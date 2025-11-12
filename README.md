# ML Background Classifier Service

TensorFlow.js microservice for predicting whether product images should have their backgrounds removed.

## Overview

This service uses a Teachable Machine image classification model to automatically determine if a product image needs background removal. It runs as a standalone Node.js service and integrates with the main Omega PHP application.

## Features

- ✅ TensorFlow.js-based image classification
- ✅ REST API with health checks
- ✅ Bearer token authentication
- ✅ Supports both URL and base64 image inputs
- ✅ Docker containerized
- ✅ Automatic model loading on startup
- ✅ Weighted scoring for better accuracy

## API Endpoints

### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "ml-background-classifier"
}
```

### `POST /predict`
Predict from image URL. **Requires authentication.**

**Headers:**
```
Authorization: Bearer YOUR_API_TOKEN
Content-Type: application/json
```

**Request:**
```json
{
  "imageUrl": "https://example.com/image.jpg"
}
```

**Response:**
```json
{
  "shouldRemoveBackground": true,
  "confidence": 0.89,
  "scores": {
    "odstranit": 0.89,
    "ponechat": 0.11,
    "weightedOdstranit": 1.335
  },
  "decision": "Odstranit pozadí"
}
```

### `POST /predict-base64`
Predict from base64 image data.

**Request:**
```json
{
  "imageData": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA..."
}
```

**Response:** Same as `/predict`

## Local Development

### Prerequisites
- Node.js 18+
- npm

### Setup
```bash
npm install
```

### Configuration
Create a `.env` file or set environment variables:
```bash
API_TOKEN=your-secret-token-here
PORT=3000
MODEL_PATH=./model
```

### Run
```bash
# Set API token
export API_TOKEN="your-secret-token-here"

# Start service
npm start
```

Development mode with auto-reload:
```bash
npm run dev
```

### Test
```bash
# Health check (no auth required)
curl http://localhost:3000/health

# Prediction with authentication
curl -X POST http://localhost:3000/predict \
  -H "Authorization: Bearer your-secret-token-here" \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://example.com/product.jpg"}'
```

## Docker

### Build
```bash
docker build -t ml-background-classifier .
```

### Run
```bash
docker run -p 3000:3000 \
  -e API_TOKEN="your-secret-token-here" \
  ml-background-classifier
```

### Docker Compose
The service is integrated into the main `docker-compose.yml` file:
```bash
docker-compose up ml-classifier
```

## Model Information

- **Type**: Teachable Machine Image Classification
- **Input Size**: 224x224 pixels
- **Classes**:
  - "Odstranit pozadí" (Remove background)
  - "Ponechat pozadí" (Keep background)
- **Weighted Scoring**: 1.5x boost for "Odstranit pozadí"

## Environment Variables

- `API_TOKEN` - **Required**. Bearer token for API authentication
- `PORT` - Service port (default: 3000)
- `MODEL_PATH` - Path to model files (default: ./model)

## Integration with Omega

The service is called from PHP via HTTP with authentication:

```php
// app/Model/ML/BackgroundClassifierService.php
$response = $this->httpClient->post('http://ml-classifier:3000/predict', [
    'headers' => [
        'Authorization' => 'Bearer ' . $apiToken
    ],
    'json' => ['imageUrl' => $imageUrl]
]);
```

## Performance

- **Startup Time**: ~2-3 seconds (model loading)
- **Inference Time**: ~50-200ms per image
- **Memory Usage**: ~512MB
- **Throughput**: 10-100 requests/sec

## Troubleshooting

### API_TOKEN not set
- Ensure `API_TOKEN` environment variable is set before starting
- Service will exit with error if not configured

### Authentication errors (401/403)
- Verify correct Bearer token in Authorization header
- Token must match the `API_TOKEN` environment variable

### Model not loading
- Ensure `model/model.json`, `model/metadata.json`, and `model/weights.bin` exist
- Check file permissions
- Verify MODEL_PATH environment variable

### Out of memory errors
- Increase container memory limit
- Reduce concurrent requests

### Slow predictions
- Check image size (large images take longer to download)
- Verify network connectivity
- Consider adding Redis caching for repeated images
