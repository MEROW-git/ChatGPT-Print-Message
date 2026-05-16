/*
  ChatGPT-Print-Message - content script
  Scope: https://chatgpt.com/*
  Pure vanilla JS, no external dependencies.
*/
(function () {
  'use strict';

  let lastMenuTrigger = null;
  let injectedMenus = new WeakSet();
  let extensionEnabled = true;
  let printTheme = 'light';

  function normalizeTheme(theme) {
    return theme === 'dark' ? 'dark' : 'light';
  }

  function loadStoredTheme() {
    chrome.storage?.sync?.get({
      extensionEnabled: true,
      printTheme: 'light',
    }, (result) => {
      extensionEnabled = result.extensionEnabled !== false;
      printTheme = normalizeTheme(result.printTheme);
    });
  }

  function findMessageRoot(fromEl) {
    let cur = fromEl;
    while (cur && cur !== document.body && cur !== document.documentElement) {
      const tid = cur.getAttribute?.('data-testid');
      if (typeof tid === 'string' && tid.includes('conversation-turn')) {
        return cur;
      }
      cur = cur.parentElement;
    }
    return null;
  }

  function extractMessageHTML(root) {
    if (!root) return '<p><em>Unable to locate message content.</em></p>';

    const clone = root.cloneNode(true);
    const removeSelectors = [
      'button',
      '[data-testid*="avatar"]',
      '[data-testid*="profile"]',
      '[data-testid*="feedback"]',
      '[data-testid*="menu"]',
      '[data-testid*="action"]',
      '[role="menu"]',
      '[role="toolbar"]',
      '.avatar',
      '.timestamp',
      '.message-actions',
      '.flex.gap-3',
    ];

    removeSelectors.forEach(sel => {
      clone.querySelectorAll?.(sel).forEach(n => n.remove());
    });

    const prose =
      clone.querySelector('[data-message-author-role] .markdown') ||
      clone.querySelector('.markdown') ||
      clone.querySelector('[data-message-author-role]') ||
      clone;

    return prose.innerHTML || '';
  }

  function printMessageInNewTab(html, theme) {
    const cssUrl = chrome.runtime.getURL('print.css');
    const logoUrl = chrome.runtime.getURL('icons/logo.svg');
    const previewJsUrl = chrome.runtime.getURL('print-preview.js');
    const safeTheme = normalizeTheme(theme);

    const doc = `<!DOCTYPE html>
<html lang="en" class="print-theme-${safeTheme}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ChatGPT Message</title>
<link rel="stylesheet" href="${cssUrl}">
</head>
<body class="print-theme-${safeTheme}">
<div class="print-toolbar">
  <div class="print-brand">
    <img src="${logoUrl}" alt="" width="28" height="28">
    <span>ChatGPT-Print-Message</span>
  </div>
  <button type="button" id="printButton">
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 8V4h10v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M7 17H5a2 2 0 0 1-2-2v-4a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v4a2 2 0 0 1-2 2h-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M7 14h10v6H7v-6Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
    </svg>
    <span>Print</span>
  </button>
</div>
<div class="message-content">
${html}
</div>
<script src="${previewJsUrl}"><\/script>
</body>
</html>`;

    const blob = new Blob([doc], { type: 'text/html; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');

    setTimeout(() => URL.revokeObjectURL(url), 60000);
    setTimeout(() => {
      try { if (w && !w.closed) w.close(); } catch (_e) { /* noop cross-origin */ }
    }, 120000);
  }

  function printLastMessage(menu, theme) {
    menu.style.display = 'none';
    if (!extensionEnabled) return;

    if (lastMenuTrigger) {
      const cleanHTML = extractMessageHTML(lastMenuTrigger);
      printMessageInNewTab(cleanHTML, theme);
    }

    lastMenuTrigger = null;
  }

  function styleMenuItem(item) {
    item.style.cssText = [
      'display:flex',
      'align-items:center',
      'gap:8px',
      'width:100%',
      'padding:8px 16px',
      'font-size:14px',
      'line-height:20px',
      'color:inherit',
      'background:transparent',
      'border:none',
      'border-radius:4px',
      'cursor:pointer',
      'text-align:left',
      'user-select:none',
    ].join(';');

    const icon = item.querySelector('svg');
    if (icon) {
      icon.style.cssText = [
        'display:block',
        'flex:0 0 auto',
      ].join(';');
    }

    item.addEventListener('mouseenter', () => {
      item.style.backgroundColor = 'rgba(127,127,127,0.12)';
    });
    item.addEventListener('mouseleave', () => {
      item.style.backgroundColor = 'transparent';
    });
  }

  function injectPrintItem(menu) {
    if (!extensionEnabled) return;
    if (!menu || injectedMenus.has(menu)) return;
    if (menu.querySelector?.(':scope > .cgpt-print-item')) return;
    injectedMenus.add(menu);

    const item = document.createElement('div');
    item.className = 'cgpt-print-item';
    item.setAttribute('role', 'menuitem');
    item.setAttribute('tabindex', '0');
    item.innerHTML = [
      '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" width="18" height="18" xmlns="http://www.w3.org/2000/svg">',
      '<path d="M7 8V4h10v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
      '<path d="M7 17H5a2 2 0 0 1-2-2v-4a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v4a2 2 0 0 1-2 2h-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
      '<path d="M7 14h10v6H7v-6Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
      '<path d="M17 11.5h.01" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
      '</svg>',
      '<span>Print this message</span>',
    ].join('');
    styleMenuItem(item);

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      printLastMessage(menu, printTheme);
    });

    menu.appendChild(item);
  }

  function isMenuNode(node) {
    if (!(node instanceof HTMLElement)) return false;

    if (node.getAttribute('role') === 'menu') return true;
    if (node.querySelector?.('[role="menu"]')) return false;

    const style = window.getComputedStyle(node);
    const isFloating = style.position === 'fixed' || style.position === 'absolute';
    const hasMenuLikeChildren = node.querySelectorAll?.('button, [role="menuitem"]').length > 0;

    return Boolean(isFloating && hasMenuLikeChildren && node.children.length >= 2);
  }

  document.addEventListener('click', (e) => {
    if (!extensionEnabled) return;

    const btn = e.target.closest('button');
    if (!btn) return;

    const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
    const hasDotsSVG = btn.querySelector?.('svg') !== null;
    const isLikelyMenuTrigger =
      aria.includes('menu') ||
      aria.includes('more') ||
      aria.includes('options') ||
      aria.includes('actions') ||
      (hasDotsSVG && btn.innerHTML.length < 800);

    if (isLikelyMenuTrigger) {
      const msg = findMessageRoot(btn);
      if (msg) lastMenuTrigger = msg;
    }
  }, true);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;

        if (isMenuNode(node)) {
          injectPrintItem(node);
        }

        if (node.querySelectorAll) {
          const menus = node.querySelectorAll?.('[role="menu"]');
          menus?.forEach(m => injectPrintItem(m));
        }
      }
    }
  });

  chrome.storage?.onChanged?.addListener((changes, areaName) => {
    if (areaName !== 'sync') return;
    if (changes.extensionEnabled) {
      extensionEnabled = changes.extensionEnabled.newValue !== false;
    }
    if (changes.printTheme) {
      printTheme = normalizeTheme(changes.printTheme.newValue);
    }
  });

  loadStoredTheme();

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    window.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }
})();
