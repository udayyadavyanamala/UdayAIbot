// app.js — Main application controller

const App = (() => {
  let activeThreadId = null;
  let selectedFileForUpload = null; // Stores the file object and its content
  let isStreaming = false;

  function init() {
    UI.init();
    Settings.init();
    setupEventListeners();
    loadActiveThread();
    lucide.createIcons();
  }

  function setupEventListeners() {
    // Send message
    UI.els.sendBtn.addEventListener('click', handleSend);
    UI.els.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });

    // File upload
    UI.els.uploadBtn.addEventListener('click', () => UI.els.fileInput.click());
    UI.els.fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        UI.els.fileNameDisplay.textContent = file.name;
        UI.els.fileUploadPreview.style.display = 'flex';
        UI.els.sendBtn.disabled = false; // Enable send button if a file is selected

        // Read file content
        selectedFileForUpload = await readFileContent(file);
      } else {
        selectedFileForUpload = null;
        UI.els.fileNameDisplay.textContent = '';
        UI.els.fileUploadPreview.style.display = 'none';
        UI.els.sendBtn.disabled = !UI.els.messageInput.value.trim(); // Re-evaluate send button state
      }
      lucide.createIcons({ nodes: [UI.els.fileUploadPreview] });
    });
    UI.els.clearFileBtn.addEventListener('click', () => { selectedFileForUpload = null; UI.els.fileInput.value = ''; UI.els.fileUploadPreview.style.display = 'none'; });

    // New chat
    UI.els.newChatBtn.addEventListener('click', createNewChat);

    // Search
    UI.els.searchInput.addEventListener('input', (e) => {
      const threads = Storage.searchThreads(e.target.value);
      UI.renderChatList(threads, activeThreadId, switchThread, deleteThread);
    });

    // Export
    UI.els.exportBtn.addEventListener('click', exportCurrentChat);

    // Welcome chips
    document.querySelectorAll('.chip[data-prompt]').forEach(chip => {
      chip.addEventListener('click', () => {
        UI.els.messageInput.value = chip.dataset.prompt;
        UI.els.messageInput.dispatchEvent(new Event('input'));
        handleSend();
      });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        createNewChat();
      }
    });
  }

  function loadActiveThread() {
    const threads = Storage.getThreads();
    activeThreadId = Storage.getActiveThreadId();

    if (activeThreadId) {
      const thread = Storage.getThread(activeThreadId);
      if (thread) {
        renderThread(thread);
      } else {
        // Thread not found, reset
        activeThreadId = null;
        Storage.setActiveThreadId(null);
      }
    }

    if (!activeThreadId) {
      UI.showWelcome();
      UI.setTitle('New Chat');
    }

    UI.renderChatList(threads, activeThreadId, switchThread, deleteThread);
  }

  function renderThread(thread) {
    UI.clearMessages();
    if (thread.messages.length === 0) {
      UI.showWelcome();
    } else {
      UI.hideWelcome(); // Ensure welcome is hidden even if messages are empty but thread exists
      thread.messages.forEach(m => {
        UI.appendMessage(m.role, m.content, m.time, m.file); // Pass file data
      });
    }
    UI.setTitle(thread.title);
    UI.scrollToBottom();
  }

  function switchThread(threadId) {
    if (threadId === activeThreadId) return;
    activeThreadId = threadId;
    Storage.setActiveThreadId(threadId);
    const thread = Storage.getThread(threadId);
    if (thread) renderThread(thread);
    UI.renderChatList(Storage.getThreads(), activeThreadId, switchThread, deleteThread);
    UI.closeSidebar();
  }

  function createNewChat() {
    const thread = Storage.createThread();
    activeThreadId = thread.id;
    UI.clearMessages();
    UI.showWelcome();
    UI.setTitle('New Chat');
    UI.renderChatList(Storage.getThreads(), activeThreadId, switchThread, deleteThread);
    UI.els.messageInput.focus();
    UI.closeSidebar();
  }

  function deleteThread(threadId) {
    if (!confirm('Delete this conversation?')) return;
    const threads = Storage.deleteThread(threadId);
    if (threadId === activeThreadId) {
      if (threads.length > 0) {
        switchThread(threads[0].id);
      } else {
        activeThreadId = null;
        UI.clearMessages();
        UI.showWelcome();
        UI.setTitle('New Chat'); // Reset title
      }
    }
    UI.renderChatList(Storage.getThreads(), activeThreadId, switchThread, deleteThread);
    UI.showToast('Conversation deleted');
  }

  async function handleSend() {
    const originalUserInput = UI.els.messageInput.value.trim();
    if (!originalUserInput && !selectedFileForUpload || isStreaming) return; // Allow sending only file

    // Create thread if needed
    if (!activeThreadId) {
      const thread = Storage.createThread();
      activeThreadId = thread.id;
    }

    let fileDataForStorage = null;
    if (selectedFileForUpload) {
      fileDataForStorage = {
        name: selectedFileForUpload.file.name,
        type: selectedFileForUpload.file.type,
        data: selectedFileForUpload.data
      };
    }

    const userMsgForStorage = {
      role: 'user',
      content: originalUserInput,
      time: Date.now(),
      file: fileDataForStorage
    };

    Storage.addMessage(activeThreadId, userMsgForStorage);
    UI.appendMessage('user', originalUserInput, Date.now(), fileDataForStorage);
    UI.resetInput();
    selectedFileForUpload = null;

    UI.renderChatList(Storage.getThreads(), activeThreadId, switchThread, deleteThread);
    UI.setTitle(Storage.getThread(activeThreadId)?.title || 'Chat');

    isStreaming = true;
    UI.setInputEnabled(false);
    UI.showTyping();

    const thread = Storage.getThread(activeThreadId);
    const messagesForApi = thread.messages.map(m => {
      if (m.role === 'user' && m.file) {
        if (m.file.type.startsWith('image/') && m.file.data) {
          return {
            role: 'user',
            content: [
              { type: 'text', text: m.content || 'Analyze this image' },
              { type: 'image_url', image_url: { url: m.file.data } }
            ]
          };
        } else if (m.file.data) {
          const textContent = `${m.content}\n\n[File: ${m.file.name}]\n\`\`\`\n${m.file.data}\n\`\`\``;
          return { role: 'user', content: textContent };
        }
      }
      return { role: m.role, content: m.content };
    });

    const streamingMsg = UI.createStreamingMessage();
    UI.hideTyping();

    Api.sendMessage(
      messagesForApi, // Pass the constructed messages array to the API
      Settings.getModel(),
      Settings.getSystemPrompt(),
      // onChunk
      (delta, fullText) => {
        UI.updateStreamingMessage(streamingMsg, fullText);
      },
      // onDone
      (fullText) => {
        UI.finalizeStreamingMessage(streamingMsg, fullText);
        Storage.addMessage(activeThreadId, { role: 'assistant', content: fullText, time: Date.now() });
        isStreaming = false;
        UI.setInputEnabled(true); // Re-enable input after stream finishes
        // Play sound
        if (Settings.isSoundEnabled()) playNotification();
      },
      // onError
      (error) => {
        UI.finalizeStreamingMessage(streamingMsg, `⚠️ Error: ${error}`);
        Storage.addMessage(activeThreadId, { role: 'assistant', content: `⚠️ Error: ${error}`, time: Date.now() }); // Store error message
        isStreaming = false;
        UI.setInputEnabled(true);
        UI.showToast(error, 'error');
      }
    );
  }

  function exportCurrentChat() {
    if (!activeThreadId) {
      UI.showToast('No conversation to export', 'error');
      return;
    }
    const md = Storage.exportThread(activeThreadId);
    if (!md) return;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const thread = Storage.getThread(activeThreadId);
    a.download = `${(thread?.title || 'chat').replace(/[^a-z0-9]/gi, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    UI.showToast('Chat exported as Markdown');
  }

  function playNotification() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.setValueAtTime(880, ctx.currentTime);
      o.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      g.gain.setValueAtTime(0.1, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      o.start(ctx.currentTime);
      o.stop(ctx.currentTime + 0.3);
    } catch { }
  }

  async function readFileContent(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        let content = e.target.result;
        resolve({ file: file, data: content });
      };

      // Read as DataURL (base64) for images, as plain text for text-like files
      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('text/') || file.type === 'application/json' || file.name.endsWith('.md') || file.name.endsWith('.js') || file.name.endsWith('.py') || file.name.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        // For other file types, we might not want to send the full content
        // or we might need a different encoding. For now, just send metadata.
        // The UI will show the file name, but LLM won't get content.
        resolve({ file: file, data: null });
      }
    });
  }

  // Boot
  document.addEventListener('DOMContentLoaded', init);

  return { init };
})();
