async function run() {
  const baseUrl = 'https://samadhaangrievanceapp.onrender.com/api';
  console.log('Sending chat request to production backend...');
  try {
    const res = await fetch(`${baseUrl}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'assistant', content: 'Hello! I am Samadhaan AI...' },
          { role: 'user', content: 'hello' }
        ],
        userContext: []
      })
    });
    
    console.log('Response Status:', res.status);
    const text = await res.text();
    console.log('Response Body:', text);
  } catch (err) {
    console.error('Fetch failed:', err);
  }
}

run();
