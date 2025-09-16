const app = require('./src/app');
const config = require('./config/config');

const PORT = config.server.port;

app.listen(PORT, () => {
  console.log('🚀 Alumni Management System API Server Started');
  console.log('📡 Server running on port:', PORT);
  console.log('🌍 Environment:', config.server.environment);
  console.log('📊 Health check: http://localhost:' + PORT + '/api/health');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});