/*
 * Shared helper for rendering a scannable QR code on a ticket/quote result
 * screen. The QR encodes the same plain-text ticket that's sent via
 * WhatsApp/email, so staff can scan it in-store (with any QR reader) and
 * read the order straight off the phone screen — no backend or database
 * lookup required, since this is a static site with nowhere to look it up.
 */
window.ISHTicket = {
  renderQR: function (containerEl, text) {
    if (!containerEl || typeof qrcode === 'undefined') {
      return;
    }

    containerEl.innerHTML = '';

    try {
      var qr = qrcode(0, 'L');
      qr.addData(text);
      qr.make();

      containerEl.innerHTML = qr.createImgTag(4, 8);

      var img = containerEl.querySelector('img');
      if (img) {
        img.alt = 'QR code for this ticket — scan in-store to show your order';
        img.style.width = '160px';
        img.style.height = '160px';
      }
    } catch (e) {
      // QR capacity exceeded (very large orders) or generation failed —
      // skip the QR rather than break the rest of the ticket.
      containerEl.innerHTML = '';
    }
  }
};
