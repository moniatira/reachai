/**
 * Calendar tab — real OAuth (Google / Outlook / Calendly) or demo fallback.
 */
(function (global) {
  var LABELS = {
    google: 'Google Calendar',
    outlook: 'Microsoft Outlook',
    calendly: 'Calendly',
  };

  function cfg() {
    return typeof CPConfig !== 'undefined' ? CPConfig.load() : {};
  }

  function toast(title, body) {
    var el = document.createElement('div');
    el.className = 'toast-demo';
    el.innerHTML = '<strong>' + title + '</strong><br>' + (body || '');
    document.body.appendChild(el);
    setTimeout(function () {
      el.remove();
    }, 4200);
  }

  function sampleBusySlots() {
    return CPConfig.getBusySlots();
  }

  function persistBusySlots() {
    var c = cfg();
    var slots =
      Array.isArray(c.calendarBusySlots) && c.calendarBusySlots.length
        ? c.calendarBusySlots
        : CPConfig.generateDefaultBusySlots();
    CPConfig.save({ calendarBusySlots: slots });
    return slots;
  }

  function showOAuthSetup(selected, reachable) {
    var el = document.getElementById('cal-demo-setup');
    if (!el) return;
    el.hidden = false;
    if (!reachable) {
      el.innerHTML =
        '<p><strong>Start the calendar bridge</strong> so sign-in can open:</p>' +
        '<code style="font-size:11px;display:block;margin:8px 0;padding:8px;background:rgba(0,0,0,.3);border-radius:6px">cd integrations/calendar &amp;&amp; npm start</code>' +
        '<p style="margin-top:8px">Then click <strong>Sign in with Google Calendar</strong> again.</p>';
    } else {
      el.innerHTML =
        '<p>Add <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> to <code>integrations/calendar/.env</code> — see <code>GOOGLE_SETUP.md</code>.</p>';
    }
  }

  async function oauthConnect(selected) {
    if (!global.CPCalendarOAuth) {
      toast('OAuth unavailable', 'Calendar bridge script missing.');
      return;
    }
    var reachable = await CPCalendarOAuth.bridgeReachable();
    var configured = reachable && (await CPCalendarOAuth.isConfigured(selected));
    if (!configured) {
      showOAuthSetup(selected, reachable);
      toast(
        reachable ? 'Not configured' : 'Bridge offline',
        reachable
          ? 'Add OAuth credentials in integrations/calendar/.env'
          : 'Run: cd integrations/calendar && npm start'
      );
      return;
    }
    var setup = document.getElementById('cal-demo-setup');
    if (setup) setup.hidden = true;
    toast('Opening sign-in…', 'You will be redirected to ' + (LABELS[selected] || selected) + '.');
    await CPCalendarOAuth.connectAndSync(selected, location.href.split('#')[0]);
  }

  async function updateCalendarBridgeUi() {
    var googleBtn = document.getElementById('cal-demo-google-connect');
    if (!googleBtn || !global.CPCalendarOAuth) return;
    var up = await CPCalendarOAuth.bridgeReachable();
    var googleOk = up && (await CPCalendarOAuth.isConfigured('google'));
    googleBtn.hidden = !googleOk || !!cfg().calendarConnected;
  }

  async function oauthSync() {
    if (global.CPCalendarOAuth && cfg().calendarOAuth) {
      try {
        await CPCalendarOAuth.refreshFromServer();
        renderCalendarDemo();
        toast('Synced', 'Loaded live busy times from your calendar.');
        return;
      } catch (e) {
        toast('Sync failed', e.message || String(e));
        return;
      }
    }
    var c = cfg();
    var existing = Array.isArray(c.calendarBusySlots) ? c.calendarBusySlots : [];
    var seeded = CPConfig.generateDefaultBusySlots();
    var merged = existing.slice();
    seeded.forEach(function (s) {
      if (!merged.some(function (m) {
        return m.start === s.start;
      })) {
        merged.push(s);
      }
    });
    CPConfig.save({ calendarBusySlots: merged });
    renderCalendarDemo();
    toast('Calendar synced', 'Refreshed busy times.');
  }

  async function oauthDisconnect() {
    if (global.CPCalendarOAuth && cfg().calendarOAuth) {
      try {
        await CPCalendarOAuth.disconnect();
      } catch (e) {}
    }
    CPConfig.save({
      calendarConnected: false,
      calendarAccountEmail: '',
      calendarProvider: '',
      calendarBusySlots: [],
      calendarOAuth: false,
    });
    renderCalendarDemo();
    toast('Disconnected', 'Calendar access removed.');
  }

  function renderCalendarDemo() {
    var statusEl = document.getElementById('cal-demo-status');
    var offEl = document.getElementById('cal-demo-off');
    var onEl = document.getElementById('cal-demo-on');
    var emailEl = document.getElementById('cal-demo-email');
    var listEl = document.getElementById('cal-demo-import-list');
    var c = cfg();

    if (statusEl) {
      var label = c.calendarConnected ? 'Connected' : 'Not connected';
      if (c.calendarOAuth) label += ' · live';
      statusEl.textContent = label;
      statusEl.className = 'demo-status ' + (c.calendarConnected ? 'on' : 'off');
    }
    if (offEl) offEl.hidden = !!c.calendarConnected;
    if (onEl) onEl.hidden = !c.calendarConnected;
    if (emailEl) emailEl.textContent = c.calendarAccountEmail || 'your@calendar.com';

    if (listEl && c.calendarConnected) {
      var slots = sampleBusySlots();
      if (!slots.length) {
        listEl.innerHTML =
          '<p style="font-size:12px;color:#7a9488">No busy blocks yet. Sync or book via chat/phone.</p>';
      } else {
        listEl.innerHTML = slots
          .map(function (s) {
            var start = new Date(s.start);
            var isBooked = s.source === 'booking';
            return (
              '<div class="cal-import-row"><strong style="color:#f0f7f3">' +
              (s.title || 'Busy') +
              '</strong> · ' +
              start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) +
              ' ' +
              start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) +
              ' <span style="color:#ff6b6b">busy</span>' +
              (isBooked ? ' <span style="color:#00e89b;font-size:10px">· booking</span>' : '') +
              '</div>'
            );
          })
          .join('');
      }
    }

    if (global.CPCalendarStatus) CPCalendarStatus.notify();
    updateCalendarBridgeUi();
  }

  async function initOAuthSession() {
    if (!global.CPCalendarOAuth) return;
    var ret = CPCalendarOAuth.applyOAuthReturnParams();
    if (ret && ret.error) toast('Sign-in cancelled', ret.error);
    if (ret && ret.connected) {
      try {
        await CPCalendarOAuth.refreshFromServer();
        renderCalendarDemo();
        toast('Connected', 'Signed in — live calendar times loaded.');
      } catch (e) {
        toast('Connected, sync failed', e.message || String(e));
      }
      return;
    }
    if (!(await CPCalendarOAuth.bridgeReachable())) return;
    try {
      var conn = await CPCalendarOAuth.getConnection();
      if (conn.connected) {
        await CPCalendarOAuth.refreshFromServer();
        renderCalendarDemo();
      }
    } catch (e) {}
  }

  function initCalendarDemo() {
    var picker = document.getElementById('cal-demo-picker');
    var selected = 'google';
    if (picker) {
      picker.querySelectorAll('.cal-opt').forEach(function (btn) {
        btn.onclick = function () {
          picker.querySelectorAll('.cal-opt').forEach(function (b) {
            b.classList.remove('sel');
          });
          btn.classList.add('sel');
          selected = btn.getAttribute('data-provider') || 'google';
        };
      });
      var first = picker.querySelector('.cal-opt');
      if (first) first.classList.add('sel');
    }

    var btnConnect = document.getElementById('btn-cal-demo-connect');
    var btnSync = document.getElementById('btn-cal-demo-sync');
    var btnDisconnect = document.getElementById('btn-cal-demo-disconnect');

    if (btnConnect) {
      btnConnect.onclick = function () {
        oauthConnect(selected);
      };
    }
    if (btnSync) {
      btnSync.onclick = function () {
        oauthSync();
      };
    }
    if (btnDisconnect) {
      btnDisconnect.onclick = function () {
        oauthDisconnect();
      };
    }

    global.addEventListener('cp-config-change', function () {
      if (document.getElementById('cal-demo-import-list')) renderCalendarDemo();
    });

    var googleBtn = document.getElementById('cal-demo-google-connect');
    if (googleBtn) {
      googleBtn.onclick = function () {
        oauthConnect('google');
      };
    }

    initOAuthSession();
    renderCalendarDemo();
    updateCalendarBridgeUi();
  }

  global.CPDemos = global.CPDemos || {};
  global.CPDemos.initCalendarDemo = initCalendarDemo;
  global.CPDemos.renderCalendarDemo = renderCalendarDemo;
  global.CPDemos.sampleBusySlots = sampleBusySlots;
  global.CPDemos.persistBusySlots = persistBusySlots;
})(typeof window !== 'undefined' ? window : global);
