document.addEventListener('DOMContentLoaded', function () {
  var dialog = document.getElementById('workstationDialog');
  var openCard = document.getElementById('workstationCard');
  var closeBtn = document.getElementById('workstationClose');
  var form = document.getElementById('workstationForm');
  var formView = document.getElementById('workstationFormView');
  var resultView = document.getElementById('workstationResult');
  var restartBtn = document.getElementById('workstationRestart');
  var totalEl = document.getElementById('workstationTotal');
  var itemsErrorEl = document.getElementById('workstationItemsError');

  var supportsDialog = dialog && typeof dialog.showModal === 'function';

  if (!supportsDialog || !openCard || !form) {
    return;
  }

  var itemCheckboxes = form.querySelectorAll('input[name="workstationItem"]');
  var nameInput = document.getElementById('workstationName');
  var emailInput = document.getElementById('workstationEmail');
  var contactNumberInput = document.getElementById('workstationContactNumber');
  var nameError = document.getElementById('workstationNameError');
  var emailError = document.getElementById('workstationEmailError');
  var contactNumberError = document.getElementById('workstationContactNumberError');

  function checkedItems() {
    return Array.prototype.filter.call(itemCheckboxes, function (checkbox) {
      return checkbox.checked;
    });
  }

  function updateTotal() {
    var total = 0;
    checkedItems().forEach(function (checkbox) {
      total += Number(checkbox.getAttribute('data-price'));
    });
    totalEl.textContent = 'R' + total;
    return total;
  }

  function resetDialog() {
    form.reset();
    updateTotal();
    itemsErrorEl.textContent = '';
    nameError.textContent = '';
    emailError.textContent = '';
    contactNumberError.textContent = '';
    nameInput.removeAttribute('aria-invalid');
    emailInput.removeAttribute('aria-invalid');
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

  itemCheckboxes.forEach(function (checkbox) {
    checkbox.addEventListener('change', function () {
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
    return 'ISH-WS-' + year + '-' + random;
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var items = checkedItems();
    var isValid = true;

    if (items.length === 0) {
      itemsErrorEl.textContent = 'Please select at least one item.';
      isValid = false;
    } else {
      itemsErrorEl.textContent = '';
    }

    var businessOrName = nameInput.value.trim();
    var email = emailInput.value.trim();
    var contactNumber = contactNumberInput.value.trim();

    if (!businessOrName) {
      nameError.textContent = 'Please enter a business name or your name.';
      nameInput.setAttribute('aria-invalid', 'true');
      isValid = false;
    } else {
      nameError.textContent = '';
      nameInput.removeAttribute('aria-invalid');
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

    var total = updateTotal();
    var ticketId = generateTicketId();
    var orderItems = items.map(function (checkbox) {
      return { name: checkbox.value, price: Number(checkbox.getAttribute('data-price')) };
    });

    var detailsEl = document.getElementById('workstationResultDetails');
    detailsEl.innerHTML = '';
    addDetailRow(detailsEl, 'Order ID', ticketId);
    addDetailRow(detailsEl, 'Business / Name', businessOrName);
    addDetailRow(detailsEl, 'Email', email);
    addDetailRow(detailsEl, 'Contact Number', contactNumber);
    addListRow(detailsEl, 'Items', orderItems);
    addDetailRow(detailsEl, 'Estimated Total', 'R' + total);

    var messageLines = ['Internet Smart Hub — Workstation Order ' + ticketId];
    messageLines.push('Business / Name: ' + businessOrName);
    messageLines.push('Email: ' + email);
    messageLines.push('Contact Number: ' + contactNumber);
    orderItems.forEach(function (item) {
      messageLines.push('- ' + item.name + ': R' + item.price);
    });
    messageLines.push('Estimated Total: R' + total);
    var message = messageLines.join('\n');

    if (window.ISHTicket) {
      window.ISHTicket.renderQR(document.getElementById('workstationResultQR'), message);
    }

    /*
     * Saved to this browser's local ticket log (js/records.js). If
     * js/backend-config.js has a Google Sheets endpoint configured, this
     * is also POSTed there, which logs it to the Sheet and automatically
     * emails the shop — no action needed from the customer.
     */
    if (window.ISHBackend) {
      window.ISHBackend.submit({
        type: 'Workstation Order',
        id: ticketId,
        name: businessOrName,
        email: email,
        contact: contactNumber,
        total: total,
        summary: message
      });
    }

    if (window.ISHRecords) {
      window.ISHRecords.save({
        id: ticketId,
        type: 'Workstation Order',
        summary: message,
        total: total,
        details: message
      });
    }

    formView.hidden = true;
    resultView.hidden = false;

    if (window.ISHMotion) {
      window.ISHMotion.celebrate(resultView);
    }
  });
});
