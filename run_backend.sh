#!/bin/bash
set -ex
source .env

export KYUTAI_STT_URL=ws://localhost:8090
export KYUTAI_TTS_URL=ws://localhost:8089
export KYUTAI_LLM_URL=${KYUTAI_LLM_URL:-http://localhost:8091}
export KYUTAI_LLM_API_KEY=${KYUTAI_LLM_API_KEY:-}
export KYUTAI_LLM_MODEL=${KYUTAI_LLM_MODEL:-}
export HUGGING_FACE_HUB_TOKEN

# Pass your frontend URL so CORS accepts it
export CORS_EXTRA_ORIGINS="$FRONTEND_URL"

uv run uvicorn unmute.main_websocket:app \
  --host 0.0.0.0 \
  --port 8000 \
  --ws-per-message-deflate=false
