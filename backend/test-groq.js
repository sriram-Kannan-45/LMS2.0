const axios = require('axios');

async function test() {
  const text = `SRIRAM K is a Java Developer with experience as Deep Learning Intern and Machine Learning Intern. 
He worked on Bone Fracture Detection System and Medicam AI Medicine Recognition System.
He is an AI & Data Science Graduate and Automation Testing Enthusiast.
His technical skills include Languages: Java, Python, C, SQL and Frameworks: TensorFlow, PyTorch, Scikit-learn.
He has certifications in Machine Learning, Deep Learning, and Java Programming.
He designed an AI-powered bone fracture detection system using YOLO for fast, high-precision analysis of X-ray and medical images.
He implemented deep learning pipelines with TensorFlow and OpenCV, enabling real-time diagnostic inference with clinical-grade precision.
He integrated image preprocessing and data augmentation to improve model generalization across diverse clinical datasets.`;

  console.log('Sending text to AI service (JSON endpoint)...\n');
  
  try {
    const result = await axios.post('http://localhost:8000/generate-quiz', {
      text: text,
      num_questions: 5,
      difficulty: 'medium'
    }, { timeout: 60000 });
    
    console.log('SUCCESS! Generated', result.data.questions?.length, 'questions');
    console.log('Quiz Title:', result.data.quiz_title);
    console.log('Time:', result.data.elapsed_seconds, 'seconds\n');
    
    result.data.questions?.forEach((q, i) => {
      console.log(`Q${q.index || i+1} [MCQ]: ${q.question?.substring(0, 80)}...`);
      if (q.options) {
        console.log(`   A: ${q.options[0]?.substring(0, 50)}`);
        console.log(`   B: ${q.options[1]?.substring(0, 50)}`);
        console.log(`   C: ${q.options[2]?.substring(0, 50)}`);
        console.log(`   D: ${q.options[3]?.substring(0, 50)}`);
        console.log(`   Correct: ${q.correct_answer}`);
      }
      console.log('');
    });
    
  } catch(e) {
    console.error('Error:', e.response?.data || e.message);
  }
}

test();
