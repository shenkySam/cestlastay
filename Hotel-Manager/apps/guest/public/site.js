/*
 * C'est La Stay — landing interactivity (static page).
 * Booking modal -> POST /bookings/public, DB-driven stay prices via
 * GET /rooms/categories, and the footer newsletter -> POST /crm/subscribe.
 * No build step: the API base is chosen at runtime by hostname.
 */
(() => {
  'use strict';

  const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const API = isLocal
    ? 'http://localhost:3000/api/v1'
    : 'https://cestlastay-production.up.railway.app/api/v1';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  const fmtPrice = (n) => '₹' + Number(n).toLocaleString('en-IN');

  // ---- Stay catalog (drives prices + the modal dropdown from the admin) ------
  let categories = [];
  const fallbackStays = $$('#staysList .stay-row').map((r) => r.getAttribute('data-stay'));

  const findCategory = (name) => {
    if (!name) return null;
    const key = name.trim().toLowerCase();
    return categories.find((c) => (c.name || '').trim().toLowerCase() === key) || null;
  };

  function applyCategories() {
    $$('#staysList .stay-row').forEach((row) => {
      const cat = findCategory(row.getAttribute('data-stay'));
      if (!cat) return;
      const price = $('[data-stay-price]', row);
      if (price) price.innerHTML = fmtPrice(cat.basePrice) + ' <small>/ night</small>';
      const name = $('[data-stay-name]', row);
      if (name && cat.name) name.textContent = cat.name;
      const desc = $('[data-stay-desc]', row);
      if (desc && cat.description) desc.textContent = cat.description;
    });
  }

  function populateStaySelect() {
    const sel = $('#bkStay');
    if (!sel) return;
    // Always offer exactly the stays shown on the page; attach the matching
    // category id (so the booking uses the right room type) when one exists.
    sel.innerHTML = '';
    fallbackStays.forEach((name) => {
      const cat = findCategory(name);
      const opt = document.createElement('option');
      opt.value = cat ? cat.id : '';
      opt.dataset.name = name;
      opt.textContent = name;
      sel.appendChild(opt);
    });
  }

  async function loadCategories() {
    try {
      const res = await fetch(API + '/rooms/categories');
      if (res.ok) categories = await res.json();
    } catch (_) { /* offline / API down -> keep hardcoded content */ }
    applyCategories();
    populateStaySelect();
  }

  // ---- Booking modal ---------------------------------------------------------
  const modal = $('#bookModal');
  const formWrap = $('#bookForm');
  const doneWrap = $('#bookDone');

  function openModal(prefill) {
    if (!modal) return;
    prefill = prefill || {};
    formWrap.style.display = '';
    doneWrap.style.display = 'none';
    const msg = $('#bkMsg'); msg.textContent = ''; msg.classList.remove('err');

    const ci = prefill.checkIn || ($('#bbCheckIn') && $('#bbCheckIn').value) || '';
    const co = prefill.checkOut || ($('#bbCheckOut') && $('#bbCheckOut').value) || '';
    if (ci) $('#bkCheckIn').value = ci;
    if (co) $('#bkCheckOut').value = co;
    const g = prefill.guests || ($('#bbGuests') && $('#bbGuests').value);
    if (g) $('#bkGuests').value = String(g);

    if (prefill.stay) {
      const opt = $$('#bkStay option').find((o) => (o.dataset.name || '').toLowerCase() === prefill.stay.toLowerCase());
      if (opt) $('#bkStay').value = opt.value;
    }
    const today = new Date().toISOString().slice(0, 10);
    $('#bkCheckIn').min = today;
    $('#bkCheckOut').min = today;

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => $('#bkFirst').focus(), 50);
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  $$('[data-book]').forEach((el) =>
    el.addEventListener('click', (e) => {
      e.preventDefault();
      openModal({ stay: el.getAttribute('data-stay') || '' });
    }),
  );
  $$('[data-book-close]').forEach((el) => el.addEventListener('click', closeModal));
  if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  const bookForm = $('#bookFormEl');
  if (bookForm) {
    bookForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = $('#bkMsg');
      msg.classList.remove('err');
      const first = $('#bkFirst').value.trim();
      const last = $('#bkLast').value.trim();
      const email = $('#bkEmail').value.trim();
      const checkIn = $('#bkCheckIn').value;
      const checkOut = $('#bkCheckOut').value;
      const fail = (t) => { msg.textContent = t; msg.classList.add('err'); };
      if (!first || !last) return fail('Please enter your full name.');
      if (!EMAIL_RE.test(email)) return fail('Please enter a valid email.');
      if (!checkIn || !checkOut) return fail('Please choose your arrival and departure dates.');
      if (new Date(checkOut) <= new Date(checkIn)) return fail('Departure must be after arrival.');

      const categoryId = $('#bkStay').value || undefined;
      const payload = {
        firstName: first,
        lastName: last,
        email,
        phone: $('#bkPhone').value.trim() || undefined,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numberOfGuests: Number($('#bkGuests').value),
        specialRequests: $('#bkNotes').value.trim() || undefined,
      };
      if (categoryId) payload.categoryId = categoryId;

      const btn = $('#bkSubmit');
      btn.disabled = true; btn.textContent = 'Reserving…';
      try {
        const res = await fetch(API + '/bookings/public', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('bad status');
        const booking = await res.json();
        const num = booking.bookingNumber ? ' Reservation ' + booking.bookingNumber + '.' : '';
        formWrap.style.display = 'none';
        doneWrap.style.display = '';
        $('#bookDoneMsg').textContent =
          (booking.status === 'CONFIRMED' ? 'Your stay is confirmed.' : 'Request received.') +
          num + ' A confirmation is on its way to your inbox.';
      } catch (_) {
        fail('We couldn’t complete your reservation. Please try again, or email stay@cestlastay.com.');
      } finally {
        btn.disabled = false; btn.textContent = 'Request to reserve';
      }
    });
  }

  // ---- Availability search (hero booking bar) --------------------------------
  function scrollToStays() {
    const el = document.getElementById('stays');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function ensureAvailMsg() {
    let el = document.getElementById('availMsg');
    if (!el) {
      const head = document.querySelector('#stays .sec-head');
      el = document.createElement('p');
      el.id = 'availMsg';
      el.className = 'avail-msg';
      el.setAttribute('role', 'status');
      if (head) head.appendChild(el);
    }
    return el;
  }

  function setRowAvail(row, ok) {
    const meta = row.querySelector('.stay-meta');
    if (!meta) return;
    let b = meta.querySelector('[data-avail]');
    if (!b) { b = document.createElement('div'); b.setAttribute('data-avail', ''); meta.appendChild(b); }
    b.className = 'avail-badge ' + (ok ? 'ok' : 'req');
    b.textContent = ok ? '✓ Available' : 'On request';
  }

  async function onSearch() {
    const ci = ($('#bbCheckIn') || {}).value || '';
    const co = ($('#bbCheckOut') || {}).value || '';
    const msg = ensureAvailMsg();
    msg.classList.remove('err');
    const bad = (t) => { msg.textContent = t; msg.classList.add('err'); scrollToStays(); };
    if (!ci || !co) return bad('Please choose your arrival and departure dates above.');
    if (new Date(co) <= new Date(ci)) return bad('Departure must be after arrival.');

    msg.textContent = 'Checking availability…';
    scrollToStays();
    let rooms = [];
    try {
      const res = await fetch(API + '/rooms/availability?checkIn=' + ci + '&checkOut=' + co);
      if (res.ok) rooms = await res.json();
    } catch (_) { /* offline -> treat all as on request */ }
    const availCats = new Set((rooms || []).map((r) => r.categoryId));

    let n = 0;
    $$('#staysList .stay-row').forEach((row) => {
      const cat = findCategory(row.getAttribute('data-stay'));
      const ok = !!(cat && availCats.has(cat.id));
      if (ok) n++;
      setRowAvail(row, ok);
    });
    msg.textContent = n > 0
      ? n + ' stay' + (n > 1 ? 's' : '') + ' available for ' + ci + ' → ' + co + '. Choose one and hit Reserve.'
      : 'No rooms open for ' + ci + ' → ' + co + ' — hit Reserve to request and we’ll confirm by email.';
  }

  const bookingBar = $('#bookingBar');
  if (bookingBar) bookingBar.addEventListener('submit', (e) => { e.preventDefault(); onSearch(); });

  // ---- Newsletter ------------------------------------------------------------
  const newsForm = $('#newsForm');
  if (newsForm) {
    newsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = $('#newsEmail');
      const msg = $('#newsMsg');
      msg.classList.remove('err');
      const email = input.value.trim();
      if (!EMAIL_RE.test(email)) { msg.textContent = 'Please enter a valid email.'; msg.classList.add('err'); return; }
      try {
        const res = await fetch(API + '/crm/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, source: 'guest-footer' }),
        });
        if (!res.ok) throw new Error('bad status');
        msg.textContent = 'Thank you — you’re on the list.';
        input.value = '';
      } catch (_) {
        msg.textContent = 'Couldn’t subscribe just now. Please try again.';
        msg.classList.add('err');
      }
    });
  }

  loadCategories();
})();
