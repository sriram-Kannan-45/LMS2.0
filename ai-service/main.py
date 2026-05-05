"""
AI Quiz Generator Microservice
Uses LangChain + Groq (OpenAI-compatible) to generate quizzes from documents.
"""
import os
import sys
import logging
import asyncio
from dotenv import load_dotenv
load_dotenv()  # Load .env file

import json
import tempfile
import time
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import PyPDF2
import docx

# ── Logging Setup ──────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("ai-quiz")

app = FastAPI(title="LMS AI Quiz Generator", version="2.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Groq Setup ──────────────────────────────
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
llm = None
llm_type = "None"

if GROQ_API_KEY and GROQ_API_KEY not in ("", "your-groq-api-key-here"):
    try:
        from langchain_openai import ChatOpenAI
        from langchain_core.prompts import PromptTemplate
        from langchain_text_splitters import RecursiveCharacterTextSplitter

        # Groq uses OpenAI-compatible API
        llm = ChatOpenAI(
            openai_api_key=GROQ_API_KEY,
            base_url="https://api.groq.com/openai/v1",
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            max_tokens=4000,
            request_timeout=60,
        )
        llm_type = "Groq"
        log.info("✅ LLM initialized with Groq (llama-3.3-70b-versatile)")
    except ImportError as e:
        log.error("❌ Missing dependency: %s — run: pip install langchain-openai", e)
    except Exception as e:
        log.error("❌ Groq initialization failed: %s", e)
else:
    log.warning("⚠️ GROQ_API_KEY not set or invalid. Using text-based fallback.")

if llm is None:
    log.warning("No LLM available — will use text-based fallback")

# ── Request / Response Models ─────────────────────────
class QuizRequest(BaseModel):
    text: str
    num_questions: int = 10
    difficulty: str = "MIXED"  # EASY, MEDIUM, HARD, MIXED

class Question(BaseModel):
    questionText: str
    questionType: str = "MCQ"
    options: Optional[List[str]] = None
    correctAnswer: Optional[str] = None
    explanation: Optional[str] = None
    difficulty: str = "MEDIUM"
    order: int = 0

class QuizResponse(BaseModel):
    success: bool
    questions: List[Question]
    message: Optional[str] = None

class EvaluateRequest(BaseModel):
    questionText: str
    modelAnswer: str
    userAnswer: str

class EvaluateResponse(BaseModel):
    score: float
    feedback: str
    isCorrect: bool

# ── Text Extraction ─────────────────────────────────────
def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from PDF file."""
    try:
        with open(file_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            text = ""
            for page in reader.pages:
                text += page.extract_text() or ""
            return text[:15000]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"PDF extraction failed: {str(e)}")

def extract_text_from_docx(file_path: str) -> str:
    """Extract text from DOCX file."""
    try:
        doc = docx.Document(file_path)
        return "\n".join([p.text for p in doc.paragraphs])[:15000]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"DOCX extraction failed: {str(e)}")

def extract_text_from_txt(file_path: str) -> str:
    """Read text file."""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()[:15000]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"TXT extraction failed: {str(e)}")

# ── Text Cleaning ─────────────────────────────────────
def clean_text_for_quiz(text: str) -> str:
    """Clean extracted text for better quiz generation."""
    import re
    text = re.sub(r'[\w.-]+?@\w+\.\w{2,}', '[EMAIL]', text)
    text = re.sub(r'https?://\S+', '[URL]', text)
    text = re.sub(r'[|•■◆▪–—]+', ' ', text)
    text = re.sub(r'([a-z])\n([A-Z])', r'\1. \2', text)
    text = re.sub(r'\n{2,}', '. ', text)
    text = re.sub(r'  +', ' ', text)
    return text.strip()

# ── Quiz Generation ─────────────────────────────────────
QUIZ_PROMPT_TEMPLATE = """
You are an expert educational quiz generator. Based ONLY on the provided document content, generate {num_questions} multiple-choice quiz questions.

DOCUMENT CONTENT:
{text}

INSTRUCTIONS:
1. Generate exactly {num_questions} MCQ questions STRICTLY based on the document content above
2. Difficulty: {difficulty}
3. For each question: Provide exactly 4 options (A, B, C, D), mark correct answer as "A", "B", "C", or "D"
4. Do NOT add external information not in the document
5. Ensure questions test understanding, not just memorization
6. Use the document's key concepts and terminology
7. Return ONLY the question text in the question field

OUTPUT FORMAT (return ONLY valid JSON array, no markdown, no explanation):
[
  {{
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "A",
    "explanation": "Why this is correct based on document"
  }}
]

Generate ONLY the JSON array:
"""

MAX_RETRIES = 3

def generate_quiz_with_langchain(text: str, num_questions: int = 10, difficulty: str = "MIXED") -> List[Dict]:
    """Generate quiz using LangChain + LLM (Groq) with retry logic."""
    
    if llm is None:
        log.info("Using text-based question generation (no LLM available)")
        return generate_text_based_questions(text, num_questions, difficulty)
    
    log.info("Generating quiz with %s...", llm_type)
    
    # Clean the text first
    text = clean_text_for_quiz(text)
    log.info("Text cleaned, length: %d", len(text))
    
    # Split text if too long
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=4000,
        chunk_overlap=200
    )
    chunks = text_splitter.split_text(text)
    combined_text = "\n\n".join(chunks[:3])
    
    from langchain_core.prompts import PromptTemplate
    
    prompt = PromptTemplate(
        template=QUIZ_PROMPT_TEMPLATE,
        input_variables=["text", "num_questions", "difficulty"]
    )
    
    chain = prompt | llm
    
    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            log.info("Attempt %d/%d for quiz generation...", attempt, MAX_RETRIES)
            response = chain.invoke({
                "text": combined_text,
                "num_questions": num_questions,
                "difficulty": difficulty
            })
            result = response.content
            
            # Extract JSON from response
            cleaned = result.strip()
            if "```json" in cleaned:
                cleaned = cleaned.split("```json")[1].split("```")[0]
            elif "```" in cleaned:
                cleaned = cleaned.split("```")[1].split("```")[0]
            
            # Find JSON array
            start = cleaned.find('[')
            end = cleaned.rfind(']') + 1
            if start != -1 and end != 0:
                cleaned = cleaned[start:end]
            
            questions = json.loads(cleaned)
            
            # Validate and format
            formatted = []
            for i, q in enumerate(questions[:num_questions]):
                formatted.append({
                    "question": q.get("question", f"Question {i+1}"),
                    "options": q.get("options", ["Option A", "Option B", "Option C", "Option D"]),
                    "correct_answer": q.get("correct_answer", "A"),
                    "explanation": q.get("explanation", "")
                })
            
            log.info("✅ Generated %d questions successfully on attempt %d", len(formatted), attempt)
            return formatted
            
        except json.JSONDecodeError as e:
            last_error = e
            log.warning("JSON parse error on attempt %d: %s", attempt, e)
        except Exception as e:
            last_error = e
            log.warning("Generation error on attempt %d: %s", attempt, e)
            if attempt < MAX_RETRIES:
                time.sleep(2 * attempt)  # Exponential backoff
    
    log.error("❌ All %d attempts failed. Last error: %s. Falling back to text-based.", MAX_RETRIES, last_error)
    return generate_text_based_questions(text, num_questions, difficulty)

def generate_text_based_questions(text: str, num_questions: int, difficulty: str) -> List[Dict]:
    """Generate questions based on text content without LLM."""
    import re
    log.info("Generating text-based questions from document...")
    
    text = clean_text_for_quiz(text)
    
    phrases = re.findall(r'\b[A-Z][a-z]+(?:\s+[a-z]+){1,3}\b', text)
    if not phrases:
        phrases = re.findall(r'\b\w{5,}\b', text)
    
    if not phrases:
        log.info("No good phrases found, using sample questions")
        return generate_sample_questions(num_questions, difficulty)
    
    log.info("Found %d key phrases", len(phrases))
    
    sentences = []
    for phrase in phrases[:num_questions * 2]:
        pattern = re.escape(phrase)
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            start = max(0, text.rfind('.', 0, match.start()) + 1)
            end = text.find('.', match.end())
            if end == -1:
                end = len(text)
            sentence = text[start:end].strip()
            if 20 < len(sentence) < 200 and sentence not in sentences:
                sentences.append(sentence)
    
    if not sentences:
        sentences = [s.strip() for s in re.split(r'[.!?]+', text) if 20 < len(s.strip()) < 200]
    
    if not sentences:
        log.info("No good sentences found, using sample questions")
        return generate_sample_questions(num_questions, difficulty)
    
    log.info("Using %d sentences for questions", len(sentences))
    
    questions = []
    for i in range(num_questions):
        sentence = sentences[i % len(sentences)]
        key_phrase = phrases[i % len(phrases)]
        
        question_text = f"What does the document say about '{key_phrase}'?"
        questions.append({
            "question": question_text,
            "options": [
                sentence[:120] + ("..." if len(sentence) > 120 else ""),
                "This is contradicted by the document",
                "This information is not present in the document",
                "The document describes a different concept"
            ],
            "correct_answer": "A",
            "explanation": "This information is directly stated in the document"
        })
    
    log.info("✅ Generated %d text-based questions", len(questions))
    return questions

def generate_sample_questions(num_questions: int, difficulty: str) -> List[Dict]:
    """Fallback sample questions if AI fails."""
    log.info("Generating sample questions...")
    questions = []
    for i in range(num_questions):
        questions.append({
            "question": f"Sample MCQ {i+1}: What is the main concept discussed?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_answer": "A",
            "explanation": "Option A is correct based on the document"
        })
    return questions

def evaluate_short_answer(question_text: str, model_answer: str, user_answer: str) -> Dict:
    """Evaluate short answer using AI."""
    if llm is None:
        user_words = set(user_answer.lower().split())
        model_words = set(model_answer.lower().split())
        match_ratio = len(user_words.intersection(model_words)) / max(len(model_words), 1)
        score = min(100.0, match_ratio * 100)
        return {
            "score": score,
            "feedback": "Partial credit based on keyword matching" if score > 0 else "Answer needs improvement",
            "isCorrect": score >= 60
        }
    
    eval_prompt = f"""
You are an expert evaluator. Evaluate the user's answer against the model answer, based ONLY on accuracy.

QUESTION: {question_text}
MODEL ANSWER: {model_answer}
USER ANSWER: {user_answer}

Evaluate and return ONLY valid JSON:
{{
  "score": 75.0,
  "feedback": "Brief feedback here (max 100 chars)",
  "isCorrect": false
}}

Return ONLY the JSON:
"""
    
    try:
        from langchain_core.prompts import PromptTemplate
        
        prompt = PromptTemplate(template=eval_prompt, input_variables=["question_text", "model_answer", "user_answer"])
        chain = prompt | llm
        response = chain.invoke({
            "question_text": question_text,
            "model_answer": model_answer,
            "user_answer": user_answer
        })
        result = response.content
        
        cleaned = result.strip()
        if "{" in cleaned:
            start = cleaned.find('{')
            end = cleaned.rfind('}') + 1
            if start != -1 and end != 0:
                cleaned = cleaned[start:end]
            result_dict = json.loads(cleaned)
            return {
                "score": float(result_dict.get("score", 0)),
                "feedback": result_dict.get("feedback", "Answer evaluated"),
                "isCorrect": result_dict.get("isCorrect", False)
            }
    except Exception as e:
        log.warning("Evaluation error: %s", e)
    
    # Fallback
    user_words = set(user_answer.lower().split())
    model_words = set(model_answer.lower().split())
    match_ratio = len(user_words.intersection(model_words)) / max(len(model_words), 1)
    score = min(100.0, match_ratio * 100)
    return {
        "score": score,
        "feedback": "Partial credit based on keyword matching" if score > 0 else "Answer needs improvement",
        "isCorrect": score >= 60
    }

# ── API Endpoints ─────────────────────────────────────
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "ai-quiz-generator",
        "llm": llm_type,
        "groq_key_set": bool(GROQ_API_KEY and GROQ_API_KEY != "your-groq-api-key-here"),
    }

@app.post("/generate-quiz")
async def generate_quiz(request: QuizRequest):
    """
    Generate quiz from provided text content.
    Uses Groq (llama-3.3-70b-versatile) to create MCQ questions.
    """
    try:
        if not request.text or len(request.text.strip()) < 50:
            raise HTTPException(
                status_code=422,
                detail="Text content is too short. Please provide at least 50 characters of text."
            )

        if request.num_questions < 1 or request.num_questions > 50:
            raise HTTPException(
                status_code=422,
                detail="Number of questions must be between 1 and 50."
            )

        questions = generate_quiz_with_langchain(
            text=request.text,
            num_questions=request.num_questions,
            difficulty=request.difficulty
        )
        return {
            "questions": questions,
            "quiz_title": "AI Generated Quiz"
        }
    except HTTPException:
        raise
    except Exception as e:
        log.error("Quiz generation failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Quiz generation failed: {str(e)}")

@app.post("/upload-and-generate")
async def upload_and_generate(
    file: UploadFile = File(...),
    num_questions: int = Form(10),
    difficulty: str = Form("MIXED"),
):
    """
    Upload document (PDF, DOCX, TXT only) and generate quiz.
    Accepts multipart/form-data.
    """
    try:
        # LAYER 1: STRICT MIME TYPE CHECK
        if file.content_type:
            if file.content_type.startswith("image/"):
                raise HTTPException(
                    status_code=415, 
                    detail="Images are not supported. Please upload PDF, DOCX, or TXT files only."
                )
            
            allowed_mimes = [
                "application/pdf",
                "text/plain",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ]
            if file.content_type not in allowed_mimes:
                raise HTTPException(
                    status_code=415,
                    detail=f"Unsupported file type: {file.content_type}. Only PDF, DOCX, and TXT files are allowed."
                )
        
        # LAYER 2: FILE EXTENSION CHECK
        suffix = file.filename.split('.')[-1].lower() if '.' in file.filename else ""
        allowed_extensions = ["pdf", "docx", "doc", "txt", "md"]
        image_extensions = ["png", "jpg", "jpeg", "gif", "bmp", "webp", "svg", "ico", "tiff", "tif"]
        
        if suffix in image_extensions:
            raise HTTPException(
                status_code=415,
                detail=f"Images (.{suffix}) are not supported. Please upload PDF, DOCX, or TXT files only."
            )
        
        if suffix not in allowed_extensions:
            raise HTTPException(
                status_code=415,
                detail=f"Unsupported file extension: .{suffix}. Only .pdf, .docx, .doc, .txt files are allowed."
            )
        
        # LAYER 3: MAGIC BYTES CHECK
        file_content = await file.read()
        
        if len(file_content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File too large. Maximum size is 10MB.")
        
        if len(file_content) > 0:
            if file_content[:8].startswith(b'\x89PNG\r\n\x1a\n'):
                raise HTTPException(status_code=415, detail="PNG images are not supported.")
            if file_content[:3] == b'\xff\xd8\xff':
                raise HTTPException(status_code=415, detail="JPEG images are not supported.")
            if file_content[:6].startswith(b'GIF87a') or file_content[:6].startswith(b'GIF89a'):
                raise HTTPException(status_code=415, detail="GIF images are not supported.")
            if file_content[:2] == b'BM':
                raise HTTPException(status_code=415, detail="BMP images are not supported.")
            if len(file_content) >= 12 and file_content[:4] == b'RIFF' and file_content[8:12] == b'WEBP':
                raise HTTPException(status_code=415, detail="WebP images are not supported.")
        
        # Save as temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{suffix}") as tmp:
            tmp.write(file_content)
            tmp_path = tmp.name
        
        # Extract text
        try:
            if suffix == "pdf":
                text = extract_text_from_pdf(tmp_path)
            elif suffix in ["docx", "doc"]:
                text = extract_text_from_docx(tmp_path)
            elif suffix in ["txt", "md"]:
                text = extract_text_from_txt(tmp_path)
            else:
                raise HTTPException(status_code=415, detail="Unsupported file type")
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
        
        if not text or len(text.strip()) < 50:
            raise HTTPException(
                status_code=400,
                detail="Document appears to be empty or contains insufficient text."
            )
        
        # Generate quiz
        try:
            questions = generate_quiz_with_langchain(text, num_questions, difficulty)
        except Exception as e:
            error_msg = str(e)
            if any(kw in error_msg.lower() for kw in ["image", "does not support", "invalid input"]):
                raise HTTPException(
                    status_code=415,
                    detail="This AI model does not support image input. Please upload PDF, DOCX, or TXT files only."
                )
            raise
        
        return {
            "success": True,
            "questions": questions,
            "message": f"Generated {len(questions)} questions from uploaded document using {llm_type}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        log.error("Upload-and-generate failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@app.post("/evaluate", response_model=EvaluateResponse)
async def evaluate_answer(request: EvaluateRequest):
    """Evaluate a short answer using AI."""
    try:
        result = evaluate_short_answer(
            question_text=request.questionText,
            model_answer=request.modelAnswer,
            user_answer=request.userAnswer
        )
        return result
    except Exception as e:
        log.error("Evaluation failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    log.info("Starting AI Quiz Generator on port 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
