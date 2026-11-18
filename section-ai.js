/* Section 2 - AI & API Keys: router endpoint, default model, local provider keys. */
(function () {
  'use strict';

  var S = window.ApexSettings;
  var U = window.ApexUI;

  var PROVIDER_LABELS = {
    groq: 'Groq',
    gemini: 'Google Gemini',
    mistral: 'Mistral',
    cloudflare: 'Cloudflare Workers AI'
  };

  var MODELS = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'gemini-2.0-flash',
    'mistral-large-latest',
    '@cf/meta/llama-3.1-8b-instruct'
  ];

  window.ApexSections = window.ApexSections || {};
  window.ApexSections.ai = function mount(root) {
    var routerInput = U.$('#routerUrl', root);
    var modelInput = U.$('#modelSelect', root);
    var customModel = U.$('#customModel', root);
    var testBtn = U.$('#testRouter', root);
    var result = U.$('#aiResult', root);

    var cfg = S.get();

    MODELS.forEach(function (m) { modelInput.appendChild(U.el('option', { value: m, text: m })); });
    routerInput.value = cfg.ai.routerUrl;
    if (MODELS.indexOf(cfg.ai.model) === -1) {
      modelInput.appendChild(U.el('option', { value: cfg.ai.model, text: cfg.ai.model }));
    }
    modelInput.value = cfg.ai.model;

    routerInput.addEventListener('input', function () {
      S.get().ai.routerUrl = routerInput.value.trim();
      scheduleSave();
    });
    modelInput.addEventListener('change', function () {
      S.get().ai.model = modelInput.value;
      customModel.value = '';
      scheduleSave();
    });
    customModel.addEventListener('input', function () {
      var value = customModel.value.trim();
      if (!value) return;
      S.get().ai.model = value;
      scheduleSave();
    });

    var scheduleSave = U.debounce(function () { S.save(); U.toast('AI settings saved'); }, 500);

    S.providers.forEach(function (provider) {
      var input = U.$('#key-' + provider, root);
      if (!input) return;
      input.value = cfg.ai.keys[provider] || '';
      input.addEventListener('input', function () {
        S.get().ai.keys[provider] = input.value.trim();
        updateKeyStatus();
        scheduleSave();
      });
    });

    function updateKeyStatus() {
      var keys = S.get().ai.keys;
      var saved = S.providers.filter(function (p) { return !!keys[p]; });
      var box = U.$('#keyStatus', root);
      if (!box) return;
      box.textContent = saved.length
        ? saved.map(function (p) { return PROVIDER_LABELS[p]; }).join(', ') + ' saved on this device'
        : 'No provider keys saved yet';
    }
    updateKeyStatus();

    if (testBtn) {
      testBtn.addEventListener('click', function () {
        var url = routerInput.value.trim();
        if (!url) {
          result.dataset.tone = 'warn';
          result.textContent = 'Add your Apex AI Router endpoint first (e.g. https://your-worker.workers.dev/v1/chat/completions).';
          return;
        }
        testBtn.disabled = true;
        result.dataset.tone = 'info';
        result.textContent = 'Pinging router\u2026';
        var started = performance.now();
        var controller = 'AbortController' in window ? new AbortController() : null;
        var timer = setTimeout(function () { if (controller) controller.abort(); }, 9000);

        fetch(url, {
          method: 'POST',
          mode: 'cors',
          headers: { 'content-type': 'application/json' },
          signal: controller ? controller.signal : undefined,
          body: JSON.stringify({
            model: S.get().ai.model,
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 1
          })
        }).then(function (res) {
          var ms = Math.round(performance.now() - started);
          clearTimeout(timer);
          return res.text().then(function (body) {
            if (res.ok) {
              result.dataset.tone = 'ok';
              result.textContent = 'Router reachable \u2014 HTTP ' + res.status + ' in ' + ms + ' ms.';
            } else {
              result.dataset.tone = 'warn';
              result.textContent = 'Router answered HTTP ' + res.status + ' in ' + ms + ' ms \u2014 ' + body.slice(0, 140);
            }
          });
        }).catch(function (err) {
          clearTimeout(timer);
          result.dataset.tone = 'bad';
          var reason = err && err.name === 'AbortError' ? 'timed out after 9s' : (err && err.message) || 'network error';
          result.textContent = 'Could not reach the router (' + reason + '). Check the URL, the Worker deployment and its CORS headers.';
        }).then(function () {
          testBtn.disabled = false;
        });
      });
    }
  };
})();
