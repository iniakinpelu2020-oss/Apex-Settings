/* Apex Settings - boot: load config, apply theme, mount sections, register SW. */
(function () {
  'use strict';

  var S = window.ApexSettings;
  var U = window.ApexUI;

  function resolveLayout() {
    U.applyAppearance();
  }

  function wireChrome() {
    var state = document.getElementById('saveState');
    var netPill = document.getElementById('netState');

    S.onChange(function (config, source) {
      if (!state) return;
      state.textContent = source === 'remote' ? 'Updated from ApexOS' : 'Saved on this device';
      state.dataset.tone = source === 'remote' ? 'warn' : 'ok';
      clearTimeout(wireChrome.timer);
      wireChrome.timer = setTimeout(function () {
        state.textContent = 'Synced';
        state.dataset.tone = 'ok';
      }, 2400);
    });

    function renderNet() {
      if (!netPill) return;
      var online = navigator.onLine;
      netPill.textContent = online ? 'Online' : 'Offline';
      netPill.dataset.tone = online ? 'ok' : 'warn';
    }
    window.addEventListener('online', renderNet);
    window.addEventListener('offline', renderNet);
    renderNet();

    var quick = document.getElementById('exportQuick');
    if (quick) {
      quick.addEventListener('click', function () {
        U.show('backup');
        var btn = document.getElementById('exportBtn');
        if (btn) btn.click();
      });
    }

    window.addEventListener('resize', U.debounce(function () {
      resolveLayout();
    }, 150));
  }

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(function (err) {
        if (window.console) console.warn('[apex-settings] service worker failed', err);
      });
      navigator.serviceWorker.addEventListener('message', function (event) {
        if (event.data && event.data.type === 'APEX_SW_UPDATED') {
          U.toast('A new Apex Settings build is ready');
        }
      });
    });
  }

  function start() {
    S.load();
    U.applyAppearance();
    resolveLayout();
    U.initNav();
    wireChrome();

    var initial = location.hash.slice(1) || 'apps';
    if (!U.SECTIONS[initial]) initial = 'apps';
    if (document.getElementById('section-' + initial)) {
      document.getElementById('section-' + initial).dataset.mounted = 'yes';
      if (window.ApexSections && window.ApexSections[initial]) window.ApexSections[initial](document.getElementById('section-' + initial));
    }
    U.show(initial);

    registerSW();

    document.body.classList.add('is-ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
