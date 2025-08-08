const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');

// Load environment variables
dotenv.config();

// Import database connection
const connectDB = require('./config/database');// Import routes
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const aiAgentRoutes = require('./routes/aiAgentRoutes');
const agentRoutes = require('./routes/agentRoutes');
const walletRoutes = require('./routes/walletRoutes');
const agentChatRoutes = require('./routes/agentChatRoutes');
const simpleHederaAgentRoutes = require('./routes/simpleHederaAgents');
const authRoutes = require('./routes/authRoutes');
const executorAgentRoutes = require('./routes/executorAgentRoutes');
const enhancedIntentRoutes = require('./routes/enhancedIntentRoutes');
const hederaAgentsRoutes = require('./routes/hederaAgentsRoutes');

// Initialize Express app
const app = express();

// Connect to database
connectDB();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(morgan('combined')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});// API routes
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/agent', aiAgentRoutes);
app.use('/api/agents', agentRoutes);
// app.use('/api/agents/hedera', simpleHederaAgentRoutes); // Commented out to avoid route conflict
app.use('/api/wallets', walletRoutes);
app.use('/api/agent-chat', agentChatRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/executor-agents', executorAgentRoutes);
app.use('/api/enhanced-intent', enhancedIntentRoutes);
app.use('/api/hedera/agents', hederaAgentsRoutes);

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Default route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to the Crypto Trading API with Multi-Agent System',
    features: [
      'User Authentication & Management',
      'Product Management System',
      'AI-Powered Multi-Agent Trading System',
      'SEI Network DEX Integration',
      'Memory-Enhanced Conversations',
      'Strategy-Specific Agents (DCA, Momentum, Swing, HODL, Arbitrage, Custom)',
      'Interactive Swagger Documentation'
    ],
    endpoints: {
      documentation: '/api-docs',
      health: '/health',
      users: '/api/users',
      products: '/api/products',
      aiAgent: '/api/agent',
      agents: '/api/agents',
      agentChat: '/api/agent-chat',
      executorAgents: '/api/executor-agents'
    },
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
          availableRoutes: {
        documentation: '/api-docs',
        health: '/health',
        users: '/api/users',
        products: '/api/products',
        aiAgent: '/api/agent',
        agents: '/api/agents',
        agentChat: '/api/agent-chat'
      }
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`📚 Documentation available at http://localhost:${PORT}/api-docs`);
  console.log(`🤖 Multi-Agent System available at /api/agents`);
  console.log(`💬 AI Agent Chat available at /api/agent`);
  console.log(`🧠 Intelligent Agent Chat available at /api/agent-chat`);
  console.log(`❤️  Health check available at http://localhost:${PORT}/health`);
});

module.exports = app;