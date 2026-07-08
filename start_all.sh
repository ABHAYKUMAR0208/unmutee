#!/bin/bash
source /unmute/.env
tmux kill-session -t unmute 2>/dev/null || true
tmux new-session -d -s unmute -x 220 -y 50
tmux rename-window -t unmute:0 LLM
tmux send-keys -t unmute:0 "cd /unmute && source .env && export HUGGING_FACE_HUB_TOKEN && export HF_TOKEN=$HUGGING_FACE_HUB_TOKEN && pip install transformers==4.51.3 tokenizers==0.21.0 -q && vllm serve google/gemma-3-1b-it --host 0.0.0.0 --port 8091 --max-model-len 8192 --dtype bfloat16 --gpu-memory-utilization 0.5" ENTER
echo "LLM starting... waiting 90 seconds"
sleep 90
tmux new-window -t unmute -n STT
tmux send-keys -t unmute:1 "cd /unmute && source .env && export HUGGING_FACE_HUB_TOKEN && source $HOME/.cargo/env && cd dockerless && source .venv/bin/activate && cd .. && moshi-server worker --config services/moshi-server/configs/stt.toml --port 8090" ENTER
sleep 20
tmux new-window -t unmute -n TTS
tmux send-keys -t unmute:2 "export LD_LIBRARY_PATH=/usr/lib/python3.11:/usr/local/lib/python3.11/dist-packages && export PYTHONPATH=/usr/local/lib/python3.11/dist-packages && cd /unmute && source .env && export HUGGING_FACE_HUB_TOKEN && source $HOME/.cargo/env && moshi-server worker --config services/moshi-server/configs/tts.toml --port 8089" ENTER
sleep 20
tmux new-window -t unmute -n Backend
tmux send-keys -t unmute:3 "cd /unmute && ./run_backend.sh" ENTER
sleep 10
tmux new-window -t unmute -n Frontend
tmux send-keys -t unmute:4 "cd /unmute/frontend && PORT=3000 HOSTNAME=0.0.0.0 node .next/standalone/server.js" ENTER
echo "All services started! Open: https://${POD_ID}-3000.proxy.runpod.net"
