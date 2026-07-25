/* a11y-loop demo — AFTER behaviour.
 *
 * Three interactive pieces, each written so that the announced state and the
 * visual state cannot drift apart:
 *
 *   1. the registration dialog  — native <dialog> + showModal()
 *   2. the mobile nav toggle    — aria-expanded drives the CSS
 *   3. the sponsor-ticker pause — aria-pressed toggle button (SC 2.2.2)
 *
 * The dialog is the interesting one. demo/before hand-rolled a modal out of a
 * <div> and got every part of the contract wrong. Using the platform dialog
 * means the focus trap, Escape-to-close, backdrop inertness and focus return
 * are the browser's responsibility rather than ours — less code, and the parts
 * that are easiest to get wrong stop being our code at all.
 */

(function () {
  'use strict';

  /* --------------------------------------------------- registration dialog --- */

  var dialog = document.getElementById('registerDialog');
  var trigger = document.getElementById('registerTrigger');
  var closeBtn = document.getElementById('dialogClose');
  var dialogForm = document.getElementById('dialogForm');
  var dialogStatus = document.getElementById('dialogFormStatus');

  function openDialog() {
    if (typeof dialog.showModal === 'function') {
      // showModal() gives us, for free: focus moved into the dialog, focus
      // trapped inside it, Escape closing it, the rest of the document made
      // inert, and focus returned to the trigger on close.
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }

    // APG Dialog (Modal): when a dialog's main purpose is a form, put initial
    // focus on the first input rather than on the dialog container.
    var firstField = dialog.querySelector('input, select, textarea');
    if (firstField) {
      firstField.focus();
    }
  }

  function closeDialog() {
    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
  }

  trigger.addEventListener('click', openDialog);
  closeBtn.addEventListener('click', closeDialog);

  // Belt and braces on focus return. Browsers restore focus to the trigger
  // themselves for showModal(), but being explicit means the behaviour holds if
  // the dialog is ever closed from somewhere other than this file.
  dialog.addEventListener('close', function () {
    if (document.activeElement === document.body || !document.activeElement) {
      trigger.focus();
    }
  });

  // Clicking the backdrop closes the dialog. This is a mouse convenience only —
  // Escape already covers the keyboard, so no functionality is mouse-only.
  dialog.addEventListener('click', function (event) {
    if (event.target === dialog) {
      closeDialog();
    }
  });

  dialogForm.addEventListener('submit', function (event) {
    event.preventDefault();
    // role="status" on #dialogFormStatus is already in the DOM, so updating its
    // text is announced without moving focus.
    dialogStatus.textContent =
      'Demo page — no payment is taken. In the real thing you would go to our payment provider now.';
  });

  /* ------------------------------------------------------ registration form --- */

  var regForm = document.getElementById('regForm');
  var regStatus = document.getElementById('regFormStatus');

  regForm.addEventListener('submit', function (event) {
    event.preventDefault();
    regStatus.textContent =
      'Demo page — nothing was submitted. The real form would take you to payment next.';
  });

  /* ---------------------------------------------------------- nav toggle --- */

  var navToggle = document.getElementById('navToggle');

  navToggle.addEventListener('click', function () {
    var expanded = navToggle.getAttribute('aria-expanded') === 'true';
    // The stylesheet keys off [aria-expanded="true"], so the attribute is the
    // single source of truth for both the visual and the announced state.
    navToggle.setAttribute('aria-expanded', String(!expanded));
  });

  /* ------------------------------------------------------- ticker control --- */

  var track = document.getElementById('tickerTrack');
  var tickerToggle = document.getElementById('tickerToggle');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function setPaused(paused) {
    track.classList.toggle('is-paused', paused);
    // Per APG, a toggle button keeps one constant label and communicates state
    // through aria-pressed; the label must not change under the user.
    tickerToggle.setAttribute('aria-pressed', String(paused));
  }

  tickerToggle.addEventListener('click', function () {
    setPaused(tickerToggle.getAttribute('aria-pressed') !== 'true');
  });

  // The stylesheet already removes the animation under prefers-reduced-motion.
  // Reflect that in the control's state so the button never reports "not
  // paused" while nothing is moving.
  function syncMotionPreference() {
    if (reduceMotion.matches) {
      setPaused(true);
    }
  }

  syncMotionPreference();

  if (typeof reduceMotion.addEventListener === 'function') {
    reduceMotion.addEventListener('change', syncMotionPreference);
  }
})();
