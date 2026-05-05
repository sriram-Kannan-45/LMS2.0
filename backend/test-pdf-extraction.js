const pdf = require('pdf-parse');
const fs = require('fs');

async function test() {
  try {
    const filePath = 'uploads/ai-docs/1777796039888-SRIRAM_K_RESUME_INFO.pdf';
    const buf = fs.readFileSync(filePath);
    const data = await pdf(buf);
    
    console.log('PDF Text length:', data.text.length);
    console.log('\nFirst 1000 chars:');
    console.log(data.text.substring(0, 1000));
    
    // Check for image references
    const imagePattern = /\b(image|img|fig|figure)\s*\d*\.(png|jpg|jpeg|gif|bmp|webp|svg)\b/gi;
    const matches = data.text.match(imagePattern);
    if (matches) {
      console.log('\nFound image references:', matches.slice(0, 10));
    }
    
  } catch (e) {
    console.error('Error:', e.message);
  }
}

test();
