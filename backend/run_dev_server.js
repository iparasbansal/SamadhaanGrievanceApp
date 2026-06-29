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
  process.env.PORT = '5001'; 
  process.env.CLIENT_ORIGIN = 'http://localhost:5173';

  // Load backend GEMINI_API_KEY if present in environment or load it from parent process
  if (process.env.GEMINI_API_KEY) {
    console.log('Using GEMINI_API_KEY from environment.');
  }

  // Import and start our server
  console.log('Booting backend server on port 5001...');
  require('./server.js');
}

main().catch(err => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});
