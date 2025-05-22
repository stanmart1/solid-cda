const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CDA Platform API',
      version: '1.0.0',
      description: 'API documentation for the Community Development Association Platform',
      contact: {
        name: 'Support Team',
        // url: 'http://your-support-url.com', // Optional
        email: 'support@example.com', // Optional
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}/api`, // Adjust if your base path is different
        description: 'Development server',
      },
      // You can add more servers here (e.g., staging, production)
    ],
    components: {
      securitySchemes: {
        bearerAuth: { // Arbitrary name for the security scheme
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT', // Optional, for documentation purposes
        },
      },
    },
    security: [ // Global security definition, applied to all paths unless overridden
      {
        bearerAuth: [],
      },
    ],
  },
  // Path to the API docs
  // Looks for JSDoc comments in these files
  apis: ['./routes/*.js', './controllers/*.js', './models/*.js'], // Adjust paths as necessary
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
