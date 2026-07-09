document.addEventListener('DOMContentLoaded', function () {
  var dialog = document.getElementById('quoteDialog');
  var openBtn = document.getElementById('getQuoteBtn');
  var closeBtn = document.getElementById('quoteClose');
  var form = document.getElementById('quoteForm');
  var formView = document.getElementById('quoteFormView');
  var resultView = document.getElementById('quoteResult');
  var totalEl = document.getElementById('quoteTotal');
  var problemsErrorEl = document.getElementById('quoteProblemsError');
  var restartBtn = document.getElementById('quoteRestart');

  var supportsDialog = dialog && typeof dialog.showModal === 'function';

  if (!supportsDialog || !openBtn || !form) {
    return; // fall back to the button's default #contact anchor behavior
  }

  var repairCheckboxes = form.querySelectorAll('input[name="repairPart"]');
  var firstNameInput = document.getElementById('quoteFirstName');
  var lastNameInput = document.getElementById('quoteLastName');
  var contactNumberInput = document.getElementById('quoteContactNumber');
  var firstNameError = document.getElementById('quoteFirstNameError');
  var lastNameError = document.getElementById('quoteLastNameError');
  var contactNumberError = document.getElementById('quoteContactNumberError');
  var brandNameInput = document.getElementById('quoteBrandName');
  var modelInput = document.getElementById('quoteModel');
  var brandNameError = document.getElementById('quoteBrandNameError');
  var modelError = document.getElementById('quoteModelError');

  function resetDialog() {
    form.reset();
    updateTotal();
    problemsErrorEl.textContent = '';
    firstNameError.textContent = '';
    lastNameError.textContent = '';
    contactNumberError.textContent = '';
    brandNameError.textContent = '';
    modelError.textContent = '';
    firstNameInput.removeAttribute('aria-invalid');
    lastNameInput.removeAttribute('aria-invalid');
    contactNumberInput.removeAttribute('aria-invalid');
    brandNameInput.removeAttribute('aria-invalid');
    modelInput.removeAttribute('aria-invalid');
    formView.hidden = false;
    resultView.hidden = true;
  }

  function checkedRepairParts() {
    return Array.prototype.filter.call(repairCheckboxes, function (checkbox) {
      return checkbox.checked;
    });
  }

  function updateTotal() {
    var total = 0;
    checkedRepairParts().forEach(function (checkbox) {
      total += Number(checkbox.getAttribute('data-price'));
    });
    totalEl.textContent = 'R' + total;
    return total;
  }

  function generateTicketId() {
    var year = new Date().getFullYear();
    var random = Math.floor(1000 + Math.random() * 9000);
    return 'ISH-REPAIR-' + year + '-' + random;
  }

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

  function addListRow(container, label, items) {
    var row = document.createElement('div');
    var dt = document.createElement('dt');
    var dd = document.createElement('dd');
    dt.textContent = label;
    var list = document.createElement('ul');
    list.className = 'quote-result-list';
    items.forEach(function (item) {
      var li = document.createElement('li');
      li.textContent = item.name + ' — R' + item.price;
      list.appendChild(li);
    });
    dd.appendChild(list);
    row.appendChild(dt);
    row.appendChild(dd);
    container.appendChild(row);
  }

  if (window.ISHMotion) {
    window.ISHMotion.bindDialog(dialog);
  }

  function openDialog() {
    resetDialog();
    if (window.ISHMotion) {
      window.ISHMotion.openDialog(dialog);
    } else {
      dialog.showModal();
    }
  }

  function closeDialog() {
    if (window.ISHMotion) {
      window.ISHMotion.closeDialog(dialog);
    } else {
      dialog.close();
    }
  }

  openBtn.addEventListener('click', function (event) {
    event.preventDefault();
    openDialog();
  });

  document.querySelectorAll('.quote-open-card').forEach(function (card) {
    card.addEventListener('click', function (event) {
      event.preventDefault();
      openDialog();
    });

    card.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openDialog();
      }
    });
  });

  closeBtn.addEventListener('click', function () {
    closeDialog();
  });

  dialog.addEventListener('click', function (event) {
    if (event.target === dialog) {
      closeDialog();
    }
  });

  restartBtn.addEventListener('click', function () {
    resetDialog();
  });

  repairCheckboxes.forEach(function (checkbox) {
    checkbox.addEventListener('change', function () {
      updateTotal();
      if (problemsErrorEl.textContent) {
        problemsErrorEl.textContent = '';
      }
    });
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var repairParts = checkedRepairParts();
    var isValid = true;

    if (repairParts.length === 0) {
      problemsErrorEl.textContent = 'Please select at least one repair.';
      isValid = false;
    } else {
      problemsErrorEl.textContent = '';
    }

    var firstName = firstNameInput.value.trim();
    var lastName = lastNameInput.value.trim();
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

    if (!contactNumber) {
      contactNumberError.textContent = 'Please enter a contact number.';
      contactNumberInput.setAttribute('aria-invalid', 'true');
      isValid = false;
    } else {
      contactNumberError.textContent = '';
      contactNumberInput.removeAttribute('aria-invalid');
    }

    var brandName = brandNameInput.value.trim();
    var model = modelInput.value.trim();

    if (!brandName) {
      brandNameError.textContent = 'Please enter the brand name.';
      brandNameInput.setAttribute('aria-invalid', 'true');
      isValid = false;
    } else {
      brandNameError.textContent = '';
      brandNameInput.removeAttribute('aria-invalid');
    }

    if (!model) {
      modelError.textContent = 'Please enter the model.';
      modelInput.setAttribute('aria-invalid', 'true');
      isValid = false;
    } else {
      modelError.textContent = '';
      modelInput.removeAttribute('aria-invalid');
    }

    if (!isValid) {
      return;
    }

    var total = updateTotal();
    var ticketId = generateTicketId();

    var repairItems = repairParts.map(function (checkbox) {
      return { name: checkbox.value, price: Number(checkbox.getAttribute('data-price')) };
    });

    // ---------- Build the on-screen result ----------
    var detailsEl = document.getElementById('quoteResultDetails');
    detailsEl.innerHTML = '';

    addDetailRow(detailsEl, 'Ticket ID', ticketId);
    addDetailRow(detailsEl, 'Name', firstName + ' ' + lastName);
    addDetailRow(detailsEl, 'Contact Number', contactNumber);
    addDetailRow(detailsEl, 'Brand', brandName);
    addDetailRow(detailsEl, 'Model', model);
    addListRow(detailsEl, 'Repair Parts', repairItems);
    addDetailRow(detailsEl, 'Estimated Total', 'R' + total);

    // ---------- Build the WhatsApp / email message ----------
    var messageLines = ['Internet Smart Hub — Repair Ticket ' + ticketId];
    messageLines.push('Name: ' + firstName + ' ' + lastName);
    messageLines.push('Contact Number: ' + contactNumber);
    messageLines.push('Brand: ' + brandName);
    messageLines.push('Model: ' + model);
    repairItems.forEach(function (item) {
      messageLines.push('- ' + item.name + ': R' + item.price);
    });
    messageLines.push('Estimated Total: R' + total);
    var message = messageLines.join('\n');

    if (window.ISHTicket) {
      window.ISHTicket.renderQR(document.getElementById('quoteResultQR'), message);
    }

    /*
     * Saved to this browser's local ticket log (see js/records.js), a
     * same-device convenience log, not a shared database. If
     * js/backend-config.js has a Google Sheets endpoint configured, this
     * is also POSTed there, which logs it to the Sheet and automatically
     * emails the shop — no action needed from the customer.
     */
    if (window.ISHRecords) {
      window.ISHRecords.save({
        id: ticketId,
        type: 'Repair Ticket',
        summary: message,
        total: total,
        details: message
      });
    }

    if (window.ISHBackend) {
      window.ISHBackend.submit({
        type: 'Repair Ticket',
        id: ticketId,
        name: firstName + ' ' + lastName,
        contact: contactNumber,
        total: total,
        summary: message
      });
    }

    formView.hidden = true;
    resultView.hidden = false;

    if (window.ISHMotion) {
      window.ISHMotion.celebrate(resultView);
    }
  });
});
