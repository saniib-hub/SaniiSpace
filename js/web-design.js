document.addEventListener('DOMContentLoaded', function () {
  var dialog = document.getElementById('webDesignDialog');
  var openCard = document.getElementById('web-design');
  var closeBtn = document.getElementById('webDesignClose');
  var form = document.getElementById('webDesignForm');
  var formView = document.getElementById('webDesignFormView');
  var resultView = document.getElementById('webDesignResult');
  var restartBtn = document.getElementById('webDesignRestart');

  var supportsDialog = dialog && typeof dialog.showModal === 'function';

  if (!supportsDialog || !openCard || !form) {
    return;
  }

  var contactNameInput = document.getElementById('wdContactName');
  var contactMethodInput = document.getElementById('wdContactMethod');
  var contactNameError = document.getElementById('wdContactNameError');
  var contactMethodError = document.getElementById('wdContactMethodError');

  function resetDialog() {
    form.reset();
    contactNameError.textContent = '';
    contactMethodError.textContent = '';
    contactNameInput.removeAttribute('aria-invalid');
    contactMethodInput.removeAttribute('aria-invalid');
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

  function generateBriefId() {
    var year = new Date().getFullYear();
    var random = Math.floor(1000 + Math.random() * 9000);
    return 'ISH-WEB-' + year + '-' + random;
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var isValid = true;
    var contactName = contactNameInput.value.trim();
    var contactMethod = contactMethodInput.value.trim();

    if (!contactName) {
      contactNameError.textContent = 'Please enter your name.';
      contactNameInput.setAttribute('aria-invalid', 'true');
      isValid = false;
    } else {
      contactNameError.textContent = '';
      contactNameInput.removeAttribute('aria-invalid');
    }

    if (!contactMethod) {
      contactMethodError.textContent = 'Please enter a phone number or email address.';
      contactMethodInput.setAttribute('aria-invalid', 'true');
      isValid = false;
    } else {
      contactMethodError.textContent = '';
      contactMethodInput.removeAttribute('aria-invalid');
    }

    if (!isValid) {
      return;
    }

    var briefId = generateBriefId();
    var projectType = document.getElementById('wdProjectType').value;
    var existingSite = document.getElementById('wdExistingSite').value.trim();
    var pages = document.getElementById('wdPages').value;
    var timeline = document.getElementById('wdTimeline').value;
    var hosting = document.getElementById('wdHosting').value;
    var branding = document.getElementById('wdBranding').value;
    var details = document.getElementById('wdDetails').value.trim();

    var detailsEl = document.getElementById('webDesignResultDetails');
    detailsEl.innerHTML = '';
    addDetailRow(detailsEl, 'Brief ID', briefId);
    addDetailRow(detailsEl, 'Project Type', projectType);
    if (existingSite) addDetailRow(detailsEl, 'Existing Website', existingSite);
    addDetailRow(detailsEl, 'Pages Needed', pages);
    addDetailRow(detailsEl, 'Timeline', timeline);
    addDetailRow(detailsEl, 'Cloud / Hosting Setup', hosting);
    addDetailRow(detailsEl, 'Logo / Branding', branding);
    if (details) addDetailRow(detailsEl, 'Additional Details', details);
    addDetailRow(detailsEl, 'Contact', contactName + ' — ' + contactMethod);

    var messageLines = [
      'Internet Smart Hub — Web Design Brief ' + briefId,
      'Project Type: ' + projectType,
      existingSite ? 'Existing Website: ' + existingSite : null,
      'Pages Needed: ' + pages,
      'Timeline: ' + timeline,
      'Cloud / Hosting Setup: ' + hosting,
      'Logo / Branding: ' + branding,
      details ? 'Additional Details: ' + details : null,
      'Contact: ' + contactName + ' — ' + contactMethod
    ].filter(function (line) { return line !== null; });
    var message = messageLines.join('\n');

    var whatsappLink = document.getElementById('webDesignWhatsappLink');
    whatsappLink.href = 'https://wa.me/27697304534?text=' + encodeURIComponent(message);

    var emailLink = document.getElementById('webDesignEmailLink');
    emailLink.href = 'mailto:internetsmarthub@gmail.com?subject=' +
      encodeURIComponent('Web Design Brief ' + briefId) +
      '&body=' + encodeURIComponent(message);

    /*
     * This brief is not automated by default — the customer sends it via
     * the WhatsApp or email links above, and it's saved to this browser's
     * local ticket log (js/records.js). If js/backend-config.js has a
     * Google Sheets endpoint configured, it's also POSTed there.
     */
    if (window.ISHBackend) {
      window.ISHBackend.submit({
        type: 'Web Design Brief',
        id: briefId,
        name: contactName,
        contact: contactMethod,
        total: null,
        summary: message
      });
    }

    if (window.ISHRecords) {
      window.ISHRecords.save({
        id: briefId,
        type: 'Web Design Brief',
        summary: message,
        total: null,
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
