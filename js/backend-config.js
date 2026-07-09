/*
 * Backend endpoint configuration.
 *
 * Leave ENDPOINT_URL empty and the site works exactly as before (tickets
 * still show, WhatsApp/email links still work) — nothing breaks.
 *
 * To turn on the free Google Sheets backend:
 *   1. Create a new Google Sheet.
 *   2. Extensions -> Apps Script, paste in the contents of
 *      backend/google-apps-script.js from this repo, and save.
 *   3. Deploy -> New deployment -> type "Web app".
 *        Execute as: Me
 *        Who has access: Anyone
 *   4. Click Deploy, authorize it, then copy the Web App URL it gives you.
 *   5. Paste that URL below between the quotes.
 *
 * Every quote/order submitted on the site will then also appear as a new
 * row in that spreadsheet (in addition to the WhatsApp/email the customer
 * sends themselves).
 */
window.ISH_BACKEND_ENDPOINT_URL = 'https://script.google.com/macros/s/AKfycbyQGnLbudf0PvNDiEcDM64Zz0RC14TIXXtu0kkDBy1IFibN6PJb2QZroNHU-5Rrcog9NQ/exec';
