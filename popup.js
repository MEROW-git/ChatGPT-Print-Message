(function () {
  'use strict';

  const themeButtons = Array.from(document.querySelectorAll('[data-theme]'));
  const extensionToggle = document.getElementById('extensionToggle');
  const statusText = document.getElementById('statusText');

  let extensionEnabled = true;

  function normalizeTheme(theme) {
    return theme === 'dark' ? 'dark' : 'light';
  }

  function renderTheme(theme) {
    const activeTheme = normalizeTheme(theme);
    themeButtons.forEach((button) => {
      const isActive = button.dataset.theme === activeTheme;
      button.setAttribute('aria-checked', isActive ? 'true' : 'false');
      button.tabIndex = isActive ? 0 : -1;
    });
  }

  function renderEnabled(enabled) {
    extensionEnabled = enabled !== false;
    extensionToggle.setAttribute('aria-pressed', extensionEnabled ? 'true' : 'false');
    extensionToggle.querySelector('strong').textContent = extensionEnabled ? 'On' : 'Off';
    statusText.textContent = extensionEnabled ? 'Extension is on' : 'Extension is off';
  }

  function saveTheme(theme) {
    const nextTheme = normalizeTheme(theme);
    chrome.storage.sync.set({ printTheme: nextTheme }, () => {
      renderTheme(nextTheme);
    });
  }

  function saveEnabled(enabled) {
    chrome.storage.sync.set({ extensionEnabled: enabled }, () => {
      renderEnabled(enabled);
    });
  }

  chrome.storage.sync.get({
    printTheme: 'light',
    extensionEnabled: true,
  }, (result) => {
    renderTheme(result.printTheme);
    renderEnabled(result.extensionEnabled);
  });

  themeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      saveTheme(button.dataset.theme);
    });
  });

  extensionToggle.addEventListener('click', () => {
    saveEnabled(!extensionEnabled);
  });
})();
