/*
 * Shared motion helpers used by every <dialog> (quote, printing, web design,
 * stock inquiry, workstation, records) and by the ticket-confirmation
 * screens. Centralised here so the GSAP timeline logic isn't duplicated in
 * six separate files. Falls back to plain instant open/close when GSAP
 * isn't available or the user prefers reduced motion.
 */
window.ISHMotion = (function () {
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function hasGsap() {
    return !!window.gsap && !prefersReducedMotion;
  }

  function innerOf(dialog) {
    return dialog.querySelector('.quote-dialog-inner') || dialog;
  }

  function openDialog(dialog) {
    if (!dialog || typeof dialog.showModal !== 'function') {
      return;
    }
    dialog.showModal();

    if (!hasGsap()) {
      return;
    }

    var inner = innerOf(dialog);
    gsap.fromTo(inner,
      { opacity: 0, scale: 0.94, y: 16 },
      { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: 'back.out(1.5)' }
    );
  }

  function closeDialog(dialog) {
    if (!dialog) {
      return;
    }

    if (!hasGsap()) {
      dialog.close();
      return;
    }

    var inner = innerOf(dialog);
    gsap.to(inner, {
      opacity: 0,
      scale: 0.96,
      y: 8,
      duration: 0.18,
      ease: 'power1.in',
      onComplete: function () {
        dialog.close();
        gsap.set(inner, { clearProps: 'opacity,transform' });
      }
    });
  }

  // Pressing Escape fires the dialog's native "cancel" event before it
  // closes instantly — intercept it so the close animation still plays.
  function bindDialog(dialog) {
    if (!dialog) {
      return;
    }
    dialog.addEventListener('cancel', function (event) {
      event.preventDefault();
      closeDialog(dialog);
    });
  }

  // Success celebration on ticket/order confirmation screens: draws an
  // animated checkmark and pops the QR code in, drawing the eye to it.
  function celebrate(container) {
    if (!container) {
      return;
    }

    var check = container.querySelector('.success-check');
    if (check) {
      check.classList.remove('is-animated');
      if (prefersReducedMotion) {
        check.classList.add('is-done');
      } else {
        void check.offsetWidth; // force reflow so the animation restarts
        check.classList.add('is-animated');
      }
    }

    var qrWrap = container.querySelector('.ticket-qr');
    if (qrWrap && hasGsap()) {
      gsap.fromTo(qrWrap,
        { opacity: 0, scale: 0.75 },
        { opacity: 1, scale: 1, duration: 0.45, delay: 0.5, ease: 'back.out(2.2)' }
      );
    }
  }

  return {
    openDialog: openDialog,
    closeDialog: closeDialog,
    bindDialog: bindDialog,
    celebrate: celebrate
  };
})();
