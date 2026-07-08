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
  var gamingSelects = form.querySelectorAll('[data-quote-select]');
  var softwareAddonCheckboxes = form.querySelectorAll('input[name="softwareAddon"]');
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
  var softwareIssueInput = document.getElementById('quoteSoftwareIssue');
  var specialSoftwareCheckbox = document.getElementById('quoteSpecialSoftware');
  var specialSoftwareGroup = document.getElementById('specialSoftwareGroup');
  var specialSoftwareDetailsInput = document.getElementById('quoteSpecialSoftwareDetails');
  var specialSoftwareError = document.getElementById('quoteSpecialSoftwareError');

  function resetDialog() {
    form.reset();
    updateTotal();
    problemsErrorEl.textContent = '';
    firstNameError.textContent = '';
    lastNameError.textContent = '';
    contactNumberError.textContent = '';
    brandNameError.textContent = '';
    modelError.textContent = '';
    specialSoftwareError.textContent = '';
    firstNameInput.removeAttribute('aria-invalid');
    lastNameInput.removeAttribute('aria-invalid');
    contactNumberInput.removeAttribute('aria-invalid');
    brandNameInput.removeAttribute('aria-invalid');
    modelInput.removeAttribute('aria-invalid');
    specialSoftwareDetailsInput.removeAttribute('aria-invalid');
    specialSoftwareGroup.hidden = true;
    formView.hidden = false;
    resultView.hidden = true;
  }

  function checkedRepairParts() {
    return Array.prototype.filter.call(repairCheckboxes, function (checkbox) {
      return checkbox.checked;
    });
  }

  function checkedSoftwareAddons() {
    return Array.prototype.filter.call(softwareAddonCheckboxes, function (checkbox) {
      return checkbox.checked;
    });
  }

  function selectedGamingParts() {
    return Array.prototype.filter.call(gamingSelects, function (select) {
      return Number(select.value) > 0;
    });
  }

  function updateTotal() {
    var total = 0;
    checkedRepairParts().forEach(function (checkbox) {
      total += Number(checkbox.getAttribute('data-price'));
    });
    selectedGamingParts().forEach(function (select) {
      total += Number(select.value);
    });
    checkedSoftwareAddons().forEach(function (checkbox) {
      total += Number(checkbox.getAttribute('data-price'));
    });
    totalEl.textContent = 'R' + total;
    return total;
  }

  function generateTicketId() {
    var year = new Date().getFullYear();
    var random = Math.floor(1000 + Math.random() * 9000);
    return 'ISH-' + year + '-' + random;
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

  function openDialog(scrollTargetId) {
    resetDialog();
    dialog.showModal();
    if (scrollTargetId) {
      var target = document.getElementById(scrollTargetId);
      if (target) {
        // wait for the dialog's own layout/animation to settle first
        window.requestAnimationFrame(function () {
          target.scrollIntoView({ block: 'start' });
        });
      }
    }
  }

  openBtn.addEventListener('click', function (event) {
    event.preventDefault();
    openDialog();
  });

  document.querySelectorAll('.quote-open-card').forEach(function (card) {
    var sectionId = card.getAttribute('data-quote-section');

    card.addEventListener('click', function (event) {
      event.preventDefault();
      openDialog(sectionId);
    });

    card.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openDialog(sectionId);
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

  repairCheckboxes.forEach(function (checkbox) {
    checkbox.addEventListener('change', function () {
      updateTotal();
      if (problemsErrorEl.textContent) {
        problemsErrorEl.textContent = '';
      }
    });
  });

  gamingSelects.forEach(function (select) {
    select.addEventListener('change', function () {
      updateTotal();
      if (problemsErrorEl.textContent) {
        problemsErrorEl.textContent = '';
      }
    });
  });

  softwareAddonCheckboxes.forEach(function (checkbox) {
    checkbox.addEventListener('change', function () {
      updateTotal();
      if (problemsErrorEl.textContent) {
        problemsErrorEl.textContent = '';
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

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var repairParts = checkedRepairParts();
    var allSelects = selectedGamingParts();
    var osSelects = allSelects.filter(function (select) {
      return select.getAttribute('data-category') === 'Operating System';
    });
    var gamingParts = allSelects.filter(function (select) {
      return select.getAttribute('data-category') !== 'Operating System';
    });
    var softwareAddons = checkedSoftwareAddons();
    var pricedSoftwareAddons = softwareAddons.filter(function (checkbox) {
      return checkbox !== specialSoftwareCheckbox;
    });
    var softwareIssue = softwareIssueInput.value.trim();

    var isValid = true;

    var hasAnySelection = repairParts.length > 0 || gamingParts.length > 0 ||
      osSelects.length > 0 || softwareAddons.length > 0 || softwareIssue.length > 0;
    if (!hasAnySelection) {
      problemsErrorEl.textContent = 'Please select a repair, a gaming PC part, a software package, or describe an issue.';
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

    if (repairParts.length > 0) {
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
    } else {
      brandNameError.textContent = '';
      modelError.textContent = '';
      brandNameInput.removeAttribute('aria-invalid');
      modelInput.removeAttribute('aria-invalid');
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

    var repairItems = repairParts.map(function (checkbox) {
      return { name: checkbox.value, price: Number(checkbox.getAttribute('data-price')) };
    });
    var gamingItems = gamingParts.map(function (select) {
      var optionText = select.options[select.selectedIndex].text;
      var name = select.getAttribute('data-category') + ': ' + optionText.split(' — R')[0];
      return { name: name, price: Number(select.value) };
    });
    var osItems = osSelects.map(function (select) {
      return { name: select.options[select.selectedIndex].text.split(' — R')[0], price: Number(select.value) };
    });
    var softwareAddonItems = pricedSoftwareAddons.map(function (checkbox) {
      return { name: checkbox.value, price: Number(checkbox.getAttribute('data-price')) };
    });

    // ---------- Build the on-screen result ----------
    var detailsEl = document.getElementById('quoteResultDetails');
    detailsEl.innerHTML = '';

    addDetailRow(detailsEl, 'Ticket ID', ticketId);
    addDetailRow(detailsEl, 'Name', firstName + ' ' + lastName);
    addDetailRow(detailsEl, 'Contact Number', contactNumber);
    if (brandName) addDetailRow(detailsEl, 'Brand', brandName);
    if (model) addDetailRow(detailsEl, 'Model', model);
    if (repairItems.length) addListRow(detailsEl, 'Repair Parts', repairItems);
    if (gamingItems.length) addListRow(detailsEl, 'Gaming PC Components', gamingItems);
    if (osItems.length) addListRow(detailsEl, 'Operating System', osItems);
    if (softwareAddonItems.length) addListRow(detailsEl, 'Software Add-ons', softwareAddonItems);
    if (specialSoftwareCheckbox.checked) addDetailRow(detailsEl, 'Special Software Requested', specialSoftwareDetails);
    if (softwareIssue) addDetailRow(detailsEl, 'Other Notes', softwareIssue);
    addDetailRow(detailsEl, 'Estimated Total', total > 0 ? 'R' + total : 'Diagnosed in-store');

    // ---------- Build the WhatsApp / email message ----------
    var messageLines = ['Internet Smart Hub — Ticket ' + ticketId];
    messageLines.push('Name: ' + firstName + ' ' + lastName);
    messageLines.push('Contact Number: ' + contactNumber);
    if (brandName) messageLines.push('Brand: ' + brandName);
    if (model) messageLines.push('Model: ' + model);
    repairItems.forEach(function (item) {
      messageLines.push('- ' + item.name + ': R' + item.price);
    });
    gamingItems.forEach(function (item) {
      messageLines.push('- ' + item.name + ': R' + item.price);
    });
    osItems.forEach(function (item) {
      messageLines.push('- ' + item.name + ': R' + item.price);
    });
    softwareAddonItems.forEach(function (item) {
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

    var whatsappLink = document.getElementById('quoteWhatsappLink');
    whatsappLink.href = 'https://wa.me/27697304534?text=' + encodeURIComponent(message);

    var emailLink = document.getElementById('quoteEmailLink');
    emailLink.href = 'mailto:internetsmarthub@gmail.com?subject=' +
      encodeURIComponent('Internet Smart Hub Ticket ' + ticketId) +
      '&body=' + encodeURIComponent(message);

    if (window.ISHTicket) {
      window.ISHTicket.renderQR(document.getElementById('quoteResultQR'), message);
    }

    /*
     * Backend integration point: this ticket is not stored or emailed
     * automatically — the customer sends it themselves via the WhatsApp or
     * email links above. To automate delivery, POST the ticket details
     * (ticketId, brandName, model, repairItems, gamingItems, softwareIssue,
     * total) to a backend endpoint here. It is saved to this browser's
     * local ticket log below (see js/records.js) — that's a same-device
     * convenience log, not a shared/cloud database.
     */
    if (window.ISHRecords) {
      window.ISHRecords.save({
        id: ticketId,
        type: 'Repair / Build Ticket',
        summary: message,
        total: total > 0 ? total : null,
        details: message
      });
    }

    formView.hidden = true;
    resultView.hidden = false;
  });
});
