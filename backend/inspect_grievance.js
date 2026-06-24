async function run() {
  const baseUrl = 'https://samadhaangrievanceapp.onrender.com/api';
  const url = `${baseUrl}/grievances`;
  console.log('Fetching:', url);
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log('Response status:', res.status);
    console.log('Response body:', data);
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
