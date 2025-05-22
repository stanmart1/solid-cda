const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db'); // Adjust path if necessary
const User = require('../models/userModel'); // Import models to clear them

// Optional: Increase timeout for database operations if needed, though Jest config already has testTimeout
// jest.setTimeout(30000); 

beforeAll(async () => {
  // Ensure NODE_ENV is set to 'test' which should be handled by cross-env in package.json script
  // but can be double-checked here.
  if (process.env.NODE_ENV !== 'test') {
    // console.warn("NODE_ENV is not 'test'. Ensure your test script sets it correctly.");
    // Potentially force it, though it's better if the script handles it:
    // process.env.NODE_ENV = 'test';
    // Or throw an error:
    // throw new Error("NODE_ENV must be 'test' for running tests.");
  }
  await connectDB();
});

afterEach(async () => {
  // Clean up the database by deleting all documents from collections after each test
  // This ensures tests are independent.
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  await disconnectDB();
});
