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
        firstName: 'Grievance',
        lastName: 'Tester',
        email,
        password
      })
    });
    
    const regText = await regRes.text();
    console.log('Registration Status:', regRes.status);
    console.log('Registration Body:', regText);
    
    let regData;
    try {
      regData = JSON.parse(regText);
    } catch {
      console.error('Registration response was not JSON');
      return;
    }
    
    if (!regRes.ok) {
      console.error('Registration failed:', regData);
      return;
    }
    
    const token = regData.token;
    const userId = regData.user?.id || regData.user?._id;
    console.log('Registered successfully! Token:', token, 'UserId:', userId);

    // 2. Submit a grievance
    console.log('Submitting a new grievance...');
    const postRes = await fetch(`${baseUrl}/grievances`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify({
        title: 'Broken Potholes at Mall Road Test Spot',
        description: 'Large potholes are causing traffic congestion and accidents at this intersection from the past 3 weeks.',
        category: 'Roads & Infrastructure',
        submitterUserId: userId,
        submitterName: 'Grievance Tester',
        location: {
          address: 'Mall Road, Sangrur, Punjab, India',
          latitude: 30.2458,
          longitude: 75.8452
        }
      })
    });

    const text = await postRes.text();
    console.log('POST Response Status:', postRes.status);
    console.log('POST Response Body:', text);
  } catch (err) {
    console.error('Test failed with error:', err);
  }
}

run();
