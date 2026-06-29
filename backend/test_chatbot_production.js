async function run() {
  const baseUrl = 'https://samadhaangrievanceapp.onrender.com/api';
  console.log('Sending analyze request to production backend...');
  try {
    const res = await fetch(`${baseUrl}/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Water Leakage in Main Pipeline',
        description: 'Clean drinking water is leaking from the main pipeline on Street 4 for the past 2 days, wasting thousands of liters.'
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
