javascript:(()=>{  
    fetch('https://raw.githubusercontent.com/jajetloh/ic-combo-logger/main/script.js?cachebust='+Date.now())  
      .then(r=>r.text())  
      .then(code=>{  
        // Running this eval as "user code" bypasses CSP
        /* eslint-disable no-eval */  
        eval(code);  
      })  
      .catch(console.error);  
  })();