document.addEventListener('DOMContentLoaded', function () {
  var dialog = document.getElementById('softwareDialog');
  var openCard = document.getElementById('softwareCard');
  var closeBtn = document.getElementById('softwareClose');
  var form = document.getElementById('softwareForm');
  var formView = document.getElementById('softwareFormView');
  var resultView = document.getElementById('softwareResult');
  var restartBtn = document.getElementById('softwareRestart');
  var totalEl = document.getElementById('softwareTotal');
  var itemsErrorEl = document.getElementById('softwareItemsError');

  var supportsDialog = dialog && typeof dialog.showModal === 'function';

  if (!supportsDialog || !openCard || !form) {
    return;
  }

  var osSelect = document.getElementById('softwareOS');
  var addonCheckboxes = form.querySelectorAll('input[name="softwareAddon"]');
  var firstNameInput = document.getElementById('softwareFirstName');
  var lastNameInput = document.getElementById('softwareLastName');
  var contactNumberInput = document.getElementById('softwareContactNumber');
  var firstNameError = document.getElementById('softwareFirstNameError');
  var lastNameError = document.getElementById('softwareLastNameError');
  var contactNumberError = document.getElementById('softwareContactNumberError');
  var softwareIssueInput = document.getElementById('softwareIssue');
  var specialSoftwareCheckbox = document.getElementById('softwareSpecialSoftware');
  var specialSoftwareGroup = document.getElementById('softwareSpecialSoftwareGroup');
  var specialSoftwareDetailsInput = document.getElementById('softwareSpecialSoftwareDetails');
  var specialSoftwareError = document.getElementById('softwareSpecialSoftwareError');

  function checkedAddons() {
    return Array.prototype.filter.call(addonCheckboxes, function (checkbox) {
      return checkbox.checked;
    });
  }

  function updateTotal() {
    var total = Number(osSelect.value) || 0;
    checkedAddons().forEach(function (checkbox) {
      total += Number(checkbox.getAttribute('data-price'));
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
    specialSoftwareError.textContent = '';
    firstNameInput.removeAttribute('aria-invalid');
    lastNameInput.removeAttribute('aria-invalid');
    contactNumberInput.removeAttribute('aria-invalid');
    specialSoftwareDetailsInput.removeAttribute('aria-invalid');
    specialSoftwareGroup.hidden = true;
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

  osSelect.addEventListener('change', function () {
    updateTotal();
    if (itemsErrorEl.textContent) {
      itemsErrorEl.textContent = '';
    }
  });

  addonCheckboxes.forEach(function (checkbox) {
    checkbox.addEventListener('change', function () {
      updateTotal();
      if (itemsErrorEl.textContent) {
        itemsErrorEl.textContent = '';
      }
    });
  });

  specialSoftwareCheckbox.addEventListener('change', function () {
    specialSoftwareGroup.hidden = !specialSoftwareCheckbox.checked;
    if (!specialSoftwareCheckbox.checked) {
      specialSoftwareError.textContent = '';
      specialSoftwareDetailsInput.removeAttribute('aria-invalid');
    }
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
    return 'ISH-SOFT-' + year + '-' + random;
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var osSelected = Number(osSelect.value) > 0;
    var addons = checkedAddons();
    var pricedAddons = addons.filter(function (checkbox) {
      return checkbox !== specialSoftwareCheckbox;
    });
    var softwareIssue = softwareIssueInput.value.trim();

    var isValid = true;

    var hasAnySelection = osSelected || addons.length > 0 || softwareIssue.length > 0;
    if (!hasAnySelection) {
      itemsErrorEl.textContent = 'Please select a software package, add-on, or describe an issue.';
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

    var specialSoftwareDetails = specialSoftwareDetailsInput.value.trim();
    if (specialSoftwareCheckbox.checked) {
      if (!specialSoftwareDetails) {
        specialSoftwareError.textContent = 'Please describe the software you need.';
        specialSoftwareDetailsInput.setAttribute('aria-invalid', 'true');
        isValid = false;
      } else {
        specialSoftwareError.textContent = '';
        specialSoftwareDetailsInput.removeAttribute('aria-invalid');
      }
    }

    if (!isValid) {
      return;
    }

    var total = updateTotal();
    var ticketId = generateTicketId();

    var osItem = osSelected ? [{
      name: osSelect.options[osSelect.selectedIndex].text.split(' — R')[0],
      price: Number(osSelect.value)
    }] : [];
    var addonItems = pricedAddons.map(function (checkbox) {
      return { name: checkbox.value, price: Number(checkbox.getAttribute('data-price')) };
    });

    var detailsEl = document.getElementById('softwareResultDetails');
    detailsEl.innerHTML = '';
    addDetailRow(detailsEl, 'Ticket ID', ticketId);
    addDetailRow(detailsEl, 'Name', firstName + ' ' + lastName);
    addDetailRow(detailsEl, 'Contact Number', contactNumber);
    if (osItem.length) addListRow(detailsEl, 'Operating System', osItem);
    if (addonItems.length) addListRow(detailsEl, 'Software Add-ons', addonItems);
    if (specialSoftwareCheckbox.checked) addDetailRow(detailsEl, 'Special Software Requested', specialSoftwareDetails);
    if (softwareIssue) addDetailRow(detailsEl, 'Other Notes', softwareIssue);
    addDetailRow(detailsEl, 'Estimated Total', total > 0 ? 'R' + total : 'Diagnosed in-store');

    var messageLines = ['Internet Smart Hub — Software Ticket ' + ticketId];
    messageLines.push('Name: ' + firstName + ' ' + lastName);
    messageLines.push('Contact Number: ' + contactNumber);
    osItem.forEach(function (item) {
      messageLines.push('- ' + item.name + ': R' + item.price);
    });
    addonItems.forEach(function (item) {
      messageLines.push('- ' + item.name + ': R' + item.price);
    });
    if (specialSoftwareCheckbox.checked) {
      messageLines.push('Special software requested (quote on request): ' + specialSoftwareDetails);
    }
    if (softwareIssue) {
      messageLines.push('Other notes: ' + softwareIssue);
    }
    messageLines.push('Estimated Total: ' + (total > 0 ? 'R' + total : 'Diagnosed in-store'));
    var message = messageLines.join('\n');

    var whatsappLink = document.getElementById('softwareWhatsappLink');
    whatsappLink.href = 'https://wa.me/27697304534?text=' + encodeURIComponent(message);

    var emailLink = document.getElementById('softwareEmailLink');
    emailLink.href = 'mailto:internetsmarthub@gmail.com?subject=' +
      encodeURIComponent('Software Ticket ' + ticketId) +
      '&body=' + encodeURIComponent(message);

    if (window.ISHTicket) {
      window.ISHTicket.renderQR(document.getElementById('softwareResultQR'), message);
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
        type: 'Software Ticket',
        summary: message,
        total: total > 0 ? total : null,
        details: message
      });
    }

    if (window.ISHBackend) {
      window.ISHBackend.submit({
        type: 'Software Ticket',
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
