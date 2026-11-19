/* Pagina iniziale: legge lo scorrimento e scrive due numeri che il CSS usa per muovere le cose.
   --h sull'apertura (0 a 1 mentre esce), --pr su ogni progetto (0 a 1 mentre resta fermo), --sp sulla barra in alto.
   Avvia e ferma i video del primo progetto solo quando si vedono. Senza JavaScript la pagina si legge lo stesso (--pr vale 1). */
(function () {
  var d = document, root = d.documentElement;
  var hero = d.querySelector('.hero');
  var pins = [].slice.call(d.querySelectorAll('.pin'));
  var barra = d.querySelector('.barra');
  var rail = [].slice.call(d.querySelectorAll('.rail a'));
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var attesa = false;

  function limita(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

  function calcola() {
    attesa = false;
    var vh = window.innerHeight || root.clientHeight;
    var attivo = 0;
    if (hero) {
      var h = hero.getBoundingClientRect();
      hero.style.setProperty('--h', reduce ? '0' : limita(-h.top / (h.height * 0.8)).toFixed(3));
    }
    pins.forEach(function (s, i) {
      var r = s.getBoundingClientRect();
      var campo = r.height - vh + vh * 0.5;
      var p = reduce ? 1 : (campo > 1 ? limita((vh * 0.5 - r.top) / campo) : limita((vh * 0.9 - r.top) / (vh * 0.6)));
      s.style.setProperty('--pr', p.toFixed(3));
      if (r.top < vh * 0.5 && r.bottom > vh * 0.5) attivo = i + 1;
    });
    rail.forEach(function (a, i) { if (i === attivo) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    if (barra) {
      var tot = root.scrollHeight - vh;
      barra.style.setProperty('--sp', tot > 0 ? limita((window.pageYOffset || root.scrollTop) / tot).toFixed(4) : '0');
    }
  }
  function chiedi() { if (!attesa) { attesa = true; requestAnimationFrame(calcola); } }
  window.addEventListener('scroll', chiedi, { passive: true });
  window.addEventListener('resize', chiedi);
  calcola();

  // video del muro: si caricano e partono solo quando sono vicini allo schermo, si fermano quando escono
  var video = [].slice.call(d.querySelectorAll('video[data-src]'));
  if (!reduce && 'IntersectionObserver' in window) {
    var oss = new IntersectionObserver(function (voci) {
      voci.forEach(function (v) {
        var el = v.target;
        if (v.isIntersecting) {
          if (!el.getAttribute('src')) el.setAttribute('src', el.getAttribute('data-src'));
          var pr = el.play();
          if (pr && pr.catch) pr.catch(function () {});
        } else { el.pause(); }
      });
    }, { rootMargin: '150px' });
    video.forEach(function (v) { oss.observe(v); });
  }
})();
