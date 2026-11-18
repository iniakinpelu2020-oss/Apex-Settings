/* Section 5 - Backup & Reset: export/import JSON and factory reset. */
(function () {
  'use strict';

  var S = window.ApexSettings;
  var U = window.ApexUI;

  window.ApexSections = window.ApexSections || {};
  window.ApexSections.backup = function mount(root) {
    var exportBtn = U.$('#exportBtn', root);
    var importInput = U.$('#importInput', root);
    var importBtn = U.$('#importBtn', root);
    var resetBtn = U.$('#resetBtn', root);
    var summary = U.$('#backupSummary', root);
    var modal = U.$('#modal');
    var confirmBtn = U.$('#confirmReset');
    var cancelBtn = U.$('#cancelReset');

    function renderSummary() {
      var cfg = S.get();
      var keys = S.providers.filter(function (p) { return !!cfg.ai.keys[p]; }).length;
      if (summary) {
        summary.textContent = cfg.apps.length + ' apps \u00b7 ' + keys + ' provider keys \u00b7 accent ' +
          cfg.appearance.accent + ' \u00b7 updated ' + (cfg.updatedAt ? new Date(cfg.updatedAt).toLocaleString() : 'never');
      }
    }

    function exportConfig() {
      var cfg = S.get();
      var payload = JSON.stringify({
        app: 'ApexOS',
        kind: 'apex_os_config',
        exportedAt: new Date().toISOString(),
        config: cfg
      }, null, 2);
      var blob = new Blob([payload], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      var link = U.el('a', { href: url, download: 'apex-os-config-' + stamp + '.json' });
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      U.toast('Config exported');
    }

    function importFile(file) {
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var parsed = JSON.parse(String(reader.result));
          var incoming = parsed && parsed.config ? parsed.config : parsed;
          if (!incoming || typeof incoming !== 'object' || !Array.isArray(incoming.apps)) {
            throw new Error('missing apps array');
          }
          S.replace(incoming);
          U.applyAppearance();
          renderSummary();
          U.toast('Config imported \u00b7 ' + S.get().apps.length + ' apps restored');
          if (window.ApexSections.apps) {
            var page = U.$('#section-apps');
            if (page) {
              page.dataset.mounted = 'yes';
              U.$('#appList', page).innerHTML = '';
              window.ApexSections.apps(page);
            }
          }
        } catch (err) {
          U.toast('That file is not an ApexOS config', 'bad');
        }
        importInput.value = '';
      };
      reader.onerror = function () { U.toast('Could not read that file', 'bad'); };
      reader.readAsText(file);
    }

    if (exportBtn) exportBtn.addEventListener('click', exportConfig);
    if (importBtn) importBtn.addEventListener('click', function () { importInput.click(); });
    if (importInput) importInput.addEventListener('change', function () {
      importFile(importInput.files && importInput.files[0]);
    });
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        if (modal) {
          modal.hidden = false;
          confirmBtn.focus();
        } else if (window.confirm('Erase all ApexOS settings on this device?')) {
          S.reset();
          location.reload();
        }
      });
    }
    if (cancelBtn) cancelBtn.addEventListener('click', function () { modal.hidden = true; });
    if (modal) {
      modal.addEventListener('click', function (event) {
        if (event.target === modal) modal.hidden = true;
      });
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && !modal.hidden) modal.hidden = true;
      });
    }
    if (confirmBtn) {
      confirmBtn.addEventListener('click', function () {
        modal.hidden = true;
        S.reset();
        U.toast('ApexOS settings restored to factory defaults');
        setTimeout(function () { location.reload(); }, 500);
      });
    }

    var drag = U.$('#dropZone', root);
    if (drag) {
      ['dragover', 'dragenter'].forEach(function (type) {
        drag.addEventListener(type, function (event) {
          event.preventDefault();
          drag.classList.add('is-over');
        });
      });
      ['dragleave', 'drop'].forEach(function (type) {
        drag.addEventListener(type, function (event) {
          event.preventDefault();
          drag.classList.remove('is-over');
        });
      });
      drag.addEventListener('drop', function (event) {
        importFile(event.dataTransfer && event.dataTransfer.files[0]);
      });
      drag.addEventListener('click', function () { importInput.click(); });
    }

    S.onChange(renderSummary);
    renderSummary();
  };
})();
