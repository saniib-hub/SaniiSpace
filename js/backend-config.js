/*
 * Backend configuration. Leave everything empty and the site still works
 * exactly the same (tickets still generate, QR codes still show) —
 * nothing breaks. These are purely additive: every ticket/order also
 * gets sent wherever is configured below.
 *
 * ---------- OPTION 1: Supabase (recommended) ----------
 * A free, proper database with a real API — unlike Apps Script below, a
 * failed submission shows up as a visible error in the browser console
 * instead of silently vanishing.
 *
 *   1. Go to https://supabase.com, sign up free, and create a new project.
 *   2. In the project, open the SQL Editor and run the contents of
 *      backend/supabase-schema.sql from this repo. This creates a
 *      `tickets` table that the public website is allowed to INSERT into
 *      (and nothing else — customers can't read other people's tickets).
 *   3. Go to Project Settings -> API. Copy the "Project URL" and the
 *      "anon public" API key.
 *   4. Paste them into ISH_SUPABASE_URL and ISH_SUPABASE_ANON_KEY below.
 *   5. Push. New tickets now appear as rows in Table Editor -> tickets.
 *      Use the "Export" button there to download a CSV, which opens
 *      directly in Excel or Google Sheets — your spreadsheet view.
 *
 *   Optional: to also keep pushing new tickets into an actual Google
 *   Sheet automatically, set up a Supabase Database Webhook (Database ->
 *   Webhooks -> Create a new hook -> table: tickets, event: Insert,
 *   type: HTTP Request) pointing at your Apps Script URL below. No code
 *   change needed for that — it's a one-time dashboard setup.
 *
 * ---------- OPTION 2: Google Apps Script ----------
 * Free, logs to a Google Sheet and emails the shop automatically. Uses a
 * request mode that can't report failures back to the site, so problems
 * are harder to diagnose than Supabase.
 *
 *   1. Create a Google Sheet, then Extensions -> Apps Script, paste in
 *      the contents of backend/google-apps-script.js from this repo.
 *   2. Deploy -> New deployment -> type "Web app".
 *        Execute as: Me
 *        Who has access: Anyone
 *   3. Click Deploy, authorize it, then copy the Web App URL it gives you
 *      (ends in /exec) into ISH_BACKEND_ENDPOINT_URL below.
 */
window.ISH_SUPABASE_URL = 'https://ifohpehukfwefulbcqtw.supabase.co';
window.ISH_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlmb2hwZWh1a2Z3ZWZ1bGJjcXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NDg2ODcsImV4cCI6MjA5OTEyNDY4N30.arhShJyHF6nULGWxgDNlL7FniZRDoITFFqiYw6o2LEU';

window.ISH_BACKEND_ENDPOINT_URL = 'https://script.google.com/macros/s/AKfycbyQGnLbudf0PvNDiEcDM64Zz0RC14TIXXtu0kkDBy1IFibN6PJb2QZroNHU-5Rrcog9NQ/exec';
