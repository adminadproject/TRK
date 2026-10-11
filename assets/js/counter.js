(function () {
  var box = document.getElementById('shirtStat');
  var num = document.getElementById('shirtCount');
  if (!box || !num) return;

  var KEY = 'ad_shirt_shown';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function fmt(n) { return n.toLocaleString('en-MY') + '+'; }

  function render(target, animate) {
    box.hidden = false;
    if (!animate || reduce) { num.textContent = fmt(target); return; }
    var start = performance.now(), dur = 1200;
    (function tick(now) {
      var p = Math.min(1, (now - start) / dur);
      num.textContent = fmt(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    })(start);
  }

  var cached = 0;
  try { cached = Number(localStorage.getItem(KEY)) || 0; } catch (e) {}
  if (cached > 0) render(cached, false); // papar nilai terakhir serta-merta

  var url = box.getAttribute('data-endpoint');
  if (!url || !window.fetch) return;

  fetch(url + (url.indexOf('?') < 0 ? '?' : '&') + 'stats=1')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      var step = Math.max(1, Number(d.step) || 50);
      var shown = Math.floor((Number(d.total) || 0) / step) * step;
      if (shown <= 0) return; // jangan papar sifar
      try { localStorage.setItem(KEY, String(shown)); } catch (e) {}
      render(shown, shown !== cached);
    })
    .catch(function () { /* senyap: lencana kekal tersembunyi / nilai cache */ });
})();
