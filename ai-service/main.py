b"""
AI Quiz Generator Microservice - Enterprise Edition
Uses LangChain + Gemini to generate quizzes from documents.

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
import random
import tempfile
import time
from typing import List, Dict, Any, Optional, Tuple
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, field_validator
import PyPDF2
import docx

# ── Logging Setup ──────────────────────────────────────
class ColoredFormatter(logging.Formatter):
    """Custom logging formatter that adds ANSI colors to logs."""
    GREY = "\x1b[38;20m"
    YELLOW = "\x1b[33;20m"
    RED = "\x1b[31;20m"
    BOLD_RED = "\x1b[31;1m"
    GREEN = "\x1b[32;20m"
    CYAN = "\x1b[36;20m"
    RESET = "\x1b[0m"
    
    FORMAT = "%(asctime)s | %(levelname)-7s | %(name)s | %(message)s"
    
    COLORS = {
        logging.DEBUG: GREY,
        logging.INFO: CYAN,
        logging.WARNING: YELLOW,
        logging.ERROR: RED,
        logging.CRITICAL: BOLD_RED
    }
    
    def format(self, record):
        log_fmt = self.COLORS.get(record.levelno, self.RESET) + self.FORMAT + self.RESET
        formatter = logging.Formatter(log_fmt, datefmt="%H:%M:%S")
        return formatter.format(record)

handler = logging.StreamHandler()
handler.setFormatter(ColoredFormatter())
logging.basicConfig(
    level=logging.INFO,
    handlers=[handler]
)
log = logging.getLogger("ai-quiz")

# Global port state for health checking and dynamic binding
current_port = int(os.getenv("AI_SERVICE_PORT", 8000))

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

STAGE_1_DOCUMENT_UNDERSTANDING_PROMPT = """You are an expert educational content researcher and knowledge engineer.

Analyze the following document and extract its core knowledge structure. 
Your goal is to build a high-quality, structured summary of the educational content, ignoring repeated content, formatting noise, and low-value paragraphs.

## UPLOADED DOCUMENT:
{text}

## EXTRACTION INSTRUCTIONS:
Carefully extract and organize:
1. **Main Topics & Subtopics**: The primary themes of the document.
2. **Important Concepts & Definitions**: Key technical concepts and their precise, clear definitions.
3. **Keywords & Terminology**: Crucial industry/domain-specific terms.
4. **Examples & Scenarios**: Concrete examples or use-cases used to explain concepts.
5. **Procedures & Steps**: Sequential lists of instructions, processes, or workflows.
6. **Advantages & Disadvantages**: Comparisons, benefits, drawbacks, trade-offs.
7. **Programming Syntax (if present)**: Code blocks, functions, parameters, APIs, variables, loops, conditionals, and their expected outcomes.

## FORMATTING RULES:
- Rephrase the content naturally in clear English. Do NOT copy full sentences directly from the document.
- Do NOT use phrases referring to the document like "According to the document", "The document states", etc.
- Ignore repeated content or unnecessary filler paragraphs.
- Keep the output highly structured, concise, and focused on educational/testable concepts.
- Return the results as a clean, structured JSON object:
{{
  "mainTopics": [
    {{
      "topic": "Topic Name",
      "concepts": [
        {{
          "name": "Concept/Term",
          "definition": "Clear explanation of the concept/term",
          "keywords": ["keyword1", "keyword2"],
          "examples": ["Example or scenario of this concept"],
          "procedures": ["Step 1", "Step 2"],
          "advantages": ["Advantage 1"],
          "disadvantages": ["Disadvantage 1"],
          "syntax": "Syntax code or explanation (if applicable)"
        }}
      ]
    }}
  ]
}}
"""

STAGE_2_QUIZ_GENERATION_PROMPT = """You are an expert university professor and professional certification exam paper setter (like AWS, Microsoft, Coursera, or Udemy).

Your task is to generate high-quality Multiple-Choice Questions (MCQs) based ONLY on the provided structured knowledge representation from Stage 1.

## STRUCTURED KNOWLEDGE REPRESENTATION:
{knowledge_representation}

## DIFFICULTY LEVEL: {difficulty}
Difficulty Guidelines:
- EASY: Focus on basic definitions, key terminology, and simple programming syntax.
- MEDIUM: Focus on core concepts, practical usage, and relationships between concepts.
- HARD: Focus on complex scenario-based, analytical, and problem-solving questions.

## QUESTION DISTRIBUTION:
Generate exactly {num_questions} questions.
Try to target the following distribution of question types:
- 40% Concept questions
- 20% Definition questions
- 20% Application questions
- 20% Scenario questions (where a real-world scenario is given and the correct response/solution must be selected)
* Note: If the topic is programming-related, generate code output questions and best-practice questions.

## STRICT QUESTION RULES:
1. **Never** use phrases like:
   - "According to the document"
   - "Based on the document"
   - "Which statement correctly describes"
   - "What does the document say"
2. **Never** copy sentences from the source document. Rephrase everything naturally.
3. Test understanding instead of memorization.
4. Each question must be **maximum 20 words**, in clear English, containing exactly **one idea**.
5. Do NOT include markdown symbols (like bolding **, backticks `, or bullet points).
6. Do NOT expose internal document wording or jargon that isn't commonly known in the domain.

## STRICT OPTION RULES:
1. Generate exactly **4 options** for each question.
2. Each option must be **maximum 8 words** (short and meaningful, never long paragraphs).
3. Only **one option** must be correct.
4. Distractors must be highly believable, relevant, and not obvious.
5. Randomize the position of the correct answer across the options.

## OTHER RULES:
1. Provide a **one-line explanation** for every question's correct answer.
2. Ensure there are no duplicate questions or options.

## JSON OUTPUT FORMAT:
You MUST return a valid JSON object matching the following structure. Do NOT wrap the JSON in markdown blocks (e.g. do NOT use ```json). Return ONLY the raw JSON string.

{{
  "quizTitle": "A concise, appropriate title for the quiz",
  "difficulty": "{difficulty}",
  "questions": [
    {{
      "question": "Question text here (max 20 words)",
      "options": [
        "Option A text (max 8 words)",
        "Option B text (max 8 words)",
        "Option C text (max 8 words)",
        "Option D text (max 8 words)"
      ],
      "correctAnswer": "The exact string of the correct option (must match one of the options above)",
      "explanation": "A one-line explanation of why this option is correct."
    }}
  ]
}}
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

    # Ensure option values are unique
    opts_stripped = [str(opt).strip().lower() for opt in question["options"]]
    if len(set(opts_stripped)) < 4:
        return False

    # Ensure question ends with a question mark
    if not str(question["question"]).strip().endswith("?"):
        return False

    # Ensure explanation is present
    if not question.get("explanation") or not str(question.get("explanation")).strip():
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
    
    # Fix question ending
    if not repaired["question"].strip().endswith("?"):
        repaired["question"] = repaired["question"].strip() + "?"
    
    # Fix options
    raw_options = question.get("options", [])
    if isinstance(raw_options, list):
        repaired["options"] = [str(o).strip() for o in raw_options[:4]]
        # Pad with placeholder if less than 4
        opt_count = len(repaired["options"])
        while opt_count < 4:
            repaired["options"].append("Option " + chr(65 + opt_count))
            opt_count += 1
    else:
        repaired["options"] = ["Option A", "Option B", "Option C", "Option D"]
        
    # De-duplicate options if any are identical
    unique_opts = []
    seen = set()
    for opt in repaired["options"]:
        opt_lower = opt.lower()
        if opt_lower not in seen:
            seen.add(opt_lower)
            unique_opts.append(opt)
        else:
            placeholder = f"{opt} (Alt)"
            unique_opts.append(placeholder)
            seen.add(placeholder.lower())
    repaired["options"] = unique_opts
    
    # Fix correct_answer
    ca = repaired["correct_answer"]
    if ca not in ["A", "B", "C", "D"]:
        repaired["correct_answer"] = "A"
    
    return repaired

def validate_and_filter_prompt_questions(raw_questions: List[Dict], requested_count: int) -> List[Dict]:
    """
    Validates and filters prompt-based generated questions.
    Ensures:
    - No duplicate questions.
    - No duplicate options within a question.
    - Exactly 4 options exist.
    - Correct answer matches one option text.
    - Explanation is present and non-empty.
    - Question is a complete sentence ending with '?'.
    - Returns a list of formatted, valid questions.
    Raises ValueError if the number of valid questions is less than requested_count.
    """
    if not isinstance(raw_questions, list):
        raise ValueError("Raw questions is not a list")

    valid_questions = []
    seen_questions = set()

    for i, q in enumerate(raw_questions):
        if not isinstance(q, dict):
            continue

        q_text = (q.get("question") or q.get("questionText") or "").strip()
        if not q_text:
            log.warning("Validation failure: question text is empty in question %d", i)
            continue
        if not q_text.endswith("?"):
            log.warning("Validation failure: question does not end with '?' in question %d: '%s'", i, q_text)
            continue

        opt_a = str(q.get("optionA") or q.get("option_a") or "").strip()
        opt_b = str(q.get("optionB") or q.get("option_b") or "").strip()
        opt_c = str(q.get("optionC") or q.get("option_c") or "").strip()
        opt_d = str(q.get("optionD") or q.get("option_d") or "").strip()

        options = [opt_a, opt_b, opt_c, opt_d]

        # Ensure exactly 4 options exist and they are all non-empty
        if any(not opt for opt in options):
            log.warning("Validation failure: one or more options are empty in question %d: %s", i, options)
            continue

        # Remove duplicate options: check if unique options count is less than 4
        if len(set(options)) < 4:
            log.warning("Validation failure: duplicate options found in question %d: %s", i, options)
            continue

        correct = str(q.get("correctAnswer") or q.get("correct_answer") or "").strip()
        if not correct:
            log.warning("Validation failure: correctAnswer is empty in question %d", i)
            continue

        explanation = str(q.get("explanation") or "").strip()
        if not explanation:
            log.warning("Validation failure: explanation is empty in question %d", i)
            continue

        # Map correct answer to option values
        # If correct answer is a letter or index, resolve it to option text
        c_lower = correct.lower()
        correct_val = ""
        if c_lower in ["optiona", "option_a", "opt_a", "a", "option a", "0"]:
            correct_val = opt_a
        elif c_lower in ["optionb", "option_b", "opt_b", "b", "option b", "1"]:
            correct_val = opt_b
        elif c_lower in ["optionc", "option_c", "opt_c", "c", "option c", "2"]:
            correct_val = opt_c
        elif c_lower in ["optiond", "option_d", "opt_d", "d", "option d", "3"]:
            correct_val = opt_d
        else:
            # Check if correct answer matches any option value directly
            if correct in options:
                correct_val = correct
            elif c_lower in [o.lower() for o in options]:
                # find the correct case match
                for o in options:
                    if o.lower() == c_lower:
                        correct_val = o
                        break
            else:
                log.warning("Validation failure: correctAnswer '%s' does not match any option in question %d", correct, i)
                continue

        # Remove duplicate questions (case-insensitive and whitespace-stripped)
        q_norm = q_text.lower()
        if q_norm in seen_questions:
            log.warning("Validation failure: duplicate question text found in question %d: '%s'", i, q_text)
            continue
        seen_questions.add(q_norm)

        # Clean markdown formatting (bold, headers, bullets, backticks)
        def clean_md(t: str) -> str:
            t = re.sub(r"\*\*|##|`", "", t)
            t = re.sub(r"^[•\-\*\+]\s*", "", t)
            return t.strip()

        q_clean = clean_md(q_text)
        opt_a_clean = clean_md(opt_a)
        opt_b_clean = clean_md(opt_b)
        opt_c_clean = clean_md(opt_c)
        opt_d_clean = clean_md(opt_d)
        explanation_clean = clean_md(explanation)
        correct_clean = clean_md(correct_val)

        # Enforce question length limit (max 20 words)
        q_words = q_clean.split()
        if len(q_words) > 20:
            q_clean = " ".join(q_words[:20])
            if not q_clean.endswith("?"):
                q_clean += "?"

        # Put options in a list to shuffle
        options_clean = [opt_a_clean, opt_b_clean, opt_c_clean, opt_d_clean]
        
        # Enforce option length limit (max 8 words)
        for idx, opt in enumerate(options_clean):
            opt_words = opt.split()
            if len(opt_words) > 8:
                options_clean[idx] = " ".join(opt_words[:8])
        
        # Make sure correct_clean value is updated if its corresponding option was truncated
        # We find which index matched the original correct_val, and use that index's clean/truncated version
        orig_options = [opt_a, opt_b, opt_c, opt_d]
        try:
            matched_idx = orig_options.index(correct_val)
            correct_clean = options_clean[matched_idx]
        except ValueError:
            pass

        # Shuffle correct answer position (Shuffle Options)
        random.shuffle(options_clean)

        # Ensure correct answer is still present in options
        if correct_clean not in options_clean:
            options_clean[0] = correct_clean
            random.shuffle(options_clean)

        valid_questions.append({
            "question": q_clean,
            "optionA": options_clean[0],
            "optionB": options_clean[1],
            "optionC": options_clean[2],
            "optionD": options_clean[3],
            "correctAnswer": correct_clean,
            "explanation": explanation_clean
        })

    if len(valid_questions) < requested_count:
        raise ValueError(f"Only generated {len(valid_questions)} valid questions out of {requested_count} requested.")

    return valid_questions[:requested_count]

def _try_json_repair(text: str) -> Tuple[Optional[Any], Optional[str]]:
    """Try to repair malformed JSON using the json-repair library if available."""
    try:
        from json_repair import repair_json
        repaired = repair_json(text, return_objects=True)
        return repaired, None
    except ImportError:
        return None, "json-repair library not installed"
    except Exception as e:
        return None, f"json-repair failed: {e}"


def _extract_question_objects(text: str) -> List[Dict]:
    """
    Last-resort parser: scan for top-level {...} blocks inside the array
    and try to parse each one independently. This recovers as many
    questions as possible when the overall array has syntax errors.
    """
    results: List[Dict] = []
    depth = 0
    start_idx = -1
    in_string = False
    escape = False

    for i, ch in enumerate(text):
        if escape:
            escape = False
            continue
        if ch == "\\":
            escape = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == "{":
            if depth == 0:
                start_idx = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start_idx != -1:
                block = text[start_idx:i + 1]
                # Try strict JSON, then json-repair
                try:
                    parsed = json.loads(block)
                    if isinstance(parsed, dict):
                        results.append(parsed)
                except json.JSONDecodeError:
                    repaired, _ = _try_json_repair(block)
                    if isinstance(repaired, dict):
                        results.append(repaired)
                start_idx = -1
    return results


def safe_json_parse(text: str) -> Tuple[List[Dict], List[str]]:
    """
    Safely parse JSON from text, with auto-repair capabilities.
    Returns (parsed_questions, warnings)

    Strategy (in order):
      1. Strip markdown fences and locate the JSON payload.
      2. Try strict json.loads on the cleaned text.
      3. Try json-repair on the cleaned text.
      4. Scan for individual {...} question blocks and parse each.
    """
    warnings: List[str] = []

    if not text or not text.strip():
        warnings.append("Empty response")
        return [], warnings

    cleaned = text.strip()

    # Remove markdown code fences (```json ... ``` or ``` ... ```)
    fence_match = re.search(r"```(?:json)?\s*(.*?)```", cleaned, re.DOTALL | re.IGNORECASE)
    if fence_match:
        cleaned = fence_match.group(1).strip()

    # Locate JSON payload. Prefer an array; fall back to a top-level object
    # that contains a "questions" array (JSON mode wraps things this way).
    array_start = cleaned.find('[')
    array_end = cleaned.rfind(']')
    obj_start = cleaned.find('{')
    obj_end = cleaned.rfind('}')

    payload = None
    if array_start != -1 and array_end > array_start:
        payload = cleaned[array_start:array_end + 1]
    elif obj_start != -1 and obj_end > obj_start:
        payload = cleaned[obj_start:obj_end + 1]
    else:
        warnings.append("No JSON object or array found in response")
        return [], warnings

    # Light, *safe* fixups (do NOT touch quotes — that breaks apostrophes).
    payload = re.sub(r',\s*([}\]])', r'\1', payload)   # trailing commas
    payload = re.sub(r'}\s*{', '},{', payload)         # missing commas between objects

    def _normalize(parsed: Any) -> List[Dict]:
        """Coerce parsed JSON into a list of question dicts."""
        if isinstance(parsed, list):
            return [q for q in parsed if isinstance(q, dict)]
        if isinstance(parsed, dict):
            for key in ("questions", "quiz", "items", "data", "results"):
                val = parsed.get(key)
                if isinstance(val, list):
                    return [q for q in val if isinstance(q, dict)]
            # Single question wrapped in an object
            if "question" in parsed and "options" in parsed:
                return [parsed]
        return []

    questions: List[Dict] = []

    # Attempt 1: strict parse
    try:
        questions = _normalize(json.loads(payload))
    except json.JSONDecodeError as e:
        warnings.append(f"Strict JSON parse failed: {e}")

    # Attempt 2: json-repair
    if not questions:
        repaired, repair_err = _try_json_repair(payload)
        if repaired is not None:
            questions = _normalize(repaired)
            if questions:
                warnings.append("Recovered using json-repair")
        elif repair_err:
            warnings.append(repair_err)

    # Attempt 3: per-object extraction
    if not questions:
        extracted = _extract_question_objects(payload)
        if extracted:
            questions = extracted
            warnings.append(f"Recovered {len(extracted)} question(s) via per-object extraction")

    if not questions:
        warnings.append("Could not parse any questions from response")
        return [], warnings

    # Validate / repair each question
    valid_questions: List[Dict] = []
    for i, q in enumerate(questions):
        if validate_question_structure(q):
            valid_questions.append(q)
        else:
            warnings.append(f"Question {i + 1} had structural issues - repaired")
            valid_questions.append(repair_question(q, i))

    return valid_questions, warnings

# ── LLM Setup (Gemini only — Groq removed) ────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
llm = None
llm_type = "None"

if GEMINI_API_KEY and GEMINI_API_KEY not in ("", "your-gemini-api-key-here"):
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        from langchain_core.prompts import PromptTemplate
        from langchain_text_splitters import RecursiveCharacterTextSplitter

        # Gemini's native JSON mode (response_mime_type) guarantees valid JSON
        # output — no more "Expecting ',' delimiter" parse failures.
        llm = ChatGoogleGenerativeAI(
            google_api_key=GEMINI_API_KEY,
            model=GEMINI_MODEL,
            temperature=0.2,
            max_output_tokens=8192,
            timeout=120,
            max_retries=3,
            response_mime_type="application/json",
        )
        llm_type = f"Gemini ({GEMINI_MODEL})"
        log.info("✅ LLM initialized with %s (JSON mode enabled)", llm_type)
    except ImportError as e:
        log.error("❌ Missing dependency: %s — run: pip install langchain-google-genai", e)
    except Exception as e:
        log.error("❌ Gemini initialization failed: %s", e)

if llm is None:
    log.warning("⚠️ No Gemini LLM available (GEMINI_API_KEY not set) — using text-based fallback")

# ── Request / Response Models ─────────────────────────
class QuizRequest(BaseModel):
    text: str
    num_questions: int = 10
    difficulty: str = "MIXED"  # EASY, MEDIUM, HARD, MIXED

class PromptQuizRequest(BaseModel):
    prompt: str
    questionCount: int = 10
    difficulty: str = "Medium"

    @field_validator('questionCount')
    @classmethod
    def validate_count(cls, v):
        if v < 1 or v > 50:
            raise ValueError('Number of questions must be between 1 and 50.')
        return v

    @field_validator('prompt')
    @classmethod
    def validate_prompt(cls, v):
        if not v or not v.strip():
            raise ValueError('Prompt/Topic cannot be empty.')
        return v

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

def _question_is_grounded(question: Dict, doc_tokens: set) -> bool:
    """
    Heuristic: a question is "grounded" if the question text or its correct
    option contains at least one meaningful (4+ char) token that also appears
    in the document. Helps catch LLM hallucinations where the model invents
    content not present in the source.
    """
    parts = [str(question.get("question", ""))]
    options = question.get("options", []) or []
    ca = str(question.get("correct_answer", "A")).upper()
    if ca in ("A", "B", "C", "D") and len(options) == 4:
        parts.append(str(options[ord(ca) - 65]))
    else:
        parts.extend(str(o) for o in options)

    candidate = " ".join(parts).lower()
    candidate_tokens = {
        t for t in re.findall(r"[a-z][a-z0-9]{3,}", candidate)
        if t not in {"which", "what", "where", "when", "the", "this", "that",
                     "with", "from", "into", "according", "document", "based",
                     "following", "statement", "correct", "describes", "best"}
    }

    return bool(candidate_tokens & doc_tokens)


def filter_grounded_questions(questions: List[Dict], doc_text: str) -> List[Dict]:
    """Drop questions that don't reference any vocabulary from the document."""
    doc_tokens = set(re.findall(r"[a-z][a-z0-9]{3,}", doc_text.lower()))
    if not doc_tokens:
        return questions  # Document too short to validate

    grounded: List[Dict] = []
    dropped = 0
    for q in questions:
        if _question_is_grounded(q, doc_tokens):
            grounded.append(q)
        else:
            dropped += 1
    if dropped:
        log.warning("Dropped %d ungrounded LLM question(s) — no document overlap", dropped)
    return grounded


def generate_cache_key(text: str, num_questions: int, difficulty: str) -> str:
    """
    Generate a cache key based on FULL content hash and parameters.
    Previously only hashed first 1000 chars, which caused two different
    documents with similar headers/abstracts to share the same cached quiz.
    """
    content_hash = hashlib.md5(text.encode("utf-8", errors="ignore")).hexdigest()
    return f"quiz:{content_hash}:{num_questions}:{difficulty}"

def generate_quiz_with_langchain(text: str, num_questions: int = 10, difficulty: str = "MIXED") -> Any:
    """
    Generate quiz using a Two-Stage LangChain + Gemini pipeline.
    
    Stage 1: Document Understanding (Extract core knowledge structure, rephrase, no copying)
    Stage 2: Quiz Generation (Generate high quality questions from structured representation)
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
        log.info("✅ Cache hit! Returning cached quiz questions and title")
        return cached_result
    
    # Split text if too long
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=Config.DEFAULT_CHUNK_SIZE,
        chunk_overlap=Config.DEFAULT_CHUNK_OVERLAP
    )
    chunks = text_splitter.split_text(text)

    # Select chunks SPREAD across the document instead of only the first 3.
    # This way questions cover the full content, not just the introduction.
    if len(chunks) <= 5:
        selected_chunks = chunks
    else:
        # Pick first, middle, and last; plus two interpolated chunks for coverage.
        n = len(chunks)
        indices = sorted({0, n // 4, n // 2, (3 * n) // 4, n - 1})
        selected_chunks = [chunks[i] for i in indices]

    combined_text = "\n\n".join(selected_chunks)
    log.info(
        "Text split into %d chunks, using %d spread chunks (indices cover entire document) for context",
        len(chunks), len(selected_chunks)
    )
    
    # --- STAGE 1: DOCUMENT UNDERSTANDING ---
    log.info("Running Stage 1: Document Understanding...")
    stage_1_prompt = STAGE_1_DOCUMENT_UNDERSTANDING_PROMPT.format(text=combined_text)
    
    knowledge_representation = combined_text  # Default fallback
    try:
        # We invoke the Chat model to understand the document and output JSON
        response = llm.invoke(stage_1_prompt)
        knowledge_representation = response.content
        log.info("Stage 1 complete. Extract length: %d characters", len(knowledge_representation))
    except Exception as e:
        log.error("Stage 1 failed: %s. Falling back to using raw text content.", e)
        
    # --- STAGE 2: QUIZ GENERATION ---
    log.info("Running Stage 2: Quiz Generation...")
    stage_2_prompt = STAGE_2_QUIZ_GENERATION_PROMPT.format(
        knowledge_representation=knowledge_representation,
        difficulty=difficulty,
        num_questions=num_questions
    )
    
    last_error = None
    for attempt in range(1, Config.MAX_RETRIES + 1):
        try:
            log.info("Generation attempt %d/%d...", attempt, Config.MAX_RETRIES)
            response = llm.invoke(stage_2_prompt)
            result = response.content
            
            # Parse the full JSON structure to retrieve questions list and quizTitle
            quiz_title = "AI Generated Quiz"
            try:
                # Clean markdown fences from result
                cleaned_result = result.strip()
                fence_match = re.search(r"```(?:json)?\s*(.*?)```", cleaned_result, re.DOTALL | re.IGNORECASE)
                if fence_match:
                    cleaned_result = fence_match.group(1).strip()
                
                parsed_full = json.loads(cleaned_result)
                if isinstance(parsed_full, dict):
                    quiz_title = parsed_full.get("quizTitle", "AI Generated Quiz")
            except Exception:
                # Fallback to trying json-repair
                try:
                    import json_repair
                    parsed_full = json_repair.repair_json(cleaned_result, return_objects=True)
                    if isinstance(parsed_full, dict):
                        quiz_title = parsed_full.get("quizTitle", "AI Generated Quiz")
                except Exception:
                    pass

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
            
            # Format and clean/shuffle for compatibility with existing system
            formatted = []
            for i, q in enumerate(questions):
                # Clean up any potential markdown formatting in question, options, and explanation
                question_text = q.get("question", f"Question {i+1}")
                options = q.get("options", ["Option A", "Option B", "Option C", "Option D"])
                correct_val = q.get("correctAnswer", q.get("correct_answer", ""))
                explanation = q.get("explanation", "Based on document content.")
                difficulty_val = q.get("difficulty", difficulty if difficulty != "MIXED" else "MEDIUM")
                bloom_level = q.get("bloom_level", "Understand")

                # Remove markdown formatting (bold, headers, bullets, backticks)
                def clean_md(t: str) -> str:
                    t = re.sub(r"\*\*|##|`", "", t)
                    t = re.sub(r"^[•\-\*\+]\s*", "", t)
                    return t.strip()

                question_text = clean_md(question_text)
                explanation = clean_md(explanation)
                
                # Ensure options are a list of exactly 4 strings
                if not isinstance(options, list) or len(options) != 4:
                    options = (options + ["Option A", "Option B", "Option C", "Option D"])[:4]
                options = [str(o) for o in options]

                # Find which option is correct
                correct_index = 0
                correct_letter_map = {"A": 0, "B": 1, "C": 2, "D": 3}
                correct_val_str = str(correct_val).strip()
                
                if correct_val_str in correct_letter_map:
                    correct_index = correct_letter_map[correct_val_str]
                elif correct_val_str in ("0", "1", "2", "3"):
                    correct_index = int(correct_val_str)
                else:
                    # Search options for matching text
                    try:
                        match_idx = [o.lower().strip() for o in options].index(correct_val_str.lower())
                        correct_index = match_idx
                    except ValueError:
                        correct_index = 0
                
                if correct_index >= len(options):
                    correct_index = 0
                
                correct_option_text = options[correct_index]

                # Shuffle options
                options_shuffled = list(options)
                random.shuffle(options_shuffled)

                # Find correct option index after shuffle
                try:
                    new_correct_index = options_shuffled.index(correct_option_text)
                except ValueError:
                    new_correct_index = 0
                    options_shuffled[0] = correct_option_text
                    random.shuffle(options_shuffled)
                    new_correct_index = options_shuffled.index(correct_option_text)
                
                new_correct_letter = chr(65 + new_correct_index)
                
                options_shuffled = [clean_md(o) for o in options_shuffled]

                # Enforce word limits
                # Question length: Max 20 words
                q_words = question_text.split()
                if len(q_words) > 20:
                    question_text = " ".join(q_words[:20])
                    if not question_text.endswith("?"):
                        question_text += "?"
                
                # Option length: Max 8 words
                for idx, opt in enumerate(options_shuffled):
                    opt_words = opt.split()
                    if len(opt_words) > 8:
                        options_shuffled[idx] = " ".join(opt_words[:8])
                
                # Also resolve the new correct answer text after word-limit truncation
                final_correct_answer_text = options_shuffled[new_correct_index]

                formatted.append({
                    "question": question_text,
                    "options": options_shuffled,
                    "correct_answer": new_correct_letter,  # Backwards compatible letter
                    "correctAnswer": final_correct_answer_text,  # Actual correct option text (per user request)
                    "explanation": explanation,
                    "difficulty": difficulty_val,
                    "bloom_level": bloom_level
                })
            
            # Cache the result as a tuple
            cache_val = (formatted, quiz_title)
            quiz_cache.set(cache_key, cache_val)
            
            log.info("✅ Generated %d questions successfully on attempt %d", len(formatted), attempt)
            return formatted, quiz_title
            
        except (json.JSONDecodeError, ValueError) as e:
            last_error = e
            log.warning("Parse error on attempt %d: %s", attempt, e)
        except Exception as e:
            last_error = e
            error_str = str(e).lower()
            # Gemini rate limit (429 RESOURCE_EXHAUSTED) — sleep longer
            if "429" in error_str or "resource_exhausted" in error_str or "quota" in error_str or "rate" in error_str:
                delay = min(30 * attempt, 120)  # 30s, 60s, 90s
                log.warning("Gemini rate limit hit on attempt %d — backing off %ds", attempt, delay)
                time.sleep(delay)
                continue
            log.warning("Generation error on attempt %d: %s", attempt, e)
        
        # Default exponential backoff
        if attempt < Config.MAX_RETRIES:
            delay = Config.RETRY_DELAY * attempt
            log.info("Retrying in %d seconds...", delay)
            time.sleep(delay)
    
    log.error("❌ All %d attempts failed. Last error: %s. Falling back to text-based.", Config.MAX_RETRIES, last_error)
    fallback_questions = generate_text_based_questions(text, num_questions, difficulty)
    return fallback_questions, "Fallback Quiz"

def _split_into_sentences(text: str) -> List[str]:
    """Split document text into clean, usable sentences."""
    raw = re.split(r'(?<=[.!?])\s+', text)
    seen = set()
    out = []
    for s in raw:
        s = s.strip()
        # Keep sentences that are reasonably sized AND contain enough words
        if 30 <= len(s) <= 280 and len(s.split()) >= 6 and s not in seen:
            seen.add(s)
            out.append(s)
    return out


def _extract_key_terms(text: str) -> List[str]:
    """Extract candidate key terms from the document for question seeding."""
    # Multi-word capitalized phrases (likely concepts, e.g., "Build in Exception")
    phrases = re.findall(r'\b[A-Z][A-Za-z]+(?:\s+[A-Za-z]+){1,4}\b', text)
    # Long lowercase technical words (e.g., "photosynthesis")
    long_words = re.findall(r'\b[a-z]{8,}\b', text)
    candidates = phrases + long_words

    # Deduplicate while preserving order, drop common stopwords
    stop = {
        "however", "therefore", "additionally", "furthermore", "moreover",
        "according", "regarding", "concerning", "throughout", "altogether"
    }
    seen = set()
    out = []
    for c in candidates:
        cl = c.lower()
        if cl in stop or cl in seen:
            continue
        seen.add(cl)
        out.append(c)
    return out


def generate_text_based_questions(text: str, num_questions: int, difficulty: str) -> List[Dict]:
    """
    Knowledge-based fallback when the LLM is unavailable.

    Builds fill-in-the-blank style MCQs where:
      - The CORRECT option is the actual sentence from the document containing the term.
      - The DISTRACTORS are OTHER real sentences from the document (similar length).
    This guarantees every option is grounded in the document and the correct
    answer position is randomized — much better than the previous fallback that
    used hard-coded strings like "This is contradicted by the document".
    """
    import random
    log.info("Generating knowledge-based fallback questions from document...")

    text = clean_text_for_quiz(text)
    sentences = _split_into_sentences(text)
    key_terms = _extract_key_terms(text)

    if not sentences or len(sentences) < 4:
        # Not enough material to build genuine MCQs — bubble up the failure.
        log.warning(
            "Document yielded only %d usable sentences and %d key terms — cannot build "
            "knowledge-based fallback. Refusing to return placeholder questions.",
            len(sentences), len(key_terms)
        )
        raise HTTPException(
            status_code=422,
            detail=(
                "Document text is too sparse or unstructured to generate a knowledge-based "
                "quiz. Please upload a richer document or check that AI service (LLM) is "
                "reachable."
            )
        )

    # Map each key term to the first sentence that mentions it
    term_to_sentence: Dict[str, str] = {}
    for term in key_terms:
        pattern = re.compile(re.escape(term), re.IGNORECASE)
        for s in sentences:
            if pattern.search(s):
                if term not in term_to_sentence:
                    term_to_sentence[term] = s
                break

    # Fall back to using sentences directly if we couldn't link terms reliably
    if len(term_to_sentence) < min(4, num_questions):
        log.info("Term mapping sparse, using sentence-based seeding")
        # Use unique sentences as questions: "Which statement appears in the document?"
        random.shuffle(sentences)
        seeds = [(f"Statement {i+1}", s) for i, s in enumerate(sentences[:num_questions])]
    else:
        seeds = list(term_to_sentence.items())[:num_questions]

    questions: List[Dict] = []
    for i, (term, correct_sentence) in enumerate(seeds):
        # Build distractors from OTHER sentences that don't mention the term
        pattern = re.compile(re.escape(term), re.IGNORECASE) if term and not term.startswith("Statement") else None
        candidate_distractors = [
            s for s in sentences
            if s != correct_sentence and (pattern is None or not pattern.search(s))
        ]
        if len(candidate_distractors) < 3:
            # Allow reuse — relax the no-term constraint
            candidate_distractors = [s for s in sentences if s != correct_sentence]

        random.shuffle(candidate_distractors)
        distractors = candidate_distractors[:3]
        if len(distractors) < 3:
            log.warning("Not enough distinct distractors for question %d, skipping", i + 1)
            continue

        # Randomize correct answer position
        options = distractors + [correct_sentence]
        random.shuffle(options)
        correct_index = options.index(correct_sentence)
        correct_letter = chr(ord("A") + correct_index)

        # Phrase the question
        if term.startswith("Statement"):
            question_text = "Which of the following statements is supported by the document?"
        else:
            question_text = f"According to the document, which statement correctly describes \"{term}\"?"

        questions.append({
            "question": question_text,
            "options": [o[:280] for o in options],
            "correct_answer": correct_letter,
            "explanation": f"This statement is taken directly from the document content.",
            "difficulty": difficulty if difficulty != "MIXED" else "MEDIUM",
            "bloom_level": "Remember",
        })

        if len(questions) >= num_questions:
            break

    if not questions:
        raise HTTPException(
            status_code=422,
            detail="Could not generate any knowledge-based questions from the document content."
        )

    log.info("✅ Generated %d knowledge-based fallback questions", len(questions))
    return questions


def generate_sample_questions(num_questions: int, difficulty: str) -> List[Dict]:
    """
    DEPRECATED placeholder generator.

    Previously this returned questions like "Sample MCQ 1: What is the main
    concept discussed?" with options ["Option A", "Option B", ...]. Those are
    NOT knowledge-based — they were saved to the DB and shown to participants,
    making the quiz feature look broken.

    We now always raise so the API surface returns a clear error rather than
    silently storing meaningless placeholder questions.
    """
    raise HTTPException(
        status_code=500,
        detail=(
            "Quiz generation failed and no usable knowledge-based fallback was possible. "
            "Please ensure the LLM service is reachable and the document contains enough "
            "structured text."
        )
    )

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
    provider = "None"
    model = "None"
    if llm is not None:
        provider = "Gemini"
        model = GEMINI_MODEL

    return {
        "status": "UP" if llm is not None else "DEGRADED",
        "provider": provider,
        "model": model,
        "port": current_port,
        "service": "ai-quiz-generator",
        "llm": llm_type,
        "gemini_key_set": bool(GEMINI_API_KEY and GEMINI_API_KEY != "your-gemini-api-key-here"),
    }

@app.post("/generate-quiz")
async def generate_quiz(request: QuizRequest):
    """
    Generate quiz from provided text content using Gemini AI.
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

        res = generate_quiz_with_langchain(
            text=request.text,
            num_questions=request.num_questions,
            difficulty=request.difficulty
        )
        if isinstance(res, tuple):
            questions, quiz_title = res
        else:
            questions = res
            quiz_title = "AI Generated Quiz"
            
        return {
            "questions": questions,
            "quiz_title": quiz_title
        }
    except HTTPException:
        raise
    except Exception as e:
        log.error("Quiz generation failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

def generate_mock_prompt_quiz(prompt: str, count: int, difficulty: str) -> List[Dict[str, str]]:
    """Generate mock/fallback MCQ questions when the LLM is unavailable or fails."""
    log.warning("⚠️ Using mock prompt-to-quiz generator fallback for: '%s'", prompt)
    mock_questions = []
    templates = [
        {
            "question": "What is the primary purpose or concept of {prompt}?",
            "optionA": "To streamline and organize core structures in {prompt}.",
            "optionB": "To bypass traditional database models entirely.",
            "optionC": "To compile hardware register values.",
            "optionD": "To host web applications on a local development server.",
            "correctAnswer": "To streamline and organize core structures in {prompt}.",
            "explanation": "The primary objective of {prompt} is to define and streamline its core structures and logical components."
        },
        {
            "question": "Which of the following represents a key benefit of using {prompt}?",
            "optionA": "It increases system latency and memory consumption.",
            "optionB": "It reduces development complexity and enhances modularity.",
            "optionC": "It removes all compiler optimization settings.",
            "optionD": "It mandates the use of proprietary hardware interfaces.",
            "correctAnswer": "It reduces development complexity and enhances modularity.",
            "explanation": "A key advantage of {prompt} is that it modularizes code or systems, leading to lower complexity and better maintainability."
        },
        {
            "question": "When implementing {prompt}, which practice is highly recommended?",
            "optionA": "Writing monolithic routines without error validation.",
            "optionB": "Applying consistent conventions and documenting design patterns.",
            "optionC": "Storing credentials directly in public source code.",
            "optionD": "Hardcoding all runtime parameters and values.",
            "correctAnswer": "Applying consistent conventions and documenting design patterns.",
            "explanation": "For any project involving {prompt}, maintaining code documentation and using clear naming conventions is a best practice."
        },
        {
            "question": "In the context of {prompt}, how is error handling typically managed?",
            "optionA": "By ignoring errors and letting the runtime environment crash.",
            "optionB": "Using standard exception handling mechanisms to catch and log failures.",
            "optionC": "By delegating all exception catching to operating system utilities.",
            "optionD": "By deleting logs to free up local disk space.",
            "correctAnswer": "Using standard exception handling mechanisms to catch and log failures.",
            "explanation": "Robust implementation of {prompt} utilizes try-catch or equivalent conditional error handling blocks to catch and recover from failures."
        },
        {
            "question": "Which of the following is a common pitfall when working with {prompt}?",
            "optionA": "Failing to validate inputs, leading to potential security vulnerabilities or unexpected behavior.",
            "optionB": "Writing clean, commented, and self-documenting code.",
            "optionC": "Optimizing database queries and system queries.",
            "optionD": "Using modern source control systems to track changes.",
            "correctAnswer": "Failing to validate inputs, leading to potential security vulnerabilities or unexpected behavior.",
            "explanation": "Neglecting input validation or proper bounds checking when handling {prompt} can introduce bugs, crashes, or security risks."
        }
    ]
    for i in range(count):
        tpl = templates[i % len(templates)]
        mock_questions.append({
            "question": tpl["question"].format(prompt=prompt),
            "optionA": tpl["optionA"].format(prompt=prompt),
            "optionB": tpl["optionB"].format(prompt=prompt),
            "optionC": tpl["optionC"].format(prompt=prompt),
            "optionD": tpl["optionD"].format(prompt=prompt),
            "correctAnswer": tpl["correctAnswer"].format(prompt=prompt),
            "explanation": tpl["explanation"].format(prompt=prompt)
        })
    return mock_questions

@app.post("/generate-quiz-from-prompt")
async def generate_quiz_from_prompt(request: PromptQuizRequest):
    """
    Generate quiz from a user prompt/topic using Gemini AI.
    Falls back to a mock quiz generator if Gemini is unavailable or fails.
    """
    if llm is None:
        log.warning("No LLM configured. Falling back to mock generator.")
        questions = generate_mock_prompt_quiz(request.prompt, request.questionCount, request.difficulty)
        return {
            "success": True,
            "questions": questions
        }

    try:
        user_prompt = f"""You are a world-class certification exam developer (like AWS, Coursera, Microsoft, and NPTEL). Your goal is to write high-quality, concept-based multiple choice questions that test deep understanding rather than simple recall.

Generate exactly {request.questionCount} high-quality, unique multiple-choice questions on the topic:
"{request.prompt}"

Difficulty level: {request.difficulty}

## TARGET QUESTION MIX
Target this distribution across the quiz:
- 40% Concept Questions (understanding how mechanisms or ideas work)
- 20% Definition Questions (fundamental terminology, rephrased naturally)
- 20% Application Questions (how to use the knowledge practically)
- 20% Scenario Questions (applying concepts in real-world contexts)

## GENERATION RULES
1. **No Referral Openings**: Never start a question with "According to the document", "Based on the document", "Which statement correctly describes", "What does the document say", or similar phrasing.
2. **Rephrase Naturally**: Do not copy sentences or standard definitions directly from textbooks. Understand the underlying concept and explain/question it in your own words.
3. **Standalone Clarity**: Every question must be fully understandable on its own.
4. **Length Constraints**:
   - Question length: Maximum 20 words.
   - Option length: Maximum 8 words. Keep options short, concise, and clean.
5. **Plausible Distractors**:
   - Every question must have exactly 4 options: optionA, optionB, optionC, and optionD.
   - Distractors (wrong answers) must be highly plausible and grammatically aligned, but clearly incorrect.
   - Only one option must be correct.
6. **No Duplicates**: Ensure no duplicate questions or options are generated.
7. **Clean Text**: Do not include markdown formatting (like **, ##, ` backticks, or bullet points) in questions, options, or explanations. Keep them plain text.
8. **One-Line Explanation**: Every question must have a concise, one-line explanation explaining why the correct option is right.
9. **Topic Adaptation**:
   - If the topic contains programming (e.g., Python conditional statements), ensure the questions cover different constructs (like if, if-else, elif, nested if, logical/comparison operators, ternary operator, etc.), syntax, output, debugging, and practical coding concepts. Generate output-based questions, code-analysis, or practical usage questions.
   - If the topic is theoretical, focus on concept verification, real-world application, or scenario solving.
10. **Difficulty Alignment**:
   - Easy: Focus on definitions and basic mechanics.
   - Medium: Focus on concepts and practical application.
   - Hard: Focus on scenario-based problem solving and analytical thinking.
11. **JSON Output Only**: Return ONLY a valid JSON array of objects. Do NOT wrap the JSON in markdown code blocks (such as ```json ... ```). Do NOT include any intro, outro, headings, or notes.

Response Format:
[
  {{
    "question": "Concise standalone question text (max 20 words)?",
    "optionA": "Short option 1 (max 8 words)",
    "optionB": "Short option 2 (max 8 words)",
    "optionC": "Short option 3 (max 8 words)",
    "optionD": "Short option 4 (max 8 words)",
    "correctAnswer": "Exact string of the correct option",
    "explanation": "One-line clear explanation."
  }}
]
"""

        log.info("Generating quiz from prompt: '%s', count=%d, difficulty=%s", 
                 request.prompt, request.questionCount, request.difficulty)
        
        last_error = None
        for attempt in range(1, Config.MAX_RETRIES + 1):
            try:
                log.info("Prompt generation attempt %d/%d...", attempt, Config.MAX_RETRIES)
                response = llm.invoke(user_prompt)
                result = response.content
                
                # Let's clean markdown fences if any
                cleaned = result.strip()
                fence_match = re.search(r"```(?:json)?\s*(.*?)```", cleaned, re.DOTALL | re.IGNORECASE)
                if fence_match:
                    cleaned = fence_match.group(1).strip()
                
                # Check for brackets
                array_start = cleaned.find('[')
                array_end = cleaned.rfind(']')
                if array_start != -1 and array_end > array_start:
                    cleaned = cleaned[array_start:array_end + 1]
                
                # Safe parse
                try:
                    parsed_data = json.loads(cleaned)
                except json.JSONDecodeError:
                    parsed_data, repair_err = _try_json_repair(cleaned)
                
                # Validate and filter prompt questions
                validated_questions = validate_and_filter_prompt_questions(parsed_data, request.questionCount)
                
                log.info("Successfully generated %d questions from prompt", len(validated_questions))
                return {
                    "success": True,
                    "questions": validated_questions
                }
                
            except Exception as e:
                last_error = e
                error_str = str(e).lower()
                # Gemini rate limit (429 RESOURCE_EXHAUSTED) — sleep longer
                if "429" in error_str or "resource_exhausted" in error_str or "quota" in error_str or "rate" in error_str:
                    delay = min(30 * attempt, 120)
                    log.warning("Gemini rate limit hit on attempt %d — backing off %ds", attempt, delay)
                    await asyncio.sleep(delay)
                    continue
                log.warning("Attempt %d failed: %s", attempt, e)
                if attempt < Config.MAX_RETRIES:
                    await asyncio.sleep(Config.RETRY_DELAY * attempt)
        
        log.warning("Prompt quiz generation via LLM failed. Falling back to mock generator.")
        questions = generate_mock_prompt_quiz(request.prompt, request.questionCount, request.difficulty)
        return {
            "success": True,
            "questions": questions
        }
    except Exception as e:
        log.error("Prompt quiz generation failed: %s. Falling back to mock generator.", e)
        questions = generate_mock_prompt_quiz(request.prompt, request.questionCount, request.difficulty)
        return {
            "success": True,
            "questions": questions
        }


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


# ── Coding Assessment AI endpoints (Modules A & B) ─────
class CodingQuestionRequest(BaseModel):
    topic: str
    difficulty: str = "medium"
    language: str = "any"

class CodeReviewRequest(BaseModel):
    title: str
    language: str = "python"
    code: str
    passed: int = 0
    total: int = 0

CODING_QUESTION_SYSTEM = (
    "You are an expert competitive programming question author. "
    "Generate a coding problem in strict JSON. Return ONLY valid JSON, no markdown.\n"
    "Schema:\n"
    "{\n"
    '  "title": string,\n'
    '  "problem_description": string,\n'
    '  "input_format": string,\n'
    '  "output_format": string,\n'
    '  "constraints": string,\n'
    '  "sample_input": string,\n'
    '  "sample_output": string,\n'
    '  "explanation": string,\n'
    '  "test_cases": [ { "input": string, "expected_output": string, "is_hidden": boolean } ],\n'
    '  "difficulty": "easy"|"medium"|"hard",\n'
    '  "marks": number,\n'
    '  "tags": string[]\n'
    "}\n"
    "Generate exactly 2 visible (is_hidden=false) and 5 hidden (is_hidden=true) test cases. "
    "Suggest marks by difficulty: easy=10, medium=20, hard=30."
)

CODE_REVIEW_SYSTEM = (
    "You are a senior software engineer doing a code review for a student. "
    "Be constructive, educational, and specific. Return ONLY valid JSON, no markdown.\n"
    "Schema:\n"
    "{\n"
    '  "summary": string,\n'
    '  "strengths": string[],\n'
    '  "weaknesses": string[],\n'
    '  "time_complexity": string,\n'
    '  "space_complexity": string,\n'
    '  "suggestions": string[],\n'
    '  "optimized_snippet": string\n'
    "}"
)


def _invoke_json(prompt: str):
    """Invoke the LLM and parse its JSON response (with repair). Returns dict/list or None."""
    response = llm.invoke(prompt)
    text = response.content if hasattr(response, "content") else str(response)
    try:
        return json.loads(text)
    except Exception:
        parsed, _ = _try_json_repair(text)
        return parsed


@app.post("/generate-coding-question")
async def generate_coding_question(req: CodingQuestionRequest):
    if llm is None:
        raise HTTPException(status_code=503, detail="LLM not configured")
    prompt = (
        CODING_QUESTION_SYSTEM
        + f"\n\nTopic: {req.topic}. Difficulty: {req.difficulty}. Language hint: {req.language}."
    )
    try:
        parsed = _invoke_json(prompt)
        if not isinstance(parsed, dict) or "title" not in parsed:
            raise ValueError("malformed question JSON")
        parsed.setdefault("test_cases", [])
        return {"question": parsed}
    except Exception as e:
        log.error("Coding question generation failed: %s", e)
        raise HTTPException(status_code=422, detail="AI returned malformed response. Try again.")


@app.post("/review-code")
async def review_code(req: CodeReviewRequest):
    if llm is None:
        raise HTTPException(status_code=503, detail="LLM not configured")
    prompt = (
        CODE_REVIEW_SYSTEM
        + f"\n\nProblem: {req.title}\nLanguage: {req.language}\n"
        + f"Test results: {req.passed}/{req.total} test cases passed\nCode:\n{req.code}"
    )
    try:
        parsed = _invoke_json(prompt)
        if not isinstance(parsed, dict) or "summary" not in parsed:
            raise ValueError("malformed review JSON")
        return {"review": parsed}
    except Exception as e:
        log.error("Code review failed: %s", e)
        raise HTTPException(status_code=422, detail="AI returned malformed response. Try again.")


def check_and_resolve_port(port: int) -> int:
    """Check if the port is in use; try to terminate any previous instance, else fallback to next available ports."""
    import socket
    import subprocess
    import sys
    
    def is_port_in_use(p: int) -> bool:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('0.0.0.0', p))
                return False
            except socket.error:
                return True

    if not is_port_in_use(port):
        return port

    log.warning(f"Port {port} is occupied. Attempting to terminate previous instance of AI service on this port...")
    try:
        if sys.platform == "win32":
            cmd = f'netstat -ano | findstr LISTENING | findstr :{port}'
            proc = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            lines = proc.stdout.strip().split("\n")
            for line in lines:
                parts = line.strip().split()
                if len(parts) >= 5 and f":{port}" in parts[1]:
                    pid = parts[-1]
                    log.warning(f"Found process with PID {pid} occupying port {port}. Terminating...")
                    subprocess.run(f"taskkill /F /PID {pid}", shell=True, capture_output=True)
        else:
            subprocess.run(f"fuser -k -n tcp {port}", shell=True, capture_output=True)
    except Exception as e:
        log.error(f"Error while attempting to terminate process on port {port}: {e}")

    time.sleep(1.5)

    if not is_port_in_use(port):
        log.info(f"Port {port} successfully released.")
        return port

    resolved = port
    while is_port_in_use(resolved):
        log.warning(f"Port {resolved} is still occupied. Scanning next port...")
        resolved += 1
    
    log.info(f"Port resolved to available port: {resolved}")
    return resolved

def validate_startup_config():
    """Validates configuration parameters and environment variables on startup."""
    log.info("🔍 Validating environment and configuration...")
    
    if Config.DEFAULT_CHUNK_SIZE <= 0:
        log.critical("❌ Invalid configuration: DEFAULT_CHUNK_SIZE must be positive.")
        sys.exit(1)
    if Config.DEFAULT_CHUNK_OVERLAP < 0 or Config.DEFAULT_CHUNK_OVERLAP >= Config.DEFAULT_CHUNK_SIZE:
        log.critical("❌ Invalid configuration: DEFAULT_CHUNK_OVERLAP must be non-negative and less than DEFAULT_CHUNK_SIZE.")
        sys.exit(1)
    if Config.MAX_RETRIES < 1:
        log.critical("❌ Invalid configuration: MAX_RETRIES must be at least 1.")
        sys.exit(1)
    if Config.RETRY_DELAY < 0:
        log.critical("❌ Invalid configuration: RETRY_DELAY must be non-negative.")
        sys.exit(1)

    gemini_key = os.getenv("GEMINI_API_KEY", "")
    
    if gemini_key == "your-gemini-api-key-here":
        log.critical("❌ Invalid environment: GEMINI_API_KEY is configured with a placeholder value.")
        sys.exit(1)

    port_str = os.getenv("AI_SERVICE_PORT", "8000")
    try:
        port = int(port_str)
        if port < 1 or port > 65535:
            raise ValueError()
    except ValueError:
        log.critical(f"❌ Invalid environment: AI_SERVICE_PORT '{port_str}' is not a valid port number.")
        sys.exit(1)
        
    log.info("✅ Configuration and environment are valid.")

def log_startup_banner(provider: str, model: str, port: int, health_status: str):
    """Log a colored startup banner with AI service status details."""
    startup_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    banner = f"""
======================================================================
                  LMS AI QUIZ GENERATOR SERVICE
======================================================================
   Startup Time:  {startup_time}
   AI Provider:   {provider}
   Model Name:    {model}
   Server Port:   {port}
   Health Status: {health_status}
======================================================================
"""
    green_start = "\x1b[32;1m"
    ansi_reset = "\x1b[0m"
    for line in banner.strip().split("\n"):
        log.info(f"{green_start}{line}{ansi_reset}")

if __name__ == "__main__":
    import uvicorn
    
    validate_startup_config()
    
    configured_port = int(os.getenv("AI_SERVICE_PORT", 8000))
    resolved_port = check_and_resolve_port(configured_port)
    
    current_port = resolved_port
    
    provider = "None"
    model = "None"
    health_status = "WARNING (GEMINI_API_KEY not set)"
    
    if llm is not None:
        provider = "Gemini"
        model = GEMINI_MODEL
        health_status = "UP"
        
    log_startup_banner(provider, model, resolved_port, health_status)
    
    uvicorn.run(app, host="0.0.0.0", port=resolved_port)
