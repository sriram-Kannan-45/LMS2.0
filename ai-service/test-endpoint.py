import json
from main import app
from fastapi.testclient import TestClient

client = TestClient(app)

text = """SRIRAM K is a Java Developer with experience as Deep Learning Intern and Machine Learning Intern. 
He worked on Bone Fracture Detection System and Medicam AI Medicine Recognition System.
He is an AI & Data Science Graduate and Automation Testing Enthusiast.
His technical skills include Languages: Java, Python, C, SQL.
Frameworks: TensorFlow, PyTorch, Scikit-learn.
Libraries: NumPy, Pandas, OpenCV, NLTK, gTTS.
He designed an AI-powered bone fracture detection system using YOLO for fast, high-precision analysis of X-ray and medical images.
Implemented deep learning pipelines with TensorFlow and OpenCV, enabling real-time diagnostic inference with clinical-grade precision.
Integrated image preprocessing and data augmentation to improve model generalization across diverse clinical datasets."""

print("Testing /generate-quiz-json endpoint...")
resp = client.post('/generate-quiz-json', json={
    'text': text,
    'num_questions': 3,
    'difficulty': 'medium'
})

print(f"Status: {resp.status_code}")
if resp.status_code == 200:
    data = resp.json()
    print(f"Quiz Title: {data.get('quiz_title')}")
    print(f"Questions: {len(data.get('questions', []))}")
    print(f"Time: {data.get('elapsed_seconds')}s")
    for i, q in enumerate(data.get('questions', [])):
        print(f"\nQ{i+1}: {q.get('question', '')[:80]}...")
        print(f"   A: {q.get('options', [''])[0][:50]}")
        print(f"   Correct: {q.get('correct_answer')}")
else:
    print(f"Error: {resp.json()}")
