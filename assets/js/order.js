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

      // Respons Apps Script akan menghantar mesej status melalui postMessage.
      window.addEventListener('message', function (event) {
        if (!submissionPending || submissionHandled) return;
        const data = event.data;
        // Terima mesej daripada Google sahaja.
        if (!/^https:\/\/([a-z0-9-]+\.)*(googleusercontent\.com|google\.com)$/.test(event.origin)) return;
        if (!data || data.type !== 'AD_PROJECT_ORDER_RESULT') return;
        submissionHandled = true;
        submissionPending = false;
        if (data.success) {
          showConfirmation(true, data.message || 'Terima kasih. Maklumat tempahan anda telah diterima oleh AD Project.');
        } else {
          showConfirmation(false, data.message || 'Tempahan belum dapat disahkan. Sila cuba sekali lagi atau hubungi admin.');
        }
      });

      function showConfirmation(success, message) {
        form.style.display = 'none';
        confirmationPanel.classList.add('show');
        confirmationTitle.textContent = success ? 'Tempahan berjaya dihantar!' : 'Tempahan belum dapat disahkan';
        confirmationMessage.textContent = message;
        confirmationIcon.textContent = success ? '✓' : '!';
        document.getElementById('catalogPrompt').hidden = !success;
        document.getElementById('telegramBtn').style.display = success ? '' : 'none';
        document.getElementById('confirmationNote').hidden = !success;
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
        if (!ready) type.value = 'ROUNDNECK';
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
        // Jika respons server tidak diterima, pulihkan butang tanpa mendakwa tempahan berjaya.
        window.setTimeout(function () {
          if (submissionHandled) return;
          submissionPending = false;
          submitBtn.disabled = false;
          submitBtn.textContent = 'HANTAR TEMPAHAN ↗';
          const hint = form.querySelector('.submit-hint');
          hint.textContent = 'Jika anda sudah menekan Hantar, sila semak dengan admin sebelum menghantar sekali lagi.';
        }, 15000);
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
  