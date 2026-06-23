(function () {
  var script = document.currentScript;
  var endpoint =
    (script && script.getAttribute('data-endpoint')) ||
    window.CAUSALFUNNEL_ENDPOINT ||
    'http://localhost:4000/api/events';
  var storageKey = 'causalfunnel_session_id';

  function getSessionId() {
    var current = localStorage.getItem(storageKey);
    if (current) return current;

    var generated =
      'sess_' +
      Date.now().toString(36) +
      '_' +
      Math.random().toString(36).slice(2, 10);

    localStorage.setItem(storageKey, generated);
    document.cookie = storageKey + '=' + generated + '; path=/; max-age=2592000; SameSite=Lax';
    return generated;
  }

  function pageMetrics() {
    var doc = document.documentElement;
    var body = document.body || {};

    return {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      document: {
        width: Math.max(doc.scrollWidth, body.scrollWidth || 0, doc.clientWidth),
        height: Math.max(doc.scrollHeight, body.scrollHeight || 0, doc.clientHeight)
      }
    };
  }

  function sendEvent(type, details) {
    var metrics = pageMetrics();
    var payload = Object.assign(
      {
        session_id: getSessionId(),
        type: type,
        page_url: window.location.href,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        referrer: document.referrer,
        viewport: metrics.viewport,
        document: metrics.document
      },
      details || {}
    );

    var body = JSON.stringify(payload);

    if (navigator.sendBeacon) {
      var blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon(endpoint, blob)) return;
    }

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body,
      keepalive: true
    }).catch(function () {});
  }

  window.CausalFunnelTracker = { track: sendEvent, sessionId: getSessionId };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      sendEvent('page_view');
    });
  } else {
    sendEvent('page_view');
  }

  document.addEventListener(
    'click',
    function (event) {
      sendEvent('click', {
        x: event.pageX,
        y: event.pageY,
        clientX: event.clientX,
        clientY: event.clientY
      });
    },
    true
  );
})();
