b"""
AI Quiz Generator Microservice - Enterprise Edition
Uses LangChain + Groq (OpenAI-compatible) to generate quizzes from documents.

Enhanced with:
- Advanced prompt engineering with Bloom's taxonomy
- Response caching for improved performance
- Structured JSON output validation
- Semantic similarity filtering for question diversity
- Retry logic with exponential backoff
- Comprehensive error handling and logging
"""
import os
import sys
import logging
import asyncio
import hashlib
import re
from datetime import datetime, timedelta
from dotenv import load_dotenv
load_dotenv()  # Load .env file

import json
import tempfile
import time
from typing import List, Dict, Any, Optional, Tuple
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, validator
import PyPDF2
import docx

# ── Logging Setup ──────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("ai-quiz")

# ── Application Setup ──────────────────────────────────
app = FastAPI(
    title="LMS AI Quiz Generator",
    version="3.0.0",
    description="Enterprise-grade AI quiz generation service with advanced prompt engineering and caching"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Cache Implementation ───────────────────────────────
class SimpleCache:
    """In-memory cache with TTL support for quiz generation results."""
    
    def __init__(self, default_ttl: int = 3600):
        self._cache: Dict[str, Dict] = {}
        self._timestamps: Dict[str, datetime] = {}
        self.default_ttl = default_ttl
    
    def get(self, key: str) -> Optional[Dict]:
        """Get item from cache if not expired."""
        if key in self._cache:
            if datetime.now() - self._timestamps[key] < timedelta(seconds=self.default_ttl):
                return self._cache[key]
            else:
                del self._cache[key]
                del self._timestamps[key]
        return None
    
    def set(self, key: str, value: Dict) -> None:
        """Set item in cache with current timestamp."""
        self._cache[key] = value
        self._timestamps[key] = datetime.now()
    
    def clear(self) -> None:
        """Clear all cache entries."""
        self._cache.clear()
        self._timestamps.clear()

# Initialize cache
quiz_cache = SimpleCache(default_ttl=7200)  # 2 hour TTL

# ── Configuration ──────────────────────────────────────
class Config:
    """Centralized configuration for AI service."""
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    MAX_TEXT_LENGTH = 15000
    MIN_TEXT_LENGTH = 50
    MAX_QUESTIONS = 50
    MIN_QUESTIONS = 1
    DEFAULT_CHUNK_SIZE = 4000
    DEFAULT_CHUNK_OVERLAP = 200
    MAX_RETRIES = 3
    RETRY_DELAY = 2  # seconds
    SIMILARITY_THRESHOLD = 0.7  # For duplicate detection

# ── Enhanced Prompt Templates ─────────────────────────
DIFFICULTY_CONFIGS = {
    "EASY": {
        "description": "Basic recall and comprehension questions",
        "bloom_level": "Remember, Understand",
        "instruction": "Focus on key terms, definitions, and basic concepts. Questions should test fundamental understanding.",
        "complexity": "low"
    },
    "MEDIUM": {
        "description": "Application and analysis questions",
        "bloom_level": "Apply, Analyze",
        "instruction": "Include scenario-based questions that require applying concepts. Test ability to analyze relationships.",
        "complexity": "medium"
    },
    "HARD": {
        "description": "Evaluation and creation questions",
        "bloom_level": "Evaluate, Create",
        "instruction": "Create complex scenarios requiring critical thinking. Test ability to evaluate, synthesize, and make judgments.",
        "complexity": "high"
    },
    "MIXED": {
        "description": "Balanced difficulty distribution",
        "bloom_level": "All levels",
        "instruction": "Distribute questions across all difficulty levels: ~30% easy, ~40% medium, ~30% hard.",
        "complexity": "mixed"
    }
}

ENHANCED_QUIZ_PROMPT = """You are an expert educational assessment designer with deep knowledge of Bloom's Taxonomy and pedagogical best practices.

## DOCUMENT CONTENT
{text}

## TASK
Generate exactly {num_questions} high-quality multiple-choice questions (MCQs) based STRICTLY on the document content above.

## DIFFICULTY CONFIGURATION
Level: {difficulty}
{difficulty_instruction}

## QUESTION QUALITY REQUIREMENTS
1. **Content Accuracy**: Every question must be directly answerable from the document. Do NOT introduce external information.
2. **Cognitive Depth**: Questions should test understanding, not just rote memorization. Use real-world scenarios when appropriate.
3. **Option Quality**:
   - Exactly 4 options (A, B, C, D)
   - One clearly correct answer
   - Distractors should be plausible but definitively incorrect
   - Avoid "all of the above" or "none of the above"
   - Options should be similar in length and complexity
4. **Question Diversity**: Cover different sections and concepts from the document. Avoid repetitive question patterns.
5. **Clarity**: Questions must be unambiguous with precise wording.

## OUTPUT FORMAT
Return ONLY a valid JSON array. No markdown, no explanations, no preamble.

[
  {{
    "question": "Clear, well-formed question text?",
    "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
    "correct_answer": "A",
    "explanation": "Brief explanation (1-2 sentences) referencing the document content",
    "difficulty": "EASY or MEDIUM or HARD",
    "bloom_level": "Remember/Understand/Apply/Analyze/Evaluate/Create"
  }}
]

## IMPORTANT
- Return ONLY the JSON array
- Ensure valid JSON syntax (proper escaping of quotes)
- All {num_questions} questions must be unique and cover different aspects of the document
- The correct_answer field must be exactly "A", "B", "C", or "D"

Generate the JSON array now:
"""

# ── Similarity Detection ───────────────────────────────
def simple_text_similarity(text1: str, text2: str) -> float:
    """
    Simple Jaccard similarity for detecting duplicate questions.
    Returns a value between 0 and 1.
    """
    words1 = set(text1.lower().split())
    words2 = set(text2.lower().split())
    
    if not words1 or not words2:
        return 0.0
    
    intersection = words1 & words2
    union = words1 | words2
    
    return len(intersection) / len(union) if union else 0.0

def filter_duplicate_questions(questions: List[Dict], threshold: float = 0.7) -> List[Dict]:
    """
    Filter out questions that are too similar to each other.
    Returns a deduplicated list.
    """
    if len(questions) <= 1:
        return questions
    
    filtered = [questions[0]]
    
    for q in questions[1:]:
        is_duplicate = False
        for existing in filtered:
            # Check question text similarity
            sim = simple_text_similarity(q.get("question", ""), existing.get("question", ""))
            if sim >= threshold:
                is_duplicate = True
                break
            
            # Also check if options are too similar
            q_options = " ".join(q.get("options", []))
            existing_options = " ".join(existing.get("options", []))
            opt_sim = simple_text_similarity(q_options, existing_options)
            if opt_sim >= threshold:
                is_duplicate = True
                break
        
        if not is_duplicate:
            filtered.append(q)
    
    return filtered

# ── JSON Validation & Repair ───────────────────────────
def validate_question_structure(question: Dict) -> bool:
    """Validate that a question has all required fields with correct types."""
    required_fields = {
        "question": str,
        "options": list,
        "correct_answer": str,
    }
    
    for field, field_type in required_fields.items():
        if field not in question:
            return False
        if not isinstance(question[field], field_type):
            return False
    
    # Validate options count
    if not isinstance(question["options"], list) or len(question["options"]) != 4:
        return False
    
    # Validate correct_answer is valid index
    if question["correct_answer"] not in ["A", "B", "C", "D", "0", "1", "2", "3"]:
        return False
    
    # Validate all options are non-empty strings
    for opt in question["options"]:
        if not isinstance(opt, str) or not opt.strip():
            return False
    
    return True

def repair_question(question: Dict, index: int) -> Dict:
    """Attempt to repair a malformed question structure."""
    repaired = {
        "question": str(question.get("question", "Question " + str(index + 1))),
        "options": [],
        "correct_answer": question.get("correct_answer", "A"),
        "explanation": question.get("explanation", "Answer based on document content."),
        "difficulty": question.get("difficulty", "MEDIUM"),
        "bloom_level": question.get("bloom_level", "Understand")
    }
    
    # Fix options
    raw_options = question.get("options", [])
    if isinstance(raw_options, list):
        repaired["options"] = [str(o) for o in raw_options[:4]]
        # Pad with placeholder if less than 4
        opt_count = len(repaired["options"])
        while opt_count < 4:
            repaired["options"].append("Option " + chr(65 + opt_count))
            opt_count += 1
    else:
        repaired["options"] = ["Option A", "Option B", "Option C", "Option D"]
    
    # Fix correct_answer
    ca = repaired["correct_answer"]
    if ca not in ["A", "B", "C", "D"]:
        repaired["correct_answer"] = "A"
    
    return repaired

def safe_json_parse(text: str) -> Tuple[List[Dict], List[str]]:
    """
    Safely parse JSON from text, with auto-repair capabilities.
    Returns (parsed_questions, warnings)
    """
    warnings = []
    
    # Clean the text
    cleaned = text.strip()
    
    # Remove markdown code blocks
    for marker in ["```json", "```"]:
        if marker in cleaned:
            cleaned = cleaned.split(marker)[1].split("```")[0] if "```" in cleaned else cleaned
    
    # Find JSON array bounds
    start = cleaned.find('[')
    end = cleaned.rfind(']') + 1
    
    if start == -1 or end == 0:
        warnings.append("No JSON array found in response")
        return [], warnings
    
    cleaned = cleaned[start:end]
    
    # Fix common JSON issues
    # Remove trailing commas
    cleaned = re.sub(r',\s*([}\]])', r'\1', cleaned)
    # Fix missing commas between array elements
    cleaned = re.sub(r'}\s*{', '},{', cleaned)
    # Fix single quotes
    cleaned = cleaned.replace("'", '"')
    # Fix unescaped quotes in strings (simple heuristic)
    
    try:
        questions = json.loads(cleaned)
        
        if not isinstance(questions, list):
            warnings.append("Parsed JSON is not an array")
            return [], warnings
        
        # Validate and repair each question
        valid_questions = []
        for i, q in enumerate(questions):
            if not isinstance(q, dict):
                warnings.append(f"Question {i+1} is not an object")
                continue
            
            if validate_question_structure(q):
                valid_questions.append(q)
            else:
                warnings.append(f"Question {i+1} had structural issues - repaired")
                valid_questions.append(repair_question(q, i))
        
        return valid_questions, warnings
        
    except json.JSONDecodeError as e:
        warnings.append(f"JSON parse error: {str(e)}")
        return [], warnings

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

def generate_cache_key(text: str, num_questions: int, difficulty: str) -> str:
    """Generate a cache key based on content hash and parameters."""
    content_hash = hashlib.md5(text[:1000].encode()).hexdigest()
    return f"quiz:{content_hash}:{num_questions}:{difficulty}"

def generate_quiz_with_langchain(text: str, num_questions: int = 10, difficulty: str = "MIXED") -> List[Dict]:
    """
    Generate quiz using LangChain + LLM (Groq) with enhanced prompt engineering.
    
    Features:
    - Cache lookup for identical requests
    - Enhanced Bloom's taxonomy-based prompts
    - Robust JSON parsing with auto-repair
    - Duplicate question filtering
    - Exponential backoff retry logic
    """
    
    if llm is None:
        log.info("Using text-based question generation (no LLM available)")
        return generate_text_based_questions(text, num_questions, difficulty)
    
    log.info("Generating quiz with %s for %d questions (%s difficulty)...", llm_type, num_questions, difficulty)
    
    # Clean the text first
    text = clean_text_for_quiz(text)
    log.info("Text cleaned, length: %d characters", len(text))
    
    # Check cache first
    cache_key = generate_cache_key(text, num_questions, difficulty)
    cached_result = quiz_cache.get(cache_key)
    if cached_result:
        log.info("✅ Cache hit! Returning cached quiz questions")
        return cached_result
    
    # Split text if too long
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=Config.DEFAULT_CHUNK_SIZE,
        chunk_overlap=Config.DEFAULT_CHUNK_OVERLAP
    )
    chunks = text_splitter.split_text(text)
    combined_text = "\n\n".join(chunks[:3])
    log.info("Text split into %d chunks, using top %d for context", len(chunks), min(3, len(chunks)))
    
    # Build enhanced prompt with difficulty-specific instructions
    from langchain_core.prompts import PromptTemplate
    
    diff_config = DIFFICULTY_CONFIGS.get(difficulty, DIFFICULTY_CONFIGS["MIXED"])
    difficulty_instruction = diff_config["instruction"]
    
    prompt = PromptTemplate(
        template=ENHANCED_QUIZ_PROMPT,
        input_variables=["text", "num_questions", "difficulty", "difficulty_instruction"]
    )
    
    chain = prompt | llm
    
    last_error = None
    for attempt in range(1, Config.MAX_RETRIES + 1):
        try:
            log.info("Generation attempt %d/%d...", attempt, Config.MAX_RETRIES)
            response = chain.invoke({
                "text": combined_text,
                "num_questions": num_questions,
                "difficulty": difficulty,
                "difficulty_instruction": difficulty_instruction
            })
            result = response.content
            
            # Parse JSON with auto-repair capabilities
            questions, warnings = safe_json_parse(result)
            
            if warnings:
                for w in warnings:
                    log.warning("Parse warning: %s", w)
            
            if not questions:
                raise ValueError("No valid questions could be parsed from response")
            
            # Filter duplicates
            original_count = len(questions)
            questions = filter_duplicate_questions(questions, Config.SIMILARITY_THRESHOLD)
            if len(questions) < original_count:
                log.info("Filtered %d duplicate questions (%d -> %d)", 
                        original_count - len(questions), original_count, len(questions))
            
            # Limit to requested number
            questions = questions[:num_questions]
            
            # Format for compatibility with existing system
            formatted = []
            for i, q in enumerate(questions):
                formatted.append({
                    "question": q.get("question", f"Question {i+1}"),
                    "options": q.get("options", ["Option A", "Option B", "Option C", "Option D"]),
                    "correct_answer": q.get("correct_answer", "A"),
                    "explanation": q.get("explanation", "Based on document content."),
                    "difficulty": q.get("difficulty", difficulty if difficulty != "MIXED" else "MEDIUM"),
                    "bloom_level": q.get("bloom_level", "Understand")
                })
            
            # Cache the result
            quiz_cache.set(cache_key, formatted)
            
            log.info("✅ Generated %d questions successfully on attempt %d", len(formatted), attempt)
            return formatted
            
        except (json.JSONDecodeError, ValueError) as e:
            last_error = e
            log.warning("Parse error on attempt %d: %s", attempt, e)
        except Exception as e:
            last_error = e
            log.warning("Generation error on attempt %d: %s", attempt, e)
        
        # Exponential backoff
        if attempt < Config.MAX_RETRIES:
            delay = Config.RETRY_DELAY * attempt
            log.info("Retrying in %d seconds...", delay)
            time.sleep(delay)
    
    log.error("❌ All %d attempts failed. Last error: %s. Falling back to text-based.", Config.MAX_RETRIES, last_error)
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

@app.get("/cache/status")
async def cache_status():
    """Get cache statistics and status."""
    now = datetime.now()
    active_entries = 0
    expired_entries = 0
    
    for key, timestamp in quiz_cache._timestamps.items():
        if now - timestamp < timedelta(seconds=quiz_cache.default_ttl):
            active_entries += 1
        else:
            expired_entries += 1
    
    return {
        "cache_enabled": True,
        "ttl_seconds": quiz_cache.default_ttl,
        "total_entries": len(quiz_cache._cache),
        "active_entries": active_entries,
        "expired_entries": expired_entries,
        "llm_type": llm_type,
        "service_version": "3.0.0"
    }

@app.delete("/cache/clear")
async def clear_cache():
    """Clear all cached quiz generations."""
    quiz_cache.clear()
    log.info("Cache cleared by admin request")
    return {"message": "Cache cleared successfully", "status": "ok"}


if __name__ == "__main__":
    import uvicorn
    log.info("Starting AI Quiz Generator on port 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
