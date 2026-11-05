import express from 'express';
import expressWs from 'express-ws';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import pino from 'pino';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  }
});

// Create Express app
const app = express();
const { app: wsApp } = expressWs(app);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`
    });
  });
  next();
});

// Serve static frontend files
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: process.env.npm_package_version || '0.1.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Initialize services
import { ProjectManager } from './services/ProjectManager.js';
import { ToolchainManager } from './services/ToolchainManager.js';
import { WebSocketManager } from './services/WebSocketManager.js';
import { BuildService } from './services/BuildService.js';

const projectsDir = path.join(__dirname, '../projects');
const projectManager = new ProjectManager(projectsDir);
const toolchainManager = new ToolchainManager();
const wsManager = new WebSocketManager();
const buildService = new BuildService(projectManager, toolchainManager, wsManager);

// Store services in app.locals for route access
app.locals.projectManager = projectManager;
app.locals.toolchainManager = toolchainManager;
app.locals.wsManager = wsManager;
app.locals.buildService = buildService;

logger.info('Services initialized');

// API Routes
import projectRoutes from './routes/projects.js';
import filesRoutes from './routes/files.js';
import buildRoutes from './routes/build.js';
import toolsRoutes from './routes/tools.js';

app.use('/api/projects', projectRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/build', buildRoutes);
app.use('/api/tools', toolsRoutes);

// WebSocket endpoint for real-time updates
app.ws('/ws/projects/:id', (ws, req) => {
  const projectId = req.params.id;
  logger.info(`WebSocket connection established for project ${projectId}`);
  
  // Register with WebSocketManager
  wsManager.register(projectId, ws);
  
  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      logger.debug({ type: data.type, projectId }, 'WebSocket message received');
      
      // Echo back for now (will be replaced with real handlers)
      ws.send(JSON.stringify({
        type: 'ack',
        payload: { received: data.type }
      }));
    } catch (err) {
      logger.error({ err }, 'Failed to parse WebSocket message');
    }
  });
  
  ws.on('close', () => {
    logger.info(`WebSocket connection closed for project ${projectId}`);
  });
  
  ws.on('error', (err) => {
    logger.error({ err, projectId }, 'WebSocket error');
  });
});

// Catch-all route - serve index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  logger.error({ err, url: req.url, method: req.method }, 'Unhandled error');
  
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  logger.info(`🚀 WebVado server running on http://localhost:${PORT}`);
  logger.info(`📁 Serving frontend from ${frontendPath}`);
  logger.info(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Open browser automatically in development
  if (process.env.NODE_ENV !== 'production') {
    import('open').then(({ default: open }) => {
      open(`http://localhost:${PORT}`).catch(() => {
        logger.warn('Failed to open browser automatically');
      });
    }).catch(() => {
      logger.warn('Failed to load open module');
    });
  }
});

// Graceful shutdown
const shutdown = (signal) => {
  logger.info(`${signal} received, shutting down gracefully...`);
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled Promise Rejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught Exception');
  process.exit(1);
});

export default app;
