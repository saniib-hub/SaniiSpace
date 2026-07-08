/**
 * Internet Smart Hub — free backend for the website's quote/order forms.
 *
 * WHAT THIS DOES
 * Every quote, order, or inquiry submitted on the website (repairs, gaming
 * PC, software, cell phone repairs, workstation, printing, stock inquiries,
 * web design briefs) gets:
 *   1. Appended as a new row in a Google Sheet, so you have one place to
 *      see everything customers have requested.
 *   2. Emailed straight to your inbox automatically, the moment it comes
 *      in — no need to open the Sheet to notice a new ticket.
 * All for free, with no server or database to manage.
 *
 * SETUP (about 5 minutes, no cost)
 * 1. Go to https://sheets.google.com and create a new blank spreadsheet.
 *    Name it something like "Internet Smart Hub — Orders".
 * 2. In the sheet, go to Extensions -> Apps Script.
 * 3. Delete anything in the editor and paste in this entire file.
 * 4. If you want the notification emails sent to a different address than
 *    internetsmarthub@gmail.com, change the NOTIFY_EMAIL constant below.
 * 5. Click the Save icon (or Ctrl+S).
 * 6. Click Deploy -> New deployment.
 *      - Click the gear icon next to "Select type" and choose "Web app".
 *      - Description: anything, e.g. "Website orders".
 *      - Execute as: Me (your Google account).
 *      - Who has access: Anyone.
 *      - Click Deploy.
 * 7. Google will ask you to authorize the script — click through the
 *    prompts (Advanced -> Go to [project name] -> Allow). This is safe;
 *    it's your own script running under your own account. The email step
 *    needs this same authorization (it sends as you, via Gmail's free
 *    quota of ~100 emails/day on a personal Google account).
 * 8. Copy the "Web app URL" it shows you (ends in /exec).
 * 9. Open js/backend-config.js in the website project and paste that URL
 *    between the quotes on the ISH_BACKEND_ENDPOINT_URL line.
 * 10. Push that change to the site. New submissions will now appear as
 *     rows in your spreadsheet AND land in your inbox within seconds.
 *
 * If you already deployed an earlier version of this script and are just
 * updating it (e.g. to add the email step), you don't need a new URL:
 * Deploy -> Manage deployments -> edit (pencil icon) -> New version ->
 * Deploy. The existing /exec URL in backend-config.js keeps working.
 *
 * NOTE ON WHATSAPP: Google Apps Script can send email for free, but there
 * is no free, official way to send WhatsApp messages automatically —
 * WhatsApp's own Business API requires a paid Meta Business account and
 * approved message templates. Customers can still send you their ticket
 * via WhatsApp themselves with one tap (the "Send via WhatsApp" button on
 * the site), but the shop side can't auto-send WhatsApp messages for free.
 */

var NOTIFY_EMAIL = 'internetsmarthub@gmail.com';

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  // Add a header row the first time this runs on an empty sheet.
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Timestamp', 'Type', 'ID', 'Name', 'Email', 'Contact', 'Total', 'Summary']);
  }

  var data = {};
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    data = {};
  }

  sheet.appendRow([
    data.timestamp || new Date().toISOString(),
    data.type || '',
    data.id || '',
    data.name || '',
    data.email || '',
    data.contact || '',
    data.total || '',
    data.summary || ''
  ]);

  try {
    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      subject: 'New ' + (data.type || 'Website Submission') + (data.id ? ' — ' + data.id : ''),
      body: buildEmailBody(data)
    });
  } catch (mailErr) {
    // The Sheet row above is already saved even if the email send fails
    // (e.g. daily Gmail quota reached), so no submission is lost.
  }

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function buildEmailBody(data) {
  return [
    'A new ticket/order just came in from the website.',
    '',
    'Type: ' + (data.type || ''),
    'ID: ' + (data.id || ''),
    'Name: ' + (data.name || ''),
    'Email: ' + (data.email || ''),
    'Contact: ' + (data.contact || ''),
    'Total: ' + (data.total != null && data.total !== '' ? 'R' + data.total : 'N/A'),
    '',
    data.summary || ''
  ].join('\n');
}
