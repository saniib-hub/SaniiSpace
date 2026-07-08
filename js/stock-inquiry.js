document.addEventListener('DOMContentLoaded', function () {
  var dialog = document.getElementById('stockInquiryDialog');
  var closeBtn = document.getElementById('stockInquiryClose');
  var form = document.getElementById('stockInquiryForm');
  var formView = document.getElementById('stockInquiryFormView');
  var resultView = document.getElementById('stockInquiryResult');
  var restartBtn = document.getElementById('stockInquiryRestart');
  var titleEl = document.getElementById('stockInquiryTitle');
  var introEl = document.getElementById('stockInquiryIntro');

  var supportsDialog = dialog && typeof dialog.showModal === 'function';
  var triggerButtons = document.querySelectorAll('.stock-inquiry-btn');

  if (!supportsDialog || !form || !triggerButtons.length) {
    return;
  }

  var messageInput = document.getElementById('stockInquiryMessage');
  var messageError = document.getElementById('stockInquiryMessageError');
  var nameInput = document.getElementById('stockInquiryName');
  var nameError = document.getElementById('stockInquiryNameError');
  var contactInput = document.getElementById('stockInquiryContact');

  var currentStockType = 'Second-Hand';

  function resetDialog(stockType) {
    form.reset();
    messageError.textContent = '';
    nameError.textContent = '';
    messageInput.removeAttribute('aria-invalid');
    nameInput.removeAttribute('aria-invalid');
    formView.hidden = false;
    resultView.hidden = true;

    if (stockType) {
      currentStockType = stockType;
    }
    titleEl.textContent = 'Ask About ' + currentStockType + ' Stock';
    introEl.textContent = 'Tell us what ' + currentStockType.toLowerCase() + ' item you\'re looking for and we\'ll get back to you.';
  }

  triggerButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      resetDialog(button.getAttribute('data-stock-type'));
      dialog.showModal();
    });
  });

  closeBtn.addEventListener('click', function () {
    dialog.close();
  });

  dialog.addEventListener('click', function (event) {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  restartBtn.addEventListener('click', function () {
    resetDialog();
  });

  function addDetailRow(container, label, value) {
    var row = document.createElement('div');
    var dt = document.createElement('dt');
    var dd = document.createElement('dd');
    dt.textContent = label;
    dd.textContent = value;
    row.appendChild(dt);
    row.appendChild(dd);
    container.appendChild(row);
  }

  function generateInquiryId() {
    var year = new Date().getFullYear();
    var random = Math.floor(1000 + Math.random() * 9000);
    return 'ISH-STOCK-' + year + '-' + random;
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var isValid = true;
    var message = messageInput.value.trim();
    var name = nameInput.value.trim();
    var contact = contactInput.value.trim();

    if (!message) {
      messageError.textContent = 'Please tell us what you\'re looking for.';
      messageInput.setAttribute('aria-invalid', 'true');
      isValid = false;
    } else {
      messageError.textContent = '';
      messageInput.removeAttribute('aria-invalid');
    }

    if (!name) {
      nameError.textContent = 'Please enter your name.';
      nameInput.setAttribute('aria-invalid', 'true');
      isValid = false;
    } else {
      nameError.textContent = '';
      nameInput.removeAttribute('aria-invalid');
    }

    if (!isValid) {
      return;
    }

    var inquiryId = generateInquiryId();

    var messageLines = [
      'Internet Smart Hub — Stock Inquiry ' + inquiryId,
      'Stock Type: ' + currentStockType,
      'Message: ' + message,
      'Name: ' + name,
      contact ? 'Contact: ' + contact : null
    ].filter(function (line) { return line !== null; });
    var fullMessage = messageLines.join('\n');

    var detailsEl = document.getElementById('stockInquiryResultDetails');
    detailsEl.innerHTML = '';
    addDetailRow(detailsEl, 'Inquiry ID', inquiryId);
    addDetailRow(detailsEl, 'Stock Type', currentStockType);
    addDetailRow(detailsEl, 'Message', message);
    addDetailRow(detailsEl, 'Name', name);
    if (contact) addDetailRow(detailsEl, 'Contact', contact);

    var emailHref = 'mailto:internetsmarthub@gmail.com?subject=' +
      encodeURIComponent('Stock Inquiry ' + inquiryId + ' (' + currentStockType + ')') +
      '&body=' + encodeURIComponent(fullMessage);

    var emailLink = document.getElementById('stockInquiryEmailLink');
    emailLink.href = emailHref;

    var whatsappLink = document.getElementById('stockInquiryWhatsappLink');
    whatsappLink.href = 'https://wa.me/27697304534?text=' + encodeURIComponent(fullMessage);

    /*
     * Backend integration point: this inquiry is not stored or emailed
     * automatically — clicking "Send Email" below opens the customer's own
     * email client with the message pre-filled (mailto: links cannot send
     * mail directly from JavaScript). To send this automatically without
     * the customer's own email client, POST it to a backend endpoint or a
     * service like Formspree here instead.
     */
    if (window.ISHRecords) {
      window.ISHRecords.save({
        id: inquiryId,
        type: 'Stock Inquiry (' + currentStockType + ')',
        summary: fullMessage,
        total: null,
        details: fullMessage
      });
    }

    formView.hidden = true;
    resultView.hidden = false;

    // Open the customer's email client immediately with the message ready
    window.location.href = emailHref;
  });
});
