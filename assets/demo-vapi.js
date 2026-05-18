/**
 * Live Vapi voice call in the browser (opens real assistant widget).
 */
(function (global) {
  var widgetLoading = false;

  function cfg() {
    return typeof CPConfig !== 'undefined' ? CPConfig.load() : {};
  }

  function ensureWidgetScript(cb) {
    if (global.customElements && global.customElements.get('vapi-widget')) {
      cb();
      return;
    }
    var existing = document.querySelector('script[data-vapi-official-widget]');
    if (existing) {
      if (global.customElements && global.customElements.whenDefined) {
        global.customElements.whenDefined('vapi-widget').then(cb).catch(function () {
          cb();
        });
      } else {
        setTimeout(cb, 400);
      }
      return;
    }
    if (widgetLoading) {
      setTimeout(function () {
        ensureWidgetScript(cb);
      }, 200);
      return;
    }
    widgetLoading = true;
    var s = document.createElement('script');
    s.src = 'https://unpkg.com/@vapi-ai/client-sdk-react/dist/embed/widget.umd.js';
    s.async = true;
    s.setAttribute('data-vapi-official-widget', '1');
    s.onload = function () {
      widgetLoading = false;
      if (global.customElements && global.customElements.whenDefined) {
        global.customElements.whenDefined('vapi-widget').then(cb).catch(function () {
          cb();
        });
      } else {
        setTimeout(cb, 300);
      }
    };
    s.onerror = function () {
      widgetLoading = false;
      cb(new Error('Could not load Vapi widget'));
    };
    document.head.appendChild(s);
  }

  function renderLiveCall() {
    var mount = document.getElementById('vapi-mount');
    var hint = document.getElementById('vapi-hint');
    var keyRow = document.getElementById('vapi-key-row');
    if (!mount) return;

    var c = cfg();
    var publicKey = String(c.vapiPublicKey || '').trim();
    var assistantId = String(c.vapiAssistantId || '').trim();

    if (!publicKey) {
      mount.innerHTML = '';
      if (hint) {
        hint.textContent =
          'Add your Vapi public API key to open a live call (Dashboard → API Keys, or assets/vapi-demo.config.js).';
      }
      if (keyRow) keyRow.hidden = false;
      return;
    }

    if (keyRow) keyRow.hidden = true;
    if (hint) {
      hint.textContent = 'Click Start call — allow microphone access to talk to your booking assistant.';
    }

    ensureWidgetScript(function (err) {
      if (err) {
        if (hint) hint.textContent = 'Could not load Vapi. Check your network and try again.';
        return;
      }
      mount.innerHTML = '';
      var widget = document.createElement('vapi-widget');
      widget.setAttribute('public-key', publicKey);
      widget.setAttribute('assistant-id', assistantId);
      widget.setAttribute('mode', 'voice');
      widget.setAttribute('theme', 'dark');
      widget.setAttribute('position', 'inline');
      widget.setAttribute('size', 'full');
      widget.setAttribute('accent-color', '#00e89b');
      widget.setAttribute('base-color', '#0e1812');
      widget.setAttribute('main-label', 'Talk to ' + (c.businessName || 'BookRing'));
      widget.setAttribute('start-button-text', 'Start call');
      widget.setAttribute('end-button-text', 'End call');
      widget.setAttribute('empty-voice-message', 'Open a live call with your booking assistant');
      mount.appendChild(widget);
    });
  }

  function initVapiDemo() {
    var keyInp = document.getElementById('vapi-key-inp');
    var keyBtn = document.getElementById('vapi-key-save');
    if (keyBtn && keyInp) {
      var c = cfg();
      if (c.vapiPublicKey && !keyInp.value) keyInp.value = c.vapiPublicKey;
      keyBtn.onclick = function () {
        var key = keyInp.value.trim();
        if (!key) return;
        CPConfig.save({ vapiPublicKey: key });
        renderLiveCall();
      };
    }
    renderLiveCall();
    global.addEventListener('cp-config-change', renderLiveCall);
  }

  global.CPVapiDemo = { initVapiDemo: initVapiDemo, renderLiveCall: renderLiveCall };
})(typeof window !== 'undefined' ? window : global);
