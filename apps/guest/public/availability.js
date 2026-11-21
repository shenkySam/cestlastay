/*
 * C'est La Stay: /availability results page.
 * Reads ?checkIn=&checkOut=&guests= and lists every free room as its own card
 * (GET /rooms/availability). Regular rooms come first; VIP rooms the admin holds
 * back are offered only when every regular room is taken. When nothing is free,
 * suggests the nearest open dates (GET /rooms/availability/next) and lets the
 * guest request their dates anyway. Booking reuses the landing's modal (site.js).
 */
(() => {
  'use strict';

  const CLS = window.CLS || {};
  const API = CLS.API;
  const fmtPrice = CLS.fmtPrice || ((n) => '₹' + Number(n).toLocaleString('en-IN'));
  const $ = (sel) => document.querySelector(sel);

  const results = $('#results');
  const titleEl = $('#resultTitle');
  const leadEl = $('#resultLead');
  const form = $('#searchForm');
  const sIn = $('#sIn');
  const sOut = $('#sOut');
  const sGuests = $('#sGuests');
  const errEl = $('#searchErr');

  const DAY = 24 * 60 * 60 * 1000;
  const localToday = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
  const parse = (iso) => new Date(iso + 'T00:00:00');
  const nightsBetween = (a, b) => Math.round((parse(b) - parse(a)) / DAY);
  const isIso = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || '') && !isNaN(parse(v).getTime());

  function fmtRange(a, b) {
    const da = parse(a);
    const db = parse(b);
    const day = (d) => d.toLocaleDateString('en-GB', { day: 'numeric' });
    const dm = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    if (da.getMonth() === db.getMonth() && da.getFullYear() === db.getFullYear()) {
      return day(da) + ' to ' + dm(db);
    }
    return dm(da) + ' to ' + dm(db);
  }
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many || one + 's');

  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // Category images point at the original PNGs; serve the optimised copies.
  const OPTIMISED = ['rooms', 'balcony', 'heroImage', 'heroMain'];
  function imageFor(room, i) {
    const raw = room.category && room.category.images && room.category.images[0];
    const m = raw && raw.match(/^\/([A-Za-z]+)\.png$/);
    const base = m && OPTIMISED.includes(m[1]) ? m[1] : !raw ? OPTIMISED[i % OPTIMISED.length] : null;
    if (!base) return { src: raw, srcset: '' };
    return {
      src: '/' + base + '-960.webp',
      srcset: '/' + base + '-480.webp 480w, /' + base + '-960.webp 960w, /' + base + '-1440.webp 1440w',
    };
  }

  // ---- State from the URL ----------------------------------------------------
  function readQuery() {
    const q = new URLSearchParams(location.search);
    const guests = Math.min(6, Math.max(1, parseInt(q.get('guests'), 10) || 2));
    return { checkIn: q.get('checkIn') || '', checkOut: q.get('checkOut') || '', guests };
  }

  function validate(s) {
    if (!isIso(s.checkIn) || !isIso(s.checkOut)) return 'Choose your check-in and check-out dates.';
    if (s.checkIn < localToday()) return 'Check-in can’t be in the past.';
    if (s.checkOut <= s.checkIn) return 'Check-out must be after check-in.';
    return null;
  }

  function fillForm(s) {
    sIn.min = localToday();
    sOut.min = s.checkIn && s.checkIn >= localToday() ? s.checkIn : localToday();
    sIn.value = s.checkIn;
    sOut.value = s.checkOut;
    sGuests.value = String(s.guests);
  }

  function go(s, push) {
    const q = new URLSearchParams({ checkIn: s.checkIn, checkOut: s.checkOut, guests: String(s.guests) });
    if (push) history.pushState(null, '', '?' + q.toString());
    run(s);
  }

  // ---- Rendering -------------------------------------------------------------
  function skeletons() {
    const one =
      '<article class="room skeleton" aria-hidden="true"><div class="room-img"><div class="sk"></div></div>' +
      '<div class="room-body"><div class="sk" style="height:26px;width:62%"></div>' +
      '<div class="sk" style="height:14px;width:44%"></div><div class="sk" style="height:14px;width:88%"></div>' +
      '<div class="room-foot" style="border-top-color:transparent"><div class="sk" style="height:30px;width:38%"></div>' +
      '<div class="sk" style="height:44px;width:120px;border-radius:999px"></div></div></div></article>';
    results.innerHTML = '<div class="grid">' + one + one + one + '</div>';
  }

  function roomCard(room, i, s, nights) {
    const cat = room.category || {};
    const rate = Number(cat.basePrice) || 0;
    const img = imageFor(room, i);
    const amen = (cat.amenities || []).slice(0, 3);
    return (
      '<article class="room rise" style="--i:' + i + '">' +
      '<div class="room-img"><img src="' + esc(img.src) + '"' +
      (img.srcset ? ' srcset="' + img.srcset + '" sizes="(max-width:640px) 100vw, 420px"' : '') +
      ' alt="' + esc(cat.name || 'Room') + ' at C\'est La Stay" loading="lazy" decoding="async"></div>' +
      '<div class="room-body">' +
      '<div class="room-name"><h3>' + esc(cat.name || 'Room ' + room.roomNumber) + '</h3>' +
      (room.isVip ? '<span class="vip">VIP</span>' : '') + '</div>' +
      '<div class="room-facts"><span>Room <b>' + esc(room.roomNumber) + '</b></span>' +
      (cat.maxOccupancy ? '<span>Sleeps <b>' + esc(cat.maxOccupancy) + '</b></span>' : '') +
      '<span>Floor <b>' + esc(room.floor) + '</b></span></div>' +
      (cat.description ? '<p class="room-desc">' + esc(cat.description) + '</p>' : '') +
      (amen.length ? '<div class="chips">' + amen.map((a) => '<span class="chip">' + esc(a) + '</span>').join('') + '</div>' : '') +
      '<div class="room-foot"><div class="price"><b>' + fmtPrice(rate) + ' <small>/ night</small></b>' +
      '<span>' + fmtPrice(rate * nights) + ' for ' + plural(nights, 'night') + '</span></div>' +
      '<button class="pill pill-solid" type="button" data-room="' + esc(room.id) + '">Reserve</button></div>' +
      '</div></article>'
    );
  }

  function nextBlock(next, s) {
    if (!next) {
      return '<div class="next"><small>Next open dates</small><span>Nothing opens in the next two months for ' +
        plural(s.guests, 'guest') + '. Send a request and we’ll look for a way.</span></div>';
    }
    return (
      '<div class="next"><small>Next open dates</small><b>' + fmtRange(next.checkIn, next.checkOut) + '</b>' +
      '<span>' + (next.vip ? 'A VIP room is free' : plural(next.rooms, 'room') + ' free') + ' for the same length of stay.</span></div>' +
      '<button class="pill pill-solid" type="button" data-next="' + esc(next.checkIn) + '|' + esc(next.checkOut) + '">See these dates</button>'
    );
  }

  let current = { rooms: [], state: null, nights: 0 };

  function render(s, rooms, next) {
    const nights = nightsBetween(s.checkIn, s.checkOut);
    const range = fmtRange(s.checkIn, s.checkOut);
    const regular = rooms.filter((r) => !r.isVip);
    const vip = rooms.filter((r) => r.isVip);
    current = { rooms, state: s, nights };
    const stayLine = plural(nights, 'night') + ', ' + plural(s.guests, 'guest') + '.';
    let html = '';

    if (regular.length) {
      titleEl.innerHTML = plural(regular.length, 'room') + ' open, <em>' + esc(range) + '</em>';
      leadEl.textContent = stayLine + ' Pick a room and reserve; a host confirms by email.';
      html = '<div class="grid">' + regular.map((r, i) => roomCard(r, i, s, nights)).join('') + '</div>';
    } else if (vip.length) {
      titleEl.innerHTML = 'Our regular rooms are full, <em>' + esc(range) + '</em>';
      leadEl.textContent = stayLine + ' A VIP room is still open for these dates.';
      html =
        '<div class="notice rise"><div><h2>Stay in a <em>VIP room</em> instead</h2>' +
        '<p>We keep a few rooms aside for exactly this. Reserve one below, or move your dates.</p></div>' +
        '<div class="actions">' + nextBlock(next, s) + '</div></div>' +
        '<div class="group-head"><h2>VIP rooms open</h2><p>' + plural(vip.length, 'room') + '</p></div>' +
        '<div class="grid">' + vip.map((r, i) => roomCard(r, i, s, nights)).join('') + '</div>';
    } else {
      titleEl.innerHTML = 'Fully booked, <em>' + esc(range) + '</em>';
      leadEl.textContent = stayLine + ' Every room is taken for these dates.';
      html =
        '<div class="notice rise"><div><h2>Book ahead for <em>another date</em></h2>' +
        '<p>Try the nearest open dates, or send a request for yours. If a room frees up, a host will confirm by email within 24 hours.</p></div>' +
        '<div class="actions">' + nextBlock(next, s) +
        '<button class="pill pill-ghost" type="button" data-request>Request my dates</button></div></div>';
    }
    results.innerHTML = html;
    results.setAttribute('aria-busy', 'false');
  }

  function renderError(s) {
    titleEl.textContent = 'We couldn’t check availability';
    leadEl.textContent = 'The connection dropped. Try again, or send us a request and a host will reply by email.';
    results.innerHTML =
      '<div class="empty rise"><div style="display:flex;gap:12px;flex-wrap:wrap">' +
      '<button class="pill pill-solid" type="button" data-retry>Try again</button>' +
      '<button class="pill pill-ghost" type="button" data-request>Request my dates</button></div></div>';
    results.setAttribute('aria-busy', 'false');
    current = { rooms: [], state: s, nights: nightsBetween(s.checkIn, s.checkOut) };
  }

  function renderPrompt(msg) {
    titleEl.textContent = 'When would you like to stay?';
    leadEl.textContent = msg;
    results.innerHTML = '';
    results.setAttribute('aria-busy', 'false');
    sIn.focus();
  }

  // ---- Data ------------------------------------------------------------------
  let seq = 0;
  async function run(s) {
    errEl.textContent = '';
    fillForm(s);
    const bad = validate(s);
    if (bad) return renderPrompt(bad);

    const mine = ++seq;
    titleEl.textContent = 'Finding your room';
    leadEl.textContent = 'Checking which rooms are open for ' + fmtRange(s.checkIn, s.checkOut) + '.';
    results.setAttribute('aria-busy', 'true');
    skeletons();

    const qs = 'checkIn=' + s.checkIn + '&checkOut=' + s.checkOut + '&guests=' + s.guests;
    try {
      const res = await fetch(API + '/rooms/availability?' + qs);
      if (!res.ok) throw new Error('status ' + res.status);
      const rooms = (await res.json()) || [];
      // Only look ahead when this search has no regular room to offer.
      let next = null;
      if (!rooms.some((r) => !r.isVip)) {
        try {
          const nr = await fetch(API + '/rooms/availability/next?' + qs);
          if (nr.ok) next = await nr.json().catch(() => null);
        } catch (_) { /* suggestion is optional */ }
      }
      if (mine !== seq) return;
      render(s, rooms, next);
    } catch (_) {
      if (mine !== seq) return;
      renderError(s);
    }
  }

  // ---- Events ----------------------------------------------------------------
  sIn.addEventListener('change', () => {
    if (sIn.value) sOut.min = sIn.value;
    if (sIn.value && sOut.value && sOut.value <= sIn.value) sOut.value = '';
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const s = { checkIn: sIn.value, checkOut: sOut.value, guests: Number(sGuests.value) || 2 };
    const bad = validate(s);
    if (bad) { errEl.textContent = bad; return; }
    go(s, true);
  });

  results.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    const s = current.state;
    if (t.hasAttribute('data-room')) {
      const room = current.rooms.find((r) => r.id === t.getAttribute('data-room'));
      if (!room || !CLS.openBooking) return;
      const name = (room.category && room.category.name) || 'Room';
      CLS.openBooking({
        checkIn: s.checkIn,
        checkOut: s.checkOut,
        guests: s.guests,
        room: {
          id: room.id,
          categoryId: room.categoryId,
          label: name + ', room ' + room.roomNumber + (room.isVip ? ' (VIP)' : '') + '. ' +
            fmtRange(s.checkIn, s.checkOut) + ', ' + fmtPrice(Number((room.category || {}).basePrice) || 0) + ' a night.',
        },
      });
    } else if (t.hasAttribute('data-next')) {
      const [ci, co] = t.getAttribute('data-next').split('|');
      go({ checkIn: ci, checkOut: co, guests: s.guests }, true);
      window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    } else if (t.hasAttribute('data-request')) {
      if (CLS.openBooking) CLS.openBooking({ checkIn: s.checkIn, checkOut: s.checkOut, guests: s.guests });
    } else if (t.hasAttribute('data-retry')) {
      run(s);
    }
  });

  window.addEventListener('popstate', () => run(readQuery()));

  run(readQuery());
})();
