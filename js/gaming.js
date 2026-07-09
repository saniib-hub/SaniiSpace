document.addEventListener('DOMContentLoaded', function () {
  var dialog = document.getElementById('gamingDialog');
  var openCard = document.getElementById('gamingCard');
  var closeBtn = document.getElementById('gamingClose');
  var form = document.getElementById('gamingForm');
  var formView = document.getElementById('gamingFormView');
  var resultView = document.getElementById('gamingResult');
  var restartBtn = document.getElementById('gamingRestart');
  var totalEl = document.getElementById('gamingTotal');
  var itemsErrorEl = document.getElementById('gamingItemsError');

  var supportsDialog = dialog && typeof dialog.showModal === 'function';

  if (!supportsDialog || !openCard || !form) {
    return;
  }

  var partSelects = form.querySelectorAll('[data-quote-select]');
  var firstNameInput = document.getElementById('gamingFirstName');
  var lastNameInput = document.getElementById('gamingLastName');
  var contactNumberInput = document.getElementById('gamingContactNumber');
  var firstNameError = document.getElementById('gamingFirstNameError');
  var lastNameError = document.getElementById('gamingLastNameError');
  var contactNumberError = document.getElementById('gamingContactNumberError');

  function selectedParts() {
    return Array.prototype.filter.call(partSelects, function (select) {
      return Number(select.value) > 0;
    });
  }

  function updateTotal() {
    var total = 0;
    selectedParts().forEach(function (select) {
      total += Number(select.value);
    });
    totalEl.textContent = 'R' + total;
    return total;
  }

  function resetDialog() {
    form.reset();
    updateTotal();
    itemsErrorEl.textContent = '';
    firstNameError.textContent = '';
    lastNameError.textContent = '';
    contactNumberError.textContent = '';
    firstNameInput.removeAttribute('aria-invalid');
    lastNameInput.removeAttribute('aria-invalid');
    contactNumberInput.removeAttribute('aria-invalid');
    formView.hidden = false;
    resultView.hidden = true;
  }

  if (window.ISHMotion) {
    window.ISHMotion.bindDialog(dialog);
  }

  function closeDialog() {
    if (window.ISHMotion) {
      window.ISHMotion.closeDialog(dialog);
    } else {
      dialog.close();
    }
  }

  function openDialog(event) {
    event.preventDefault();
    resetDialog();
    if (window.ISHMotion) {
      window.ISHMotion.openDialog(dialog);
    } else {
      dialog.showModal();
    }
  }

  openCard.addEventListener('click', openDialog);
  openCard.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' || event.key === ' ') {
      openDialog(event);
    }
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

  partSelects.forEach(function (select) {
    select.addEventListener('change', function () {
      updateTotal();
      if (itemsErrorEl.textContent) {
        itemsErrorEl.textContent = '';
      }
    });
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

  function generateTicketId() {
    var year = new Date().getFullYear();
    var random = Math.floor(1000 + Math.random() * 9000);
    return 'ISH-GAME-' + year + '-' + random;
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var parts = selectedParts();
    var isValid = true;

    if (parts.length === 0) {
      itemsErrorEl.textContent = 'Please select at least one part.';
      isValid = false;
    } else {
      itemsErrorEl.textContent = '';
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

    if (!isValid) {
      return;
    }

    var total = updateTotal();
    var ticketId = generateTicketId();
    var partItems = parts.map(function (select) {
      var optionText = select.options[select.selectedIndex].text;
      var name = select.getAttribute('data-category') + ': ' + optionText.split(' — R')[0];
      return { name: name, price: Number(select.value) };
    });

    var detailsEl = document.getElementById('gamingResultDetails');
    detailsEl.innerHTML = '';
    addDetailRow(detailsEl, 'Ticket ID', ticketId);
    addDetailRow(detailsEl, 'Name', firstName + ' ' + lastName);
    addDetailRow(detailsEl, 'Contact Number', contactNumber);
    addListRow(detailsEl, 'Gaming PC Components', partItems);
    addDetailRow(detailsEl, 'Estimated Total', 'R' + total);

    var messageLines = ['Internet Smart Hub — Gaming PC Ticket ' + ticketId];
    messageLines.push('Name: ' + firstName + ' ' + lastName);
    messageLines.push('Contact Number: ' + contactNumber);
    partItems.forEach(function (item) {
      messageLines.push('- ' + item.name + ': R' + item.price);
    });
    messageLines.push('Estimated Total: R' + total);
    var message = messageLines.join('\n');

    if (window.ISHTicket) {
      window.ISHTicket.renderQR(document.getElementById('gamingResultQR'), message);
    }

    /*
     * Saved to this browser's local ticket log (js/records.js). If
     * js/backend-config.js has a Google Sheets endpoint configured, this
     * is also POSTed there, which logs it to the Sheet and automatically
     * emails the shop — no action needed from the customer.
     */
    if (window.ISHRecords) {
      window.ISHRecords.save({
        id: ticketId,
        type: 'Gaming PC Ticket',
        summary: message,
        total: total,
        details: message
      });
    }

    if (window.ISHBackend) {
      window.ISHBackend.submit({
        type: 'Gaming PC Ticket',
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
