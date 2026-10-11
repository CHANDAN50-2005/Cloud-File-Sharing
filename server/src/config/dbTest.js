import mongoose from 'mongoose';
import { env } from './env.js';

async function runTest() {
  console.log('\n======================================================');
  console.log('SecureCloud — MongoDB Connection Verifier');
  console.log('======================================================\n');

  if (
    !env.MONGODB_URI ||
    env.MONGODB_URI.includes('<password>') ||
    env.MONGODB_URI.includes('<cluster-address>')
  ) {
    console.error('❌ ERROR: MONGODB_URI in server/.env is still set to placeholder values.');
    console.error(
      '👉 Please follow docs/SETUP_WINDOWS.md to create an Atlas cluster and set MONGODB_URI.\n'
    );
    process.exit(1);
  }

  const maskedUri = env.MONGODB_URI.replace(/:([^@]+)@/, ':****@');
  console.log(`Connecting to: ${maskedUri}...`);

  try {
    const start = Date.now();
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000
    });
    const duration = Date.now() - start;

    console.log(`✅ SUCCESS: Connected to MongoDB in ${duration}ms!`);
    console.log(`   Host: ${mongoose.connection.host}`);
    console.log(`   Database: ${mongoose.connection.name}`);
    console.log(`   Ready State: ${mongoose.connection.readyState} (1 = Connected)`);

    // Ping the admin DB
    const admin = mongoose.connection.db.admin();
    const ping = await admin.ping();
    console.log('   Admin Ping:', ping.ok === 1 ? 'OK (Latency verified)' : ping);

    await mongoose.disconnect();
    console.log('\nConnection test passed cleanly. Disconnected.\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ FAILED to connect to MongoDB:');
    console.error(err.message);
    if (err.message.includes('bad auth') || err.message.includes('Authentication failed')) {
      console.error('\n👉 Hint: Check your database username and password in server/.env.');
    } else if (
      err.message.includes('querySrv ETIMEOUT') ||
      err.message.includes('selection timed out')
    ) {
      console.error(
        '\n👉 Hint: Check your Atlas IP Access List in Atlas Network Access. Ensure 0.0.0.0/0 or your current IP is added.'
      );
    }
    console.log('');
    process.exit(1);
  }
}

runTest();
