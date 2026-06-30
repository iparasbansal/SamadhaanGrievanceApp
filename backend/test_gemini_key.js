/**
 * Gemini API Key Diagnostic Script
 * Usage: node backend/test_gemini_key.js <YOUR_GEMINI_API_KEY>
 * Or set GEMINI_API_KEY in backend/.env and run: node backend/test_gemini_key.js
 */

const fs = require('fs');
const path = require('path');

// Try loading from backend/.env if key not passed in args
let apiKey = process.argv[2];

if (!apiKey) {
  try {
    const envPath = path.resolve(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/^GEMINI_API_KEY=(.*)$/m);
      if (match && match[1]) {
        apiKey = match[1].trim();
      }
    }
  } catch (e) {
    console.warn('Could not read .env file:', e.message);
  }
}

if (!apiKey) {
  console.error('❌ Error: No Gemini API Key provided.');
  console.log('\nPlease run the script with your API key as an argument:');
  console.log('  node backend/test_gemini_key.js AIzaSy...');
  console.log('\nOr add it to backend/.env:');
  console.log('  GEMINI_API_KEY=your_api_key_here');
  process.exit(1);
}

// Mask key for safety
const maskedKey = apiKey.length > 8 ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : '***';
console.log(`Testing Gemini API Key: ${maskedKey}\n`);

async function listModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  console.log(`Fetching list of available models...`);
  try {
    const response = await fetch(url);
    const text = await response.text();
    if (response.ok) {
      const data = JSON.parse(text);
      console.log('✅ Available Models:');
      if (data.models && Array.isArray(data.models)) {
        data.models.forEach(m => {
          console.log(`   - ${m.name.replace('models/', '')} (${m.displayName})`);
        });
      } else {
        console.log('   No models returned in list.');
      }
      console.log();
      return data.models || [];
    } else {
      console.log(`❌ Failed to list models! Status: ${response.status}`);
      console.log(`   Error: ${text}\n`);
      return [];
    }
  } catch (err) {
    console.log(`❌ Error fetching models list: ${err.message}\n`);
    return [];
  }
}

async function testModel(modelName) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: 'Respond with the word "SUCCESS" if you can read this.' }]
      }
    ]
  };

  console.log(`Testing model [${modelName}]...`);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const status = response.status;
    const text = await response.text();

    if (response.ok) {
      const data = JSON.parse(text);
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      console.log(`✅ [${modelName}] Success! Status: ${status}`);
      console.log(`   Response: "${reply}"\n`);
      return true;
    } else {
      console.log(`❌ [${modelName}] Failed! Status: ${status}`);
      try {
        const errJson = JSON.parse(text);
        console.log(`   Error Message: ${errJson?.error?.message || text}`);
      } catch {
        console.log(`   Error response: ${text}`);
      }
      console.log();
      return false;
    }
  } catch (err) {
    console.log(`❌ [${modelName}] Network/Fetch Error: ${err.message}\n`);
    return false;
  }
}

async function run() {
  const models = await listModels();
  
  const candidateModels = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-2.5-flash',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-flash-lite-latest'
  ];

  console.log('--- RUNNING MODEL TESTS ---');
  const results = {};
  for (const model of candidateModels) {
    const isAvailable = models.some(m => m.name.includes(model));
    if (isAvailable) {
      results[model] = await testModel(model);
      // Small pause between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    } else {
      console.log(`⚠️ Model [${model}] is not in the list of available models for this key. Skipping.\n`);
    }
  }

  console.log('--- DIAGNOSTIC SUMMARY ---');
  const workingModels = Object.keys(results).filter(m => results[m]);
  if (workingModels.length > 0) {
    console.log('✅ The following models are WORKING with your API key:');
    workingModels.forEach(m => console.log(`   - ${m}`));
    console.log('\nAction: Update your backend config in backend/routes/ai.js to use one of these working models!');
  } else {
    console.log('❌ All tested models failed. Your API key might have a total quota limit of 0 on the free tier (e.g., daily limit exceeded or restricted project).');
    console.log('Action: Go to Google AI Studio (https://aistudio.google.com/), create a new project, and generate a new API key.');
  }
}

run();
