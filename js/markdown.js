// markdown.js — Markdown rendering + code highlighting

const Markdown = (() => {
  // Configure marked
  marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: false,
    mangle: false,
  });

  // Custom renderer for code blocks
  const renderer = new marked.Renderer();

  renderer.code = function (code, language) {
    // Handle the case where code is an object (marked v12+)
    if (typeof code === 'object') {
      language = code.lang;
      code = code.text;
    }
    const lang = language || 'plaintext';
    let highlighted;
    try {
      if (hljs.getLanguage(lang)) {
        highlighted = hljs.highlight(code, { language: lang }).value;
      } else {
        highlighted = hljs.highlightAuto(code).value;
      }
    } catch {
      highlighted = escapeHtml(code);
    }

    return `<div class="code-block">
      <div class="code-header">
        <span class="code-lang">${lang}</span>
        <button class="copy-btn" onclick="Markdown.copyCode(this)" aria-label="Copy code">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          <span>Copy</span>
        </button>
      </div>
      <pre><code class="hljs language-${lang}">${highlighted}</code></pre>
    </div>`;
  };

  // Make links open in new tab
  renderer.link = function (href, title, text) {
    if (typeof href === 'object') {
      text = href.text;
      title = href.title;
      href = href.href;
    }
    const titleAttr = title ? ` title="${title}"` : '';
    return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
  };

  marked.use({ renderer });

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function render(text) {
    if (!text) return '';
    try {
      return marked.parse(text);
    } catch {
      return `<p>${escapeHtml(text)}</p>`;
    }
  }

  function copyCode(btn) {
    const codeBlock = btn.closest('.code-block');
    const code = codeBlock.querySelector('code').textContent;
    navigator.clipboard.writeText(code).then(() => {
      const span = btn.querySelector('span');
      const origText = span.textContent;
      span.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        span.textContent = origText;
        btn.classList.remove('copied');
      }, 2000);
    });
  }

  return { render, copyCode, escapeHtml };
})();
