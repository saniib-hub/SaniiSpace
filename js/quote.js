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
  var brandNameInput = document.getElementById('quoteBrandName');
  var modelInput = document.getElementById('quoteModel');
  var brandNameError = document.getElementById('quoteBrandNameError');
  var modelError = document.getElementById('quoteModelError');
  var softwareIssueInput = document.getElementById('quoteSoftwareIssue');

  function resetDialog() {
    form.reset();
    updateTotal();
    problemsErrorEl.textContent = '';
    brandNameError.textContent = '';
    modelError.textContent = '';
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

  openBtn.addEventListener('click', function (event) {
    event.preventDefault();
    resetDialog();
    dialog.showModal();
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

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var repairParts = checkedRepairParts();
    var gamingParts = selectedGamingParts();
    var softwareIssue = softwareIssueInput.value.trim();

    var isValid = true;

    var hasAnySelection = repairParts.length > 0 || gamingParts.length > 0 || softwareIssue.length > 0;
    if (!hasAnySelection) {
      problemsErrorEl.textContent = 'Please select a repair, a gaming PC part, or describe a software issue.';
      isValid = false;
    } else {
      problemsErrorEl.textContent = '';
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

    // ---------- Build the on-screen result ----------
    var detailsEl = document.getElementById('quoteResultDetails');
    detailsEl.innerHTML = '';

    addDetailRow(detailsEl, 'Ticket ID', ticketId);
    if (brandName) addDetailRow(detailsEl, 'Brand', brandName);
    if (model) addDetailRow(detailsEl, 'Model', model);
    if (repairItems.length) addListRow(detailsEl, 'Repair Parts', repairItems);
    if (gamingItems.length) addListRow(detailsEl, 'Gaming PC Components', gamingItems);
    if (softwareIssue) addDetailRow(detailsEl, 'Software Issue', softwareIssue);
    addDetailRow(detailsEl, 'Estimated Total', total > 0 ? 'R' + total : 'Diagnosed in-store');

    // ---------- Build the WhatsApp / email message ----------
    var messageLines = ['Internet Smart Hub — Ticket ' + ticketId];
    if (brandName) messageLines.push('Brand: ' + brandName);
    if (model) messageLines.push('Model: ' + model);
    repairItems.forEach(function (item) {
      messageLines.push('- ' + item.name + ': R' + item.price);
    });
    gamingItems.forEach(function (item) {
      messageLines.push('- ' + item.name + ': R' + item.price);
    });
    if (softwareIssue) {
      messageLines.push('Software issue: ' + softwareIssue);
    }
    messageLines.push('Estimated Total: ' + (total > 0 ? 'R' + total : 'Diagnosed in-store'));
    var message = messageLines.join('\n');

    var whatsappLink = document.getElementById('quoteWhatsappLink');
    whatsappLink.href = 'https://wa.me/27697304534?text=' + encodeURIComponent(message);

    var emailLink = document.getElementById('quoteEmailLink');
    emailLink.href = 'mailto:internetsmarthub@gmail.com?subject=' +
      encodeURIComponent('Internet Smart Hub Ticket ' + ticketId) +
      '&body=' + encodeURIComponent(message);

    /*
     * Backend integration point: this ticket is not stored or emailed
     * automatically — the customer sends it themselves via the WhatsApp or
     * email links above. To automate delivery or log it to a database,
     * POST the ticket details (ticketId, brandName, model, repairItems,
     * gamingItems, softwareIssue, total) to a backend endpoint here.
     */

    formView.hidden = true;
    resultView.hidden = false;
  });
});
