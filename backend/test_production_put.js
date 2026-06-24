// Using global fetch (built-in in Node 18+)
async function run() {
  const baseUrl = 'https://samadhaangrievanceapp.onrender.com/api';
  const email = `test-${Date.now()}@example.com`;
  const password = 'Password123!';

  try {
    // 1. Register test user
    console.log('Registering test user...');
    const regRes = await fetch(`${baseUrl}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Test',
        lastName: 'User',
        email,
        password
      })
    });
    
    const regData = await regRes.json();
    if (!regRes.ok) {
      console.error('Registration failed:', regData);
      return;
    }
    
    const token = regData.token;
    console.log('Registered successfully! Token received.');

    // 2. Send PUT request to resolve
    console.log('Sending PUT request to resolve grievance 6a1f0dc0398c14d51c1fed89...');
    const putRes = await fetch(`${baseUrl}/grievances/6a1f0dc0398c14d51c1fed89`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        status: 'Resolved',
        resolutionPhoto: {
          url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          name: 'solved.png',
          uploadedBy: 'Test User'
        }
      })
    });

    const putData = await putRes.json();
    console.log('PUT Response Status:', putRes.status);
    console.log('PUT Response Body:', putData);
  } catch (err) {
    console.error('Test failed with error:', err);
  }
}

run();
