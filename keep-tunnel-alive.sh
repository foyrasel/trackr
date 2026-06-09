#!/bin/bash
# Kill existing tunnels
kill $(ps aux | grep cloudflared | grep -v grep | awk '{print $2}') 2>/dev/null
kill $(ps aux | grep "node.*tunnel" | grep -v grep | awk '{print $2}') 2>/dev/null
sleep 2

# Restart cloudflared with auto-restart
while true; do
  echo "Starting Cloudflare tunnel at $(date)..."
  /tmp/cloudflared tunnel --url http://127.0.0.1:3000 --protocol http2 2>&1
  echo "Tunnel died at $(date). Restarting in 3 seconds..."
  sleep 3
done
