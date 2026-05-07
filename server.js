require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Custom Error Handler for JSON parsing and limits
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'The file is too large. Please upload an image smaller than 70MB.' });
  }
  next(err);
});

// Parse models from .env MODEL_1, MODEL_2, ... variables
// Format per line: MODEL_<n>=id|Display Name|Description
function parseModels() {
  const models = [];
  for (let i = 1; i <= 50; i++) {
    const raw = process.env[`MODEL_${i}`];
    if (!raw || !raw.includes('|')) continue;
    const [id, name, description] = raw.split('|');
    if (id && id.trim()) {
      models.push({ id: id.trim(), name: (name || id).trim(), description: (description || '').trim() });
    }
  }
  if (models.length === 0) {
    return [{ id: 'openrouter/free', name: '✨ Auto (Best Free)', description: 'Automatically picks the best free model' }];
  }
  return models;
}

const FREE_MODELS = parseModels();

// GET /api/models — return available free models
app.get('/api/models', (req, res) => {
  res.json({ models: FREE_MODELS });
});

// GET /health — health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// POST /api/chat — proxy to OpenRouter with SSE streaming
app.post('/api/chat', async (req, res) => {
  const { messages, model, systemPrompt } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === 'your-openrouter-api-key-here') {
    return res.status(500).json({ error: 'OpenRouter API key not configured' });
  }

  // Build messages array with optional system prompt
  const fullMessages = [];
  if (systemPrompt) {
    fullMessages.push({ role: 'system', content: systemPrompt });
  }
  fullMessages.push(...messages);

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.SITE_URL || 'https://udaysai.onrender.com',
        'X-OpenRouter-Title': "Uday's AI",
      },
      body: JSON.stringify({
        model: model || 'openrouter/free',
        messages: fullMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      res.write(`data: ${JSON.stringify({ error: `API Error: ${response.status} - ${errorData}` })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '' || trimmed === 'data: [DONE]') {
          if (trimmed === 'data: [DONE]') {
            res.write('data: [DONE]\n\n');
          }
          continue;
        }
        if (trimmed.startsWith('data: ')) {
          res.write(trimmed + '\n\n');
        }
      }
    }

    // Ensure we send DONE
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Stream error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// Fallback — serve index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Uday's AI server running on http://localhost:${PORT}`);
});
