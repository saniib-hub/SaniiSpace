document.addEventListener('DOMContentLoaded', function () {
  var dialog = document.getElementById('printingDialog');
  var closeBtn = document.getElementById('printingClose');
  var form = document.getElementById('printingForm');
  var formView = document.getElementById('printingFormView');
  var resultView = document.getElementById('printingResult');
  var restartBtn = document.getElementById('printingRestart');
  var totalEl = document.getElementById('printingTotal');

  var supportsDialog = dialog && typeof dialog.showModal === 'function';

  if (!supportsDialog || !form) {
    return;
  }

  var serviceTypeSelect = document.getElementById('printingServiceType');
  var itemTypeGroup = document.getElementById('printingItemTypeGroup');
  var quantityInput = document.getElementById('printingQuantity');
  var quantityHint = document.getElementById('printingQuantityHint');
  var quantityError = document.getElementById('printingQuantityError');
  var firstNameInput = document.getElementById('printingFirstName');
  var lastNameInput = document.getElementById('printingLastName');
  var emailInput = document.getElementById('printingEmail');
  var contactNumberInput = document.getElementById('printingContactNumber');
  var firstNameError = document.getElementById('printingFirstNameError');
  var lastNameError = document.getElementById('printingLastNameError');
  var emailError = document.getElementById('printingEmailError');
  var contactNumberError = document.getElementById('printingContactNumberError');

  var MIN_ORDER_TOTAL = 10;

  var QUANTITY_RANGES = {
    'Bundle Prints': { min: 1, max: 10000, hint: 'Any quantity — let us know how many.' },
    'Embroidery Bulk': { min: 10, max: 1000, hint: 'Bulk orders from 10 to 1000 pieces.' },
    'Clothes Printing': { min: 10, max: 1000, hint: 'Bulk orders from 10 to 1000 pieces.' },
    'Sheet Printing': { min: 100, max: 100000, hint: 'Bulk orders from 100 to 100,000 sheets.' },
    'Poster Printing': { min: 10, max: 300, hint: 'Bulk orders from 10 to 300 copies.' }
  };

  var GARMENT_SERVICES = ['Embroidery Bulk', 'Clothes Printing'];

  function currentUnitPrice() {
    var option = serviceTypeSelect.options[serviceTypeSelect.selectedIndex];
    return Number(option.getAttribute('data-unit-price'));
  }

  function updateForServiceType() {
    var serviceType = serviceTypeSelect.value;
    var range = QUANTITY_RANGES[serviceType];

    itemTypeGroup.hidden = GARMENT_SERVICES.indexOf(serviceType) === -1;

    if (range) {
      quantityInput.min = range.min;
      quantityInput.max = range.max;
      quantityInput.placeholder = 'e.g. ' + range.min;
      quantityHint.textContent = range.hint + ' Minimum order R' + MIN_ORDER_TOTAL + '.';
    }
    updateTotal();
  }

  function updateTotal() {
    var quantity = Number(quantityInput.value) || 0;
    var total = quantity * currentUnitPrice();
    if (total > 0 && total < MIN_ORDER_TOTAL) {
      total = MIN_ORDER_TOTAL;
    }
    total = Math.round(total);
    totalEl.textContent = 'R' + total;
    return total;
  }

  function resetDialog(presetServiceType) {
    form.reset();
    if (presetServiceType) {
      serviceTypeSelect.value = presetServiceType;
    }
    updateForServiceType();
    quantityError.textContent = '';
    firstNameError.textContent = '';
    lastNameError.textContent = '';
    emailError.textContent = '';
    contactNumberError.textContent = '';
    firstNameInput.removeAttribute('aria-invalid');
    lastNameInput.removeAttribute('aria-invalid');
    emailInput.removeAttribute('aria-invalid');
    contactNumberInput.removeAttribute('aria-invalid');
    quantityInput.removeAttribute('aria-invalid');
    formView.hidden = false;
    resultView.hidden = true;
  }

  serviceTypeSelect.addEventListener('change', updateForServiceType);
  quantityInput.addEventListener('input', updateTotal);

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

    var firstName = firstNameInput.value.trim();
    var lastName = lastNameInput.value.trim();
    var email = emailInput.value.trim();
    var contactNumber = contactNumberInput.value.trim();

    if (!firstName) {
      firstNameError.textContent = 'Please enter your name.';
      firstNameInput.setAttribute('aria-invalid', 'true');
      isValid = false;
    } else {
      firstNameError.textContent = '';
      firstNameInput.removeAttribute('aria-invalid');
    }

    if (!lastName) {
      lastNameError.textContent = 'Please enter your surname.';
      lastNameInput.setAttribute('aria-invalid', 'true');
      isValid = false;
    } else {
      lastNameError.textContent = '';
      lastNameInput.removeAttribute('aria-invalid');
    }

    if (!email) {
      emailError.textContent = 'Please enter your email address.';
      emailInput.setAttribute('aria-invalid', 'true');
      isValid = false;
    } else {
      emailError.textContent = '';
      emailInput.removeAttribute('aria-invalid');
    }

    if (!contactNumber) {
      contactNumberError.textContent = 'Please enter a contact number.';
      contactNumberInput.setAttribute('aria-invalid', 'true');
      isValid = false;
    } else {
      contactNumberError.textContent = '';
      contactNumberInput.removeAttribute('aria-invalid');
    }

    if (!isValid) {
      return;
    }

    var itemType = !itemTypeGroup.hidden ? document.getElementById('printingItemType').value : null;
    var details = document.getElementById('printingDetails').value.trim();
    var ticketId = generateTicketId();
    var total = updateTotal();
    var unitPrice = currentUnitPrice();

    var detailsEl = document.getElementById('printingResultDetails');
    detailsEl.innerHTML = '';
    addDetailRow(detailsEl, 'Ticket ID', ticketId);
    addDetailRow(detailsEl, 'Name', firstName + ' ' + lastName);
    addDetailRow(detailsEl, 'Email', email);
    addDetailRow(detailsEl, 'Contact Number', contactNumber);
    addDetailRow(detailsEl, 'Service', serviceType);
    if (itemType) addDetailRow(detailsEl, 'Item / Garment Type', itemType);
    addDetailRow(detailsEl, 'Quantity', String(quantity) + ' @ R' + unitPrice + ' each');
    if (details) addDetailRow(detailsEl, 'Additional Details', details);
    addDetailRow(detailsEl, 'Estimated Total', 'R' + total);

    var messageLines = [
      'Internet Smart Hub — Printing Ticket ' + ticketId,
      'Name: ' + firstName + ' ' + lastName,
      'Email: ' + email,
      'Contact Number: ' + contactNumber,
      'Service: ' + serviceType,
      itemType ? 'Item / Garment Type: ' + itemType : null,
      'Quantity: ' + quantity + ' @ R' + unitPrice + ' each',
      details ? 'Additional Details: ' + details : null,
      'Estimated Total: R' + total
    ].filter(function (line) { return line !== null; });
    var message = messageLines.join('\n');

    var whatsappLink = document.getElementById('printingWhatsappLink');
    whatsappLink.href = 'https://wa.me/27697304534?text=' + encodeURIComponent(message);

    var emailLink = document.getElementById('printingEmailLink');
    emailLink.href = 'mailto:internetsmarthub@gmail.com?subject=' +
      encodeURIComponent('Printing Ticket ' + ticketId) +
      '&body=' + encodeURIComponent(message);

    if (window.ISHTicket) {
      window.ISHTicket.renderQR(document.getElementById('printingResultQR'), message);
    }

    /*
     * Backend integration point: this request is not stored or emailed
     * automatically — the customer sends it themselves via the WhatsApp or
     * email links above. To automate delivery, POST the request details to
     * a backend endpoint here.
     */
    if (window.ISHRecords) {
      window.ISHRecords.save({
        id: ticketId,
        type: 'Printing / Embroidery Ticket',
        summary: message,
        total: total,
        details: message
      });
    }

    formView.hidden = true;
    resultView.hidden = false;
  });
});
