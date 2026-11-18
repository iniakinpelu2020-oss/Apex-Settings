/* Section 4 - Appearance & Mode: UI mode, accent, wallpaper, scale. */
(function () {
  'use strict';

  var S = window.ApexSettings;
  var U = window.ApexUI;

  var MODES = [
    ['auto', 'Auto', 'Follows the screen width'],
    ['desktop', 'Desktop', 'Sidebar layout'],
    ['mobile', 'Android Mobile', 'Bottom tab bar']
  ];

  var WALL_LABELS = {
    aurora: 'Aurora',
    mesh: 'Mesh',
    ember: 'Ember',
    graphite: 'Graphite'
  };

  window.ApexSections = window.ApexSections || {};
  window.ApexSections.appearance = function mount(root) {
    var modeGroup = U.$('#modeGroup', root);
    var accentGrid = U.$('#accentGrid', root);
    var accentPicker = U.$('#accentPicker', root);
    var wallGrid = U.$('#wallGrid', root);
    var scaleRange = U.$('#scaleRange', root);
    var scaleValue = U.$('#scaleValue', root);

    var cfg = S.get();

    MODES.forEach(function (m) {
      var btn = U.el('button', {
        class: 'mode-btn' + (cfg.appearance.mode === m[0] ? ' is-active' : ''),
        type: 'button',
        'data-mode': m[0],
        onclick: function () {
          S.get().appearance.mode = m[0];
          S.save();
          U.applyAppearance();
          U.$$('.mode-btn', modeGroup).forEach(function (b) {
            b.classList.toggle('is-active', b.dataset.mode === m[0]);
          });
          U.toast('Mode: ' + m[1]);
        }
      }, [U.el('strong', { text: m[1] }), U.el('span', { class: 'muted', text: m[2] })]);
      modeGroup.appendChild(btn);
    });

    function syncAccentSwatches(active) {
      U.$$('.accent-swatch', accentGrid).forEach(function (sw) {
        sw.classList.toggle('is-active', sw.dataset.color === active);
      });
    }

    function setAccent(color) {
      S.get().appearance.accent = color;
      S.save();
      U.applyAppearance();
      accentPicker.value = color;
      syncAccentSwatches(color);
    }

    U.ACCENTS.forEach(function (color) {
      var sw = U.el('button', {
        class: 'accent-swatch' + (cfg.appearance.accent === color ? ' is-active' : ''),
        type: 'button',
        'data-color': color,
        style: 'background:' + color,
        'aria-label': 'Accent ' + color,
        onclick: function () { setAccent(color); }
      });
      accentGrid.appendChild(sw);
    });

    accentPicker.value = cfg.appearance.accent;
    accentPicker.addEventListener('input', function () { setAccent(accentPicker.value); });

    U.WALLPAPERS.forEach(function (name) {
      var tile = U.el('button', {
        class: 'wall-tile' + (cfg.appearance.wallpaper === name ? ' is-active' : ''),
        type: 'button',
        'data-wallpaper': name,
        onclick: function () {
          S.get().appearance.wallpaper = name;
          S.save();
          U.applyAppearance();
          U.$$('.wall-tile', wallGrid).forEach(function (b) {
            b.classList.toggle('is-active', b.dataset.wallpaper === name);
          });
          U.toast('Wallpaper: ' + (WALL_LABELS[name] || name));
        }
      }, [U.el('span', { class: 'wall-preview', 'data-wall': name }), U.el('span', { class: 'wall-name', text: WALL_LABELS[name] || name })]);
      wallGrid.appendChild(tile);
    });

    scaleRange.value = String(cfg.appearance.scale);
    scaleValue.textContent = cfg.appearance.scale + '%';
    scaleRange.addEventListener('input', function () {
      var value = Number(scaleRange.value);
      scaleValue.textContent = value + '%';
      S.get().appearance.scale = value;
      S.save();
      U.applyAppearance();
    });

    S.onChange(function () {
      var ap = S.get().appearance;
      U.$$('.mode-btn', modeGroup).forEach(function (b) { b.classList.toggle('is-active', b.dataset.mode === ap.mode); });
      syncAccentSwatches(ap.accent);
      accentPicker.value = ap.accent;
      U.$$('.wall-tile', wallGrid).forEach(function (b) { b.classList.toggle('is-active', b.dataset.wallpaper === ap.wallpaper); });
      scaleRange.value = String(ap.scale);
      scaleValue.textContent = ap.scale + '%';
    });
  };
})();
