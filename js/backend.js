/*
 * Best-effort submission to whichever backend(s) are configured in
 * backend-config.js. This is additive only — if nothing is configured, or
 * a request fails (offline, misconfigured, etc.), the ticket/order still
 * works normally via the local records log. Nothing here is required for
 * the site to function.
 *
 * Two independent, optional backends:
 *   1. Supabase (recommended) — a real REST API with proper CORS, so
 *      failures are visible in the browser console instead of silently
 *      disappearing. View/export submitted tickets as a spreadsheet-style
 *      grid in the Supabase Table Editor (Table Editor -> tickets ->
 *      Export -> CSV opens straight in Excel/Google Sheets).
 *   2. Google Apps Script — logs to a Google Sheet and emails the shop.
 *      Uses mode: 'no-cors', so the site can't see whether it succeeded;
 *      this is a known limitation of Apps Script Web Apps.
 * Both can be configured at once, or just one, or neither.
 */
window.ISHBackend = (function () {
  function buildPayload(data) {
    return {
      timestamp: new Date().toISOString(),
      type: data.type || '',
      id: data.id || '',
      name: data.name || '',
      email: data.email || '',
      contact: data.contact || '',
      total: data.total != null ? data.total : '',
      summary: data.summary || ''
    };
  }

  function submitToSupabase(payload) {
    var url = window.ISH_SUPABASE_URL;
    var key = window.ISH_SUPABASE_ANON_KEY;
    if (!url || !key) {
      return;
    }

    try {
      fetch(url.replace(/\/$/, '') + '/rest/v1/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': key,
          'Authorization': 'Bearer ' + key,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          ticket_timestamp: payload.timestamp,
          type: payload.type,
          ticket_id: payload.id,
          name: payload.name,
          email: payload.email,
          contact: payload.contact,
          total: payload.total === '' ? null : payload.total,
          summary: payload.summary
        })
      }).then(function (response) {
        if (!response.ok) {
          response.text().then(function (text) {
            console.error('Supabase ticket log failed (HTTP ' + response.status + '): ' + text);
          });
        }
      }).catch(function (err) {
        console.error('Supabase ticket log request failed:', err);
      });
    } catch (e) {
      console.error('Supabase ticket log error:', e);
    }
  }

  function submitToAppsScript(payload) {
    var endpoint = window.ISH_BACKEND_ENDPOINT_URL;
    if (!endpoint) {
      return;
    }

    try {
      fetch(endpoint, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      }).catch(function () {
        // Offline or unreachable — ignore, Supabase (if configured) and
        // the local records log are still the source of truth.
      });
    } catch (e) {
      // fetch unsupported or blocked — ignore for the same reason.
    }
  }

  function submit(data) {
    var payload = buildPayload(data);
    submitToSupabase(payload);
    submitToAppsScript(payload);
  }

  return { submit: submit };
})();
