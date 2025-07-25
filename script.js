(() => {
    const STORAGE_KEY = 'ic_pair_log';
  
    // 1) Helpers to read / write / clear the log
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
    }
  
    // Expose for manual inspection
    window.getICLog   = () => loadLog();
    window.clearICLog = clearLog;
  
    console.log('🔧 IC-Patch: helpers installed. Use getICLog() and clearICLog()');
  
    // 2) URL→{first,second} parser
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
  
    // 3) Monkey-patch fetch
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
  
        // 4) Append to our persistent log
        const log = loadLog();
        log.push({
          ts:       Date.now(),
          request,
          response: data
        });
        saveLog(log);
  
        console.log(
          `🧩 paired ${request.first}+${request.second} →`,
          data,
          `(total entries: ${log.length})`
        );
  
        return resp;
      }
      return _fetch.apply(this, arguments);
    };
  
    console.log('✅ Infinite-Craft fetch-patch installed');
  })();