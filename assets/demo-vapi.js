/**
 * Live Vapi voice widget — AI assistant + phone demo.
 */
(function (global) {
  var widgetLoading = false;

  var PRESETS = {
    phone: { mountId: 'vapi-mount', hintId: 'vapi-hint', panelId: 'demo-phone' },
    chat: { mountId: 'chat-vapi-mount', hintId: 'chat-vapi-hint', panelId: 'demo-chat' },
  };

  function cfg() {
    return typeof CPConfig !== 'undefined' ? CPConfig.load() : {};
  }

  function vapiCreds() {
    var c = cfg();
    var fromWindow = global.VAPI_DEMO || {};
    return {
      publicKey: String(c.vapiPublicKey || fromWindow.publicKey || '').trim(),
      assistantId: String(c.vapiAssistantId || fromWindow.assistantId || '62cc8a69-c0d5-4efb-a6b5-584c41b6d190').trim(),
    };
  }

  function panelVisible(panelId) {
    var panel = document.getElementById(panelId);
    return panel && panel.classList.contains('on');
  }

  function ensureWidgetScript(cb) {
    if (global.customElements && global.customElements.get('vapi-widget')) {
      cb();
      return;
    }
    var existing = document.querySelector('script[data-vapi-official-widget]');
    if (existing) {
      if (global.customElements && global.customElements.whenDefined) {
        global.customElements.whenDefined('vapi-widget').then(function () {
          cb();
        }).catch(function () {
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
        global.customElements.whenDefined('vapi-widget').then(function () {
          cb();
        }).catch(function () {
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

  function mountWidget(mount, creds, presetKey) {
    var c = cfg();
    var widget = document.createElement('vapi-widget');
    widget.setAttribute('public-key', creds.publicKey);
    widget.setAttribute('assistant-id', creds.assistantId);
    widget.setAttribute('mode', 'voice');
    widget.setAttribute('theme', 'dark');
    widget.setAttribute('accent-color', '#00e89b');
    widget.setAttribute('base-color', '#0e1812');
    widget.setAttribute('main-label', 'Talk to ' + (c.businessName || 'BookRing'));
    widget.setAttribute('start-button-text', 'Start call');
    widget.setAttribute('end-button-text', 'End call');
    widget.setAttribute('empty-voice-message', 'Talk to book an appointment');

    if (presetKey === 'chat') {
      widget.setAttribute('position', 'inline');
      widget.setAttribute('size', 'full');
    } else {
      widget.setAttribute('position', 'inline');
      widget.setAttribute('size', 'full');
    }

    mount.appendChild(widget);
  }

  function renderLiveCall(presetKey) {
    var preset = PRESETS[presetKey] || PRESETS.chat;
    var mount = document.getElementById(preset.mountId);
    var hint = document.getElementById(preset.hintId);
    if (!mount) return;

    if (!panelVisible(preset.panelId)) return;

    var creds = vapiCreds();

    if (!creds.publicKey) {
      mount.innerHTML = '';
      if (hint) hint.textContent = 'Voice assistant is not available right now.';
      return;
    }

    if (presetKey === 'chat') {
      var sub = document.getElementById('chat-hdr-sub');
      if (sub) {
        var tag = cfg().tagline && String(cfg().tagline).trim();
        sub.textContent = tag || 'Voice booking';
      }
    }
    if (hint) hint.textContent = 'Tap Start call — allow microphone access to book by voice.';

    function build() {
      ensureWidgetScript(function (err) {
        if (!panelVisible(preset.panelId)) return;
        if (err) {
          if (hint) hint.textContent = 'Could not load voice assistant. Check your connection and refresh.';
          return;
        }
        mount.innerHTML = '';
        try {
          mountWidget(mount, creds, presetKey);
        } catch (e) {
          if (hint) hint.textContent = 'Could not start assistant. Refresh and try again.';
          console.error(e);
        }
      });
    }

    requestAnimationFrame(function () {
      requestAnimationFrame(build);
    });
  }

  function renderAll() {
    renderLiveCall('chat');
    renderLiveCall('phone');
  }

  function initVapiDemo(presetKey) {
    if (presetKey) {
      renderLiveCall(presetKey);
      return;
    }
    renderAll();
    global.addEventListener('cp-config-change', renderAll);
  }

  global.CPVapiDemo = {
    initVapiDemo: initVapiDemo,
    renderLiveCall: renderLiveCall,
    renderAll: renderAll,
  };
})(typeof window !== 'undefined' ? window : global);
