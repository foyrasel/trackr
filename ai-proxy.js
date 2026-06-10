import { createServer } from 'http';

const ZAI_CONFIG = {
  baseUrl: 'https://internal-api.z.ai/v1',
  apiKey: 'Z.ai',
  chatId: 'chat-bc95edbc-f046-472e-941f-3596e90019b1',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZWVlY2E5ZDUtNWY4Ny00YmYyLTlmNTQtNDNkOGM3ZmZhYTExIiwiY2hhdF9pZCI6ImNoYXQtYmM5NWVkYmMtZjA0Ni00NzJlLTk0MWYtMzU5NmU5MDAxOWIxIiwicGxhdGZvcm0iOiJ6YWkifQ.ArtAJkRtPlzgbFAbygVPSu75Vdq_fTrLEdLkU1Mf6ME',
  userId: 'eeeca9d5-5f87-4bf2-9f54-43d8c7ffaa11',
};

const PROXY_KEY = 'trackr-ai-proxy-2026';
const PORT = 3001;

const server = createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-proxy-key');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end('Method not allowed');
    return;
  }

  // Verify proxy key
  const proxyKey = req.headers['x-proxy-key'];
  if (proxyKey !== PROXY_KEY) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const parsed = JSON.parse(body);
      
      const response = await fetch(`${ZAI_CONFIG.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ZAI_CONFIG.apiKey}`,
          'X-Chat-Id': ZAI_CONFIG.chatId,
          'X-User-Id': ZAI_CONFIG.userId,
          'X-Token': ZAI_CONFIG.token,
          'X-Z-AI-From': 'Z',
        },
        body: JSON.stringify({
          ...parsed,
          thinking: parsed.thinking || { type: 'disabled' },
        }),
      });

      const result = await response.json();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`AI Proxy running on port ${PORT}`);
});
