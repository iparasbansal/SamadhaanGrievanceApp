const fs = require('fs');
const path = require('path');
const logFile = path.join(__dirname, 'crash.log');

// Clear log at startup to keep it clean
try {
  if (fs.existsSync(logFile)) {
    fs.unlinkSync(logFile);
  }
} catch (e) {}

function log(message) {
  const time = new Date().toISOString();
  const entry = `[${time}] ${message}\n`;
  console.log(entry.trim());
  try {
    fs.appendFileSync(logFile, entry);
  } catch (err) {
    console.error('Failed to write to crash.log:', err);
  }
}

process.on('uncaughtException', (err) => {
  log(`CRITICAL - UNCAUGHT EXCEPTION: ${err.message}\nStack:\n${err.stack}`);
  // Give it some time to write to file before exiting
  try {
    fs.appendFileSync(logFile, `Process exiting due to uncaughtException\n`);
  } catch (e) {}
  setTimeout(() => process.exit(1), 500);
});

process.on('unhandledRejection', (reason, promise) => {
  const msg = reason instanceof Error ? `${reason.message}\nStack:\n${reason.stack}` : String(reason);
  log(`CRITICAL - UNHANDLED REJECTION: ${msg}`);
});

module.exports = { log, logFile };
