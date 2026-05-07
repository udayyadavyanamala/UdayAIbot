// settings.js — Theme, model selection, accent color, preferences

const Settings = (() => {
  let models = [];

  function init() {
    loadSettings();
    setupTheme();
    setupAccentColor();
    setupModal();
    setupSound();
    setupDangerZone();
    loadModels();
  }

  function loadSettings() {
    const s = Storage.getSettings();
    // Theme
    const theme = s.theme || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    // Accent color
    const color = s.accentColor || 'indigo';
    document.documentElement.setAttribute('data-color', color);
    // System prompt
    if (s.systemPrompt) {
      document.getElementById('systemPrompt').value = s.systemPrompt;
    }
    // Sound
    if (s.sound) {
      document.getElementById('soundToggle').checked = s.sound;
    }
  }

  function setupTheme() {
    const toggle = document.getElementById('themeToggle');
    const darkBtn = document.getElementById('themeDarkBtn');
    const lightBtn = document.getElementById('themeLightBtn');
    const darkIcon = document.getElementById('themeIconDark');
    const lightIcon = document.getElementById('themeIconLight');

    function setTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      const s = Storage.getSettings();
      s.theme = theme;
      Storage.saveSettings(s);

      if (theme === 'dark') {
        darkIcon.style.display = '';
        lightIcon.style.display = 'none';
        darkBtn.classList.add('active');
        lightBtn.classList.remove('active');
      } else {
        darkIcon.style.display = 'none';
        lightIcon.style.display = '';
        lightBtn.classList.add('active');
        darkBtn.classList.remove('active');
      }
      lucide.createIcons();
    }

    toggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      setTheme(current === 'dark' ? 'light' : 'dark');
    });

    darkBtn.addEventListener('click', () => setTheme('dark'));
    lightBtn.addEventListener('click', () => setTheme('light'));

    // Init correct icon state
    const current = document.documentElement.getAttribute('data-theme');
    setTheme(current);
  }

  function setupAccentColor() {
    const swatches = document.querySelectorAll('.color-swatch');
    swatches.forEach(swatch => {
      swatch.addEventListener('click', () => {
        swatches.forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        const color = swatch.dataset.color;
        document.documentElement.setAttribute('data-color', color);
        const s = Storage.getSettings();
        s.accentColor = color;
        Storage.saveSettings(s);
      });
    });

    // Set active from settings
    const s = Storage.getSettings();
    const activeColor = s.accentColor || 'indigo';
    swatches.forEach(sw => {
      sw.classList.toggle('active', sw.dataset.color === activeColor);
    });
  }

  function setupModal() {
    const modal = document.getElementById('settingsModal');
    const openBtn = document.getElementById('settingsBtn');
    const closeBtn = document.getElementById('settingsClose');

    openBtn.addEventListener('click', () => modal.classList.add('active'));
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });

    // Save system prompt on change
    document.getElementById('systemPrompt').addEventListener('change', (e) => {
      const s = Storage.getSettings();
      s.systemPrompt = e.target.value;
      Storage.saveSettings(s);
    });
  }

  function setupSound() {
    document.getElementById('soundToggle').addEventListener('change', (e) => {
      const s = Storage.getSettings();
      s.sound = e.target.checked;
      Storage.saveSettings(s);
    });
  }

  function setupDangerZone() {
    document.getElementById('clearAllData').addEventListener('click', () => {
      if (confirm('Are you sure? This will delete ALL conversations permanently.')) {
        Storage.clearAll();
        document.getElementById('settingsModal').classList.remove('active');
        UI.showToast('All conversations cleared', 'success');
        // Trigger app refresh
        if (typeof App !== 'undefined') App.init();
      }
    });
  }

  async function loadModels() {
    models = await Api.fetchModels();
    const select = document.getElementById('modelSelect');
    const selectMini = document.getElementById('modelSelectMini');

    [select, selectMini].forEach(sel => {
      sel.innerHTML = '';
      models.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.name;
        sel.appendChild(opt);
      });
    });

    // Restore saved model
    const s = Storage.getSettings();
    if (s.model) {
      select.value = s.model;
      selectMini.value = s.model;
    }

    // Sync selects and update hint
    const hint = document.getElementById('modelHint');
    function updateModel(value) {
      select.value = value;
      selectMini.value = value;
      const s = Storage.getSettings();
      s.model = value;
      Storage.saveSettings(s);
      const model = models.find(m => m.id === value);
      if (model && hint) hint.textContent = model.description;
    }

    select.addEventListener('change', (e) => updateModel(e.target.value));
    selectMini.addEventListener('change', (e) => updateModel(e.target.value));

    // Set initial hint
    const currentModel = models.find(m => m.id === (s.model || models[0]?.id));
    if (currentModel && hint) hint.textContent = currentModel.description;
  }

  function getModel() {
    const s = Storage.getSettings();
    return s.model || 'openrouter/free';
  }

  function getSystemPrompt() {
    return document.getElementById('systemPrompt').value || '';
  }

  function isSoundEnabled() {
    return document.getElementById('soundToggle').checked;
  }

  return { init, getModel, getSystemPrompt, isSoundEnabled };
})();
