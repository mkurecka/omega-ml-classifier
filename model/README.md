# ML Model Files

This directory contains the Teachable Machine trained model files for background classification.

## Required Files

Place the following exported Teachable Machine files in this directory:

1. **model.json** - TensorFlow.js model architecture
2. **metadata.json** - Class labels and metadata
3. **weights.bin** - Model weights (binary file, ~2MB)

## Model Classes

The model should be trained with two classes:
- **Odstranit pozadí** (Remove background) - Products with plain/white backgrounds
- **Ponechat pozadí** (Keep background) - Products in natural settings

## Export from Teachable Machine

1. Go to https://teachablemachine.withgoogle.com/
2. Train your image classification model
3. Click "Export Model"
4. Select "TensorFlow.js" format
5. Download the model files
6. Copy `model.json`, `metadata.json`, and `weights.bin` to this directory

## Notes

- These files are excluded from git via `.gitignore`
- Total size: ~2.2 MB
- The model is loaded on service startup via Docker volume mount
