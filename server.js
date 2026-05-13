const express = require('express');
const path = require('path');
const httpProxy = require('http-proxy');

const app = express();
const port = parseInt(process.env.PORT || '5000');
const distPath = path.join(__dirname, 'order-delight-main/dist');

// API proxy to backend
const apiProxy = httpProxy.createProxyServer({
  target: 'http://localhost:8000',
  changeOrigin: false,
  ws: false,
});

// Serve static files from dist
app.use(express.static(distPath, { 
  maxAge: '1d',
  etag: false 
}));

// Proxy all /api requests to backend
app.use('/api', (req, res, next) => apiProxy.web(req, res, next));
app.use('/health', (req, res, next) => apiProxy.web(req, res, next));

// Error handling for proxy
apiProxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err);
  res.status(502).json({ error: 'Backend service unavailable' });
});

// Fallback to index.html for SPA routes (catch-all after static files and proxies)
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`✓ Frontend server running on http://0.0.0.0:${port}`);
});
