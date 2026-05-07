// ui.js — DOM manipulation, animations, transitions

const UI = (() => {
  // DOM refs
  const $ = id => document.getElementById(id);
  const els = {};

  function init() {
    els.sidebar = $('sidebar');
    els.sidebarOverlay = $('sidebarOverlay');
    els.sidebarClose = $('sidebarClose');
    els.sidebarToggle = $('sidebarToggle');
    els.chatList = $('chatList');
    els.messages = $('messages');
    els.chatContainer = $('chatContainer');
    els.messageInput = $('messageInput');
    els.sendBtn = $('sendBtn');
    els.charCount = $('charCount');
    els.topbarTitle = $('topbarTitle');
    els.welcomeScreen = $('welcomeScreen');
    els.typingIndicator = $('typingIndicator');
    els.inputWrapper = $('inputWrapper');
    els.searchInput = $('searchInput');
    els.newChatBtn = $('newChatBtn');
    els.settingsBtn = $('settingsBtn');
    els.exportBtn = $('exportBtn');
    els.uploadBtn = $('uploadBtn');
    els.fileInput = $('fileInput');
    els.fileNameDisplay = $('fileNameDisplay');
    els.clearFileBtn = $('clearFileBtn');
    els.fileUploadPreview = $('fileUploadPreview');
    els.toastContainer = $('toastContainer');

    setupTextarea();
    setupFileInput();
    setupSidebar();
  }

  function setupTextarea() {
    const ta = els.messageInput;
    ta.addEventListener('input', () => {
      // Auto-resize
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
      // Char count
      els.charCount.textContent = ta.value.length;
      // Toggle send button
      const hasFile = els.fileInput && els.fileInput.files && els.fileInput.files[0];
      els.sendBtn.disabled = !ta.value.trim() && !hasFile;
    });
  }

  function setupFileInput() {
    els.fileInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        els.fileNameDisplay.textContent = file.name;
        els.fileUploadPreview.style.display = 'flex';
      } else {
        els.fileNameDisplay.textContent = '';
        els.fileUploadPreview.style.display = 'none';
      }
      // Ensure lucide icons are created for the new file icon
      lucide.createIcons({ nodes: [els.fileUploadPreview] });
    });
    els.clearFileBtn?.addEventListener('click', () => {
      els.fileInput.value = ''; // Clear the selected file
      els.fileNameDisplay.textContent = '';
      els.fileUploadPreview.style.display = 'none';
    });
  }

  function setupSidebar() {
    els.sidebarToggle.addEventListener('click', toggleSidebar);
    els.sidebarClose.addEventListener('click', closeSidebar);
    els.sidebarOverlay.addEventListener('click', closeSidebar);
  }

  function toggleSidebar() {
    els.sidebar.classList.toggle('open');
    els.sidebarOverlay.classList.toggle('open');
  }

  function closeSidebar() {
    els.sidebar.classList.remove('open');
    els.sidebarOverlay.classList.remove('open');
  }

  function setTitle(title) {
    els.topbarTitle.querySelector('h1').textContent = title;
  }

  function showWelcome() {
    els.welcomeScreen.style.display = '';
  }

  function hideWelcome() {
    els.welcomeScreen.style.display = 'none';
  }

  function clearMessages() {
    // Remove all messages but keep welcome
    const msgs = els.messages.querySelectorAll('.message');
    msgs.forEach(m => m.remove());
  }

  function appendMessage(role, content, time, file = null) {
    hideWelcome();
    const msg = document.createElement('div');
    msg.className = `message ${role}`;

    const timeStr = time ? new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const name = role === 'user' ? 'You' : "Uday's AI";
    const avatarHtml = role === 'user' ? '<div class="message-avatar"><span>U</span></div>' : '';

    let fileHtml = '';
    if (file && role === 'user') { // Only display file for user messages
      if (file.type.startsWith('image/') && file.data) {
        fileHtml = `<div class="message-file-preview"><img src="${file.data}" alt="${Markdown.escapeHtml(file.name)}" style="max-width: 200px; max-height: 200px; border-radius: 8px; margin-top: 10px;"></div>`;
      } else {
        fileHtml = `<div class="message-file-info">
                      <i data-lucide="file" style="width:16px;height:16px;vertical-align:middle;margin-right:5px;"></i>
                      <span>${Markdown.escapeHtml(file.name)} (${file.type})</span>
                      ${file.data ? `<a href="${file.data}" download="${Markdown.escapeHtml(file.name)}" class="download-file-btn" aria-label="Download file"><i data-lucide="download"></i></a>` : ''}
                    </div>`;
      }
    }


    msg.innerHTML = `
      ${avatarHtml}
      <div class="message-content">
        <div class="message-header">
          <span class="message-name">${name}</span>
          <span class="message-time">${timeStr}</span>
        </div>
        <div class="message-body">${role === 'user' ? Markdown.escapeHtml(content) : Markdown.render(content)}</div>
        ${fileHtml}
        ${role === 'assistant' ? `<div class="message-actions">
          <button class="msg-action-btn copy-msg-btn" onclick="UI.copyMessage(this)" aria-label="Copy message">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            Copy
          </button>
        </div>` : ''}
      </div>
    `;

    els.messages.appendChild(msg);
    // Re-init lucide icons in the new message
    if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [msg] });
    scrollToBottom();
    return msg;
  }

  function createStreamingMessage() {
    hideWelcome();
    const msg = document.createElement('div');
    msg.className = 'message assistant';
    msg.innerHTML = `
      <div class="message-content">
        <div class="message-header">
          <span class="message-name">Uday's AI</span>
          <span class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="message-body streaming-cursor"></div>
        <div class="message-actions" style="display:none">
          <button class="msg-action-btn copy-msg-btn" onclick="UI.copyMessage(this)" aria-label="Copy message">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            Copy
          </button>
        </div>
      </div>
    `;
    els.messages.appendChild(msg);
    if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [msg] });
    return msg;
  }

  function updateStreamingMessage(msgEl, fullText) {
    const body = msgEl.querySelector('.message-body');
    body.innerHTML = Markdown.render(fullText);
    body.classList.add('streaming-cursor');
    scrollToBottom();
  }

  function finalizeStreamingMessage(msgEl, fullText) {
    const body = msgEl.querySelector('.message-body');
    body.innerHTML = Markdown.render(fullText);
    body.classList.remove('streaming-cursor');
    const actions = msgEl.querySelector('.message-actions');
    if (actions) actions.style.display = '';
    scrollToBottom();
  }

  function showTyping() {
    els.typingIndicator.style.display = 'flex';
    if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [els.typingIndicator] });
    scrollToBottom();
  }

  function hideTyping() {
    els.typingIndicator.style.display = 'none';
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      els.chatContainer.scrollTop = els.chatContainer.scrollHeight;
    });
  }

  function renderChatList(threads, activeId, onSelect, onDelete) {
    els.chatList.innerHTML = '';
    if (threads.length === 0) {
      els.chatList.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-3);font-size:.82rem">No conversations yet</div>';
      return;
    }
    threads.forEach(t => {
      const item = document.createElement('div');
      item.className = `chat-item${t.id === activeId ? ' active' : ''}`;
      item.innerHTML = `
        <div class="chat-item-icon"><i data-lucide="message-square"></i></div>
        <span class="chat-item-text">${Markdown.escapeHtml(t.title)}</span>
        <button class="chat-item-delete" aria-label="Delete chat"><i data-lucide="trash-2"></i></button>
      `;
      item.addEventListener('click', (e) => {
        if (e.target.closest('.chat-item-delete')) {
          e.stopPropagation();
          onDelete(t.id);
          return;
        }
        onSelect(t.id);
      });
      els.chatList.appendChild(item);
    });
    if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [els.chatList] });
  }

  function copyMessage(btn) {
    const body = btn.closest('.message-content').querySelector('.message-body');
    const text = body.textContent || body.innerText;
    navigator.clipboard.writeText(text).then(() => {
      const orig = btn.innerHTML;
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
      setTimeout(() => { btn.innerHTML = orig; }, 2000);
    });
  }

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success'
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>';
    toast.innerHTML = icon + Markdown.escapeHtml(message);
    els.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(30px)';
      toast.style.transition = '0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function resetInput() {
    els.messageInput.value = '';
    els.messageInput.style.height = 'auto';
    els.charCount.textContent = '0';
    els.sendBtn.disabled = true;
    if (els.fileInput) els.fileInput.value = '';
    if (els.fileNameDisplay) els.fileNameDisplay.textContent = '';
    if (els.fileUploadPreview) els.fileUploadPreview.style.display = 'none';
  }

  function setInputEnabled(enabled) {
    els.messageInput.disabled = !enabled;
    const hasFile = els.fileInput && els.fileInput.files && els.fileInput.files[0];
    els.sendBtn.disabled = !enabled || (!els.messageInput.value.trim() && !hasFile);
    if (enabled) els.messageInput.focus();
  }

  return {
    init, setTitle, showWelcome, hideWelcome, clearMessages, appendMessage,
    createStreamingMessage, updateStreamingMessage, finalizeStreamingMessage,
    showTyping, hideTyping, scrollToBottom, renderChatList, copyMessage,
    showToast, resetInput, setInputEnabled, closeSidebar, els
  };
})();
