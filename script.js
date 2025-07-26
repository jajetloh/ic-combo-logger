(() => {
  const KEY = 'ic_pair_csv';

  // ─── Init CSV (with header) if not present ───────────────────────────────
  function initCSV() {
    if (!localStorage.getItem(KEY)) {
      // change the header columns to whatever you actually need
      localStorage.setItem(KEY, 'ts,first,second,response\n');
    }
  }

  // ─── Append one line to the CSV ───────────────────────────────────────────
  function appendCSV({ ts, request, response }) {
    // pick a small “responseCode” field, or whatever tiny summary you like:
    let code = (response && response.code) || response || '';
    // escape any commas/linebreaks in code
    code = String(code).replace(/"/g, '""');
    const line = `${ts},${request.first},${request.second},"${code}"\n`;
    localStorage.setItem(KEY,
      localStorage.getItem(KEY) + line
    );
  }

  // ─── UI helpers ────────────────────────────────────────────────────────────
  function getCSV() {
    return localStorage.getItem(KEY);
  }
  function clearCSV() {
    localStorage.removeItem(KEY);
    initCSV();
    updateUI();
    console.log('✅ CSV log cleared');
  }
  window.getICCSV = getCSV;
  window.clearICLog = clearCSV;

  // ─── Build the little panel ───────────────────────────────────────────────
  const panel = document.createElement('div');
  Object.assign(panel.style, {
    position: 'fixed', top: '10px', left: '10px',
    background: '#fff', border: '1px solid #333',
    padding: '8px', font: '12px sans-serif',
    zIndex: 99999, boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
  });

  const cntSpan = document.createElement('span');
  const dlBtn   = document.createElement('button');
  const clrBtn  = document.createElement('button');

  dlBtn.textContent  = 'Download CSV';
  clrBtn.textContent = 'Clear log';
  dlBtn.style.marginLeft = clrBtn.style.marginLeft = '6px';

  dlBtn.onclick = () => {
    const blob = new Blob([getCSV()], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'ic_pair_log.csv';
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  clrBtn.onclick = clearCSV;

  panel.append('Lines: ', cntSpan, dlBtn, clrBtn);
  document.body.append(panel);

  function updateUI() {
    const text = getCSV() || '';
    // count non-header lines:
    const lines = text.split('\n').filter((l,i) => i>0 && l.trim());
    cntSpan.textContent = lines.length;
  }

  // ─── Monkey-patch fetch ─────────────────────────────────────────────────────
  function parseQuery(url) {
    try {
      const u = new URL(url, location.origin);
      return { first: u.searchParams.get('first'),
               second: u.searchParams.get('second') };
    } catch (e) {
      return null;
    }
  }

  const _fetch = window.fetch;
  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : input.url;
    if (url.includes('/api/infinite-craft/pair')) {
      const req  = parseQuery(url);
      const resp = await _fetch.apply(this, arguments);
      const copy = resp.clone();
      let data;
      try { data = await copy.json() }
      catch { data = await copy.text() }

      // only store a tiny “response code” or summary field here:
      appendCSV({ ts: Date.now(), request: req,
                  response: (data && data.code) || '' });
      console.log(`🧩 ${req.first}+${req.second} →`, data);

      updateUI();
      return resp;
    }
    return _fetch.apply(this, arguments);
  };

  // ─── Kick things off ───────────────────────────────────────────────────────
  initCSV();
  updateUI();
  console.log('✅ Infinite-Craft CSV-patch installed');
})();