// Folifly landing: film dell'apertura, passi, insegne, lucchetti, comparse, lingua nell'anteprima. Senza librerie.
(function(){
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO='IntersectionObserver' in window;
  function $$(r,s){return [].slice.call(r.querySelectorAll(s));}

  // ---------- film: sei scene in ciclo; pausa, scene cliccabili; fermo fuori schermo; movimento ridotto = ultima scena ferma
  function film(root){
    var stage=root.querySelector('.fstage'), btns=$$(root,'[data-go]'), bars=btns.map(function(b){return b.querySelector('.bar i');});
    var play=root.querySelector('[data-play]'), cap=root.querySelector('[data-cap]');
    var rowsEl=root.querySelector('[data-rows]'), countEl=root.querySelector('[data-count]'), check=root.querySelector('.fcheck');
    var items=$$(root,'.fcheck li'), bad=$$(root,'tr[data-bad]');
    var D=[2700,2900,3400,3500,3000,5000], TH=[1,3,5,7,9];
    var scene=-1, t0=0, elapsed=0, running=false, userPaused=false, visible=false, raf=0, lastN=-1;
    // versioni per negozio: copie della pagina a zone con il loro negozio e, per due, date diverse
    var zmain=root.querySelector('.zmain'), stores=[], d2=root.getAttribute('data-dates2');
    try{stores=JSON.parse(root.getAttribute('data-stores'));}catch(e){}
    [-2,-1,1,2].forEach(function(k,j){
      var c=zmain.cloneNode(true); c.className='mini cl'+(j%2?' chg':''); c.style.setProperty('--k',k);
      var nm=stores[j+1]||''; c.querySelector('.stag').textContent=k<0?nm.split(' ').pop():nm;   // a sinistra si vede solo una striscia: basta il numero
      if(j%2){c.querySelector('.md').textContent=d2; c.querySelector('.mdate').textContent=d2;}
      zmain.parentNode.insertBefore(c,zmain);
    });
    function setScene(i){
      var back=i<scene, c='fstage';
      for(var k=0;k<=i;k++)c+=' ge'+(k+1);
      c+=' at-'+(i+1);
      stage.className=c+(back?' noanim':'');
      if(back){void stage.offsetWidth; requestAnimationFrame(function(){stage.classList.toggle('noanim',false);});}
      scene=i; lastN=-1;
      btns.forEach(function(b,j){b.setAttribute('aria-current',j===i?'step':'false');});
      cap.firstElementChild.textContent=btns[i].getAttribute('data-name');
      cap.lastElementChild.textContent=btns[i].getAttribute('data-text');
    }
    function update(t){
      if(!reduce)bars.forEach(function(b,j){b.style.transform='scaleX('+(j<scene?1:j>scene?0:Math.min(1,t/D[scene]))+')';});
      var r=scene>0?76:Math.round(76*(1-Math.pow(1-Math.min(1,t/1700),3)));
      if(rowsEl.textContent!==String(r))rowsEl.textContent=r;
      var n=scene<2?0:scene>2?9:Math.max(0,Math.min(9,Math.floor((t-700)/250)+1));
      if(n!==lastN){
        lastN=n; countEl.textContent=9-n; check.classList.toggle('done',n>=9);
        items.forEach(function(li,j){li.classList.toggle('ok',n>=TH[j]);});
        bad.forEach(function(tr){tr.classList.toggle('ok',n>=TH[+tr.getAttribute('data-bad')]);});
      }
    }
    function tick(now){
      if(!running)return;
      var t=now-t0;
      if(t>=D[scene]){setScene((scene+1)%6); t0=now; t=0;}
      update(t); raf=requestAnimationFrame(tick);
    }
    function start(){ if(running||userPaused||!visible||reduce)return; running=true; t0=performance.now()-elapsed; raf=requestAnimationFrame(tick); }
    function stop(){ if(!running)return; running=false; cancelAnimationFrame(raf); elapsed=performance.now()-t0; }
    function labels(){ root.classList.toggle('paused',userPaused); play.setAttribute('aria-label',play.getAttribute(userPaused?'data-l-play':'data-l-pause')); }
    btns.forEach(function(b,j){b.addEventListener('click',function(){
      setScene(j); elapsed=0; t0=performance.now();
      update(running?0:1e9);
    });});
    play.addEventListener('click',function(){ userPaused=!userPaused; labels(); if(userPaused)stop(); else start(); });
    root.__film={get scene(){return scene;}, get running(){return running;}};
    if(reduce){ root.classList.add('static'); setScene(5); update(1e9); return; }
    setScene(0); update(0);
    if(hasIO){ new IntersectionObserver(function(es){es.forEach(function(en){visible=en.isIntersecting; if(visible)start(); else stop();});},{threshold:.2}).observe(root); }
    else { visible=true; start(); }
    document.addEventListener('visibilitychange',function(){ if(document.hidden)stop(); else start(); });
  }

  // ---------- i sei passi: avanzano da soli con la barra; si fermano al primo tocco
  function tabs(root){
    var btns=$$(root,'[data-step]'), shots=$$(root,'[data-shot]'), desc=root.querySelector('.step-desc'), cur=0, io=null;
    function go(i,focus){
      cur=i;
      btns.forEach(function(b,j){b.setAttribute('aria-selected',j===i?'true':'false');b.tabIndex=j===i?0:-1;});
      shots.forEach(function(s,j){s.hidden=j!==i;});
      if(desc)desc.textContent=btns[i].getAttribute('data-desc');
      if(focus)btns[i].focus();
    }
    function stopAuto(){ root.classList.toggle('auto',false); root.classList.toggle('hold',false); if(io){io.disconnect();io=null;} }
    btns.forEach(function(b,i){
      b.addEventListener('click',function(){stopAuto();go(i);});
      b.addEventListener('keydown',function(e){
        var k=e.key,n=btns.length;
        if(k==='ArrowDown'||k==='ArrowRight'){e.preventDefault();stopAuto();go((i+1)%n,true);}
        if(k==='ArrowUp'||k==='ArrowLeft'){e.preventDefault();stopAuto();go((i-1+n)%n,true);}
      });
    });
    go(0);
    if(!reduce&&hasIO){
      root.classList.add('auto','hold');
      io=new IntersectionObserver(function(es){es.forEach(function(en){root.classList.toggle('hold',!en.isIntersecting);});},{threshold:.35});
      io.observe(root);
      root.addEventListener('animationend',function(e){ if(e.animationName==='sfill'&&root.classList.contains('auto'))go((cur+1)%btns.length); });
      root.addEventListener('pointerdown',stopAuto);
    }
  }

  // ---------- insegne: le pagine si sfogliano al cambio e la prima volta che si vedono
  function insegne(page){
    var btns=$$(page,'[data-ins]'), sets=$$(page,'[data-pages]');
    function flip(s){ if(reduce)return; s.classList.toggle('flip',false); void s.offsetWidth; s.classList.add('flip'); }
    btns.forEach(function(b){b.addEventListener('click',function(){
      var k=b.getAttribute('data-ins');
      btns.forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false');});
      sets.forEach(function(s){s.hidden=s.getAttribute('data-pages')!==k; if(!s.hidden)flip(s);});
    });});
    var wrap=page.querySelector('.pages-scroll');
    if(wrap&&!reduce&&hasIO&&wrap.getBoundingClientRect().top>innerHeight){
      var io=new IntersectionObserver(function(es){ if(es[0].isIntersecting){ io.disconnect(); sets.forEach(function(s){if(!s.hidden)flip(s);}); } },{threshold:.3});
      io.observe(wrap);
    }
  }

  // ---------- lucchetti: si chiudono uno dopo l'altro quando la sezione entra
  function locks(page){
    var l=page.querySelector('.locks');
    if(!l||reduce||!hasIO||l.getBoundingClientRect().top<innerHeight)return;
    l.classList.add('armed');
    var io=new IntersectionObserver(function(es){ if(es[0].isIntersecting){ io.disconnect(); setTimeout(function(){l.classList.toggle('armed',false);},250); } },{threshold:.6});
    io.observe(l);
  }

  // ---------- comparsa allo scorrere, partendo da uno stato già visibile
  function reveal(page){
    if(reduce||!hasIO)return;
    var sel='.sec .eye,.sec h2,.sec .lead,.steps,.insegne,.pages-scroll,.rule,.wide,.split>figure,.locks,.fmt,.piat .pf,.pts li,.ledger li,.duo article,.trio article,.end h2,.end p,.end .ctas';
    var els=$$(page,sel).filter(function(el){var r=el.getBoundingClientRect(); return r.height>0&&r.top>innerHeight;});
    var io=new IntersectionObserver(function(es){es.forEach(function(en){ if(en.isIntersecting){en.target.classList.add('in'); io.unobserve(en.target);} });},{rootMargin:'0px 0px -8% 0px'});
    els.forEach(function(el){
      var sib=$$(el.parentNode,':scope>.rv').length; el.style.setProperty('--d',Math.min(sib,4)*90+'ms');
      el.classList.add('rv'); io.observe(el);
    });
  }

  var pages=$$(document,'[data-lang]');
  pages.forEach(function(p){
    var f=p.querySelector('[data-film]'); if(f)film(f);
    var st=p.querySelector('[data-steps]'); if(st)tabs(st);
    insegne(p);
    if(!p.hidden){ locks(p); reveal(p); }
  });
  // anteprima: le due lingue nella stessa pagina, si passa con #en
  if(pages.length>1){
    var done={it:1};
    function show(l){
      pages.forEach(function(p){p.hidden=p.getAttribute('data-lang')!==l;});
      document.documentElement.lang=l; window.scrollTo(0,0);
      if(!done[l]){done[l]=1; pages.forEach(function(p){ if(!p.hidden){ locks(p); reveal(p); } });}
    }
    document.addEventListener('click',function(e){
      var b=e.target.closest('[data-lang-to]'); if(!b)return;
      var l=b.getAttribute('data-lang-to'); show(l);
      try{history.replaceState(null,'',l==='en'?'#en':'#it');}catch(err){location.hash=l;}
    });
    function fromHash(){ if(location.hash==='#en')show('en'); else if(location.hash==='#it')show('it'); }
    window.addEventListener('hashchange',fromHash); fromHash();
  }
})();
