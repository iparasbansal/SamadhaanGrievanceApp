async function run() {
  const baseUrl = 'https://samadhaangrievanceapp.onrender.com/api';
  console.log('Sending test analyze request for benign query...');
  try {
    const res = await fetch(`${baseUrl}/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Lighting a match stick',
        description: 'My friend lights up fire using match stick'
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
