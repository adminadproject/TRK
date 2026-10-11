(function () {
  var form = document.getElementById('trackForm');
  if (!form) return;
  var input = document.getElementById('trackId');
  var btn = document.getElementById('trackBtn');
  var result = document.getElementById('trackResult');
  var steps = Array.prototype.slice.call(document.querySelectorAll('#timeline li'));
  var endpoint = form.getAttribute('data-endpoint');

  function render(d) {
    result.hidden = false;
    document.getElementById('trackNo').textContent = d.id ? ('No. ' + d.id) : '';
    document.getElementById('trackLabel').textContent = d.label || '';
    var step = Number(d.step) || 0;
    result.classList.toggle('is-cancelled', d.state === 'cancelled');
    steps.forEach(function (li, i) {
      li.classList.toggle('done', i + 1 < step || (step === 7 && i === 6));
      li.classList.toggle('current', i + 1 === step && step < 7);
      if (i + 1 === step) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    document.getElementById('trackMsg').textContent = d.message || '';
  }

  function check(id) {
    btn.disabled = true; btn.textContent = 'Menyemak...';
    fetch(endpoint + '?track=' + encodeURIComponent(id) + '&t=' + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.found) {
          render({ id: id, step: 0, label: 'Tempahan tidak ditemui',
            message: 'Sila semak semula nombor tempahan anda (cth. W0006 atau 1001), atau hubungi kami.' });
          return;
        }
        render(d);
        try { history.replaceState(null, '', '?no=' + encodeURIComponent(id)); } catch (e) {}
      })
      .catch(function () {
        render({ id: id, step: 0, label: 'Tidak dapat menyemak sekarang', message: 'Sila cuba sebentar lagi.' });
      })
      .then(function () { btn.disabled = false; btn.textContent = 'Semak Status'; });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var id = input.value.trim().toUpperCase().replace(/\s+/g, '');
    if (!/^(W\d{1,6}|\d{1,7})$/.test(id)) {
      input.focus();
      render({ id: '', step: 0, label: 'Format nombor tidak sah', message: 'Contoh nombor tempahan: W0006 atau 1001.' });
      return;
    }
    input.value = id;
    check(id);
  });

  var q = new URLSearchParams(location.search).get('no');
  if (q) { input.value = q; form.requestSubmit ? form.requestSubmit() : check(q); }
})();
