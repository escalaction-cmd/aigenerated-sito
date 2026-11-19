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
    var io=new IntersectionObserver(function(es){es.forEach(function(en){ if(en.isIntersecting){en.target.classList.add('shown'); io.unobserve(en.target);} });},{rootMargin:'0px 0px -8% 0px'});
    els.forEach(function(el){
      var sib=$$(el.parentNode,':scope>.rv').length; el.style.setProperty('--d',Math.min(sib,4)*90+'ms');
      el.classList.add('rv'); io.observe(el);
    });
  }

  // ---------- l'editor dal vivo: l'editor vero su una copertina d'esempio. Una regia con un cursore finto mostra cosa si fa;
  // al primo tocco, clic o tasto si ferma e la pagina si prova davvero. Movimento ridotto: niente regia, editor pronto.
  function editorDemo(root){
    if(!window.Editor||!window.Doc||!window.Disegno)return;
    var box=root.querySelector('.edl-box'), cap=root.querySelector('.edl-cap'), cur=root.querySelector('.edl-cursor'), psd=root.querySelector('.edl-psd'), stage=root.querySelector('.edl-stage'), stopBtn=root.querySelector('[data-stop]');
    var D, steps=[]; try{ D=JSON.parse(root.querySelector('.edl-dati').textContent); steps=JSON.parse(root.getAttribute('data-steps')); }catch(e){ return; }
    var base=root.getAttribute('data-base')||'', lingua=(root.closest('[data-lang]')||document.documentElement).getAttribute('data-lang')||document.documentElement.lang;
    var LOCKS={prezzi:true,immagini:false,titoli:true,posizione:true,validita:false};
    var S={ED:null,sedeDoc:null,ov:{obj:{},nuovi:[]},vista:'sede',fermo:false,stato:'',card:null,titolo:null,x0:0}, timers=[], visibile=false, avviata=false;
    root.__edl=S;
    function esc(t){return String(t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
    function asset(x){ if(!base||/^(data:|blob:|\/)/.test(x))return x; try{var u=new URL(base+x,location.href); return u.pathname+u.search;}catch(e){return x;} }
    function ctx(neg){ var d=D.dati; return {tema:D.tema,off:d.off,nPagina:1,nPagine:1,negozio:neg?{id:'014',name:'Bergamo Centro'}:null,dal:d.dal,al:d.al,legale:d.legale,web:d.web,insegna:d.insegna,tipo:d.tipo,logo:'',asset:asset}; }
    function puoNeg(o,a){
      if(a==='blocca')return false;
      if(a==='aggiungi')return ['testo','immagine','forma'].indexOf(o.t)>=0;
      if(!o.id)return true;
      if(o.lock||(Doc.trova(S.sedeDoc,o.id)&&Doc.bloccato(S.sedeDoc,o.id)))return false;
      if(a==='elimina'&&o.t==='gruppo'&&o.bind&&typeof o.bind.o==='string')return false; if(a==='elimina'&&Doc.obbligatorio(o))return false;
      return true;
    }
    function monta(v){
      S.vista=v; var neg=v==='negozio';
      $$(root,'[data-view]').forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-view')===v));});
      if(S.ED)S.ED.distruggi();
      S.ED=Editor.monta(box,{doc:neg?Doc.perNegozio(S.sedeDoc,S.ov,LOCKS):S.sedeDoc,pagina:0,ctx:function(){return ctx(neg);},ruolo:neg?'negozio':'sede',puo:neg?puoNeg:null,lingua:lingua,
        onCambio:function(d){ if(neg)S.ov=Doc.patch(S.sedeDoc,d,LOCKS); else S.sedeDoc=d; }});
      root.classList.toggle('neg',neg);
    }
    function nuovo(){
      S.sedeDoc={v:1,formati:[{id:D.formato.id,w:D.formato.w,h:D.formato.h,pagine:[JSON.parse(JSON.stringify(D.pagina))]}]}; S.ov={obj:{},nuovi:[]};
      var pg=S.sedeDoc.formati[0].pagine[0], gr=pg.oggetti.filter(function(o){return o.t==='gruppo';}), tit=null;
      Doc.ogni(pg,function(o){ if(!tit&&o.t==='testo'&&o.s&&!o.bind&&/^(Titolo|Title)/.test(o.nome||''))tit=o; });
      S.card=(gr[1]||gr[0]).id; S.titolo=tit&&tit.id; S.x0=Doc.trova(S.sedeDoc,S.card).o.x;
      monta('sede');
    }
    // attese della regia: si ferma per sempre al primo tocco; fuori vista aspetta
    function attesa(ms){ return new Promise(function(ok,ko){ var fine=Date.now()+ms; (function giro(){ var t=setTimeout(function(){ if(S.fermo)return ko(new Error('fermo')); if(!visibile){ fine=Date.now()+ms; return giro(); } if(Date.now()>=fine)return ok(); giro(); },Math.min(120,ms||1)); timers.push(t); })(); }); }
    function di(t){ cap.textContent=t; S.stato=t; }
    function elDi(id){ return box.querySelector('.ed-pagina [data-id="'+id+'"]'); }
    function cursore(el,fx,fy){
      if(!el)return attesa(10);
      var r=el.getBoundingClientRect(), s=stage.getBoundingClientRect();
      cur.style.transform='translate('+Math.round(r.left-s.left+r.width*(fx==null?.5:fx))+'px,'+Math.round(r.top-s.top+r.height*(fy==null?.5:fy))+'px)';
      cur.classList.add('on'); return attesa(780);
    }
    function premi(){ cur.classList.add('giu'); return attesa(200); }
    function lascia(){ cur.classList.remove('giu'); }
    function livelli(){
      var pg=S.ED.doc.formati[0].pagine[0], folder=root.getAttribute('data-folder')||'';
      psd.querySelector('ol').innerHTML=pg.oggetti.slice().reverse().map(function(o,j){
        return '<li class="t-'+o.t+'" style="--j:'+j+'"><i aria-hidden="true"></i><span>'+esc(o.nome||o.t)+'</span>'+(o.t==='gruppo'?'<small>'+esc(folder)+'</small>':'')+'</li>';
      }).join('');
      psd.hidden=false;
    }
    async function regia(){
      try{
        while(true){
          nuovo(); psd.hidden=true; di(steps[0]); await attesa(900);
          await cursore(elDi(S.card),.5,.3); S.ED.seleziona(S.card); await premi();
          for(var i=0;i<12;i++){ S.ED.sposta(S.card,1.4,-0.9); await attesa(45); }
          lascia(); await attesa(450);
          di(steps[1]); await cursore(box.querySelector('.ed-sel .ed-man[data-m="se"]')); await premi();
          for(i=0;i<10;i++){ var o=Doc.trova(S.ED.doc,S.card).o; S.ED.ridimensiona(S.card,{x:o.x,y:o.y,w:o.w*1.025,h:o.h*1.025}); await attesa(45); }
          lascia(); await attesa(450);
          if(S.titolo){
            di(steps[2]); await cursore(elDi(S.titolo),.25,.5); S.ED.seleziona(S.titolo); await premi(); lascia();
            var t=root.getAttribute('data-title')||''; for(i=1;i<=t.length;i++){ S.ED.testo(S.titolo,t.slice(0,i)); await attesa(55); }
            await attesa(550);
            di(steps[3]); await cursore(box.querySelector('.ed-barra [data-ed="blocca"]'),.35,.5); await premi(); S.ED.blocca([S.titolo],true); lascia(); S.ED.seleziona(S.titolo); await attesa(1100);
            di(steps[4]); monta('negozio'); await attesa(650); await cursore(elDi(S.titolo),.4,.5); S.ED.seleziona(S.titolo); await premi(); S.ED.scuoti(); lascia(); await attesa(1300);
          }
          di(steps[5]); await cursore(box.querySelector('.ed-barra [data-ed="testo"]'),.3,.5); await premi(); lascia();
          var nt=S.ED.aggiungi('testo',{s:root.getAttribute('data-store-text'),x:130,y:86,w:66,h:26,pt:22,font:'fd',col:'acink'});
          if(nt){ S.ED.stile(nt,{fill:'ac',alin:'center',v:'middle'}); S.ED.ruota(nt,-6); }
          await attesa(1200);
          di(steps[6]); cur.classList.remove('on'); livelli(); await attesa(4200);
          di(root.getAttribute('data-auto')); await attesa(2200);
        }
      }catch(e){}
    }
    function ferma(){
      if(S.fermo)return; S.fermo=true; timers.forEach(clearTimeout); cur.classList.remove('on','giu');
      di(root.getAttribute('data-try')); if(stopBtn)stopBtn.hidden=true;
    }
    function avvia(){
      if(avviata)return; avviata=true;
      if(reduce){ ferma(); return; }
      regia();
    }
    nuovo();   // l'editor si monta subito: se si montasse all'arrivo, la pagina si allungherebbe mentre si scorre
    // un tocco vero (non della regia) ferma tutto: si prova davvero
    ['pointerdown','keydown','wheel'].forEach(function(t){ root.addEventListener(t,function(e){ if(e.isTrusted&&!e.target.closest('[data-view]'))ferma(); },{passive:true,capture:true}); });
    if(stopBtn)stopBtn.addEventListener('click',ferma);
    $$(root,'[data-view]').forEach(function(b){ b.addEventListener('click',function(){ ferma(); monta(b.getAttribute('data-view')); psd.hidden=true; }); });
    if(hasIO){ new IntersectionObserver(function(es){ es.forEach(function(x){ visibile=x.isIntersecting; if(visibile)avvia(); }); },{threshold:.25}).observe(root); }
    else { visibile=true; avvia(); }
  }

  var pages=$$(document,'[data-lang]');
  pages.forEach(function(p){
    var f=p.querySelector('[data-film]'); if(f)film(f);
    var st=p.querySelector('[data-steps]'); if(st)tabs(st);
    insegne(p);
    var edl=p.querySelector('[data-edl]'); if(edl)editorDemo(edl);
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
