// api.js — OpenRouter API client with SSE streaming

const Api = (() => {
  let abortController = null;

  async function fetchModels() {
    try {
      const res = await fetch('/api/models');
      if (!res.ok) return [];
      const text = await res.text();
      let data = { models: [] };
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Invalid JSON from /api/models');
      }
      return data.models || [];
    } catch (err) {
      console.error('Failed to fetch models:', err);
      return [];
    }
  }

  async function sendMessage(messages, model, systemPrompt, onChunk, onDone, onError) {
    // Abort any existing request
    if (abortController) abortController.abort();
    abortController = new AbortController();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, model, systemPrompt }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        let msg = `Error ${res.status}`;
        try {
          const err = JSON.parse(text);
          msg = err.error || msg;
        } catch {
          if (text.includes('<!DOCTYPE')) msg = "The server returned an HTML error. This usually happens if the file is too large (413) or the server crashed (500).";
          else if (text) msg = text;
        }
        onError(msg);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') {
            onDone(fullText);
            return;
          }

          try {
            const parsed = JSON.parse(data);

            // Check for error in stream
            if (parsed.error) {
              onError(typeof parsed.error === 'string' ? parsed.error : parsed.error.message || 'Stream error');
              return;
            }

            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              onChunk(delta, fullText);
            }
          } catch {
            // skip malformed JSON
          }
        }
      }

      // If we exit the loop without [DONE]
      if (fullText) onDone(fullText);

    } catch (err) {
      if (err.name === 'AbortError') return;
      onError(err.message || 'Network error');
    }
  }

  function abort() {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  }

  return { fetchModels, sendMessage, abort };
})();
