(function () {
  var openBtn = document.getElementById('chatOpen');
  var panel = document.getElementById('chatPanel');
  if (!openBtn || !panel) return;
  var endpoint = openBtn.getAttribute('data-endpoint');
  var log = document.getElementById('chatLog');
  var form = document.getElementById('chatForm');
  var input = document.getElementById('chatInput');

  var store = {
    get: function (k, d) { try { var v = sessionStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  var sid = store.get('ad_chat_sid', null);
  if (!sid) {
    sid = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2);
    store.set('ad_chat_sid', sid);
  }
  var history = store.get('ad_chat_hist', []);
  var asked = history.filter(function (m) { return m.role === 'user'; }).length;
  var busy = false;

  function bubble(role, text) {
    var div = document.createElement('div');
    div.className = 'msg msg-' + (role === 'user' ? 'user' : 'bot');
    div.textContent = text;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }

  function updateFoot() { input.disabled = false; }

  function render() {
    log.textContent = '';
    bubble('bot', 'Hai! Selamat datang ke AD Project. Ada apa yang boleh kami bantu tentang baju custom, harga, design atau tempahan?');
    history.forEach(function (m) { bubble(m.role, m.content); });
    updateFoot();
  }

  function open() { panel.hidden = false; render(); setTimeout(function () { input.focus(); }, 50); }
  function close() { panel.hidden = true; openBtn.focus(); }

  openBtn.addEventListener('click', open);
  document.getElementById('chatClose').addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) close(); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text || busy) return;
    input.value = '';
    history.push({ role: 'user', content: text.slice(0, 500) });
    asked++;
    store.set('ad_chat_hist', history);
    bubble('user', text);
    var typing = bubble('bot', '...');
    typing.classList.add('msg-typing');
    busy = true; input.disabled = true;

    fetch(endpoint + '?action=chat', {
      method: 'POST',
      // text/plain mengelakkan preflight CORS pada Apps Script
      body: JSON.stringify({ sid: sid, messages: history.slice(-10) })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var reply = (d && d.reply) ? String(d.reply) : 'Maaf, sila cuba sebentar lagi.';
        typing.remove();
        bubble('bot', reply);
        history.push({ role: 'assistant', content: reply });
        store.set('ad_chat_hist', history);
      })
      .catch(function () {
        typing.remove();
        bubble('bot', 'Maaf, sambungan terputus. Sila cuba lagi.');
        history.pop(); asked--;
        store.set('ad_chat_hist', history);
      })
      .then(function () {
        busy = false;
        updateFoot();
        if (!input.disabled) input.focus();
      });
  });
})();
