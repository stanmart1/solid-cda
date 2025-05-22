const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
// If NODE_ENV is 'test', it will load from '.env.test'
// Otherwise, it loads from '.env'
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: '.env.test' });
} else {
  dotenv.config();
}

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables.');
    }
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // useCreateIndex: true, // No longer needed in Mongoose 6+
      // useFindAndModify: false, // No longer needed in Mongoose 6+
    });
    if (process.env.NODE_ENV !== 'test') {
      console.log(`MongoDB connected successfully to ${mongoUri}`);
    }
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (process.env.NODE_ENV !== 'test') {
      console.log('MongoDB disconnected successfully.');
    }
  } catch (err) {
    console.error(`MongoDB disconnection error: ${err.message}`);
  }
};

module.exports = { connectDB, disconnectDB };
