/**
 * Calendar tab — opens provider sign-in directly (no OAuth error UI).
 */
(function (global) {
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

  function returnUrl() {
    return location.href.split('#')[0];
  }

  function openSignIn(provider) {
    if (!global.CPCalendarOAuth) return;
    var setup = document.getElementById('cal-demo-setup');
    if (setup) setup.hidden = true;
    CPCalendarOAuth.startSignIn(provider || 'google', returnUrl());
  }

  function updateCalendarBridgeUi() {
    var googleBtn = document.getElementById('cal-demo-google-connect');
    var offEl = document.getElementById('cal-demo-off');
    if (googleBtn) googleBtn.hidden = !!cfg().calendarConnected;
    if (offEl) offEl.hidden = !!cfg().calendarConnected;
  }

  async function oauthSync() {
    if (global.CPCalendarOAuth && cfg().calendarOAuth) {
      try {
        await CPCalendarOAuth.refreshFromServer();
        renderCalendarDemo();
        toast('Synced', 'Calendar busy times updated.');
        return;
      } catch (e) {
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
  }

  function renderCalendarDemo() {
    var statusEl = document.getElementById('cal-demo-status');
    var offEl = document.getElementById('cal-demo-off');
    var onEl = document.getElementById('cal-demo-on');
    var emailEl = document.getElementById('cal-demo-email');
    var listEl = document.getElementById('cal-demo-import-list');
    var c = cfg();

    if (statusEl) {
      statusEl.textContent = c.calendarConnected ? 'Connected' : 'Not connected';
      statusEl.className = 'demo-status ' + (c.calendarConnected ? 'on' : 'off');
    }
    if (offEl) offEl.hidden = !!c.calendarConnected;
    if (onEl) onEl.hidden = !c.calendarConnected;
    if (emailEl) emailEl.textContent = c.calendarAccountEmail || 'your@calendar.com';

    if (listEl && c.calendarConnected) {
      var slots = CPConfig.getBusySlots();
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
    if (ret && ret.connected) {
      try {
        await CPCalendarOAuth.refreshFromServer();
        renderCalendarDemo();
        toast('Connected', 'Your calendar is linked.');
      } catch (e) {}
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
    var googleBtn = document.getElementById('cal-demo-google-connect');

    if (googleBtn) {
      googleBtn.onclick = function () {
        openSignIn('google');
      };
    }
    if (btnConnect) {
      btnConnect.onclick = function () {
        openSignIn(selected === 'outlook' || selected === 'calendly' ? selected : 'google');
      };
    }
    if (btnSync) btnSync.onclick = function () {
      oauthSync();
    };
    if (btnDisconnect) btnDisconnect.onclick = function () {
      oauthDisconnect();
    };

    global.addEventListener('cp-config-change', function () {
      if (document.getElementById('cal-demo-import-list')) renderCalendarDemo();
    });

    initOAuthSession();
    renderCalendarDemo();
  }

  global.CPDemos = global.CPDemos || {};
  global.CPDemos.initCalendarDemo = initCalendarDemo;
  global.CPDemos.renderCalendarDemo = renderCalendarDemo;
  global.CPDemos.persistBusySlots = function () {
    var c = cfg();
    var slots =
      Array.isArray(c.calendarBusySlots) && c.calendarBusySlots.length
        ? c.calendarBusySlots
        : CPConfig.generateDefaultBusySlots();
    CPConfig.save({ calendarBusySlots: slots });
    return slots;
  };
})(typeof window !== 'undefined' ? window : global);
