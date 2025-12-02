const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) continue;
    const [key, ...rest] = line.split('=');
    if (!key) continue;
    const value = rest.join('=').trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const PORT = process.env.PORT || 3000;
const API_KEY = (process.env.OPENROUTER_API_KEY || '').trim();
const PUBLIC_DIR = path.join(__dirname, 'public');

function sendJson(res, status, data) {
  const payload = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function serveStatic(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    const contentType = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
    }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

async function handleChatRequest(req, res) {
  if (!API_KEY) {
    sendJson(res, 500, {
      error:
        'Configura OPENROUTER_API_KEY en las variables de entorno o en un archivo .env junto a server.js.',
    });
    return;
  }

  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > 1e7) {
      req.destroy();
    }
  });

  req.on('end', async () => {
    try {
      const parsed = JSON.parse(body || '{}');
      const { model, prompt, fileContent } = parsed;

      if (!model || !prompt) {
        sendJson(res, 400, { error: 'El modelo y el prompt son obligatorios.' });
        return;
      }

      const combinedUserContent = `${prompt}\n\nContenido del archivo adjunto (si aplica):\n${fileContent || 'Sin archivo adjunto.'}`;

      const payload = {
        model,
        messages: [
          {
            role: 'system',
            content:
              'Eres un analista de licitaciones de software. Dado un pliego o solicitud, extrae requerimientos funcionales, requerimientos no funcionales y ambigüedades. Responde en español con listas claras.',
          },
          { role: 'user', content: combinedUserContent },
        ],
      };

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
          'HTTP-Referer': 'http://localhost',
          'X-Title': 'Analizador de licitaciones',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        sendJson(res, response.status, { error: `Error de OpenRouter: ${errorText}` });
        return;
      }

      const data = await response.json();
      const assistantMessage = data?.choices?.[0]?.message?.content || 'Sin respuesta del modelo.';

      sendJson(res, 200, { reply: assistantMessage });
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'POST' && url.pathname === '/api/chat') {
    handleChatRequest(req, res);
    return;
  }

  const requestedPath = url.pathname === '/' ? '/index.html' : url.pathname;
  const resolvedPath = path.normalize(path.join(PUBLIC_DIR, requestedPath));

  if (!resolvedPath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Acceso denegado');
    return;
  }

  serveStatic(res, resolvedPath);
});

server.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});
