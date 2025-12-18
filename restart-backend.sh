#!/bin/bash
set -e # stop on errors

echo "Attempting to stop the backend..."

# Find and kill the uvicorn and python processes running main.py
# pkill will exit with 0 if a process was killed, 1 otherwise.
pkill -f "uvicorn main:app" || true
pkill -f "python.*main.py" || true
# Optionally, kill any process using port 8000 (uncomment if needed)
# fuser -k 8000/tcp || true

echo "Restarting backend..."
cd backend

# Activate virtual environment if it exists
if [ -f "./venv/bin/activate" ]; then
    source ./venv/bin/activate
fi

# Start the backend in the background
python main.py & BACKEND_PID=$!

echo "Backend restarted successfully."
