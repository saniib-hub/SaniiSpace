/**
 * Internet Smart Hub — free backend for the website's quote/order forms.
 *
 * WHAT THIS DOES
 * Every quote, order, or inquiry submitted on the website gets appended
 * as a new row in a Google Sheet, so you have one place to see everything
 * customers have requested — without needing a paid server or database.
 *
 * SETUP (about 5 minutes, no cost)
 * 1. Go to https://sheets.google.com and create a new blank spreadsheet.
 *    Name it something like "Internet Smart Hub — Orders".
 * 2. In the sheet, go to Extensions -> Apps Script.
 * 3. Delete anything in the editor and paste in this entire file.
 * 4. Click the Save icon (or Ctrl+S).
 * 5. Click Deploy -> New deployment.
 *      - Click the gear icon next to "Select type" and choose "Web app".
 *      - Description: anything, e.g. "Website orders".
 *      - Execute as: Me (your Google account).
 *      - Who has access: Anyone.
 *      - Click Deploy.
 * 6. Google will ask you to authorize the script — click through the
 *    prompts (Advanced -> Go to [project name] -> Allow). This is safe;
 *    it's your own script running under your own account.
 * 7. Copy the "Web app URL" it shows you (ends in /exec).
 * 8. Open js/backend-config.js in the website project and paste that URL
 *    between the quotes on the ISH_BACKEND_ENDPOINT_URL line.
 * 9. Push that change to the site. New submissions will now appear as
 *    rows in your spreadsheet within a few seconds.
 *
 * If you ever need to update this script (e.g. add a column), edit it
 * here, save, then Deploy -> Manage deployments -> edit (pencil icon) ->
 * New version -> Deploy. The URL stays the same.
 */

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

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}
