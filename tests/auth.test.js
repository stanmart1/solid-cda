const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server'); // For in-memory DB (alternative to setup.js)
const User = require('../models/userModel');
const authRoutes = require('../routes/authRoutes');
const { errorHandler } = require('../middleware/errorMiddleware');
const dotenv = require('dotenv');

// Load .env.test variables
dotenv.config({ path: '.env.test' });

// Setup Express app for testing
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use(errorHandler); // Add error handler to catch errors thrown by controllers

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterEach(async () => {
  await User.deleteMany({}); // Clear User collection after each test
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});


describe('Auth Routes - Integration Tests', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully and return user data with a token', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'testuser@example.com',
        password: 'password123',
        role: 'Tenant',
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('token');
      expect(res.body.email).toBe(userData.email);
      expect(res.body.firstName).toBe(userData.firstName);
      expect(res.body.role).toBe(userData.role);

      // Check if user is actually saved in DB (optional, but good for full integration test)
      const userInDb = await User.findById(res.body._id);
      expect(userInDb).not.toBeNull();
      expect(userInDb.email).toBe(userData.email);
    });

    it('should return 400 if required fields are missing', async () => {
      const userData = { // Missing lastName and password
        firstName: 'Test',
        email: 'testuser2@example.com',
      };
      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toMatch(/Please add all required fields/i);
    });

    it('should return 400 if user already exists', async () => {
      const userData = {
        firstName: 'Existing',
        lastName: 'User',
        email: 'existing@example.com',
        password: 'password123',
      };
      await User.create(userData); // Pre-create user

      const res = await request(app)
        .post('/api/auth/register')
        .send(userData); // Attempt to register again with same email

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toBe('User already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser;
    const testPassword = 'password123';

    beforeEach(async () => {
      // Create a user to test login
      testUser = await User.create({
        firstName: 'Login',
        lastName: 'Test',
        email: 'login@example.com',
        password: testPassword, // Password will be hashed by pre-save hook
        role: 'Tenant',
      });
    });

    it('should log in an existing user successfully and return a token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: testPassword,
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body._id).toBe(testUser._id.toString());
      expect(res.body.email).toBe(testUser.email);
    });

    it('should return 401 for invalid credentials (wrong password)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'wrongpassword',
        });
      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('should return 401 for non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });
      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toBe('Invalid email or password');
    });
     it('should return 400 if email or password is not provided', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@example.com' }); // Missing password
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toBe('Please provide email and password');
    });
  });

  describe('GET /api/auth/me', () => {
    let token;
    let userId;

    beforeEach(async () => {
      // Register a user and get a token for testing the /me route
      const registrationResponse = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Me',
          lastName: 'User',
          email: 'me@example.com',
          password: 'password123',
          role: 'Property Owner'
        });
      token = registrationResponse.body.token;
      userId = registrationResponse.body._id;
    });

    it('should get current user profile with a valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body._id).toBe(userId);
      expect(res.body.email).toBe('me@example.com');
      expect(res.body.role).toBe('Property Owner');
      expect(res.body).not.toHaveProperty('password'); // Ensure password is not returned
    });

    it('should return 401 if no token is provided', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toBe('Not authorized, no token');
    });

    it('should return 401 if token is invalid', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalidtoken123');
      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toBe('Not authorized, token failed');
    });
  });
});

// Example of Unit-like tests for controller logic if it were more complex and separable
// For authController, the logic is tightly coupled with req/res and DB, so integration tests are more effective.
// If there were utility functions within authController, they could be unit tested here.
// describe('Auth Controller - Unit Tests (Conceptual)', () => {
//   // Mock User model for unit tests
//   // jest.mock('../models/userModel');
//
//   // test('generateToken should return a JWT token', () => {
//   //   // This function is simple, but if it had more logic:
//   //   const mockUserId = new mongoose.Types.ObjectId();
//   //   const mockUserRole = 'Tenant';
//   //   const token = generateToken(mockUserId, mockUserRole); // Assuming generateToken is exported or accessible
//   //   expect(token).toBeDefined();
//   //   // Further token structure validation if needed
//   // });
// });
