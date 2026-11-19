/* Pagina iniziale: legge lo scorrimento e scrive due numeri che il CSS usa per muovere le cose.
   --h sull'apertura (0 a 1 mentre esce), --pr su ogni progetto (0 a 1 mentre resta fermo), --sp sulla barra in alto.
   Avvia e ferma i video del primo progetto solo quando si vedono. Senza JavaScript la pagina si legge lo stesso (--pr vale 1). */
(function () {
  var d = document, root = d.documentElement;
  var hero = d.querySelector('.hero');
  var pins = [].slice.call(d.querySelectorAll('.pin, .tuo'));
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

  // informativa su privacy e cookie: si apre sopra la pagina, dal modulo e dal piede
  var priv = d.getElementById('privacy');
  if (priv) {
    d.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('[data-apri="privacy"]');
      if (a) { e.preventDefault(); if (priv.showModal) priv.showModal(); else priv.setAttribute('open', ''); return; }
      if (e.target.closest && e.target.closest('[data-chiudi]')) { priv.close(); return; }
      if (e.target === priv) priv.close();
    });
  }

  // il quarto riquadro: chi legge compila i campi, i cinque fili si accendono uno a uno e alla fine si prenota la call su Cal.com
  // (stessa prenotazione di vedeasy.com). Niente parte da solo: i dati escono solo all'invio, verso Cal.com.
  var form = d.getElementById('f-tuo');
  if (form) {
    var CAL = 'https://cal.com/giuseppe-castronovo-ncbsfy/30min';
    var $ = function (id) { return d.getElementById(id); };
    var vis = form.ownerDocument.querySelector('.tuo-vis');
    var fili = [].slice.call(vis.querySelectorAll('.fili .filo'));
    var bozza = $('bozza'), bt = $('b-tit'), bs = $('b-sub');
    var cfg = JSON.parse(form.getAttribute('data-cfg') || '{}');   // messaggi di errore e nomi delle note, nella lingua della pagina
    var MSG = cfg.err || {}, NOTE = cfg.note || {};
    var valori = function () {
      return {
        nome: $('tuo-nome').value.trim(), cognome: $('tuo-cognome').value.trim(), email: $('tuo-email').value.trim(),
        tel: $('tuo-tel').value.trim(), ruolo: $('tuo-ruolo').value.trim(), azienda: $('tuo-azienda').value.trim(),
        progetto: $('tuo-progetto').value.trim(), priv: $('tuo-priv').checked
      };
    };
    var buoni = function (v) {
      return {
        nome: !!v.nome, cognome: !!v.cognome, email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email),
        tel: v.tel.replace(/\D/g, '').length >= 6, ruolo: !!v.ruolo, azienda: !!v.azienda, progetto: !!v.progetto, priv: v.priv
      };
    };
    // cinque gruppi, cinque fili: ogni gruppo completo accende un filo
    var GRUPPI = [['nome', 'cognome'], ['email', 'tel'], ['ruolo', 'azienda'], ['progetto'], ['priv']];
    var accesi = 0;
    var aggiorna = function () {
      var v = valori(), ok = buoni(v), k = 0;
      GRUPPI.forEach(function (g, i) {
        var on = g.every(function (x) { return ok[x]; });
        if (on) k++;
        if (fili[i]) fili[i].classList.toggle('on', on);
      });
      vis.setAttribute('data-k', String(k));
      if (k === 5 && accesi !== 5) { vis.classList.remove('flare'); void vis.offsetWidth; vis.classList.add('flare'); }
      accesi = k;
      bt.textContent = v.progetto;
      bs.textContent = [[v.nome, v.cognome].join(' ').trim(), [v.ruolo, v.azienda].filter(Boolean).join(', ')].filter(Boolean).join(' · ');
      bozza.setAttribute('data-pieno', (v.progetto || v.nome || v.azienda) ? '1' : '0');
    };
    var errore = function (key, on) {
      var el = form.querySelector('[data-err="' + key + '"]'), inp = key === 'priv' ? $('tuo-priv') : $('tuo-' + key);
      if (el) el.textContent = on ? MSG[key] : '';
      if (inp) { if (on) inp.setAttribute('aria-invalid', 'true'); else inp.removeAttribute('aria-invalid'); }
      return on;
    };
    form.addEventListener('input', function (e) { var n = e.target.name; if (MSG[n]) errore(n, false); aggiorna(); });
    $('tuo-priv').addEventListener('change', function () { errore('priv', false); aggiorna(); });
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var v = valori(), ok = buoni(v), male = false;
      Object.keys(MSG).forEach(function (k) { if (errore(k, !ok[k])) male = true; });
      if (male) { var primo = form.querySelector('[aria-invalid="true"]'); if (primo) primo.focus(); return; }
      var note = [NOTE.progetto + ': ' + v.progetto, NOTE.tel + ': ' + v.tel, NOTE.ruolo + ': ' + v.ruolo, NOTE.azienda + ': ' + v.azienda].join('\n');
      var url = CAL + '?name=' + encodeURIComponent(v.nome + ' ' + v.cognome) + '&email=' + encodeURIComponent(v.email) + '&notes=' + encodeURIComponent(note);
      var a = $('tuo-cal'); a.href = url; a.hidden = false; a.parentNode.hidden = false;
      a.click();   // si apre il calendario in una scheda nuova; se il browser lo blocca resta il link
    });
    aggiorna();
  }
})();
