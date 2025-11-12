const express = require('express');
const axios = require('axios');
const { predictImage, loadModel } = require('./predict');

const app = express();
const PORT = process.env.PORT || 3000;
const API_TOKEN = process.env.API_TOKEN;

if (!API_TOKEN) {
  console.error('[ERROR] API_TOKEN environment variable is required!');
  process.exit(1);
}

app.use(express.json({ limit: '10mb' }));

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
  res.json({ status: 'healthy', service: 'ml-background-classifier' });
});

// Prediction endpoint - accepts image URL (protected)
app.post('/predict', authenticate, async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl is required' });
    }

    console.log(`[INFO] Processing image: ${imageUrl}`);

    // Download image
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000
    });

    const imageBuffer = Buffer.from(response.data);

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

// Start server after loading model
async function start() {
  try {
    console.log('[INFO] Loading TensorFlow.js model...');
    await loadModel();
    console.log('[INFO] Model loaded successfully');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[INFO] ML Background Classifier service listening on port ${PORT}`);
      console.log(`[INFO] Health check: http://localhost:${PORT}/health`);
      console.log(`[INFO] Predict endpoint: POST http://localhost:${PORT}/predict`);
    });
  } catch (error) {
    console.error('[ERROR] Failed to start service:', error);
    process.exit(1);
  }
}

start();
