const express = require('express');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit'); // Added
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const membershipRoutes = require('./routes/membershipRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminNotificationRoutes = require('./routes/adminNotificationRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const votingRoutes = require('./routes/votingRoutes');
const accountingRoutes = require('./routes/accountingRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const { errorHandler } = require('./middleware/errorMiddleware');
const swaggerUi = require('swagger-ui-express'); // Added for Swagger
const swaggerSpec = require('./swaggerConfig'); // Added for Swagger

dotenv.config(); // Ensure this is at the top
connectDB();

const app = express();

// Set security HTTP headers
app.use(helmet());

// Rate limiting - apply to all requests for simplicity, or target specific routes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes.',
});
app.use(globalLimiter); // Apply to all /api routes if mounted before them, or app.use('/api', globalLimiter)

// Specific rate limiters for sensitive routes like login and register
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login/register attempts per windowMs
  message: 'Too many authentication attempts from this IP, please try again after 15 minutes.',
  skipSuccessfulRequests: true, // Don't count successful auths towards the limit
});
// Apply this limiter specifically in authRoutes.js or here if authRoutes is simple enough
// For now, assuming it will be applied in authRoutes.js or directly before mounting authRoutes


// Middleware to parse JSON
app.use(express.json());
// Middleware to parse urlencoded data
app.use(express.urlencoded({ extended: false }));


const PORT = process.env.PORT || 3000;

// Mount Routers
// Apply authLimiter specifically to auth routes.
// This is a common pattern if you want different limits for different parts of your API.
// If authRoutes are defined in a way that router.use('/login', authLimiter) can be done there, that's also fine.
// For this example, we'll apply it before mounting all auth routes.
app.use('/api/auth', authLimiter, authRoutes); // Apply authLimiter to all /api/auth routes
app.use('/api/users', userRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin/notifications', adminNotificationRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/polls', votingRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/complaints', complaintRoutes);

// Swagger API Documentation Route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));


app.get('/', (req, res) => {
  res.send('Welcome to the API');
});

// Error Handling Middleware
app.use(errorHandler); // This should generally be last

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
