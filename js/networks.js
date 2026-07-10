document.addEventListener('DOMContentLoaded', function () {
  var dialog = document.getElementById('networksDialog');
  var openCard = document.getElementById('networksCard');
  var closeBtn = document.getElementById('networksClose');
  var form = document.getElementById('networksForm');
  var formView = document.getElementById('networksFormView');
  var resultView = document.getElementById('networksResult');
  var restartBtn = document.getElementById('networksRestart');
  var totalEl = document.getElementById('networksTotal');
  var selectionErrorEl = document.getElementById('networksSelectionError');

  var supportsDialog = dialog && typeof dialog.showModal === 'function';

  if (!supportsDialog || !openCard || !form) {
    return;
  }

  var troubleshootCheckboxes = form.querySelectorAll('input[name="networksTroubleshoot"]');
  var setupCheckboxes = form.querySelectorAll('input[name="networksSetup"]');
  var issueSelect = document.getElementById('networksIssue');
  var typeInput = document.getElementById('networksType');
  var routerModelInput = document.getElementById('networksRouterModel');
  var issueDetailsInput = document.getElementById('networksIssueDetails');
  var setupDetailsInput = document.getElementById('networksSetupDetails');
  var firstNameInput = document.getElementById('networksFirstName');
  var lastNameInput = document.getElementById('networksLastName');
  var contactNumberInput = document.getElementById('networksContactNumber');
  var firstNameError = document.getElementById('networksFirstNameError');
  var lastNameError = document.getElementById('networksLastNameError');
  var contactNumberError = document.getElementById('networksContactNumberError');

  function checkedTroubleshoot() {
    return Array.prototype.filter.call(troubleshootCheckboxes, function (checkbox) {
      return checkbox.checked;
    });
  }

  function checkedSetup() {
    return Array.prototype.filter.call(setupCheckboxes, function (checkbox) {
      return checkbox.checked;
    });
  }

  function updateTotal() {
    var total = 0;
    checkedTroubleshoot().forEach(function (checkbox) {
      total += Number(checkbox.getAttribute('data-price'));
    });
    checkedSetup().forEach(function (checkbox) {
      total += Number(checkbox.getAttribute('data-price'));
    });
    totalEl.textContent = 'R' + total;
    return total;
  }

  function resetDialog() {
    form.reset();
    updateTotal();
    selectionErrorEl.textContent = '';
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

  troubleshootCheckboxes.forEach(function (checkbox) {
    checkbox.addEventListener('change', function () {
      updateTotal();
      if (selectionErrorEl.textContent) {
        selectionErrorEl.textContent = '';
      }
    });
  });

  setupCheckboxes.forEach(function (checkbox) {
    checkbox.addEventListener('change', function () {
      updateTotal();
      if (selectionErrorEl.textContent) {
        selectionErrorEl.textContent = '';
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
    return 'ISH-NET-' + year + '-' + random;
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var isValid = true;

    var issue = issueSelect.value;
    var networkType = typeInput.value.trim();
    var routerModel = routerModelInput.value.trim();
    var issueDetails = issueDetailsInput.value.trim();
    var setupDetails = setupDetailsInput.value.trim();
    var troubleshootItems = checkedTroubleshoot();
    var setupItems = checkedSetup();

    var hasAnySelection = issue || networkType || routerModel || issueDetails ||
      troubleshootItems.length > 0 || setupItems.length > 0 || setupDetails;

    if (!hasAnySelection) {
      selectionErrorEl.textContent = 'Please tell us about your network issue, or select a setup service.';
      isValid = false;
    } else {
      selectionErrorEl.textContent = '';
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

    var troubleshootLineItems = troubleshootItems.map(function (checkbox) {
      return { name: checkbox.value, price: Number(checkbox.getAttribute('data-price')) };
    });
    var setupLineItems = setupItems.map(function (checkbox) {
      return { name: checkbox.value, price: Number(checkbox.getAttribute('data-price')) };
    });

    var detailsEl = document.getElementById('networksResultDetails');
    detailsEl.innerHTML = '';
    addDetailRow(detailsEl, 'Ticket ID', ticketId);
    addDetailRow(detailsEl, 'Name', firstName + ' ' + lastName);
    addDetailRow(detailsEl, 'Contact Number', contactNumber);
    if (issue) addDetailRow(detailsEl, 'Network Issue', issue);
    if (networkType) addDetailRow(detailsEl, 'Type of Network', networkType);
    if (routerModel) addDetailRow(detailsEl, 'Router Model', routerModel);
    if (troubleshootLineItems.length) addListRow(detailsEl, 'Troubleshooting', troubleshootLineItems);
    if (issueDetails) addDetailRow(detailsEl, 'Problem Description', issueDetails);
    if (setupLineItems.length) addListRow(detailsEl, 'Network Setup', setupLineItems);
    if (setupDetails) addDetailRow(detailsEl, 'Setup Requirements', setupDetails);
    addDetailRow(detailsEl, 'Estimated Total', total > 0 ? 'R' + total : 'To be confirmed');

    var messageLines = ['Internet Smart Hub — Networks Ticket ' + ticketId];
    messageLines.push('Name: ' + firstName + ' ' + lastName);
    messageLines.push('Contact Number: ' + contactNumber);
    if (issue) messageLines.push('Network Issue: ' + issue);
    if (networkType) messageLines.push('Type of Network: ' + networkType);
    if (routerModel) messageLines.push('Router Model: ' + routerModel);
    troubleshootLineItems.forEach(function (item) {
      messageLines.push('- ' + item.name + ': R' + item.price);
    });
    if (issueDetails) messageLines.push('Problem Description: ' + issueDetails);
    setupLineItems.forEach(function (item) {
      messageLines.push('- ' + item.name + ': R' + item.price);
    });
    if (setupDetails) messageLines.push('Setup Requirements: ' + setupDetails);
    messageLines.push('Estimated Total: ' + (total > 0 ? 'R' + total : 'To be confirmed'));
    var message = messageLines.join('\n');

    if (window.ISHTicket) {
      window.ISHTicket.renderQR(document.getElementById('networksResultQR'), message);
    }

    /*
     * Saved to this browser's local ticket log (js/records.js). If
     * js/backend-config.js has a Google Sheets or Supabase endpoint
     * configured, this is also sent there automatically.
     */
    if (window.ISHRecords) {
      window.ISHRecords.save({
        id: ticketId,
        type: 'Networks Ticket',
        summary: message,
        total: total > 0 ? total : null,
        details: message
      });
    }

    if (window.ISHBackend) {
      window.ISHBackend.submit({
        type: 'Networks Ticket',
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
