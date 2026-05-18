/**
 * Real calendar OAuth via local bridge (integrations/calendar).
 */
(function (global) {
  var SESSION_KEY = 'cp_calendar_session_id';
  var API_BASE = global.CALENDAR_API_BASE || 'http://127.0.0.1:3849';

  function getSessionId() {
    var id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11);
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }

  function apiProvider(uiProvider) {
    var p = String(uiProvider || '').toLowerCase();
    if (p === 'outlook') return 'microsoft';
    if (p === 'other') return 'calendly';
    return p;
  }

  function uiProvider(serverProvider) {
    if (serverProvider === 'microsoft') return 'outlook';
    return serverProvider;
  }

  async function bridgeReachable() {
    try {
      var r = await fetch(API_BASE + '/health', { method: 'GET' });
      return r.ok;
    } catch (e) {
      return false;
    }
  }

  async function getBridgeStatus() {
    var r = await fetch(API_BASE + '/api/calendar/status');
    if (!r.ok) throw new Error('Calendar bridge unavailable');
    return r.json();
  }

  async function isConfigured(uiProvider) {
    try {
      var st = await getBridgeStatus();
      var key = apiProvider(uiProvider);
      return st.providers && st.providers[key] && st.providers[key].configured;
    } catch (e) {
      return false;
    }
  }

  function startSignIn(uiProvider, returnUrl) {
    var session = getSessionId();
    var p = apiProvider(uiProvider);
    var url =
      API_BASE +
      '/api/calendar/auth/' +
      encodeURIComponent(p) +
      '?session=' +
      encodeURIComponent(session) +
      '&returnUrl=' +
      encodeURIComponent(returnUrl || location.href.split('#')[0]);
    location.href = url;
  }

  async function getConnection() {
    var session = getSessionId();
    var r = await fetch(API_BASE + '/api/calendar/connection?session=' + encodeURIComponent(session));
    return r.json();
  }

  async function syncBusySlots(days) {
    var session = getSessionId();
    var r = await fetch(API_BASE + '/api/calendar/busy?session=' + encodeURIComponent(session) + '&days=' + (days || 21));
    var data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Sync failed');
    return data;
  }

  async function disconnect() {
    var session = getSessionId();
    await fetch(API_BASE + '/api/calendar/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session: session }),
    });
  }

  /** After OAuth redirect: ?calendar_connected=outlook&calendar_email= */
  function applyOAuthReturnParams() {
    var q = new URLSearchParams(location.search);
    var connected = q.get('calendar_connected');
    var email = q.get('calendar_email') || '';
    var err = q.get('calendar_error');
    if (!connected && !err) return null;

    if (err) {
      q.delete('calendar_error');
      history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q.toString() : '') + location.hash);
      return { error: err };
    }

    var ui = uiProvider(connected);
    if (typeof CPConfig !== 'undefined') {
      CPConfig.save({
        calendarConnected: true,
        calendarProvider: ui,
        calendarAccountEmail: email,
        calendarOAuth: true,
      });
    }

    q.delete('calendar_connected');
    q.delete('calendar_email');
    history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q.toString() : '') + location.hash);
    return { connected: ui, email: email };
  }

  async function connectAndSync(uiProvider, returnUrl) {
    if (!(await bridgeReachable())) {
      return { mode: 'demo', error: 'Calendar bridge not running. Start: cd integrations/calendar && npm start' };
    }
    if (!(await isConfigured(uiProvider))) {
      return {
        mode: 'demo',
        error: 'OAuth credentials not set for ' + uiProvider + '. See integrations/calendar/GOOGLE_SETUP.md',
      };
    }
    startSignIn(uiProvider, returnUrl);
    return { mode: 'redirect' };
  }

  /** One-click Google Calendar OAuth. */
  function connectGoogle(returnUrl) {
    return connectAndSync('google', returnUrl);
  }

  async function refreshFromServer() {
    var conn = await getConnection();
    if (!conn.connected) return null;
    var data = await syncBusySlots(21);
    if (typeof CPConfig !== 'undefined') {
      CPConfig.save({
        calendarConnected: true,
        calendarProvider: uiProvider(data.provider),
        calendarAccountEmail: data.email || conn.email || '',
        calendarBusySlots: data.slots || [],
        calendarOAuth: true,
      });
    }
    if (typeof CPConfig !== 'undefined' && CPConfig.notifyCalendarUi) CPConfig.notifyCalendarUi();
    return data;
  }

  global.CPCalendarOAuth = {
    API_BASE: API_BASE,
    getSessionId: getSessionId,
    bridgeReachable: bridgeReachable,
    isConfigured: isConfigured,
    startSignIn: startSignIn,
    connectAndSync: connectAndSync,
    connectGoogle: connectGoogle,
    getConnection: getConnection,
    syncBusySlots: syncBusySlots,
    disconnect: disconnect,
    applyOAuthReturnParams: applyOAuthReturnParams,
    refreshFromServer: refreshFromServer,
    apiProvider: apiProvider,
    uiProvider: uiProvider,
  };
})(typeof window !== 'undefined' ? window : global);
