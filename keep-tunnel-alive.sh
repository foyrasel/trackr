#!/bin/bash
while true; do
  echo "Starting Cloudflare tunnel..."
  /tmp/cloudflared tunnel --url http://127.0.0.1:3000 2>&1
  echo "Tunnel died. Restarting in 5 seconds..."
  sleep 5
done
