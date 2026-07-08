document.addEventListener('DOMContentLoaded', function () {
  var dialog = document.getElementById('printingDialog');
  var closeBtn = document.getElementById('printingClose');
  var form = document.getElementById('printingForm');
  var formView = document.getElementById('printingFormView');
  var resultView = document.getElementById('printingResult');
  var restartBtn = document.getElementById('printingRestart');

  var supportsDialog = dialog && typeof dialog.showModal === 'function';

  if (!supportsDialog || !form) {
    return;
  }

  var serviceTypeSelect = document.getElementById('printingServiceType');
  var itemTypeGroup = document.getElementById('printingItemTypeGroup');
  var quantityInput = document.getElementById('printingQuantity');
  var quantityHint = document.getElementById('printingQuantityHint');
  var quantityError = document.getElementById('printingQuantityError');
  var contactNameInput = document.getElementById('printingContactName');
  var contactMethodInput = document.getElementById('printingContactMethod');
  var contactNameError = document.getElementById('printingContactNameError');
  var contactMethodError = document.getElementById('printingContactMethodError');

  var QUANTITY_RANGES = {
    'Bundle Prints': { min: 1, max: 10000, hint: 'Any quantity — let us know how many.' },
    'Embroidery Bulk': { min: 10, max: 1000, hint: 'Bulk orders from 10 to 1000 pieces.' },
    'Clothes Printing': { min: 10, max: 1000, hint: 'Bulk orders from 10 to 1000 pieces.' },
    'Sheet Printing': { min: 100, max: 100000, hint: 'Bulk orders from 100 to 100,000 sheets.' },
    'Poster Printing': { min: 10, max: 300, hint: 'Bulk orders from 10 to 300 copies.' }
  };

  var GARMENT_SERVICES = ['Embroidery Bulk', 'Clothes Printing'];

  function updateForServiceType() {
    var serviceType = serviceTypeSelect.value;
    var range = QUANTITY_RANGES[serviceType];

    itemTypeGroup.hidden = GARMENT_SERVICES.indexOf(serviceType) === -1;

    if (range) {
      quantityInput.min = range.min;
      quantityInput.max = range.max;
      quantityInput.placeholder = 'e.g. ' + range.min;
      quantityHint.textContent = range.hint;
    }
  }

  function resetDialog(presetServiceType) {
    form.reset();
    if (presetServiceType) {
      serviceTypeSelect.value = presetServiceType;
    }
    updateForServiceType();
    quantityError.textContent = '';
    contactNameError.textContent = '';
    contactMethodError.textContent = '';
    contactNameInput.removeAttribute('aria-invalid');
    contactMethodInput.removeAttribute('aria-invalid');
    quantityInput.removeAttribute('aria-invalid');
    formView.hidden = false;
    resultView.hidden = true;
  }

  serviceTypeSelect.addEventListener('change', updateForServiceType);

  document.querySelectorAll('.printing-open-card').forEach(function (card) {
    var serviceType = card.getAttribute('data-service-type');

    function open(event) {
      event.preventDefault();
      resetDialog(serviceType);
      dialog.showModal();
    }

    card.addEventListener('click', open);
    card.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        open(event);
      }
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

  function generateTicketId() {
    var year = new Date().getFullYear();
    var random = Math.floor(1000 + Math.random() * 9000);
    return 'ISH-PRINT-' + year + '-' + random;
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var isValid = true;
    var serviceType = serviceTypeSelect.value;
    var range = QUANTITY_RANGES[serviceType];
    var quantity = Number(quantityInput.value);

    if (!quantityInput.value || quantity < range.min || quantity > range.max) {
      quantityError.textContent = 'Please enter a quantity between ' + range.min + ' and ' + range.max + '.';
      quantityInput.setAttribute('aria-invalid', 'true');
      isValid = false;
    } else {
      quantityError.textContent = '';
      quantityInput.removeAttribute('aria-invalid');
    }

    var contactName = contactNameInput.value.trim();
    var contactMethod = contactMethodInput.value.trim();

    if (!contactName) {
      contactNameError.textContent = 'Please enter your name.';
      contactNameInput.setAttribute('aria-invalid', 'true');
      isValid = false;
    } else {
      contactNameError.textContent = '';
      contactNameInput.removeAttribute('aria-invalid');
    }

    if (!contactMethod) {
      contactMethodError.textContent = 'Please enter a phone number or email address.';
      contactMethodInput.setAttribute('aria-invalid', 'true');
      isValid = false;
    } else {
      contactMethodError.textContent = '';
      contactMethodInput.removeAttribute('aria-invalid');
    }

    if (!isValid) {
      return;
    }

    var itemType = !itemTypeGroup.hidden ? document.getElementById('printingItemType').value : null;
    var details = document.getElementById('printingDetails').value.trim();
    var ticketId = generateTicketId();

    var detailsEl = document.getElementById('printingResultDetails');
    detailsEl.innerHTML = '';
    addDetailRow(detailsEl, 'Ticket ID', ticketId);
    addDetailRow(detailsEl, 'Service', serviceType);
    if (itemType) addDetailRow(detailsEl, 'Item / Garment Type', itemType);
    addDetailRow(detailsEl, 'Quantity', String(quantity));
    if (details) addDetailRow(detailsEl, 'Additional Details', details);
    addDetailRow(detailsEl, 'Contact', contactName + ' — ' + contactMethod);

    var messageLines = [
      'Internet Smart Hub — Printing Request ' + ticketId,
      'Service: ' + serviceType,
      itemType ? 'Item / Garment Type: ' + itemType : null,
      'Quantity: ' + quantity,
      details ? 'Additional Details: ' + details : null,
      'Contact: ' + contactName + ' — ' + contactMethod
    ].filter(function (line) { return line !== null; });
    var message = messageLines.join('\n');

    var whatsappLink = document.getElementById('printingWhatsappLink');
    whatsappLink.href = 'https://wa.me/27697304534?text=' + encodeURIComponent(message);

    var emailLink = document.getElementById('printingEmailLink');
    emailLink.href = 'mailto:internetsmarthub@gmail.com?subject=' +
      encodeURIComponent('Printing Request ' + ticketId) +
      '&body=' + encodeURIComponent(message);

    /*
     * Backend integration point: this request is not stored or emailed
     * automatically — the customer sends it themselves via the WhatsApp or
     * email links above. To automate delivery, POST the request details to
     * a backend endpoint here.
     */
    if (window.ISHRecords) {
      window.ISHRecords.save({
        id: ticketId,
        type: 'Printing / Embroidery Request',
        summary: message,
        total: null,
        details: message
      });
    }

    formView.hidden = true;
    resultView.hidden = false;
  });
});
