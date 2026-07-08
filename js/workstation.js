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

  function openDialog(event) {
    event.preventDefault();
    resetDialog();
    dialog.showModal();
  }

  openCard.addEventListener('click', openDialog);
  openCard.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' || event.key === ' ') {
      openDialog(event);
    }
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

    var emailHref = 'mailto:internetsmarthub@gmail.com?subject=' +
      encodeURIComponent('Workstation Order ' + ticketId) +
      '&body=' + encodeURIComponent(message);

    var emailLink = document.getElementById('workstationEmailLink');
    emailLink.href = emailHref;

    var whatsappLink = document.getElementById('workstationWhatsappLink');
    whatsappLink.href = 'https://wa.me/27697304534?text=' + encodeURIComponent(message);

    if (window.ISHTicket) {
      window.ISHTicket.renderQR(document.getElementById('workstationResultQR'), message);
    }

    /*
     * Backend integration point: this order is not stored or emailed
     * automatically — clicking "Place Order Request" opens the customer's
     * own email client with the order pre-filled (mailto: cannot send mail
     * directly from JavaScript). To send this automatically without relying
     * on the customer's own email client, POST it to a backend endpoint or
     * a service like Formspree here instead.
     */
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

    // Open the customer's email client immediately with the order ready
    window.location.href = emailHref;
  });
});
