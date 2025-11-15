#!/bin/bash

# ML Background Classifier Server Manager with Auto-Restart
# Usage: ./start-server.sh [API_TOKEN]

# Configuration
PORT=3005
MAX_RESTARTS=10
RESTART_DELAY=5
LOG_FILE="server.log"

# Use provided API token or prompt for it
if [ -z "$1" ]; then
  # Check if API_TOKEN is already in environment
  if [ -z "$API_TOKEN" ]; then
    echo "Error: API_TOKEN required"
    echo "Usage: ./start-server.sh <API_TOKEN>"
    echo "   or: API_TOKEN=your_token ./start-server.sh"
    exit 1
  fi
else
  export API_TOKEN="$1"
fi

export PORT=$PORT

echo "=================================="
echo "ML Background Classifier Manager"
echo "=================================="
echo "Port: $PORT"
echo "API Token: ${API_TOKEN:0:10}..."
echo "Log file: $LOG_FILE"
echo "Max restarts: $MAX_RESTARTS"
echo "=================================="

# Function to cleanup on exit
cleanup() {
  echo ""
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Shutting down server..."
  if [ ! -z "$SERVER_PID" ]; then
    kill $SERVER_PID 2>/dev/null
  fi
  exit 0
}

trap cleanup SIGINT SIGTERM

# Restart counter
restart_count=0

while true; do
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting server (attempt $((restart_count + 1)))..." | tee -a "$LOG_FILE"

  # Start the server
  node server.js >> "$LOG_FILE" 2>&1 &
  SERVER_PID=$!

  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Server started with PID: $SERVER_PID" | tee -a "$LOG_FILE"

  # Wait for the process to finish
  wait $SERVER_PID
  EXIT_CODE=$?

  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Server stopped with exit code: $EXIT_CODE" | tee -a "$LOG_FILE"

  # Increment restart counter
  restart_count=$((restart_count + 1))

  # Check if we've exceeded max restarts
  if [ $restart_count -ge $MAX_RESTARTS ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Max restart limit ($MAX_RESTARTS) reached. Exiting." | tee -a "$LOG_FILE"
    exit 1
  fi

  # Wait before restarting
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restarting in ${RESTART_DELAY} seconds..." | tee -a "$LOG_FILE"
  sleep $RESTART_DELAY
done
