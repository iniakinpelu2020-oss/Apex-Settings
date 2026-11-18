/* Section 3 - Offline & Storage: quota, persistence, cache buckets, SW update. */
(function () {
  'use strict';

  var S = window.ApexSettings;
  var U = window.ApexUI;

  window.ApexSections = window.ApexSections || {};
  window.ApexSections.storage = function mount(root) {
    var usageBar = U.$('#usageBar', root);
    var usageText = U.$('#usageText', root);
    var quotaText = U.$('#quotaText', root);
    var persistState = U.$('#persistState', root);
    var persistBtn = U.$('#persistBtn', root);
    var cacheList = U.$('#cacheList', root);
    var updateBtn = U.$('#updateSw', root);

    function refreshQuota() {
      if (!navigator.storage || !navigator.storage.estimate) {
        usageText.textContent = 'Storage API unavailable in this browser';
        return;
      }
      navigator.storage.estimate().then(function (est) {
        var used = est.usage || 0;
        var quota = est.quota || 0;
        var pct = quota ? Math.min(100, (used / quota) * 100) : 0;
        usageBar.style.width = Math.max(2, pct).toFixed(1) + '%';
        usageBar.dataset.level = pct > 85 ? 'high' : pct > 60 ? 'mid' : 'low';
        usageText.textContent = U.formatBytes(used) + ' used';
        quotaText.textContent = quota ? 'of ' + U.formatBytes(quota) + ' (' + pct.toFixed(1) + '%)' : 'quota unknown';
      }).catch(function () {
        usageText.textContent = 'Could not read storage estimate';
      });
    }

    function refreshPersist() {
      if (!navigator.storage || !navigator.storage.persisted) {
        persistState.textContent = 'Persistent storage is not supported here. Cached data can be evicted by the browser.';
        persistBtn.disabled = true;
        return;
      }
      navigator.storage.persisted().then(function (yes) {
        persistState.textContent = yes
          ? 'Persistent storage granted \u2014 ApexOS data will not be evicted automatically.'
          : 'Best effort: the browser may evict cached data when space runs low.';
        persistBtn.textContent = yes ? 'Locked' : 'Request Lock';
        persistBtn.disabled = yes;
      }).catch(function () {
        persistState.textContent = 'Could not read persistence status.';
      });
    }

    function renderCaches() {
      if (!('caches' in window)) {
        cacheList.innerHTML = '';
        cacheList.appendChild(U.el('li', { class: 'cache-row muted', text: 'Cache Storage is not available in this browser.' }));
        return;
      }
      caches.keys().then(function (names) {
        cacheList.innerHTML = '';
        if (!names.length) {
          cacheList.appendChild(U.el('li', { class: 'cache-row muted', text: 'No caches yet \u2014 reload once to install the app shell.' }));
          return;
        }
        names.sort().forEach(function (name) {
          var countLabel = U.el('span', { class: 'muted', text: 'counting\u2026' });
          var remove = U.el('button', { class: 'btn ghost small', type: 'button', text: 'Delete' });
          remove.addEventListener('click', function () {
            remove.disabled = true;
            caches.delete(name).then(function (ok) {
              if (!ok) {
                remove.disabled = false;
                U.toast('Could not delete ' + name, 'warn');
                return;
              }
              U.toast('Deleted ' + name);
              renderCaches();
              refreshQuota();
            });
          });
          cacheList.appendChild(U.el('li', { class: 'cache-row' }, [
            U.el('div', { class: 'cache-name' }, [U.el('code', { text: name }), countLabel]),
            remove
          ]));
          caches.open(name).then(function (cache) {
            return cache.keys().then(function (reqs) {
              countLabel.textContent = reqs.length + ' entries';
            });
          }).catch(function () {
            countLabel.textContent = 'entries unknown';
          });
        });
      }).catch(function () {
        cacheList.innerHTML = '';
        cacheList.appendChild(U.el('li', { class: 'cache-row muted', text: 'Could not list caches.' }));
      });
    }

    persistBtn.addEventListener('click', function () {
      if (!navigator.storage || !navigator.storage.persist) return;
      persistBtn.disabled = true;
      navigator.storage.persist().then(function (granted) {
        U.toast(granted ? 'Persistent storage granted' : 'Browser declined persistent storage', granted ? 'ok' : 'warn');
        refreshPersist();
      }).catch(function () {
        persistBtn.disabled = false;
        U.toast('Persist request failed', 'bad');
      });
    });

    updateBtn.addEventListener('click', function () {
      if (!('serviceWorker' in navigator)) {
        U.toast('Service workers are not available here', 'warn');
        return;
      }
      updateBtn.disabled = true;
      navigator.serviceWorker.getRegistrations().then(function (regs) {
        if (!regs.length) {
          U.toast('No service worker registered yet', 'warn');
          updateBtn.disabled = false;
          return;
        }
        return Promise.all(regs.map(function (reg) { return reg.update(); })).then(function () {
          U.toast('Service worker update requested');
          renderCaches();
          refreshQuota();
        }).catch(function () {
          U.toast('Update check failed', 'bad');
        }).then(function () { updateBtn.disabled = false; });
      }).catch(function () {
        U.toast('Could not reach the service worker', 'bad');
        updateBtn.disabled = false;
      });
    });

    var refreshBtn = U.$('#refreshStorage', root);
    if (refreshBtn) refreshBtn.addEventListener('click', function () { refreshQuota(); refreshPersist(); renderCaches(); });

    refreshQuota();
    refreshPersist();
    renderCaches();
    S.onChange(function () { /* config changes do not alter storage, keep values live anyway */ refreshQuota(); });
  };
})();
