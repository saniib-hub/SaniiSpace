document.addEventListener('DOMContentLoaded', function () {
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  /* ---------- Opening hours: switch to new hours from 1 Aug 2026 ---------- */
  var openingHoursEl = document.getElementById('openingHours');
  var hoursNoteEl = document.getElementById('hoursNote');
  var newHoursCutoff = new Date(2026, 7, 1); // 1 Aug 2026

  if (openingHoursEl && new Date() >= newHoursCutoff) {
    openingHoursEl.textContent = 'Mon–Fri 06:30–21:00 · Sat 08:00–19:00 · Sun 07:00–20:00';
    if (hoursNoteEl) {
      hoursNoteEl.remove();
    }
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

  /* ---------- Header shrinks + gains shadow on scroll ---------- */
  var siteHeader = document.querySelector('.site-header');
  if (siteHeader) {
    var updateHeaderState = function () {
      siteHeader.classList.toggle('is-scrolled', window.scrollY > 12);
    };
    updateHeaderState();
    window.addEventListener('scroll', updateHeaderState, { passive: true });
  }

  /* ---------- Scroll-triggered reveal animations ---------- */
  var revealEls = document.querySelectorAll('.reveal');

  if (revealEls.length) {
    document.documentElement.classList.add('has-js');

    if ('IntersectionObserver' in window && !prefersReducedMotion) {
      var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

      revealEls.forEach(function (el) {
        revealObserver.observe(el);
      });
    } else {
      revealEls.forEach(function (el) {
        el.classList.add('in-view');
      });
    }
  }

  /* ---------- Hero diagnostic panel: cursor-following glow + status line ---------- */
  var heroVisual = document.getElementById('heroVisual');
  if (heroVisual && !prefersReducedMotion) {
    heroVisual.addEventListener('mousemove', function (event) {
      var rect = heroVisual.getBoundingClientRect();
      var xPercent = ((event.clientX - rect.left) / rect.width) * 100;
      var yPercent = ((event.clientY - rect.top) / rect.height) * 100;
      heroVisual.style.setProperty('--mx', xPercent + '%');
      heroVisual.style.setProperty('--my', yPercent + '%');
    });
  }

  /* ---------- Card tilt on hover (desktop pointer only) ---------- */
  if (!prefersReducedMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.card').forEach(function (card) {
      card.addEventListener('mousemove', function (event) {
        var rect = card.getBoundingClientRect();
        var xPercent = (event.clientX - rect.left) / rect.width - 0.5;
        var yPercent = (event.clientY - rect.top) / rect.height - 0.5;
        var rotateX = (-yPercent * 8).toFixed(2);
        var rotateY = (xPercent * 8).toFixed(2);
        card.style.transform = 'perspective(800px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) translateY(-6px)';
      });

      card.addEventListener('mouseleave', function () {
        card.style.transform = '';
      });
    });
  }

  /* ---------- Diagnostic status line animation ---------- */
  var diagnosticText = document.getElementById('diagnosticText');

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
