(() => {
  const STORAGE_KEY = 'ic_pair_log';

  // ─── 1) Helpers to read / write / clear the log ────────────────────────────
  function loadLog() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }
  function saveLog(log) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  }
  function clearLog() {
    localStorage.removeItem(STORAGE_KEY);
    console.log('✅ Infinite-Craft combo log cleared');
    updateUI();
  }

  // expose for manual inspection
  window.getICLog   = () => loadLog();
  window.clearICLog = clearLog;

  console.log('🔧 IC-Patch: helpers installed. Use getICLog(), clearICLog()');

  // ─── 2) URL → {first,second} parser ────────────────────────────────────────
  function parseQuery(url) {
    try {
      const u = new URL(url, location.origin);
      return {
        first:  u.searchParams.get('first'),
        second: u.searchParams.get('second')
      };
    } catch (e) {
      return null;
    }
  }

  // ─── 3) Monkey-patch fetch ──────────────────────────────────────────────────
  const _fetch = window.fetch;
  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : input.url;
    if (url.includes('/api/infinite-craft/pair')) {
      const request = parseQuery(url);
      const resp    = await _fetch.apply(this, arguments);
      const clone   = resp.clone();
      let data;
      try { data = await clone.json() }
      catch { data = await clone.text() }

      // ─── 4) Append to our persistent log ────────────────────────────────
      const log = loadLog();
      log.push({ ts: Date.now(), request, response: data });
      saveLog(log);
      console.log(`🧩 paired ${request.first}+${request.second} →`, data,
                  `(total entries: ${log.length})`);

      updateUI();  // refresh panel count

      return resp;
    }
    return _fetch.apply(this, arguments);
  };

  console.log('✅ Infinite-Craft fetch-patch installed');

  // ─── 5) Build a little UI panel ───────────────────────────────────────────
  const panel = document.createElement('div');
  panel.style.position   = 'fixed';
  panel.style.top        = '10px';
  panel.style.left       = '10px';
  panel.style.background = 'rgba(255,255,255,0.9)';
  panel.style.border     = '1px solid #333';
  panel.style.padding    = '8px';
  panel.style.fontFamily = 'sans-serif';
  panel.style.fontSize   = '12px';
  panel.style.zIndex     = '99999';
  panel.style.boxShadow  = '0 2px 6px rgba(0,0,0,0.2)';

  // count display
  const countSpan = document.createElement('span');
  countSpan.style.fontWeight = 'bold';

  // download button
  const downloadBtn = document.createElement('button');
  downloadBtn.textContent = 'Download log';
  downloadBtn.style.marginLeft = '6px';
  downloadBtn.onclick = () => {
    const data = JSON.stringify(loadLog(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href       = url;
    a.download   = `${STORAGE_KEY}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // clear button
  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Clear log';
  clearBtn.style.marginLeft = '6px';
  clearBtn.onclick = clearLog;

  panel.append(document.createTextNode('Entries: '), countSpan,
               downloadBtn, clearBtn);

  document.body.append(panel);

  // function to refresh count
  function updateUI() {
    countSpan.textContent = loadLog().length;
  }
  updateUI();
})();