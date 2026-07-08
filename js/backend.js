/*
 * Best-effort submission to the configured backend endpoint (see
 * backend-config.js). This is additive only — if the endpoint isn't
 * configured, or the request fails (offline, misconfigured, etc.), the
 * ticket/order still works normally via WhatsApp, email, and the local
 * records log. Nothing here is required for the site to function.
 */
window.ISHBackend = (function () {
  function submit(data) {
    var endpoint = window.ISH_BACKEND_ENDPOINT_URL;
    if (!endpoint) {
      return;
    }

    var payload = {
      timestamp: new Date().toISOString(),
      type: data.type || '',
      id: data.id || '',
      name: data.name || '',
      email: data.email || '',
      contact: data.contact || '',
      total: data.total != null ? data.total : '',
      summary: data.summary || ''
    };

    try {
      fetch(endpoint, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      }).catch(function () {
        // Offline or unreachable — ignore, the customer's own
        // WhatsApp/email send is the source of truth either way.
      });
    } catch (e) {
      // fetch unsupported or blocked — ignore for the same reason.
    }
  }

  return { submit: submit };
})();
