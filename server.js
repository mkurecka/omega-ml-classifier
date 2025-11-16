const express = require('express');
const axios = require('axios');
const { predictImage, loadModel, cleanupMemory } = require('./predict');

const app = express();
const PORT = process.env.PORT || 3000;
const API_TOKEN = process.env.API_TOKEN;

if (!API_TOKEN) {
  console.error('[ERROR] API_TOKEN environment variable is required!');
  process.exit(1);
}

app.use(express.json({ limit: '10mb' }));

// Memory monitoring
let requestCount = 0;
const MEMORY_LOG_INTERVAL = 60000; // Log every 60 seconds
const GC_INTERVAL = 300000; // Force GC every 5 minutes
const MEMORY_CLEANUP_THRESHOLD = 10; // Cleanup every N requests

function logMemoryUsage() {
  const usage = process.memoryUsage();
  console.log(`[MEMORY] RSS: ${(usage.rss / 1024 / 1024).toFixed(2)}MB | Heap: ${(usage.heapUsed / 1024 / 1024).toFixed(2)}MB / ${(usage.heapTotal / 1024 / 1024).toFixed(2)}MB | External: ${(usage.external / 1024 / 1024).toFixed(2)}MB | Requests: ${requestCount}`);
}

// Start memory monitoring
setInterval(logMemoryUsage, MEMORY_LOG_INTERVAL);

// Periodic garbage collection
setInterval(() => {
  if (global.gc) {
    console.log('[GC] Running manual garbage collection...');
    global.gc();
    logMemoryUsage();
  }
}, GC_INTERVAL);

// Authentication middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header is required' });
  }

  const token = authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : authHeader;

  if (token !== API_TOKEN) {
    return res.status(403).json({ error: 'Invalid API token' });
  }

  next();
};

// Health check endpoint (public)
app.get('/health', (req, res) => {
  const usage = process.memoryUsage();
  res.json({
    status: 'healthy',
    service: 'ml-background-classifier',
    uptime: process.uptime(),
    memory: {
      rss: `${(usage.rss / 1024 / 1024).toFixed(2)}MB`,
      heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
      external: `${(usage.external / 1024 / 1024).toFixed(2)}MB`
    },
    requests: requestCount
  });
});

// Prediction endpoint - accepts image URL (protected)
app.post('/predict', authenticate, async (req, res) => {
  try {
    requestCount++;
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl is required' });
    }

    console.log(`[INFO] Processing image: ${imageUrl}`);

    // Download image
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
      maxContentLength: 10 * 1024 * 1024 // 10MB limit
    });

    const imageBuffer = Buffer.from(response.data);

    // Run prediction
    const prediction = await predictImage(imageBuffer);

    console.log(`[INFO] Prediction result:`, prediction);

    // Periodic cleanup
    if (requestCount % MEMORY_CLEANUP_THRESHOLD === 0) {
      cleanupMemory();
    }

    res.json(prediction);
  } catch (error) {
    console.error('[ERROR] Prediction failed:', error.message);
    res.status(500).json({
      error: 'Prediction failed',
      details: error.message
    });
  }
});

// Prediction endpoint - accepts base64 image data
app.post('/predict-base64', async (req, res) => {
  try {
    const { imageData } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: 'imageData is required' });
    }

    // Remove data URL prefix if present
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Run prediction
    const prediction = await predictImage(imageBuffer);

    console.log(`[INFO] Prediction result:`, prediction);

    res.json(prediction);
  } catch (error) {
    console.error('[ERROR] Prediction failed:', error.message);
    res.status(500).json({
      error: 'Prediction failed',
      details: error.message
    });
  }
});

// Graceful shutdown handler
function gracefulShutdown(signal) {
  console.log(`\n[SHUTDOWN] Received ${signal}, shutting down gracefully...`);
  logMemoryUsage();
  console.log(`[SHUTDOWN] Total requests processed: ${requestCount}`);
  process.exit(0);
}

// Crash handler
process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught Exception:', error);
  logMemoryUsage();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
  logMemoryUsage();
  process.exit(1);
});

// Graceful shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server after loading model
async function start() {
  try {
    console.log('[INFO] Loading TensorFlow.js model...');
    await loadModel();
    console.log('[INFO] Model loaded successfully');

    // Log initial memory
    logMemoryUsage();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[INFO] ML Background Classifier service listening on port ${PORT}`);
      console.log(`[INFO] Health check: http://localhost:${PORT}/health`);
      console.log(`[INFO] Predict endpoint: POST http://localhost:${PORT}/predict`);
      console.log(`[INFO] Memory monitoring enabled (logging every ${MEMORY_LOG_INTERVAL / 1000}s)`);
      if (global.gc) {
        console.log(`[INFO] Manual GC enabled (running every ${GC_INTERVAL / 1000}s)`);
      } else {
        console.log(`[WARN] Manual GC not available. Start with --expose-gc flag for better memory management`);
      }
    });
  } catch (error) {
    console.error('[ERROR] Failed to start service:', error);
    process.exit(1);
  }
}

start();
