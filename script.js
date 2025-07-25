(() => {
  const KEY = 'ic_pair_csv';

  // ─── Init CSV (with header) if not present ───────────────────────────────
  function initCSV() {
    if (!localStorage.getItem(KEY)) {
      // change the header columns to whatever you actually need
      localStorage.setItem(KEY, 'ts,first,second,result,resultEmoji,resultIsNew\n');
    }
  }

  // ─── helper to escape one CSV field ───────────────────────────────────────
  function escapeCsvField(val) {
    const s = String(val === null || val === undefined ? '' : val);
    // double any quotes
    const escaped = s.replace(/"/g, '""');
    // wrap in quotes if it has commas, quotes or newlines
    if (/,|"|\r|\n/.test(s)) {
      return `"${escaped}"`;
    }
    return escaped;
  }

  // ─── Append one line to the CSV (now fully robust) ─────────────────────────
  function appendCSV({ ts, request, response }) {
    const cells = [
      ts,
      request.first,
      request.second,
      response.result,
      response.emoji,
      response.isNew
    ].map(escapeCsvField);

    // join and add newline
    const line = cells.join(',') + '\n';

    localStorage.setItem(
      KEY,
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
    position: 'fixed', bottom: '10px', left: '110px',
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

  panel.append('Lines: ', cntSpan, dlBtn);
  // panel.append('Lines: ', cntSpan, dlBtn, clrBtn);
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
      if (copy.status == 200) {
        try { data = await copy.json() }
        catch { data = await copy.text() }
      } else {
        data = { result: null, emoji: null, isNew: null };
      }

      // only store a tiny “response code” or summary field here:
      appendCSV({ ts: Date.now(), request: req,
                  response: data });
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