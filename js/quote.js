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

  var checkboxes = form.querySelectorAll('input[name="problem"]');
  var deviceNameInput = document.getElementById('quoteDeviceName');
  var modelNumberInput = document.getElementById('quoteModelNumber');
  var deviceNameError = document.getElementById('quoteDeviceNameError');
  var modelNumberError = document.getElementById('quoteModelNumberError');

  function resetDialog() {
    form.reset();
    updateTotal();
    problemsErrorEl.textContent = '';
    deviceNameError.textContent = '';
    modelNumberError.textContent = '';
    deviceNameInput.removeAttribute('aria-invalid');
    modelNumberInput.removeAttribute('aria-invalid');
    formView.hidden = false;
    resultView.hidden = true;
  }

  function updateTotal() {
    var total = 0;
    checkboxes.forEach(function (checkbox) {
      if (checkbox.checked) {
        total += Number(checkbox.getAttribute('data-price'));
      }
    });
    totalEl.textContent = 'R' + total;
    return total;
  }

  function generateInvoiceId() {
    var year = new Date().getFullYear();
    var random = Math.floor(1000 + Math.random() * 9000);
    return 'ISH-' + year + '-' + random;
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

  checkboxes.forEach(function (checkbox) {
    checkbox.addEventListener('change', function () {
      updateTotal();
      if (problemsErrorEl.textContent) {
        problemsErrorEl.textContent = '';
      }
    });
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var isValid = true;
    var checkedBoxes = Array.prototype.filter.call(checkboxes, function (checkbox) {
      return checkbox.checked;
    });

    if (checkedBoxes.length === 0) {
      problemsErrorEl.textContent = 'Please select at least one issue.';
      isValid = false;
    } else {
      problemsErrorEl.textContent = '';
    }

    var deviceName = deviceNameInput.value.trim();
    if (!deviceName) {
      deviceNameError.textContent = 'Please enter the device name.';
      deviceNameInput.setAttribute('aria-invalid', 'true');
      isValid = false;
    } else {
      deviceNameError.textContent = '';
      deviceNameInput.removeAttribute('aria-invalid');
    }

    var modelNumber = modelNumberInput.value.trim();
    if (!modelNumber) {
      modelNumberError.textContent = 'Please enter the model number.';
      modelNumberInput.setAttribute('aria-invalid', 'true');
      isValid = false;
    } else {
      modelNumberError.textContent = '';
      modelNumberInput.removeAttribute('aria-invalid');
    }

    if (!isValid) {
      return;
    }

    var total = updateTotal();
    var invoiceId = generateInvoiceId();
    var problemNames = checkedBoxes.map(function (checkbox) {
      return checkbox.value;
    });

    document.getElementById('resultInvoiceId').textContent = invoiceId;
    document.getElementById('resultDevice').textContent = deviceName;
    document.getElementById('resultModel').textContent = modelNumber;
    document.getElementById('resultProblems').textContent = problemNames.join(', ');
    document.getElementById('resultTotal').textContent = 'R' + total;

    var messageLines = [
      'Repair Quote Request',
      'Invoice ID: ' + invoiceId,
      'Device: ' + deviceName,
      'Model Number: ' + modelNumber,
      'Issues: ' + problemNames.join(', '),
      'Estimated Total: R' + total
    ];
    var message = messageLines.join('\n');

    var whatsappLink = document.getElementById('quoteWhatsappLink');
    whatsappLink.href = 'https://wa.me/27697304534?text=' + encodeURIComponent(message);

    var emailLink = document.getElementById('quoteEmailLink');
    emailLink.href = 'mailto:internetsmarthub@gmail.com?subject=' +
      encodeURIComponent('Repair Quote ' + invoiceId) +
      '&body=' + encodeURIComponent(message);

    /*
     * Backend integration point: this quote is not stored or emailed
     * automatically — the customer sends it themselves via the WhatsApp or
     * email links above. To automate delivery, POST the quote details
     * (invoiceId, deviceName, modelNumber, problemNames, total) to a backend
     * endpoint or a service like Formspree here.
     */

    formView.hidden = true;
    resultView.hidden = false;
  });
});
