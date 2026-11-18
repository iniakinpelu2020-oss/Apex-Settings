/* Apex Settings - shared config store.
   One key (`apex_os_config`) mirrored into localStorage + IndexedDB and
   broadcast on BroadcastChannel('apex-settings') so the ApexOS shell can
   react without a reload. Vanilla, no dependencies. */
(function () {
  'use strict';

  var KEY = 'apex_os_config';
  var DB_NAME = 'apex-settings';
  var DB_STORE = 'config';
  var CHANNEL_NAME = 'apex-settings';
  var SCHEMA = 1;
  var CLIENT = 'settings-' + Math.random().toString(36).slice(2, 10);

  var APPS = [
    ['ai', 'Apex AI', './apps/ai/'],
    ['automation', 'Automation', './apps/automation/'],
    ['drive', 'Apex Drive', './apps/drive/'],
    ['auth', 'Apex Auth', './apps/auth/'],
    ['vault', 'Apex Vault', './apps/vault/'],
    ['shield', 'Apex Shield', './apps/shield/'],
    ['sec', 'Apex Sec', './apps/sec/'],
    ['browser', 'Apex Browser', './apps/browser/'],
    ['gallery', 'Apex Gallery', './apps/gallery/'],
    ['drop', 'Apex Drop', './apps/drop/'],
    ['docs', 'Apex Docs', './apps/docs/'],
    ['notes', 'Apex Notes', './apps/notes/'],
    ['planner', 'Apex Planner', './apps/planner/'],
    ['archive', 'Apex Archive', './apps/archive/'],
    ['feed', 'Apex Feed', './apps/feed/'],
    ['ledger', 'Apex Ledger', './apps/ledger/'],
    ['links', 'Apex Links', './apps/links/'],
    ['pulse', 'Apex Pulse', './apps/pulse/'],
    ['backup', 'Apex Backup', './apps/backup/'],
    ['studio', 'Apex Studio', './apps/studio/'],
    ['router', 'Apex AI Router', './apps/router/'],
    ['editor', 'Apex Editor', './apps/editor/']
  ];

  var PROVIDERS = ['groq', 'gemini', 'mistral', 'cloudflare'];

  function defaults() {
    return {
      version: SCHEMA,
      apps: APPS.map(function (a) {
        return { id: a[0], name: a[1], url: a[2], visible: true, custom: false };
      }),
      ai: {
        routerUrl: '',
        model: 'llama-3.3-70b-versatile',
        keys: { groq: '', gemini: '', mistral: '', cloudflare: '' }
      },
      appearance: { mode: 'auto', accent: '#7c8cff', wallpaper: 'aurora', scale: 100 },
      updatedAt: null
    };
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  /* Fill gaps so an older/partial config never breaks the UI. */
  function normalize(raw) {
    var base = defaults();
    if (!raw || typeof raw !== 'object') return base;
    var out = base;
    out.version = SCHEMA;
    out.updatedAt = raw.updatedAt || null;

    if (Array.isArray(raw.apps)) {
      var seen = {};
      var merged = raw.apps.filter(function (a) {
        if (!a || typeof a !== 'object' || !a.id || seen[a.id]) return false;
        seen[a.id] = true;
        return true;
      }).map(function (a) {
        return {
          id: String(a.id),
          name: String(a.name || a.id),
          url: String(a.url || ''),
          visible: a.visible !== false,
          custom: !!a.custom
        };
      });
      base.apps.forEach(function (a) {
        if (!seen[a.id]) merged.push(a);
      });
      out.apps = merged;
    }

    var ai = raw.ai || {};
    out.ai.routerUrl = typeof ai.routerUrl === 'string' ? ai.routerUrl : '';
    out.ai.model = typeof ai.model === 'string' && ai.model ? ai.model : base.ai.model;
    PROVIDERS.forEach(function (p) {
      var v = ai.keys && ai.keys[p];
      out.ai.keys[p] = typeof v === 'string' ? v : '';
    });

    var ap = raw.appearance || {};
    if (['auto', 'desktop', 'mobile'].indexOf(ap.mode) !== -1) out.appearance.mode = ap.mode;
    if (typeof ap.accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(ap.accent)) out.appearance.accent = ap.accent;
    if (typeof ap.wallpaper === 'string' && ap.wallpaper) out.appearance.wallpaper = ap.wallpaper;
    var scale = Number(ap.scale);
    if (isFinite(scale)) out.appearance.scale = Math.min(140, Math.max(80, Math.round(scale)));

    return out;
  }

  /* ---- IndexedDB mirror (best effort, localStorage stays authoritative) ---- */
  function withDB(fn) {
    if (!('indexedDB' in window)) return Promise.resolve(null);
    return new Promise(function (resolve) {
      var open;
      try {
        open = indexedDB.open(DB_NAME, 1);
      } catch (err) {
        resolve(null);
        return;
      }
      open.onupgradeneeded = function () {
        var db = open.result;
        if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
      };
      open.onerror = function () { resolve(null); };
      open.onsuccess = function () {
        var db = open.result;
        var result;
        try {
          result = fn(db);
        } catch (err) {
          result = null;
        }
        resolve(result || null);
      };
    });
  }

  function idbGet() {
    return withDB(function (db) {
      return new Promise(function (resolve) {
        var req = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(KEY);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { resolve(null); };
      });
    });
  }

  function idbPut(value) {
    return withDB(function (db) {
      db.transaction(DB_STORE, 'readwrite').objectStore(DB_STORE).put(value, KEY);
      return true;
    });
  }

  /* ---- state ---- */
  var config = defaults();
  var listeners = [];
  var channel = null;

  try {
    channel = 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL_NAME) : null;
  } catch (err) {
    channel = null;
  }

  function emit(source) {
    listeners.slice().forEach(function (fn) {
      try {
        fn(config, source);
      } catch (err) {
        if (window.console) console.error('[apex-settings] listener failed', err);
      }
    });
  }

  function readLocal() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function broadcast() {
    if (!channel) return;
    try {
      channel.postMessage({ type: 'apex-config-changed', source: CLIENT, config: config });
    } catch (err) {
      /* channel closed - ignore */
    }
  }

  function persistLocal() {
    try {
      localStorage.setItem(KEY, JSON.stringify(config));
    } catch (err) {
      if (window.console) console.warn('[apex-settings] localStorage write failed', err);
    }
  }

  function save(opts) {
    opts = opts || {};
    config.updatedAt = new Date().toISOString();
    persistLocal();
    idbPut(clone(config));
    if (opts.broadcast !== false) broadcast();
    emit('local');
    return config;
  }

  function load() {
    var local = readLocal();
    config = normalize(local);
    emit('load');
    if (!local) {
      /* First run: publish the defaults synchronously so ApexOS always has a
         config to read. The IndexedDB copy is only used to recover a config
         whose localStorage entry was cleared. */
      persistLocal();
      idbGet().then(function (stored) {
        if (readLocal() || !stored) return;
        config = normalize(stored);
        emit('restore');
        save({ broadcast: true });
      });
    }
    return config;
  }

  function reset() {
    config = defaults();
    try {
      localStorage.removeItem(KEY);
    } catch (err) {
      /* ignore */
    }
    withDB(function (db) {
      db.transaction(DB_STORE, 'readwrite').objectStore(DB_STORE).delete(KEY);
      return true;
    });
    save();
    return config;
  }

  function replace(next) {
    config = normalize(next);
    save();
    return config;
  }

  function onChange(fn) {
    listeners.push(fn);
    return function off() {
      var i = listeners.indexOf(fn);
      if (i !== -1) listeners.splice(i, 1);
    };
  }

  if (channel) {
    channel.addEventListener('message', function (event) {
      var data = event.data || {};
      if (data.type !== 'apex-config-changed' || data.source === CLIENT) return;
      config = normalize(data.config);
      emit('remote');
    });
  }

  window.addEventListener('storage', function (event) {
    if (event.key !== KEY || !event.newValue) return;
    try {
      config = normalize(JSON.parse(event.newValue));
      emit('remote');
    } catch (err) {
      /* ignore malformed payloads */
    }
  });

  window.ApexSettings = {
    key: KEY,
    channelName: CHANNEL_NAME,
    providers: PROVIDERS,
    clientId: CLIENT,
    apps: APPS,
    defaults: defaults,
    get: function () { return config; },
    load: load,
    save: save,
    reset: reset,
    replace: replace,
    normalize: normalize,
    onChange: onChange
  };
})();
