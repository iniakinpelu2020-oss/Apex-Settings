/* Apex Settings - shared UI helpers, section router and appearance applier. */
(function () {
  'use strict';

  var S = window.ApexSettings;
  var SECTIONS = {
    apps: 'Apps & Launcher',
    ai: 'AI & API Keys',
    storage: 'Offline & Storage',
    appearance: 'Appearance & Mode',
    backup: 'Backup & Reset'
  };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), v);
        else if (k in node) node[k] = v;
        else node.setAttribute(k, v);
      });
    }
    (children || []).forEach(function (child) {
      if (child === null || child === undefined) return;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }

  var toastTimer = null;
  function toast(message, tone) {
    var box = $('#toast');
    if (!box) return;
    box.textContent = message;
    box.dataset.tone = tone || 'ok';
    box.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { box.classList.remove('is-visible'); }, 2600);
  }

  function formatBytes(bytes) {
    if (!isFinite(bytes) || bytes <= 0) return '0 B';
    var units = ['B', 'KB', 'MB', 'GB', 'TB'];
    var i = Math.floor(Math.log(bytes) / Math.log(1024));
    i = Math.min(i, units.length - 1);
    return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
  }

  function debounce(fn, wait) {
    var t = null;
    return function () {
      var args = arguments;
      var self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, wait || 300);
    };
  }

  function uid(prefix) {
    return (prefix || 'app') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  var WALLPAPERS = ['aurora', 'mesh', 'ember', 'graphite'];
  var ACCENTS = ['#7c8cff', '#38e0c8', '#ff7ab8', '#ffb457', '#8ef07a', '#c59bff'];

  /* Live theme: accent + wallpaper + UI scale come from the shared config. */
  function applyAppearance() {
    var cfg = S.get();
    var ap = cfg.appearance;
    var root = document.documentElement;
    root.style.setProperty('--accent', ap.accent);
    root.style.setProperty('--accent-soft', hexToRgba(ap.accent, 0.16));
    root.style.setProperty('--accent-line', hexToRgba(ap.accent, 0.45));
    root.style.setProperty('--ui-scale', String(ap.scale / 100));
    document.body.dataset.wallpaper = ap.wallpaper;
    document.body.dataset.mode = ap.mode;
    var narrow = window.innerWidth < 820;
    document.body.dataset.layout = ap.mode === 'auto' ? (narrow ? 'mobile' : 'desktop') : ap.mode;
  }

  function hexToRgba(hex, alpha) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
  }

  function show(section) {
    if (!SECTIONS[section]) section = 'apps';
    $$('.nav-item').forEach(function (btn) {
      var active = btn.dataset.section === section;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    $$('.tab-item').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.dataset.section === section);
    });
    $$('.page').forEach(function (page) {
      page.classList.toggle('is-active', page.id === 'section-' + section);
    });
    var title = $('#sectionTitle');
    if (title) title.textContent = SECTIONS[section];
    if (location.hash.slice(1) !== section) {
      try { history.replaceState(null, '', '#' + section); } catch (err) { /* ignore */ }
    }
    var page = $('#section-' + section);
    if (page && page.dataset.mounted !== 'yes' && window.ApexSections && window.ApexSections[section]) {
      page.dataset.mounted = 'yes';
      window.ApexSections[section](page);
    }
  }

  function initNav() {
    $$('.nav-item, .tab-item').forEach(function (btn) {
      btn.addEventListener('click', function () { show(btn.dataset.section); });
    });
    window.addEventListener('hashchange', function () { show(location.hash.slice(1) || 'apps'); });
  }

  window.ApexUI = {
    $: $,
    $$: $$,
    el: el,
    toast: toast,
    formatBytes: formatBytes,
    debounce: debounce,
    uid: uid,
    show: show,
    initNav: initNav,
    applyAppearance: applyAppearance,
    hexToRgba: hexToRgba,
    WALLPAPERS: WALLPAPERS,
    ACCENTS: ACCENTS,
    SECTIONS: SECTIONS
  };
})();
