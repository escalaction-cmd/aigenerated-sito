// Folifly landing: passi, insegne, lingua nell'anteprima. Senza librerie.
(function(){
  function tabs(root){
    var btns=[].slice.call(root.querySelectorAll('[data-step]'));
    var shots=[].slice.call(root.querySelectorAll('[data-shot]'));
    var desc=root.querySelector('.step-desc');
    function go(i,focus){
      btns.forEach(function(b,j){b.setAttribute('aria-selected',j===i?'true':'false');b.tabIndex=j===i?0:-1;});
      shots.forEach(function(s,j){s.hidden=j!==i;});
      if(desc)desc.textContent=btns[i].getAttribute('data-desc');
      if(focus)btns[i].focus();
    }
    btns.forEach(function(b,i){
      b.addEventListener('click',function(){go(i);});
      b.addEventListener('keydown',function(e){
        var k=e.key,n=btns.length;
        if(k==='ArrowDown'||k==='ArrowRight'){e.preventDefault();go((i+1)%n,true);}
        if(k==='ArrowUp'||k==='ArrowLeft'){e.preventDefault();go((i-1+n)%n,true);}
      });
    });
    go(0);
  }
  function insegne(page){
    var btns=[].slice.call(page.querySelectorAll('[data-ins]'));
    var sets=[].slice.call(page.querySelectorAll('[data-pages]'));
    btns.forEach(function(b){b.addEventListener('click',function(){
      var k=b.getAttribute('data-ins');
      btns.forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false');});
      sets.forEach(function(s){s.hidden=s.getAttribute('data-pages')!==k;});
    });});
  }
  var pages=[].slice.call(document.querySelectorAll('[data-lang]'));
  pages.forEach(function(p){
    var st=p.querySelector('[data-steps]'); if(st)tabs(st);
    insegne(p);
  });
  // anteprima: le due lingue nella stessa pagina, si passa con #en
  if(pages.length>1){
    function show(l){
      pages.forEach(function(p){p.hidden=p.getAttribute('data-lang')!==l;});
      document.documentElement.lang=l; window.scrollTo(0,0);
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
