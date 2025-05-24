const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// Optional: Increase timeout for database operations if needed, though Jest config already has testTimeout
// jest.setTimeout(30000); 

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    // Remove other options not relevant for in-memory or deprecated
  });
});

afterEach(async () => {
  // Clean up the database by deleting all documents from collections after each test
  // This ensures tests are independent.
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    // Added a check to ensure collection exists before trying to delete
    if (collection && typeof collection.deleteMany === 'function') {
      await collection.deleteMany({});
    }
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});
