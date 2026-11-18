/* Section 1 - Apps & Launcher: show/hide, edit launch URLs, add custom web apps. */
(function () {
  'use strict';

  var S = window.ApexSettings;
  var U = window.ApexUI;

  window.ApexSections = window.ApexSections || {};
  window.ApexSections.apps = function mount(root) {
    var list = U.$('#appList', root);
    var count = U.$('#appCount', root);
    var form = U.$('#addAppForm', root);

    function saveSoon() {
      saveSoon.save = saveSoon.save || U.debounce(function () { S.save(); }, 250);
      saveSoon.save();
    }

    function render() {
      var apps = S.get().apps;
      list.innerHTML = '';
      list.appendChild(U.el('li', { class: 'app-row app-row-head' }, [
        U.el('span', { text: 'App' }),
        U.el('span', { text: 'Launch URL' }),
        U.el('span', { class: 'col-toggle', text: 'On home' })
      ]));

      apps.forEach(function (app) {
        var toggle = U.el('button', {
          class: 'switch' + (app.visible ? ' is-on' : ''),
          type: 'button',
          role: 'switch',
          'aria-checked': app.visible ? 'true' : 'false',
          'aria-label': 'Show ' + app.name + ' on home screen'
        }, [U.el('span', { class: 'knob' })]);
        toggle.addEventListener('click', function () {
          app.visible = !app.visible;
          toggle.classList.toggle('is-on', app.visible);
          toggle.setAttribute('aria-checked', app.visible ? 'true' : 'false');
          saveSoon();
        });

        var url = U.el('input', {
          class: 'input',
          type: 'text',
          value: app.url,
          spellcheck: false,
          'aria-label': app.name + ' launch URL'
        });
        url.addEventListener('input', function () {
          app.url = url.value.trim();
          saveSoon();
        });

        var name = U.el('div', { class: 'app-name' }, [
          U.el('strong', { text: app.name }),
          app.custom ? U.el('span', { class: 'tag', text: 'custom' }) : null
        ]);

        var remove = app.custom ? U.el('button', {
          class: 'icon-btn',
          type: 'button',
          title: 'Remove custom app',
          'aria-label': 'Remove ' + app.name
        }, ['\u00d7']) : null;
        if (remove) {
          remove.addEventListener('click', function () {
            var cfg = S.get();
            cfg.apps = cfg.apps.filter(function (a) { return a.id !== app.id; });
            S.save();
            render();
            U.toast('Removed ' + app.name);
          });
        }

        list.appendChild(U.el('li', { class: 'app-row' }, [
          U.el('div', { class: 'app-id' }, [name, remove]),
          url,
          U.el('div', { class: 'col-toggle' }, [toggle])
        ]));
      });

      var hidden = apps.filter(function (a) { return !a.visible; }).length;
      if (count) count.textContent = apps.length + ' apps \u00b7 ' + hidden + ' hidden';
    }

    if (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var nameInput = form.querySelector('[name="name"]');
        var urlInput = form.querySelector('[name="url"]');
        var name = nameInput.value.trim();
        var url = urlInput.value.trim();
        if (!name || !url) return;
        var cfg = S.get();
        cfg.apps.push({ id: U.uid('custom'), name: name, url: url, visible: true, custom: true });
        S.save();
        nameInput.value = '';
        urlInput.value = '';
        render();
        U.toast(name + ' added to your home screen');
      });
    }

    S.onChange(function () { render(); });
    render();
  };
})();
