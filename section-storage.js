/* Section 3 - Offline & Storage: quota, persistence, cache buckets, SW update. */
(function () {
  'use strict';

  var U = window.ApexUI;

  window.ApexSections = window.ApexSections || {};
  window.ApexSections.storage = function mount(root) {
    var usageBar = U.$('#usageBar', root);
    var usageText = U.$('#usageText', root);
    var quotaText = U.$('#quotaText', root);
    var persistState = U.$('#persistState', root);
    var persistBtn = U.$('#persistBtn', root);
    var cacheList = U.$('#cacheList', root);
    var refreshBtn = U.$('#refreshStorage', root);
    var updateBtn = U.$('#updateSw', root);

    function renderUsage() {
      if (!navigator.storage || !navigator.storage.estimate) {
        usageText.textContent = 'Storage estimates unavailable in this browser.';
        return;
      }
      navigator.storage.estimate().then(function (est) {
        var used = est.usage || 0;
        var quota = est.quota || 0;
        var pct = quota ? Math.min(100, (used / quota) * 100) : 0;
        usageText.textContent = U.formatBytes(used) + ' used';
        quotaText.textContent = quota ? U.formatBytes(quota) + ' available' : 'quota unknown';
        usageBar.style.width = pct.toFixed(1) + '%';
        usageBar.dataset.level = pct > 85 ? 'high' : pct > 60 ? 'mid' : 'low';
      }).catch(function () {
        usageText.textContent = 'Could not read the storage estimate.';
      });
    }

    function renderPersist() {
      if (!navigator.storage || !navigator.storage.persisted) {
        persistState.textContent = 'Persistence API not supported here.';
        if (persistBtn) persistBtn.disabled = true;
        return;
      }
      navigator.storage.persisted().then(function (granted) {
        persistState.textContent = granted
          ? 'Persistent storage granted \u2014 ApexOS data survives storage pressure.'
          : 'Best effort \u2014 the browser may clear cached data under pressure.';
        persistState.dataset.tone = granted ? 'ok' : 'warn';
        if (persistBtn) persistBtn.textContent = granted ? 'Locked' : 'Request Lock';
      });
    }

    function deleteCache(name) {
      if (!('caches' in window)) return;
      caches.delete(name).then(function () {
        U.toast('Deleted cache ' + name);
        renderCaches();
        renderUsage();
      });
    }

    function renderCaches() {
      if (!('caches' in window)) {
        cacheList.innerHTML = '';
        cacheList.appendChild(U.el('li', { class: 'empty', text: 'Cache Storage is not available in this browser.' }));
        return;
      }
      caches.keys().then(function (names) {
        cacheList.innerHTML = '';
        if (!names.length) {
          cacheList.appendChild(U.el('li', { class: 'empty', text: 'No caches yet \u2014 visit ApexOS once online to fill them.' }));
          return;
        }
        names.sort().forEach(function (name) {
          var count = U.el('span', { class: 'muted', text: '' });
          caches.open(name).then(function (cache) {
            return cache.keys();
          }).then(function (reqs) {
            count.textContent = reqs.length + (reqs.length === 1 ? ' entry' : ' entries');
          }).catch(function () { count.textContent = ''; });

          cacheList.appendChild(U.el('li', { class: 'cache-row' }, [
            U.el('div', {}, [U.el('strong', { text: name }), count]),
            U.el('button', {
              class: 'btn ghost small',
              type: 'button',
              text: 'Delete',
              onclick: function () { deleteCache(name); }
            })
          ]));
        });
      });
    }

    function forceUpdate() {
      if (!('serviceWorker' in navigator)) {
        U.toast('Service workers are unavailable here', 'warn');
        return;
      }
      updateBtn.disabled = true;
      navigator.serviceWorker.getRegistrations().then(function (regs) {
        if (!regs.length) {
          U.toast('No service worker is registered yet', 'warn');
          updateBtn.disabled = false;
          return;
        }
        return Promise.all(regs.map(function (reg) {
          if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          return reg.update().catch(function () { return null; });
        })).then(function () {
          U.toast('Service worker checked for updates');
          setTimeout(function () { location.reload(); }, 700);
        });
      }).catch(function () {
        U.toast('Could not update the service worker', 'bad');
        updateBtn.disabled = false;
      });
    }

    if (persistBtn) {
      persistBtn.addEventListener('click', function () {
        if (!navigator.storage || !navigator.storage.persist) return;
        navigator.storage.persist().then(function (granted) {
          U.toast(granted ? 'Persistent storage granted' : 'The browser declined persistent storage', granted ? 'ok' : 'warn');
          renderPersist();
        });
      });
    }
    if (refreshBtn) refreshBtn.addEventListener('click', function () { renderUsage(); renderPersist(); renderCaches(); });
    if (updateBtn) updateBtn.addEventListener('click', forceUpdate);

    renderUsage();
    renderPersist();
    renderCaches();
  };
})();
