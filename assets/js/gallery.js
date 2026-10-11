(function () {
  var items = Array.prototype.slice.call(document.querySelectorAll('.g-item'));
  if (!items.length) return;
  var idx = 0;
  var box = document.createElement('div');
  box.className = 'lightbox';
  box.hidden = true;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Paparan design');
  box.innerHTML =
    '<button type="button" class="lb-x" aria-label="Tutup">&times;</button>' +
    '<button type="button" class="lb-nav lb-prev" aria-label="Design sebelumnya">&#8249;</button>' +
    '<figure><img alt=""><figcaption></figcaption></figure>' +
    '<button type="button" class="lb-nav lb-next" aria-label="Design seterusnya">&#8250;</button>' +
    '<a class="btn btn-primary lb-order" href="order.html">Tempah design ini</a>';
  document.body.appendChild(box);
  var img = box.querySelector('img'), cap = box.querySelector('figcaption'), order = box.querySelector('.lb-order');

  function show(i) {
    idx = (i + items.length) % items.length;
    var a = items[idx], code = a.getAttribute('data-code');
    img.src = a.getAttribute('href');
    img.alt = 'Design ' + code;
    cap.textContent = 'Design ' + code + '  (' + (idx + 1) + ' / ' + items.length + ')';
    order.href = 'order.html?design=' + encodeURIComponent(code);
  }
  function open(i) { show(i); box.hidden = false; document.body.classList.add('no-scroll'); box.querySelector('.lb-x').focus(); }
  function close() { box.hidden = true; document.body.classList.remove('no-scroll'); items[idx].focus(); }

  items.forEach(function (a, i) {
    a.addEventListener('click', function (e) { e.preventDefault(); open(i); });
  });
  box.querySelector('.lb-x').addEventListener('click', close);
  box.querySelector('.lb-prev').addEventListener('click', function () { show(idx - 1); });
  box.querySelector('.lb-next').addEventListener('click', function () { show(idx + 1); });
  box.addEventListener('click', function (e) { if (e.target === box) close(); });
  document.addEventListener('keydown', function (e) {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });
  // Leret di telefon
  var x0 = null;
  box.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
    x0 = null;
  });
})();
