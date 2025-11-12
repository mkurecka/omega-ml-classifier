const tf = require('@tensorflow/tfjs-node');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

let model = null;
let metadata = null;
const MODEL_PATH = process.env.MODEL_PATH || './model';

/**
 * Load the Teachable Machine model
 */
async function loadModel() {
  const modelJsonPath = path.join(MODEL_PATH, 'model.json');
  const metadataJsonPath = path.join(MODEL_PATH, 'metadata.json');

  // Load model using TensorFlow.js node backend
  model = await tf.loadLayersModel(`file://${modelJsonPath}`);

  // Load metadata to get class labels
  const metadataContent = await fs.readFile(metadataJsonPath, 'utf-8');
  metadata = JSON.parse(metadataContent);

  console.log('[INFO] Model loaded from:', MODEL_PATH);
  console.log('[INFO] Classes:', metadata.labels);
}

/**
 * Predict if background should be removed from an image
 *
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {Promise<Object>} Prediction result
 */
async function predictImage(imageBuffer) {
  if (!model || !metadata) {
    throw new Error('Model not loaded');
  }

  // Resize image to 224x224 using sharp (same as training)
  const resizedBuffer = await sharp(imageBuffer)
    .resize(224, 224, { fit: 'fill' })
    .toBuffer();

  // Convert to tensor and normalize to [0, 1]
  let tensor = tf.node.decodeImage(resizedBuffer, 3);
  tensor = tf.expandDims(tensor, 0);
  tensor = tf.cast(tensor, 'float32');
  tensor = tf.div(tensor, 255.0);

  // Run prediction
  const prediction = model.predict(tensor);
  const probabilities = await prediction.data();

  // Clean up tensors
  tensor.dispose();
  prediction.dispose();

  // Map probabilities to class labels
  const classResults = metadata.labels.map((label, index) => ({
    className: label,
    probability: probabilities[index]
  }));

  // Extract class probabilities
  const remove = classResults.find(p => p.className === 'Odstranit pozadí');
  const keep = classResults.find(p => p.className === 'Ponechat pozadí');

  if (!remove || !keep) {
    throw new Error('Unexpected prediction output - classes not found');
  }

  // Apply weighted scoring (same as example.php)
  // Boost "Remove background" to make it dominant from ~0.6+
  const weightedRemove = remove.probability * 1.5;
  const shouldRemove = weightedRemove > keep.probability;

  return {
    shouldRemoveBackground: shouldRemove,
    confidence: Math.max(remove.probability, keep.probability),
    scores: {
      remove: remove.probability,
      keep: keep.probability,
      weightedRemove: weightedRemove
    },
    decision: shouldRemove ? 'Remove background' : 'Keep background'
  };
}

module.exports = {
  loadModel,
  predictImage
};
