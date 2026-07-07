document.addEventListener('DOMContentLoaded', function () {
  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  /* ---------- Mobile hamburger menu ---------- */
  var navToggle = document.getElementById('navToggle');
  var primaryNav = document.getElementById('primaryNav');

  if (navToggle && primaryNav) {
    navToggle.addEventListener('click', function () {
      var isOpen = primaryNav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', isOpen);
    });

    primaryNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        primaryNav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- Diagnostic status line animation ---------- */
  var diagnosticText = document.getElementById('diagnosticText');
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (diagnosticText && !prefersReducedMotion) {
    var states = ['Diagnosing…', 'Diagnosing… ✓', 'Fixed ✓'];
    var stateIndex = 0;

    setInterval(function () {
      stateIndex = (stateIndex + 1) % states.length;
      diagnosticText.textContent = states[stateIndex];
    }, 1800);
  }

  /* ---------- Contact form validation ---------- */
  var form = document.getElementById('contactForm');

  if (form) {
    var nameInput = document.getElementById('name');
    var contactInput = document.getElementById('contactMethod');
    var messageInput = document.getElementById('message');
    var successMessage = document.getElementById('formSuccess');

    var fields = [
      { input: nameInput, error: document.getElementById('nameError'), message: 'Please enter your name.' },
      { input: contactInput, error: document.getElementById('contactMethodError'), message: 'Please enter a phone number or email address.' },
      { input: messageInput, error: document.getElementById('messageError'), message: 'Please tell us what you need help with.' }
    ];

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var isValid = true;

      fields.forEach(function (field) {
        var value = field.input.value.trim();

        if (!value) {
          field.error.textContent = field.message;
          field.input.setAttribute('aria-invalid', 'true');
          isValid = false;
        } else {
          field.error.textContent = '';
          field.input.removeAttribute('aria-invalid');
        }
      });

      if (!isValid) {
        successMessage.hidden = true;
        return;
      }

      /*
       * Backend integration point: this form does not send data anywhere yet.
       * Wire it up to a backend endpoint or a service like Formspree by
       * changing the <form> tag's action/method and removing this
       * preventDefault-based handling, or by adding a fetch() call here.
       */

      successMessage.hidden = false;
      form.reset();
    });
  }
});
