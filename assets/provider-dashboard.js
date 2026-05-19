/**
 * Provider portal — login, stats, caller options, integrations, bookings.
 */
(function (global) {
  function cfg() {
    return typeof CPConfig !== 'undefined' ? CPConfig.load() : {};
  }

  function toast(msg) {
    var el = document.getElementById('portal-save-msg');
    if (el) {
      el.textContent = msg;
      setTimeout(function () {
        el.textContent = '';
      }, 3000);
    }
  }

  function renderStats() {
    var el = document.getElementById('portal-stats');
    if (!el) return;
    var s = CPConfig.getBookingStats();
    var syncPct = s.total ? Math.round((s.synced / s.total) * 100) : 0;
    el.innerHTML =
      '<article class="stat-card"><p class="stat-label">Total booked</p><p class="stat-value">' +
      s.total +
      '</p></article>' +
      '<article class="stat-card"><p class="stat-label">Phone</p><p class="stat-value">' +
      s.phone +
      '</p></article>' +
      '<article class="stat-card"><p class="stat-label">Chat</p><p class="stat-value">' +
      s.chat +
      '</p></article>' +
      '<article class="stat-card"><p class="stat-label">Today</p><p class="stat-value">' +
      s.today +
      '</p></article>' +
      '<article class="stat-card"><p class="stat-label">Last 7 days</p><p class="stat-value">' +
      s.week +
      '</p></article>' +
      '<article class="stat-card"><p class="stat-label">Calendar synced</p><p class="stat-value">' +
      (s.total ? syncPct + '%' : '—') +
      '</p></article>';
  }

  function loadCallerOptions() {
    var c = cfg();
    var tag = document.getElementById('portal-tagline');
    var svc = document.getElementById('portal-services');
    var chat = document.getElementById('portal-chat-welcome');
    var phone = document.getElementById('portal-phone-greeting');
    if (tag) tag.value = c.tagline || '';
    if (svc) {
      svc.value =
        c.servicesText && String(c.servicesText).trim()
          ? c.servicesText
          : CPConfig.servicesToText(c.services);
    }
    if (chat) chat.value = c.chatWelcome || '';
    if (phone) phone.value = c.phoneGreeting || '';
  }

  function renderIntegrations() {
    var c = cfg();
    var statusEl = document.getElementById('portal-cal-status');
    var offEl = document.getElementById('portal-cal-off');
    var onEl = document.getElementById('portal-cal-on');
    var emailEl = document.getElementById('portal-cal-email');
    var listEl = document.getElementById('portal-cal-busy');
    var phoneInp = document.getElementById('portal-phone');

    if (statusEl) {
      statusEl.textContent = c.calendarConnected ? 'Connected' : 'Not connected';
      statusEl.className = 'demo-status ' + (c.calendarConnected ? 'on' : 'off');
    }
    if (offEl) offEl.hidden = !!c.calendarConnected;
    if (onEl) onEl.hidden = !c.calendarConnected;
    if (emailEl) emailEl.textContent = c.calendarAccountEmail || '';
    if (phoneInp) phoneInp.value = c.vapiPhoneNumber || '';

    if (listEl && c.calendarConnected) {
      listEl.innerHTML = CPConfig.getBusySlots()
        .map(function (s) {
          var start = new Date(s.start);
          var booked = s.source === 'booking';
          return (
            '<div class="cal-import-row">' +
            (s.title || 'Busy') +
            ' · ' +
            start.toLocaleString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            }) +
            ' · busy' +
            (booked ? ' <span style="color:#00e89b">· booking</span>' : '') +
            '</div>'
          );
        })
        .join('');
    } else if (listEl) listEl.innerHTML = '';
  }

  function renderBookedCalls() {
    var tbody = document.getElementById('portal-calls-body');
    var empty = document.getElementById('portal-calls-empty');
    if (!tbody) return;
    var calls = cfg().bookedCalls || [];
    tbody.innerHTML = '';
    renderStats();
    if (!calls.length) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    calls.forEach(function (row) {
      var tr = document.createElement('tr');
      var at = new Date(row.at);
      tr.innerHTML =
        '<td>' +
        at.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) +
        '</td><td>' +
        (row.channel || 'phone') +
        '</td><td>' +
        (row.callerName || '—') +
        '</td><td>' +
        (row.service || '—') +
        '</td><td>' +
        (row.slotLabel || '—') +
        '</td><td>' +
        (row.calendarSynced ? '<span class="pill on">Synced</span>' : '<span class="pill">Sample</span>') +
        '</td>';
      tbody.appendChild(tr);
    });
  }

  function showDashboard() {
    document.getElementById('portal-login').hidden = true;
    document.getElementById('portal-dash').hidden = false;
    var c = cfg();
    document.getElementById('portal-biz-name').value = c.businessName || '';
    document.getElementById('portal-pw').value = c.portalPassword || 'demo';
    loadCallerOptions();
    renderStats();
    renderIntegrations();
    renderBookedCalls();
    updateBridgeUi();
  }

  function showLogin() {
    document.getElementById('portal-login').hidden = false;
    document.getElementById('portal-dash').hidden = true;
  }

  function updateBridgeUi() {
    var googleBtn = document.getElementById('portal-google-connect');
    if (googleBtn) googleBtn.hidden = !!cfg().calendarConnected;
  }

  async function handleOAuthReturn() {
    if (!global.CPCalendarOAuth) return;
    var ret = CPCalendarOAuth.applyOAuthReturnParams();
    if (ret && ret.connected) {
      try {
        await CPCalendarOAuth.refreshFromServer();
        if (CPConfig.isPortalLoggedIn()) renderIntegrations();
        if (global.CPCalendarStatus) CPCalendarStatus.notify();
        toast('Calendar connected.');
      } catch (e) {}
    }
  }

  function initPortal() {
    handleOAuthReturn();

    if (CPConfig.isPortalLoggedIn()) {
      showDashboard();
      updateBridgeUi();
    } else showLogin();

    document.getElementById('portal-login-btn').onclick = function () {
      var pw = document.getElementById('portal-login-pw').value;
      if (CPConfig.checkPortalPassword(pw)) {
        CPConfig.setPortalLoggedIn(true);
        document.getElementById('portal-login-err').hidden = true;
        showDashboard();
      } else {
        document.getElementById('portal-login-err').hidden = false;
      }
    };

    document.getElementById('portal-logout').onclick = function () {
      CPConfig.setPortalLoggedIn(false);
      showLogin();
    };

    document.getElementById('portal-save-biz').onclick = function () {
      CPConfig.save({
        businessName: document.getElementById('portal-biz-name').value.trim() || 'BookRing Demo',
        portalPassword: document.getElementById('portal-pw').value.trim() || 'demo',
      });
      toast('Account settings saved.');
    };

    document.getElementById('portal-save-caller').onclick = function () {
      var servicesText = document.getElementById('portal-services').value;
      var services = CPConfig.parseServicesFromText(servicesText);
      CPConfig.save({
        tagline: document.getElementById('portal-tagline').value.trim(),
        servicesText: servicesText,
        services: services,
        chatWelcome: document.getElementById('portal-chat-welcome').value.trim(),
        phoneGreeting: document.getElementById('portal-phone-greeting').value.trim(),
      });
      toast('Caller & chat options saved — open the demos to preview.');
    };

    var picker = document.getElementById('portal-cal-picker');
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

    var googleBtn = document.getElementById('portal-google-connect');
    if (googleBtn) {
      googleBtn.onclick = function () {
        CPCalendarOAuth.connectGoogle(location.href.split('#')[0]);
      };
    }

    document.getElementById('portal-cal-connect').onclick = function () {
      if (!global.CPCalendarOAuth) return;
      var p = selected === 'outlook' || selected === 'calendly' ? selected : 'google';
      CPCalendarOAuth.startSignIn(p, location.href.split('#')[0]);
    };

    document.getElementById('portal-cal-sync').onclick = async function () {
      if (global.CPCalendarOAuth && cfg().calendarOAuth) {
        try {
          await CPCalendarOAuth.refreshFromServer();
          renderIntegrations();
          if (global.CPCalendarStatus) CPCalendarStatus.notify();
          toast('Live busy times synced.');
          return;
        } catch (e) {
          toast(e.message || 'Sync failed');
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
      renderIntegrations();
      if (global.CPCalendarStatus) CPCalendarStatus.notify();
      toast('Busy times refreshed.');
    };

    document.getElementById('portal-cal-disconnect').onclick = async function () {
      if (global.CPCalendarOAuth && cfg().calendarOAuth) {
        try {
          await CPCalendarOAuth.disconnect();
        } catch (e) {}
      }
      CPConfig.save({
        calendarConnected: false,
        calendarProvider: '',
        calendarAccountEmail: '',
        calendarBusySlots: [],
        calendarOAuth: false,
      });
      renderIntegrations();
      if (global.CPCalendarStatus) CPCalendarStatus.notify();
      toast('Calendar disconnected.');
    };

    document.getElementById('portal-save-phone').onclick = function () {
      CPConfig.save({ vapiPhoneNumber: document.getElementById('portal-phone').value.trim() });
      toast('Booking line saved.');
    };

    global.addEventListener('cp-config-change', function () {
      if (CPConfig.isPortalLoggedIn()) {
        renderStats();
        renderIntegrations();
        renderBookedCalls();
      }
    });
  }

  global.CPProviderPortal = { initPortal: initPortal, renderBookedCalls: renderBookedCalls, renderStats: renderStats };
})(typeof window !== 'undefined' ? window : global);
