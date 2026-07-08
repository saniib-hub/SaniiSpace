document.addEventListener('DOMContentLoaded', function () {
  var dialog = document.getElementById('cellphoneDialog');
  var openCard = document.getElementById('cellphoneCard');
  var closeBtn = document.getElementById('cellphoneClose');
  var form = document.getElementById('cellphoneForm');
  var formView = document.getElementById('cellphoneFormView');
  var resultView = document.getElementById('cellphoneResult');
  var restartBtn = document.getElementById('cellphoneRestart');
  var totalEl = document.getElementById('cellphoneTotal');

  var supportsDialog = dialog && typeof dialog.showModal === 'function';

  if (!supportsDialog || !openCard || !form) {
    return;
  }

  var partSelects = form.querySelectorAll('[data-quote-select]');
  var partCheckboxes = form.querySelectorAll('input[name="cellphonePart"]');
  var firstNameInput = document.getElementById('cellphoneFirstName');
  var lastNameInput = document.getElementById('cellphoneLastName');
  var contactNumberInput = document.getElementById('cellphoneContactNumber');
  var firstNameError = document.getElementById('cellphoneFirstNameError');
  var lastNameError = document.getElementById('cellphoneLastNameError');
  var contactNumberError = document.getElementById('cellphoneContactNumberError');
  var brandNameInput = document.getElementById('cellphoneBrandName');
  var modelInput = document.getElementById('cellphoneModel');
  var brandNameError = document.getElementById('cellphoneBrandNameError');
  var modelError = document.getElementById('cellphoneModelError');
  var issueInput = document.getElementById('cellphoneIssue');
  var issueError = document.getElementById('cellphoneIssueError');

  function selectedParts() {
    return Array.prototype.filter.call(partSelects, function (select) {
      return Number(select.value) > 0;
    });
  }

  function checkedParts() {
    return Array.prototype.filter.call(partCheckboxes, function (checkbox) {
      return checkbox.checked;
    });
  }

  function updateTotal() {
    var total = 0;
    selectedParts().forEach(function (select) {
      total += Number(select.value);
    });
    checkedParts().forEach(function (checkbox) {
      total += Number(checkbox.getAttribute('data-price'));
    });
    totalEl.textContent = 'R' + total;
    return total;
  }

  function resetDialog() {
    form.reset();
    updateTotal();
    firstNameError.textContent = '';
    lastNameError.textContent = '';
    contactNumberError.textContent = '';
    brandNameError.textContent = '';
    modelError.textContent = '';
    issueError.textContent = '';
    firstNameInput.removeAttribute('aria-invalid');
    lastNameInput.removeAttribute('aria-invalid');
    contactNumberInput.removeAttribute('aria-invalid');
    brandNameInput.removeAttribute('aria-invalid');
    modelInput.removeAttribute('aria-invalid');
    issueInput.removeAttribute('aria-invalid');
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
    select.addEventListener('change', updateTotal);
  });

  partCheckboxes.forEach(function (checkbox) {
    checkbox.addEventListener('change', updateTotal);
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
    return 'ISH-CELL-' + year + '-' + random;
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var isValid = true;

    var firstName = firstNameInput.value.trim();
    var lastName = lastNameInput.value.trim();
    var contactNumber = contactNumberInput.value.trim();
    var brandName = brandNameInput.value.trim();
    var model = modelInput.value.trim();
    var issue = issueInput.value.trim();

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

    if (!brandName) {
      brandNameError.textContent = 'Please enter the brand name.';
      brandNameInput.setAttribute('aria-invalid', 'true');
      isValid = false;
    } else {
      brandNameError.textContent = '';
      brandNameInput.removeAttribute('aria-invalid');
    }

    if (!model) {
      modelError.textContent = 'Please enter the model number.';
      modelInput.setAttribute('aria-invalid', 'true');
      isValid = false;
    } else {
      modelError.textContent = '';
      modelInput.removeAttribute('aria-invalid');
    }

    if (!issue) {
      issueError.textContent = 'Please describe the issue.';
      issueInput.setAttribute('aria-invalid', 'true');
      isValid = false;
    } else {
      issueError.textContent = '';
      issueInput.removeAttribute('aria-invalid');
    }

    if (!isValid) {
      return;
    }

    var total = updateTotal();
    var ticketId = generateTicketId();

    var selectItems = selectedParts().map(function (select) {
      return { name: select.getAttribute('data-category') + ': ' + select.options[select.selectedIndex].text.split(' — R')[0], price: Number(select.value) };
    });
    var checkboxItems = checkedParts().map(function (checkbox) {
      return { name: checkbox.value, price: Number(checkbox.getAttribute('data-price')) };
    });
    var allItems = selectItems.concat(checkboxItems);

    var detailsEl = document.getElementById('cellphoneResultDetails');
    detailsEl.innerHTML = '';
    addDetailRow(detailsEl, 'Ticket ID', ticketId);
    addDetailRow(detailsEl, 'Name', firstName + ' ' + lastName);
    addDetailRow(detailsEl, 'Contact Number', contactNumber);
    addDetailRow(detailsEl, 'Brand', brandName);
    addDetailRow(detailsEl, 'Model', model);
    if (allItems.length) addListRow(detailsEl, 'Requested Repairs', allItems);
    addDetailRow(detailsEl, 'Issue Description', issue);
    addDetailRow(detailsEl, 'Estimated Total', total > 0 ? 'R' + total : 'To be confirmed');

    var messageLines = ['Internet Smart Hub — Cell Phone Repair Ticket ' + ticketId];
    messageLines.push('Name: ' + firstName + ' ' + lastName);
    messageLines.push('Contact Number: ' + contactNumber);
    messageLines.push('Brand: ' + brandName);
    messageLines.push('Model: ' + model);
    allItems.forEach(function (item) {
      messageLines.push('- ' + item.name + ': R' + item.price);
    });
    messageLines.push('Issue: ' + issue);
    messageLines.push('Estimated Total: ' + (total > 0 ? 'R' + total : 'To be confirmed'));
    var message = messageLines.join('\n');

    var whatsappLink = document.getElementById('cellphoneWhatsappLink');
    whatsappLink.href = 'https://wa.me/27697304534?text=' + encodeURIComponent(message);

    var emailLink = document.getElementById('cellphoneEmailLink');
    emailLink.href = 'mailto:internetsmarthub@gmail.com?subject=' +
      encodeURIComponent('Cell Phone Repair Ticket ' + ticketId) +
      '&body=' + encodeURIComponent(message);

    if (window.ISHTicket) {
      window.ISHTicket.renderQR(document.getElementById('cellphoneResultQR'), message);
    }

    /*
     * This ticket is not automated by default — the customer sends it via
     * the WhatsApp or email links above, and it's saved to this browser's
     * local ticket log (js/records.js). If js/backend-config.js has a
     * Google Sheets endpoint configured, it's also POSTed there.
     */
    if (window.ISHRecords) {
      window.ISHRecords.save({
        id: ticketId,
        type: 'Cell Phone Repair Ticket',
        summary: message,
        total: total > 0 ? total : null,
        details: message
      });
    }

    if (window.ISHBackend) {
      window.ISHBackend.submit({
        type: 'Cell Phone Repair Ticket',
        id: ticketId,
        name: firstName + ' ' + lastName,
        contact: contactNumber,
        total: total > 0 ? total : null,
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
