/**
 * Shared demo + provider config (localStorage).
 */
(function (global) {
  var KEY = 'cp_business_v1';
  var SESSION_KEY = 'cp_portal_session';
  var DEFAULTS = {
    businessName: 'BookRing Demo',
    tagline: 'Book online in seconds',
    portalPassword: 'demo',
    servicesText: 'Standard appointment\nExtended session\nConsultation',
    services: [
      { id: 'svc1', name: 'Standard appointment', desc: '30 min', icon: '✦' },
      { id: 'svc2', name: 'Extended session', desc: '60 min', icon: '◆' },
    ],
    chatWelcome: '',
    phoneGreeting: 'Thank you for calling. I can help you book an appointment.',
    calendarConnected: false,
    calendarProvider: '',
    calendarAccountEmail: '',
    calendarBusySlots: [],
    calendarOAuth: false,
    vapiPhoneNumber: '',
    vapiPublicKey: '',
    vapiAssistantId: '62cc8a69-c0d5-4efb-a6b5-584c41b6d190',
    bookedCalls: [],
  };

  function load() {
    var out = {};
    var k;
    for (k in DEFAULTS) {
      if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) out[k] = DEFAULTS[k];
    }
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        for (k in parsed) {
          if (Object.prototype.hasOwnProperty.call(parsed, k)) out[k] = parsed[k];
        }
      }
    } catch (e) {}
    if (!Array.isArray(out.bookedCalls)) out.bookedCalls = [];
    if (!Array.isArray(out.calendarBusySlots)) out.calendarBusySlots = [];
    if (global.VAPI_DEMO) {
      if (global.VAPI_DEMO.assistantId && String(global.VAPI_DEMO.assistantId).trim()) {
        out.vapiAssistantId = String(global.VAPI_DEMO.assistantId).trim();
      }
      if (global.VAPI_DEMO.publicKey && String(global.VAPI_DEMO.publicKey).trim()) {
        out.vapiPublicKey = String(global.VAPI_DEMO.publicKey).trim();
      }
    }
    return out;
  }

  function save(patch) {
    var next = load();
    var k;
    for (k in patch) {
      if (Object.prototype.hasOwnProperty.call(patch, k)) next[k] = patch[k];
    }
    localStorage.setItem(KEY, JSON.stringify(next));
    try {
      global.dispatchEvent(new CustomEvent('cp-config-change', { detail: next }));
    } catch (e) {}
    return next;
  }

  function providerLabel(provider) {
    var labels = {
      google: 'Google Calendar',
      outlook: 'Microsoft Outlook',
      calendly: 'Calendly',
      other: 'Your calendar',
    };
    return labels[provider] || 'Calendar';
  }

  function busyKey(dateStr, timeStr) {
    var h = String(timeStr || '09:00').split(':')[0];
    return dateStr + '|' + String(h).padStart(2, '0') + ':00';
  }

  function generateDefaultBusySlots() {
    var out = [];
    var now = new Date();
    for (var i = 1; i <= 4; i++) {
      var d = new Date(now);
      d.setDate(d.getDate() + i);
      d.setHours(10 + (i % 3), 0, 0, 0);
      var end = new Date(d);
      end.setMinutes(45);
      out.push({
        title: 'Existing appointment',
        start: d.toISOString(),
        end: end.toISOString(),
        source: 'calendar',
      });
    }
    return out;
  }

  function getBusySlots() {
    var c = load();
    if (!c.calendarConnected) return [];
    if (Array.isArray(c.calendarBusySlots) && c.calendarBusySlots.length) {
      return c.calendarBusySlots;
    }
    return generateDefaultBusySlots();
  }

  function busyKeysFromSlots(slots) {
    var keys = {};
    (slots || []).forEach(function (s) {
      if (!s || !s.start) return;
      var start = new Date(s.start);
      if (isNaN(start.getTime())) return;
      var dk =
        start.getFullYear() +
        '-' +
        String(start.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(start.getDate()).padStart(2, '0');
      keys[busyKey(dk, String(start.getHours()).padStart(2, '0') + ':00')] = true;
    });
    return keys;
  }

  function addBusyFromBooking(entry) {
    if (!entry || !entry.date || !entry.time) return load();
    var c = load();
    var slots = Array.isArray(c.calendarBusySlots) ? c.calendarBusySlots.slice() : [];
    var p = String(entry.date).split('-').map(Number);
    var t = String(entry.time).split(':').map(Number);
    var start = new Date(p[0], p[1] - 1, p[2], t[0], t[1] || 0, 0);
    var end = new Date(start.getTime() + 30 * 60000);
    var isoStart = start.toISOString();
    var title =
      (entry.service || 'Booked appointment') + (entry.callerName ? ' — ' + entry.callerName : '');

    if (!slots.some(function (s) {
      return s.start === isoStart;
    })) {
      slots.push({
        title: title,
        start: isoStart,
        end: end.toISOString(),
        source: entry.channel || 'booking',
      });
    }

    return save({ calendarBusySlots: slots });
  }

  function isPortalLoggedIn() {
    try {
      return sessionStorage.getItem(SESSION_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function setPortalLoggedIn(on) {
    try {
      if (on) sessionStorage.setItem(SESSION_KEY, '1');
      else sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {}
  }

  function checkPortalPassword(pw) {
    var c = load();
    return String(pw || '') === String(c.portalPassword || 'demo');
  }

  function addBookedCall(entry) {
    var c = load();
    var list = Array.isArray(c.bookedCalls) ? c.bookedCalls.slice() : [];
    list.unshift({
      id: 'call_' + Date.now(),
      at: new Date().toISOString(),
      callerName: entry.callerName || 'Caller',
      service: entry.service || 'Appointment',
      slotLabel: entry.slotLabel || '',
      date: entry.date || '',
      time: entry.time || '',
      channel: entry.channel || 'phone',
      calendarSynced: !!c.calendarConnected,
    });
    if (list.length > 50) list.length = 50;
    save({ bookedCalls: list });
    if (c.calendarConnected && entry.date && entry.time) {
      addBusyFromBooking(entry);
    }
    return load();
  }

  function notifyCalendarUi() {
    if (global.CPDemos && CPDemos.renderCalendarDemo) CPDemos.renderCalendarDemo();
    if (global.CPCalendarStatus) CPCalendarStatus.notify();
  }

  function parseServicesFromText(text) {
    var lines = String(text || '')
      .split('\n')
      .map(function (l) {
        return l.trim();
      })
      .filter(Boolean);
    if (!lines.length) return DEFAULTS.services.slice();
    return lines.map(function (name, i) {
      return { id: 'svc_' + i, name: name, desc: '', icon: '✦' };
    });
  }

  function servicesToText(services) {
    if (!Array.isArray(services) || !services.length) return DEFAULTS.servicesText;
    return services
      .map(function (s) {
        return s.name || '';
      })
      .filter(Boolean)
      .join('\n');
  }

  function getServices(c) {
    c = c || load();
    if (c.servicesText && String(c.servicesText).trim()) {
      return parseServicesFromText(c.servicesText);
    }
    if (Array.isArray(c.services) && c.services.length) return c.services;
    return DEFAULTS.services.slice();
  }

  function getBookingStats() {
    var calls = load().bookedCalls || [];
    var now = new Date();
    var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    var stats = { total: calls.length, phone: 0, chat: 0, today: 0, week: 0, synced: 0 };
    calls.forEach(function (row) {
      if (String(row.channel || '').toLowerCase() === 'chat') stats.chat++;
      else stats.phone++;
      if (row.calendarSynced) stats.synced++;
      var at = new Date(row.at);
      if (!isNaN(at.getTime())) {
        if (at >= todayStart) stats.today++;
        if (at >= weekStart) stats.week++;
      }
    });
    return stats;
  }

  global.CPConfig = {
    load: load,
    save: save,
    KEY: KEY,
    providerLabel: providerLabel,
    isPortalLoggedIn: isPortalLoggedIn,
    setPortalLoggedIn: setPortalLoggedIn,
    checkPortalPassword: checkPortalPassword,
    addBookedCall: addBookedCall,
    addBusyFromBooking: addBusyFromBooking,
    getBusySlots: getBusySlots,
    generateDefaultBusySlots: generateDefaultBusySlots,
    busyKey: busyKey,
    busyKeysFromSlots: busyKeysFromSlots,
    notifyCalendarUi: notifyCalendarUi,
    parseServicesFromText: parseServicesFromText,
    servicesToText: servicesToText,
    getServices: getServices,
    getBookingStats: getBookingStats,
  };
})(typeof window !== 'undefined' ? window : global);
