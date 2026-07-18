const fs = require('fs');
const code = fs.readFileSync('script.js', 'utf8');
const md = '```javascript\n' + code + '\n```';
fs.writeFileSync('C:/Users/smart/.gemini/antigravity/brain/a9f70061-f05e-44a1-954f-06c5ceb8f7a4/artifacts/script_full.md', md);
