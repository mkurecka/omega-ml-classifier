FROM node:18

# Install required system dependencies for TensorFlow.js Node
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Rebuild native modules for the container architecture
RUN npm rebuild @tensorflow/tfjs-node --build-from-source

# Copy application code
COPY server.js predict.js ./

# Model files will be mounted as a volume from host
# See docker-compose.yml: volumes: - ./teachable:/app/model

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Start service
CMD ["node", "server.js"]
