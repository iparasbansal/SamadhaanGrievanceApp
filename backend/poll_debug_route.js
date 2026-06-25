async function run() {
  const debugUrl = 'https://samadhaangrievanceapp.onrender.com/api/grievances/test-debug';
  const logUrl = 'https://samadhaangrievanceapp.onrender.com/api/grievances/crash-log';
  const postUrl = 'https://samadhaangrievanceapp.onrender.com/api/grievances';
  console.log('Polling debug endpoints on Render...');

  for (let i = 1; i <= 30; i++) {
    console.log(`[Attempt ${i}/30] Fetching crash log...`);
    try {
      const res = await fetch(logUrl);
      const text = await res.text();
      console.log('Log endpoint status:', res.status);
      if (res.status === 200) {
        console.log('--- CRASH LOG CONTENT FROM SERVER ---');
        console.log(text);
        console.log('--------------------------------------');
        
        // Also run a test-debug request to trigger database save and print results
        console.log('Triggering test-debug endpoint...');
        const dbgRes = await fetch(debugUrl);
        const dbgJson = await dbgRes.json();
        console.log('Debug result:', JSON.stringify(dbgJson, null, 2));

        // Get updated crash log
        const updatedRes = await fetch(logUrl);
        const updatedText = await updatedRes.text();
        console.log('--- UPDATED CRASH LOG CONTENT FROM SERVER ---');
        console.log(updatedText);
        console.log('----------------------------------------------');
        return;
      }
    } catch (err) {
      console.error('Fetch error:', err.message);
    }
    
    // Wait 15 seconds before retrying
    await new Promise(resolve => setTimeout(resolve, 15000));
  }
  console.log('Polling timeout reached.');
}

run();
