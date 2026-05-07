// storage.js — localStorage management for chat threads

const Storage = (() => {
  const THREADS_KEY = 'udaysai_threads';
  const ACTIVE_KEY = 'udaysai_active';
  const SETTINGS_KEY = 'udaysai_settings';

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function getThreads() {
    try {
      return JSON.parse(localStorage.getItem(THREADS_KEY)) || [];
    } catch { return []; }
  }

  function saveThreads(threads) {
    localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
  }

  function createThread() {
    const thread = {
      id: generateId(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const threads = getThreads();
    threads.unshift(thread);
    saveThreads(threads);
    setActiveThreadId(thread.id);
    return thread;
  }

  function getThread(id) {
    return getThreads().find(t => t.id === id) || null;
  }

  function updateThread(id, updates) {
    const threads = getThreads();
    const idx = threads.findIndex(t => t.id === id);
    if (idx === -1) return null;
    threads[idx] = { ...threads[idx], ...updates, updatedAt: Date.now() };
    saveThreads(threads);
    return threads[idx];
  }

  function addMessage(threadId, message) {
    const threads = getThreads();
    const idx = threads.findIndex(t => t.id === threadId);
    if (idx === -1) return; // Thread not found
    threads[idx].messages.push(message);
    threads[idx].updatedAt = Date.now();
    // Auto-title from first user message
    if (threads[idx].title === 'New Chat' && message.role === 'user') {
      threads[idx].title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '');
    }
    saveThreads(threads);
  }

  function deleteThread(id) {
    const threads = getThreads().filter(t => t.id !== id);
    saveThreads(threads);
    if (getActiveThreadId() === id) {
      setActiveThreadId(threads.length > 0 ? threads[0].id : null);
    }
    return threads;
  }

  function clearAll() {
    localStorage.removeItem(THREADS_KEY);
    localStorage.removeItem(ACTIVE_KEY);
  }

  function getActiveThreadId() {
    return localStorage.getItem(ACTIVE_KEY);
  }

  function setActiveThreadId(id) {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  }

  function getSettings() {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
    } catch { return {}; }
  }

  function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function searchThreads(query) {
    if (!query) return getThreads();
    const q = query.toLowerCase();
    return getThreads().filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.messages.some(m => m.content.toLowerCase().includes(q))
    );
  }

  function exportThread(id) {
    const thread = getThread(id);
    if (!thread) return null;
    let md = `# ${thread.title}\n\n`;
    md += `*Exported from Uday's AI on ${new Date().toLocaleDateString()}*\n\n---\n\n`;
    thread.messages.forEach((m, index) => {
      // If the message has a file, include its details before the content
      if (m.file && m.role === 'user') { // Only user messages can have files
        md += `**File: ${m.file.name}** (Type: ${m.file.type})\n\n`;
        if (m.file.type.startsWith('image/') && m.file.data) {
          md += `!${m.file.name}\n\n`; // Include base64 image
        } else if (m.file.type.startsWith('text/') || m.file.type === 'application/json' || m.file.name.endsWith('.md') || m.file.name.endsWith('.js') || m.file.name.endsWith('.py') || m.file.name.endsWith('.csv')) {
          md += '```\n' + m.file.data + '\n```\n\n';
        } else if (m.file.data) {
          md += `[File content (base64) for type: ${m.file.type}]\n\`\`\`\n${m.file.data}\n\`\`\`\n\n`;
        } else {
          md += `[File content not included in export for type: ${m.file.type}]\n\n`;
        }
      }
      const label = m.role === 'user' ? '**You**' : "**Uday's AI**";
      md += `### ${label}\n\n${m.content}\n\n---\n\n`;
    });
    return md;
  }

  return {
    generateId, getThreads, createThread, getThread, updateThread,
    addMessage, deleteThread, clearAll, getActiveThreadId, setActiveThreadId,
    getSettings, saveSettings, searchThreads, exportThread
  };
})();
