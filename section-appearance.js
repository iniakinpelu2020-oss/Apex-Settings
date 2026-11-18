/* Section 4 - Appearance & Mode: UI mode, accent colour, wallpaper, UI scale. */
(function () {
  'use strict';

  var S = window.ApexSettings;
  var U = window.ApexUI;

  var MODES = [
    ['auto', 'Auto', 'Follow the device'],
    ['desktop', 'Desktop', 'Wide layout, sidebar'],
    ['mobile', 'Android Mobile', 'Touch layout, bottom tabs']
  ];

  window.ApexSections = window.ApexSections || {};
  window.ApexSections.appearance = function mount(root) {
    var cfg = S.get();
    var modeBox = U.$('#modeGroup', root);
    var accentGrid = U.$('#accentGrid', root);
    var accentPick = U.$('#accentPicker', root);
    var wallGrid = U.$('#wallGrid', root);
    var scaleInput = U.$('#scaleRange', root);
    var scaleValue = U.$('#scaleValue', root);

    function commit() {
      S.save();
      U.applyAppearance();
    }
    var commitSoon = U.debounce(commit, 200);

    MODES.forEach(function (m) {
      var btn = U.el('button', {
        class: 'mode-btn' + (cfg.appearance.mode === m[0] ? ' is-active' : ''),
        type: 'button',
        'data-mode': m[0]
      }, [U.el('strong', { text: m[1] }), U.el('span', { text: m[2] })]);
      btn.addEventListener('click', function () {
        S.get().appearance.mode = m[0];
        U.$$('.mode-btn', modeBox).forEach(function (b) {
          b.classList.toggle('is-active', b.dataset.mode === m[0]);
        });
        commit();
        U.toast(m[1] + ' mode applied');
      });
      modeBox.appendChild(btn);
    });

    U.ACCENTS.forEach(function (color) {
      var swatch = U.el('button', {
        class: 'swatch' + (cfg.appearance.accent.toLowerCase() === color ? ' is-active' : ''),
        type: 'button',
        style: '--swatch:' + color,
        'aria-label': 'Accent ' + color
      });
      swatch.addEventListener('click', function () {
        S.get().appearance.accent = color;
        U.$$('.swatch', accentGrid).forEach(function (s) {
          s.classList.toggle('is-active', s === swatch);
        });
        accentPick.value = color;
        commit();
      });
      accentGrid.appendChild(swatch);
    });

    accentPick.value = cfg.appearance.accent;
    accentPick.addEventListener('input', function () {
      S.get().appearance.accent = accentPick.value;
      U.$$('.swatch', accentGrid).forEach(function (s) { s.classList.remove('is-active'); });
      commitSoon();
    });

    var WALL_LABELS = {
      aurora: 'Aurora',
      mesh: 'Mesh',
      ember: 'Ember',
      graphite: 'Graphite'
    };

    U.WALLPAPERS.forEach(function (name) {
      var tile = U.el('button', {
        class: 'wall' + (cfg.appearance.wallpaper === name ? ' is-active' : ''),
        type: 'button',
        'data-wall': name
      }, [U.el('span', { class: 'wall-preview wall-' + name }), U.el('span', { class: 'wall-name', text: WALL_LABELS[name] })]);
      tile.addEventListener('click', function () {
        S.get().appearance.wallpaper = name;
        U.$$('.wall', wallGrid).forEach(function (w) {
          w.classList.toggle('is-active', w.dataset.wall === name);
        });
        commit();
      });
      wallGrid.appendChild(tile);
    });

    scaleInput.value = String(cfg.appearance.scale);
    scaleValue.textContent = cfg.appearance.scale + '%';
    scaleInput.addEventListener('input', function () {
      var value = Number(scaleInput.value);
      S.get().appearance.scale = value;
      scaleValue.textContent = value + '%';
      U.applyAppearance();
      commitSoon();
    });
  };
})();
