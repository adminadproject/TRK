    (function () {
      const form = document.getElementById('orderForm');
      const customerName = document.getElementById('customerName');
      const whatsapp = document.getElementById('whatsapp');
      const type = document.getElementById('shirtType');
      const quantity = document.getElementById('quantity');
      const dateNeeded = document.getElementById('dateNeeded');
      const totalPrice = document.getElementById('totalPrice');

      // Tarikh penggunaan tidak boleh dipilih sebelum hari ini.
      const today = new Date();
      const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
        .toISOString().slice(0, 10);
      dateNeeded.min = localToday;
      const unitPrice = document.getElementById('unitPrice');
      const tierLabel = document.getElementById('tierLabel');
      const quantityLabel = document.getElementById('quantityLabel');
      const priceNote = document.getElementById('priceNote');
      const submitBtn = document.getElementById('submitBtn');
      const confirmationPanel = document.getElementById('confirmationPanel');
      const confirmationTitle = document.getElementById('confirmationTitle');
      const confirmationMessage = document.getElementById('confirmationMessage');
      const confirmationIcon = document.getElementById('confirmationIcon');
      let submissionPending = false;
      let submissionHandled = false;

      // ---- Pilihan dari pautan (cth. order.html?jenis=POLO atau ?jenis=ROUNDNECK&lengan=panjang) ----
      const params = new URLSearchParams(location.search);
      const wantedType = (params.get('jenis') || '').toUpperCase();
      const preferredType = ['ROUNDNECK', 'POLO', 'MUSLIMAH'].indexOf(wantedType) >= 0 ? wantedType : 'ROUNDNECK';
      const notesBox = document.getElementById('customerNotes');
      const presetNotes = [];
      if (params.get('lengan') === 'panjang') presetNotes.push('Roundneck lengan panjang.');
      const designCode = (params.get('design') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
      if (designCode) presetNotes.push('Design: ' + designCode + '.');
      if (notesBox && !notesBox.value && presetNotes.length) notesBox.value = presetNotes.join(' ') + ' ';

      // ---- Loading gaya Matrix ----
      const overlay = document.getElementById('matrixOverlay');
      const linesBox = document.getElementById('matrixLines');
      const rain = document.getElementById('matrixRain');
      const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const STEPS = [
        'REKOD TEMPAHAN ANDA.....',
        'BERLARI KE KILANG.....',
        'KETUK PINTU KILANG....',
        'MENYERAHKAN TEMPAHAN ANDA.....'
      ];
      let typingDone = null;   // Promise: selesai menaip semua baris
      let rainTimer = null;

      function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

      async function typeLines() {
        linesBox.textContent = '';
        for (const text of STEPS) {
          const line = document.createElement('div');
          line.className = 'matrix-line';
          linesBox.appendChild(line);
          for (let i = 1; i <= text.length; i++) {
            line.textContent = '> ' + text.slice(0, i);
            await sleep(reduceMotion ? 0 : 28);
          }
          await sleep(reduceMotion ? 150 : 420);
        }
      }

      function startRain() {
        if (reduceMotion || !rain.getContext) return;
        const ctx = rain.getContext('2d');
        const chars = 'ADPROJECT0123456789アイウエオカキクケコサシスセソ';
        let cols, drops;
        function size() {
          rain.width = window.innerWidth; rain.height = window.innerHeight;
          cols = Math.ceil(rain.width / 16); drops = Array(cols).fill(0).map(function () { return Math.random() * -40; });
        }
        size();
        window.addEventListener('resize', size);
        rainTimer = setInterval(function () {
          ctx.fillStyle = 'rgba(0,0,0,0.12)';
          ctx.fillRect(0, 0, rain.width, rain.height);
          ctx.fillStyle = '#22c55e';
          ctx.font = '15px monospace';
          for (let i = 0; i < cols; i++) {
            ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * 16, drops[i] * 16);
            if (drops[i] * 16 > rain.height && Math.random() > 0.975) drops[i] = 0;
            drops[i]++;
          }
        }, 50);
      }

      function showOverlay() {
        overlay.hidden = false;
        document.body.classList.add('no-scroll');
        startRain();
        typingDone = typeLines();
      }

      function hideOverlay() {
        overlay.hidden = true;
        document.body.classList.remove('no-scroll');
        if (rainTimer) { clearInterval(rainTimer); rainTimer = null; }
      }

      // ---- Dialog selepas berjaya ----
      const modal = document.getElementById('doneModal');
      const waNumber = modal.getAttribute('data-wa') || '60126552627';

      function discountUrl(name, orderNo) {
        const msg = 'HELLO ADMIN AD PROJECT, SAYA ' + name + ', NAK DISKAUN UNTUK ORDER ' + (orderNo || '-') + ', BOLEH?';
        return 'https://wa.me/' + waNumber + '?text=' + encodeURIComponent(msg);
      }

      function openModal(name, orderNo) {
        document.getElementById('doneName').textContent = name;
        document.getElementById('doneOrderNo').textContent = orderNo || '-';
        document.querySelectorAll('.discount-link').forEach(function (a) { a.href = discountUrl(name, orderNo); });
        modal.hidden = false;
        document.body.classList.add('no-scroll');
        document.getElementById('doneClose').focus();
      }

      function closeModal() {
        modal.hidden = true;
        document.body.classList.remove('no-scroll');
        confirmationPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      document.getElementById('doneClose').addEventListener('click', closeModal);
      modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

      // Respons Apps Script akan menghantar mesej status melalui postMessage.
      window.addEventListener('message', function (event) {
        if (!submissionPending || submissionHandled) return;
        const data = event.data;
        // Terima mesej daripada Google sahaja.
        if (!/^https:\/\/([a-z0-9-]+\.)*(googleusercontent\.com|google\.com)$/.test(event.origin)) return;
        if (!data || data.type !== 'AD_PROJECT_ORDER_RESULT') return;
        submissionHandled = true;
        submissionPending = false;
        // Tunggu animasi selesai supaya pelanggan nampak semua langkah.
        Promise.resolve(typingDone).then(function () { return sleep(500); }).then(function () {
          hideOverlay();
          if (data.success) {
            showConfirmation(true, data.message || 'Terima kasih. Maklumat tempahan anda telah diterima oleh AD Project.', data.leadId);
            openModal(customerName.value.trim(), data.leadId);
          } else {
            showConfirmation(false, data.message || 'Tempahan belum dapat disahkan. Sila cuba sekali lagi atau hubungi admin.');
          }
        });
      });

      function showConfirmation(success, message, leadId) {
        form.style.display = 'none';
        confirmationPanel.classList.add('show');
        confirmationTitle.textContent = success ? 'Tempahan berjaya dihantar!' : 'Tempahan belum dapat disahkan';
        confirmationMessage.textContent = message;
        confirmationIcon.textContent = success ? '✓' : '!';
        document.getElementById('orderNoLine').hidden = !(success && leadId);
        document.getElementById('orderNoInline').textContent = leadId || '';
        document.getElementById('confirmActions').hidden = !success;
        document.getElementById('failHelp').hidden = success;
        confirmationPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      const tierData = JSON.parse(document.getElementById('tier-data').textContent);
      const tiers = tierData.tiers.map(function (t) {
        return { min: t.min, max: t.max === null ? Infinity : t.max, base: t.base, label: t.label };
      });
      const surcharges = tierData.surcharge;

      function money(value) {
        return 'RM' + Number(value).toLocaleString('en-MY', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
      }

      function updatePrice() {
        const ready = customerName.value.trim().length > 0 &&
                      whatsapp.value.trim().length > 0;

        if (!ready) {
          totalPrice.textContent = '—';
          unitPrice.textContent = '— / helai';
          tierLabel.textContent = 'Isi nama dan WhatsApp dahulu';
          quantityLabel.textContent = '— helai';
          priceNote.textContent = 'Harga akan dipaparkan selepas nama dan nombor WhatsApp diisi.';
          return;
        }

        const qty = Number(quantity.value);
        const tier = tiers.find(item => qty >= item.min && qty <= item.max);

        if (quantity.value === '' || !Number.isInteger(qty) || qty < 10 || !tier) {
          totalPrice.textContent = '—';
          unitPrice.textContent = '— / helai';
          tierLabel.textContent = 'Kuantiti belum sah';
          quantityLabel.textContent = 'Minimum 10 helai';
          priceNote.textContent = 'Masukkan kuantiti sekurang-kurangnya 10 helai untuk melihat harga.';
          return;
        }

        const surcharge = surcharges[type.value] || 0;
        const price = tier.base + surcharge;

        totalPrice.textContent = money(price * qty);
        unitPrice.textContent = money(price) + ' / helai';
        tierLabel.textContent = 'Tier ' + tier.label;
        quantityLabel.textContent = qty.toLocaleString('en-MY') + ' helai';
        // Galakkan pelanggan menambah kuantiti sehingga tier harga seterusnya.
        const currentTierIndex = tiers.indexOf(tier);
        const nextTier = tiers[currentTierIndex + 1];

        if (nextTier) {
          const additionalQty = nextTier.min - qty;
          const nextPrice = nextTier.base + surcharge;
          const savingPerShirt = price - nextPrice;
          priceNote.textContent =
            'Tambah ' + additionalQty.toLocaleString('en-MY') +
            ' helai untuk harga ' + money(nextPrice) + ' / helai (jimat ' +
            money(savingPerShirt) + ' sehelai).';
        } else {
          priceNote.textContent =
            'Tahniah! Anda sudah mencapai tier harga tertinggi kami. ' +
            'Untuk pertanyaan harga diskaun tambahan, hubungi admin AD Project.';
        }
      }

      function updateFormAccess() {
        const ready = customerName.value.trim().length > 0 &&
                      whatsapp.value.trim().length > 0;
        type.disabled = !ready;
        if (!ready) type.value = preferredType;
        updatePrice();
      }

      customerName.addEventListener('input', updateFormAccess);
      whatsapp.addEventListener('input', function () {
        // Benarkan digit sahaja, termasuk apabila pelanggan menampal nombor.
        const digitsOnly = whatsapp.value.replace(/[^0-9]/g, '');
        if (whatsapp.value !== digitsOnly) whatsapp.value = digitsOnly;
        updateFormAccess();
      });
      type.addEventListener('change', updatePrice);
      quantity.addEventListener('input', updatePrice);

      form.addEventListener('submit', function (event) {
        const qty = Number(quantity.value);
        const name = customerName.value.trim();
        const phone = whatsapp.value.trim();

        if (!name || !phone) {
          event.preventDefault();
          alert('Sila isi nama dan nombor WhatsApp terlebih dahulu.');
          (!name ? customerName : whatsapp).focus();
          return;
        }

        if (!/^(0|60)1\d{7,8}$/.test(phone)) {
          event.preventDefault();
          whatsapp.focus();
          alert('Sila masukkan nombor mobile Malaysia yang sah, contoh 0123456789.');
          return;
        }

        if (!Number.isInteger(qty) || qty < 10) {
          event.preventDefault();
          quantity.focus();
          alert('Kuantiti minimum ialah 10 helai.');
          return;
        }

        if (!dateNeeded.value) {
          event.preventDefault();
          dateNeeded.focus();
          alert('Sila pilih tarikh nak guna baju.');
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'SEDANG MENGHANTAR…';
        submissionPending = true;
        submissionHandled = false;
        showOverlay();
        // Jika respons server tidak diterima, pulihkan butang tanpa mendakwa tempahan berjaya.
        window.setTimeout(function () {
          if (submissionHandled) return;
          submissionPending = false;
          hideOverlay();
          submitBtn.disabled = false;
          submitBtn.textContent = 'HANTAR TEMPAHAN ↗';
          const hint = form.querySelector('.submit-hint');
          hint.textContent = 'Jika anda sudah menekan Hantar, sila semak dengan admin sebelum menghantar sekali lagi.';
        }, 25000);
      });

      // ID unik per borang: jika pelanggan tekan Hantar dua kali, server tidak cipta tempahan berganda.
      try {
        document.getElementById('submissionId').value = (window.crypto && crypto.randomUUID)
          ? crypto.randomUUID()
          : 'sub-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
      } catch (err) {
        document.getElementById('submissionId').value = 'sub-' + Date.now().toString(36);
      }

      updateFormAccess();

      // Frame tersembunyi mengekalkan pelanggan pada halaman borang ini.
      const submitFrame = document.createElement('iframe');
      submitFrame.name = 'adProjectSubmitFrame';
      submitFrame.title = 'Penghantaran tempahan AD Project';
      submitFrame.className = 'hidden-submit-frame';
      submitFrame.setAttribute('aria-hidden', 'true');
      document.body.appendChild(submitFrame);
    })();
  