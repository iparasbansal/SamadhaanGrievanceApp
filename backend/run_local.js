const { MongoMemoryServer } = require('mongodb-memory-server');
const path = require('path');
const fs = require('fs');

async function main() {
  console.log('Starting local in-memory MongoDB server...');
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  console.log('In-memory MongoDB started at:', uri);

  // Set environment variables for our server.js
  process.env.MONGO_URI = uri;
  process.env.JWT_SECRET = 'local-secret-key-12345';
  process.env.PORT = '5001'; // use 5001 to avoid conflicts
  process.env.CLIENT_ORIGIN = 'http://localhost:5173';

  // Import and start our server
  console.log('Booting backend server...');
  require('./server.js');

  // Wait a moment for server to initialize
  await new Promise(resolve => setTimeout(resolve, 2000));

  const baseUrl = 'http://localhost:5001/api';
  console.log('Sending test registration request...');
  try {
    const regRes = await fetch(`${baseUrl}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Grievance',
        lastName: 'Tester',
        email: 'test@example.com',
        password: 'Password123!'
      })
    });
    const regData = await regRes.json();
    console.log('Registration Status:', regRes.status);
    console.log('Registration Body:', regData);

    if (!regRes.ok) {
      console.error('Registration failed.');
      process.exit(1);
    }

    const token = regData.token;
    const userId = regData.user.id;

    console.log('Submitting grievance...');
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

    console.log('POST Status:', postRes.status);
    const postBody = await postRes.text();
    console.log('POST Response Body:', postBody);
  } catch (err) {
    console.error('Error running local tests:', err);
  }

  // Print crash log if it was generated
  const logFile = path.join(__dirname, 'crash.log');
  if (fs.existsSync(logFile)) {
    console.log('\n--- LOCAL CRASH LOG ---');
    console.log(fs.readFileSync(logFile, 'utf8'));
    console.log('-----------------------');
  } else {
    console.log('\nNo crash.log file was generated.');
  }

  console.log('Test complete. Shutting down...');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});
