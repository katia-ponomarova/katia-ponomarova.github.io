const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

const strings = {
  en: {
    openMenu: 'Open menu', closeMenu: 'Close menu',
    copied: (kind) => `${kind} copied`, copyFailed: 'Couldn’t copy', copyByHand: 'Please copy it manually',
    play: 'Play', pause: 'Pause', playRec: 'Play the recording', pauseRec: 'Pause the recording',
    drag: 'Drag me',
    words: ['clear', 'intuitive', 'accessible', 'consistent', 'tested'],
  },
  de: {
    openMenu: 'Menü öffnen', closeMenu: 'Menü schließen',
    copied: (kind) => `${kind} kopiert`, copyFailed: 'Kopieren nicht möglich', copyByHand: 'Bitte von Hand kopieren',
    play: 'Abspielen', pause: 'Pause', playRec: 'Aufnahme abspielen', pauseRec: 'Aufnahme pausieren',
    drag: 'Verschieben',
    words: ['klare', 'intuitive', 'barrierefreie', 'konsistente', 'getestete'],
  },
  uk: {
    openMenu: 'Відкрити меню', closeMenu: 'Закрити меню',
    copied: (kind) => `${kind} скопійовано`, copyFailed: 'Не вдалося скопіювати', copyByHand: 'Скопіюйте, будь ласка, вручну',
    play: 'Відтворити', pause: 'Пауза', playRec: 'Відтворити запис', pauseRec: 'Призупинити запис',
    drag: 'Перетягніть',
    words: ['зрозумілі', 'інтуїтивні', 'доступні', 'узгоджені', 'протестовані'],
  },
};
const say = strings[document.documentElement.lang] || strings.en;

let resizeTimer;
window.addEventListener('resize', () => {
  document.documentElement.classList.add('is-resizing');
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => document.documentElement.classList.remove('is-resizing'), 250);
});

const header = document.querySelector('[data-header]');
const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

const wideHeader = window.matchMedia('(min-width: 1000px)');
const langs = [...document.querySelectorAll('[data-lang]')].map((root) => {
  const toggle = root.querySelector('[aria-controls]');
  const set = (open) => {
    root.toggleAttribute('data-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', () => set(!root.hasAttribute('data-open')));
  if (finePointer) {
    const hoverable = () => !root.closest('[data-nav]') || wideHeader.matches;
    root.addEventListener('pointerenter', () => { if (hoverable()) set(true); });
    root.addEventListener('pointerleave', () => { if (hoverable()) set(false); });
  }
  return { root, set };
});

const burger = document.querySelector('[data-burger]');
const nav = document.querySelector('[data-nav]');
const setMenu = (open) => {
  nav.toggleAttribute('data-open', open);
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? say.closeMenu : say.openMenu);
};
burger.addEventListener('click', () => setMenu(!nav.hasAttribute('data-open')));
nav.querySelectorAll(':scope > a').forEach((a) => a.addEventListener('click', () => setMenu(false)));

document.addEventListener('click', (e) => {
  langs.forEach(({ root, set }) => { if (!root.contains(e.target)) set(false); });
  if (!nav.contains(e.target) && !burger.contains(e.target)) setMenu(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  langs.forEach(({ set }) => set(false));
  setMenu(false);
});

const toast = document.getElementById('toast');
let toastTimer;
const showToast = (title, detail, ok) => {
  toast.querySelector('.toast-mark').textContent = ok ? '✓' : '!';
  toast.querySelector('.toast-title').textContent = title;
  toast.querySelector('.toast-detail').textContent = detail;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3200);
};
const copyText = async (value) => {
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
    }
  }
  const field = document.createElement('textarea');
  field.value = value;
  field.readOnly = true;
  field.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
  document.body.appendChild(field);
  field.select();
  const ok = document.execCommand('copy');
  field.remove();
  if (!ok) throw new Error('copy failed');
};
document.querySelectorAll('[data-copy]').forEach((btn) => {
  let timer;
  btn.addEventListener('click', async () => {
    const value = btn.dataset.copy;
    try {
      await copyText(value);
      showToast(say.copied(btn.dataset.copyKind), value, true);
      btn.classList.add('is-copied');
      clearTimeout(timer);
      timer = setTimeout(() => btn.classList.remove('is-copied'), 1800);
    } catch {
      showToast(say.copyFailed, say.copyByHand, false);
    }
  });
});

document.querySelectorAll('[data-tabs]').forEach((root) => {
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  const select = (tab, focus) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (e) => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (step) {
        e.preventDefault();
        select(tabs[(i + step + tabs.length) % tabs.length], true);
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        select(tabs[e.key === 'Home' ? 0 : tabs.length - 1], true);
      }
    });
  });
});

if (!reduceMotion) {
  const boards = [...document.querySelectorAll('.fvc')];
  boards.forEach((b) => b.classList.add('is-armed'));
  const shown = (el) => el.offsetParent !== null;
  const play = (board) => {
    board.classList.remove('is-drawn');
    void board.offsetWidth;
    board.classList.add('is-drawn');
    const motion = board.querySelector('animateMotion');
    if (!motion) return;
    const dot = board.querySelector('.e-dot');
    dot.classList.remove('is-on');
    clearTimeout(board.dotTimer);
    board.dotTimer = setTimeout(() => {
      dot.classList.add('is-on');
      try { motion.beginElement(); } catch { /* no SMIL: the board is still drawn */ }
    }, board.querySelectorAll('path.e').length * 120 + 500);
  };
  const inView = (board) => {
    const r = board.getBoundingClientRect();
    return r.top < innerHeight - Math.min(r.height, innerHeight) * 0.25 && r.bottom > 0;
  };
  const check = () => boards.forEach((b) => { if (shown(b) && !b.classList.contains('is-drawn') && inView(b)) play(b); });
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    setTimeout(() => { ticking = false; check(); }, 60);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  window.addEventListener('load', check);
  const replay = () => setTimeout(() => boards.forEach((b) => {
    if (!shown(b)) { b.classList.remove('is-drawn'); return; }
    if (inView(b)) play(b);
  }));
  document.querySelectorAll('.flow-tabs [role="tab"]').forEach((t) => {
    t.addEventListener('click', replay);
    t.addEventListener('keydown', replay);
  });
}

document.querySelectorAll('[data-slider]').forEach((root) => {
  const track = root.querySelector('[data-track]');
  const slides = [...track.children];
  const names = [...root.querySelectorAll('[data-go]')];
  const dots = [...root.querySelectorAll('[data-dot]')];
  const prev = root.querySelector('[data-prev]');
  const next = root.querySelector('[data-next]');
  const count = root.querySelector('[data-count]');
  let current = 0;
  let target = null; // while a click-scroll is under way, the controls already show where it is going
  const render = (index) => {
    current = index;
    names.forEach((n, i) => (i === index ? n.setAttribute('aria-current', 'true') : n.removeAttribute('aria-current')));
    dots.forEach((d, i) => d.classList.toggle('is-active', i === index));
    if (count) count.textContent = String(index + 1).padStart(2, '0');
    prev.disabled = index === 0;
    next.disabled = index === slides.length - 1;
  };
  const go = (i) => {
    const index = Math.max(0, Math.min(slides.length - 1, i));
    target = index;
    render(index);
    track.scrollTo({ left: slides[index].offsetLeft, behavior: reduceMotion ? 'auto' : 'smooth' });
  };
  const sync = () => {
    const index = track.clientWidth ? Math.round(track.scrollLeft / track.clientWidth) : 0;
    if (target !== null && index !== target) return;
    target = null;
    render(index);
  };
  let frame;
  track.addEventListener('scroll', () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(sync); }, { passive: true });
  ['pointerdown', 'wheel', 'touchstart'].forEach((type) => track.addEventListener(type, () => { target = null; }, { passive: true }));
  prev.addEventListener('click', () => go(current - 1));
  next.addEventListener('click', () => go(current + 1));
  names.forEach((n) => n.addEventListener('click', () => go(Number(n.dataset.go))));
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      go(current + (e.key === 'ArrowRight' ? 1 : -1));
    }
  });
  window.addEventListener('resize', () => go(current));
  sync();
});

document.querySelectorAll('[data-journey]').forEach((root) => {
  const track = root.querySelector('[data-track]');
  const cols = [...track.querySelectorAll('[data-col]')];
  const pts = [...root.querySelectorAll('[data-go]')];
  const prev = root.querySelector('[data-prev]');
  const next = root.querySelector('[data-next]');
  const count = root.querySelector('[data-count]');
  const band = root.querySelector('[data-band]');
  const pad = (i) => String(i + 1).padStart(2, '0');
  let first = 0;
  let picked = null;
  const step = () => (cols[1] ? cols[1].offsetLeft - cols[0].offsetLeft : track.clientWidth);
  const render = () => {
    const w = step();
    first = Math.max(0, Math.min(cols.length - 1, Math.round(track.scrollLeft / w)));
    const last = Math.min(cols.length - 1, first + Math.max(1, Math.round(track.clientWidth / w)) - 1);
    const cur = picked !== null && picked >= first && picked <= last ? picked : first;
    pts.forEach((p, i) => (i === cur ? p.setAttribute('aria-current', 'true') : p.removeAttribute('aria-current')));
    cols.forEach((c, i) => c.classList.toggle('is-picked', i === picked));
    if (band) { band.style.setProperty('--from', first); band.style.setProperty('--to', last + 1); }
    if (count) count.textContent = last > first ? `${pad(first)}–${pad(last)}` : pad(first);
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
  };
  const go = (i) => {
    const index = Math.max(0, Math.min(cols.length - 1, i));
    picked = index;
    track.scrollTo({ left: cols[index].offsetLeft - cols[0].offsetLeft, behavior: reduceMotion ? 'auto' : 'smooth' });
    render();
  };
  let frame;
  track.addEventListener('scroll', () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(render); }, { passive: true });
  ['pointerdown', 'wheel', 'touchstart'].forEach((type) => track.addEventListener(type, () => { picked = null; }, { passive: true }));
  pts.forEach((p) => p.addEventListener('click', () => go(Number(p.dataset.go))));
  prev.addEventListener('click', () => go(first - 1));
  next.addEventListener('click', () => go(first + 1));
  cols.forEach((c, i) => {
    c.addEventListener('pointerenter', () => pts[i].classList.add('is-hot'));
    c.addEventListener('pointerleave', () => pts[i].classList.remove('is-hot'));
  });
  window.addEventListener('resize', () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(render); });
  render();
});

document.querySelectorAll('[data-loop]').forEach((box) => {
  if (!('IntersectionObserver' in window)) return;
  new IntersectionObserver(([entry]) => box.classList.toggle('is-paused', !entry.isIntersecting)).observe(box);
});

const recs = [...document.querySelectorAll('[data-rec]')].map((box) => {
  const video = box.querySelector('video');
  const btn = box.querySelector('[data-rec-toggle]');
  const rec = { video, held: reduceMotion };
  const label = () => {
    const on = !video.paused;
    btn.textContent = on ? say.pause : say.play;
    btn.setAttribute('aria-label', on ? say.pauseRec : say.playRec);
  };
  btn.addEventListener('click', () => {
    rec.held = !video.paused;
    if (rec.held) video.pause();
    else video.play().catch(() => {});
  });
  video.addEventListener('play', label);
  video.addEventListener('pause', label);
  label();
  return rec;
});
if (recs.length) {
  const onScreen = (el) => {
    if (el.offsetParent === null) return false;
    const r = el.getBoundingClientRect();
    return r.bottom > innerHeight * 0.15 && r.top < innerHeight * 0.85;
  };
  const syncRecs = () => recs.forEach(({ video, held }) => {
    if (!held && onScreen(video)) { if (video.paused) video.play().catch(() => {}); } else if (!video.paused) video.pause();
  });
  let recTick = false;
  const onRecScroll = () => {
    if (recTick) return;
    recTick = true;
    setTimeout(() => { recTick = false; syncRecs(); }, 150);
  };
  window.addEventListener('scroll', onRecScroll, { passive: true });
  window.addEventListener('resize', onRecScroll);
  document.querySelectorAll('[data-tabs] [role="tab"]').forEach((t) => ['click', 'keydown'].forEach((type) => t.addEventListener(type, () => setTimeout(syncRecs))));
  document.addEventListener('visibilitychange', () => { if (document.hidden) recs.forEach(({ video }) => video.pause()); else syncRecs(); });
}

document.querySelectorAll('[data-tour]').forEach((root) => {
  const view = root.querySelector('[data-tour-win]');
  const page = root.querySelector('[data-tour-page]');
  const mark = root.querySelector('[data-tour-mark]');
  const notes = [...root.querySelectorAll('[data-y]')];
  const srcW = Number(root.dataset.tourW);
  const srcH = Number(root.dataset.tourH);
  let current = -1;
  const place = () => {
    if (current < 0 || view.offsetParent === null || !page.clientWidth) return;
    const k = page.clientWidth / srcW;
    const y = Number(notes[current].dataset.y) * k;
    const h = Number(notes[current].dataset.h) * k;
    const vh = view.clientHeight;
    const shift = Math.min(Math.max(0, srcH * k - vh), Math.max(0, y - Math.max(0, (vh - h) / 2)));
    page.style.transform = `translate3d(0, ${-shift}px, 0)`;
    mark.style.top = `${y}px`;
    mark.style.height = `${h}px`;
    root.classList.add('is-live');
  };
  const check = () => {
    const mid = innerHeight / 2;
    let best = 0;
    let gap = Infinity;
    notes.forEach((n, i) => {
      const r = n.getBoundingClientRect();
      const d = r.top > mid ? r.top - mid : r.bottom < mid ? mid - r.bottom : 0;
      if (d < gap) { gap = d; best = i; }
    });
    if (best === current) return;
    current = best;
    notes.forEach((n, i) => n.classList.toggle('is-on', i === current));
    place();
  };
  window.addEventListener('scroll', check, { passive: true });
  window.addEventListener('resize', place);
  check();
});

const revealAll = () => {
  document.querySelectorAll('[data-hero-line], [data-hero-in], [data-hero-portrait]').forEach((el) => {
    el.style.visibility = 'visible';
  });
};

if (!window.gsap) revealAll();
else init();

function init() {
  const { gsap } = window;
  gsap.registerPlugin(ScrollTrigger, SplitText, Draggable, InertiaPlugin);
  ScrollTrigger.config({ ignoreMobileResize: true });

  let lenis = null;
  if (!reduceMotion && finePointer && window.Lenis) {
    lenis = new Lenis({ lerp: 0.11 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    const id = link.getAttribute('href');
    if (id.length < 2) return;
    link.addEventListener('click', (event) => {
      const target = id === '#top' ? document.body : document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      const offset = -header.offsetHeight;
      if (lenis) lenis.scrollTo(id === '#top' ? 0 : target, { offset, duration: 1.2 });
      else target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });

  const mm = gsap.matchMedia();
  document.fonts.ready.then(() => {
    if (document.querySelector('[data-hero]')) heroIntro(gsap, mm);
    else pageIntro(gsap);
    caseFrames(gsap, mm);
    loopRows(gsap);
    dragCursor();
    swapWords(gsap);
    scrollScenes(gsap);
    ScrollTrigger.refresh();
  });
  window.addEventListener('load', () => ScrollTrigger.refresh());

  if ('ResizeObserver' in window) {
    let lastHeight = null;
    let timer;
    new ResizeObserver(([entry]) => {
      const height = Math.round(entry.contentRect.height);
      if (lastHeight === null || height === lastHeight) { lastHeight = height; return; }
      lastHeight = height;
      clearTimeout(timer);
      timer = setTimeout(() => ScrollTrigger.refresh(), 100);
    }).observe(document.body);
  }
}

function heroIntro(gsap, mm) {
  const hero = document.querySelector('[data-hero]');

  if (reduceMotion) {
    revealAll();
  } else {
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.fromTo('[data-hero-line]', { y: 70, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.1, stagger: 0.09 })
      .from('.sel', { scale: 0.7, autoAlpha: 0, duration: 0.5, ease: 'back.out(2)' }, 0.5)
      .fromTo('[data-hero-portrait]', { autoAlpha: 0, scale: 0.94, rotate: -3 }, { autoAlpha: 1, scale: 1, rotate: 0, duration: 1.3 }, 0.1)
      .from('.badge', { autoAlpha: 0, y: 24, scale: 0.92, duration: 0.8, stagger: 0.14, ease: 'back.out(1.6)' }, 0.7)
      .fromTo('[data-hero-in]', { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.08 }, 0.4)
      .from('.tool', { autoAlpha: 0, y: 14, scale: 0.9, duration: 0.6, stagger: 0.04, ease: 'back.out(1.7)' }, 0.75);
  }

  mm.add('(min-width: 1200px)', () => {
    let detachParallax = () => {};
    if (finePointer && !reduceMotion) {
      const portrait = document.querySelector('[data-hero-portrait] > img');
      const badges = gsap.utils.toArray('.badge');
      const px = gsap.quickTo(portrait, 'x', { duration: 0.9, ease: 'power3.out' });
      const py = gsap.quickTo(portrait, 'y', { duration: 0.9, ease: 'power3.out' });
      const bx = badges.map((b) => gsap.quickTo(b, 'x', { duration: 1.1, ease: 'power3.out' }));
      const move = (e) => {
        const r = hero.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = (e.clientY - r.top) / r.height - 0.5;
        px(nx * -14);
        py(ny * -10);
        bx.forEach((fn, i) => fn(nx * (i ? 18 : -18)));
      };
      hero.addEventListener('pointermove', move);
      detachParallax = () => hero.removeEventListener('pointermove', move);
    }

    const mate = !reduceMotion ? cursorMate(gsap, hero) : null;
    return () => {
      detachParallax();
      mate?.kill();
    };
  });
}

function tiltPlate(gsap, plate) {
  if (!finePointer) return;
  gsap.set(plate, { transformPerspective: 1200 });
  const rx = gsap.quickTo(plate, 'rotationX', { duration: 0.6, ease: 'power3.out' });
  const ry = gsap.quickTo(plate, 'rotationY', { duration: 0.6, ease: 'power3.out' });
  plate.addEventListener('pointermove', (e) => {
    const r = plate.getBoundingClientRect();
    ry(((e.clientX - r.left) / r.width - 0.5) * 6);
    rx(((e.clientY - r.top) / r.height - 0.5) * -6);
  });
  plate.addEventListener('pointerleave', () => { rx(0); ry(0); });
}

function pageIntro(gsap) {
  if (reduceMotion) {
    revealAll();
    return;
  }
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.fromTo('[data-hero-line]', { y: 60, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.1, stagger: 0.09 })
    .fromTo('[data-hero-in]', { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.07 }, 0.25);
}

function caseFrames(gsap, mm) {
  mm.add('(min-width: 1000px) and (hover: hover) and (pointer: fine)', () => {
    const frames = gsap.utils.toArray('[data-case-frame]');
    const drags = Draggable.create(frames, {
      dragClickables: true,
      zIndexBoost: false,
      onPress() { this.target.classList.add('is-dragging'); },
      onRelease() {
        this.target.classList.remove('is-dragging');
        gsap.to(this.target, { x: 0, y: 0, duration: reduceMotion ? 0 : 0.9, ease: 'elastic.out(1, 0.6)' });
      },
      onClick() { if (this.target.href) window.location.href = this.target.href; },
    });
    frames.forEach((f) => f.classList.add('is-draggable'));
    return () => {
      drags.forEach((d) => d.kill());
      frames.forEach((f) => f.classList.remove('is-draggable', 'is-dragging'));
      gsap.set(frames, { x: 0, y: 0 });
    };
  });
}

function loopRows(gsap) {
  document.querySelectorAll('[data-loop]').forEach((box) => {
    const row = box.querySelector('.mc-row');
    const track = box.querySelector('.mc-track');
    if (!row || !track) return;
    track.classList.add('is-js');
    if (!finePointer) { touchRow(gsap, box, row, track); return; }
    let half = track.scrollWidth / 2;
    let x = 0;
    let hover = false;
    let held = false;
    const setX = gsap.quickSetter(track, 'x', 'px');
    const place = () => { if (half > 0) x = ((x % half) - half) % half; setX(x); };
    if ('ResizeObserver' in window) new ResizeObserver(() => { half = track.scrollWidth / 2; place(); }).observe(track);
    let v = 0;
    gsap.ticker.add((time, delta) => {
      if (held || !half) return;
      const dt = Math.min(delta, 50) / 1000;
      const target = hover || reduceMotion || box.classList.contains('is-paused') ? 0 : -half / 70;
      const rate = Math.abs(v - target) > 200 ? 3 : 4;
      v += (target - v) * (1 - Math.exp(-rate * dt));
      if (target === 0 && Math.abs(v) < 0.5) v = 0;
      if (v === 0) return;
      x += v * dt;
      place();
    });
    row.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hover = true; });
    row.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hover = false; });
    let drag = null;
    const start = (e) => {
      held = true;
      v = 0;
      drag.on = true;
      drag.from = x;
      drag.x0 = e.clientX;
      drag.trail = [[performance.now(), e.clientX]];
      row.classList.add('is-dragging');
      try { row.setPointerCapture(e.pointerId); } catch (err) { /* the pointer may already be gone */ }
    };
    const stop = (e, keepSpeed) => {
      if (!drag) return;
      if (drag.on) {
        row.classList.remove('is-dragging');
        const t = drag.trail;
        const last = t[t.length - 1];
        const first = t[0];
        const span = (last[0] - first[0]) / 1000;
        const fresh = performance.now() - last[0] < 80;
        const speed = keepSpeed && span > 0.01 && fresh ? (last[1] - first[1]) / span : 0;
        v = reduceMotion ? 0 : gsap.utils.clamp(-3000, 3000, speed);
        held = false;
        try { row.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ }
      }
      drag = null;
    };
    row.addEventListener('pointerdown', (e) => {
      if (drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
      drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, on: false };
      if (e.pointerType === 'mouse') { e.preventDefault(); start(e); }
    });
    row.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.on) {
        const dx = e.clientX - drag.sx;
        const dy = e.clientY - drag.sy;
        if (Math.hypot(dx, dy) < 6) return;
        if (Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
        start(e);
      }
      x = drag.from + (e.clientX - drag.x0);
      place();
      const now = performance.now();
      drag.trail.push([now, e.clientX]);
      while (drag.trail.length > 2 && now - drag.trail[0][0] > 100) drag.trail.shift();
    });
    row.addEventListener('pointerup', (e) => { if (drag && e.pointerId === drag.id) stop(e, true); });
    row.addEventListener('pointercancel', (e) => { if (drag && e.pointerId === drag.id) stop(e, false); });
    row.addEventListener('lostpointercapture', (e) => { if (drag && drag.on && e.pointerId === drag.id) stop(e, true); });
    row.addEventListener('dragstart', (e) => e.preventDefault());
    row.classList.add('is-draggable');
    row.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      x -= e.deltaX;
      place();
    }, { passive: false });
  });
}

function touchRow(gsap, box, row, track) {
  [...track.children].filter((el) => !el.hasAttribute('aria-hidden')).forEach((el) => {
    const copy = el.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    track.appendChild(copy);
  });
  row.classList.add('is-scroll');
  let set = track.scrollWidth / 3;
  let pos = set;
  let v = 0;
  let finger = false;
  let busy = false;
  let idle = 0;
  const wrap = () => {
    if (set <= 0) return;
    while (pos >= 2 * set) pos -= set;
    while (pos < set) pos += set;
  };
  const apply = () => { row.scrollLeft = pos; };
  requestAnimationFrame(() => { set = track.scrollWidth / 3; pos = set; apply(); });
  if ('ResizeObserver' in window) {
    new ResizeObserver(() => {
      const next = track.scrollWidth / 3;
      if (!next || next === set) return;
      pos = (pos / set) * next;
      set = next;
      if (!busy) { wrap(); apply(); }
    }).observe(track);
  }
  const settle = () => {
    clearTimeout(idle);
    idle = setTimeout(() => { busy = false; pos = row.scrollLeft; wrap(); apply(); }, 180);
  };
  row.addEventListener('touchstart', () => { finger = true; busy = true; v = 0; clearTimeout(idle); }, { passive: true });
  row.addEventListener('touchend', () => { finger = false; settle(); }, { passive: true });
  row.addEventListener('touchcancel', () => { finger = false; settle(); }, { passive: true });
  row.addEventListener('scroll', () => {
    if (!busy) return;
    pos = row.scrollLeft;
    if (!finger) settle();
  }, { passive: true });
  row.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    busy = true;
    v = 0;
    settle();
  }, { passive: true });
  let hover = false;
  let drag = null;
  row.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hover = true; });
  row.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hover = false; });
  row.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' || e.button !== 0) return;
    e.preventDefault();
    clearTimeout(idle);
    busy = true;
    finger = true;
    v = 0;
    drag = { id: e.pointerId, x0: e.clientX, from: row.scrollLeft, trail: [[performance.now(), e.clientX]] };
    row.classList.add('is-dragging');
    try { row.setPointerCapture(e.pointerId); } catch (err) { /* the pointer may already be gone */ }
  });
  row.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    row.scrollLeft = drag.from - (e.clientX - drag.x0);
    pos = row.scrollLeft;
    const now = performance.now();
    drag.trail.push([now, e.clientX]);
    while (drag.trail.length > 2 && now - drag.trail[0][0] > 100) drag.trail.shift();
  });
  const letGo = (e, keepSpeed) => {
    if (!drag || e.pointerId !== drag.id) return;
    const t = drag.trail;
    const last = t[t.length - 1];
    const span = (last[0] - t[0][0]) / 1000;
    const fresh = performance.now() - last[0] < 80;
    const speed = keepSpeed && span > 0.01 && fresh ? (last[1] - t[0][1]) / span : 0;
    v = reduceMotion ? 0 : -gsap.utils.clamp(-3000, 3000, speed);
    drag = null;
    finger = false;
    busy = false;
    pos = row.scrollLeft;
    row.classList.remove('is-dragging');
  };
  row.addEventListener('pointerup', (e) => letGo(e, true));
  row.addEventListener('pointercancel', (e) => letGo(e, false));
  row.addEventListener('dragstart', (e) => e.preventDefault());
  gsap.ticker.add((time, delta) => {
    if (busy || !set) return;
    const dt = Math.min(delta, 50) / 1000;
    const target = hover || reduceMotion || box.classList.contains('is-paused') ? 0 : set / 70;
    const rate = Math.abs(v - target) > 200 ? 3 : 4;
    v += (target - v) * (1 - Math.exp(-rate * dt));
    if (target === 0 && Math.abs(v) < 0.5) v = 0;
    if (v === 0) return;
    pos += v * dt;
    wrap();
    apply();
  });
}

function dragCursor() {
  if (!finePointer) return;
  const el = document.createElement('div');
  el.className = 'drag-cursor';
  el.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span');
  label.textContent = say.drag;
  el.appendChild(label);
  document.body.appendChild(el);
  let on = false;
  let px = null;
  let py = null;
  const place = () => { el.style.transform = `translate3d(${px}px, ${py}px, 0)`; };
  const show = (yes) => {
    if (yes === on) return;
    on = yes;
    el.classList.toggle('is-on', yes);
  };
  const overFrame = (target) => Boolean(document.querySelector('.case-media.is-dragging, .mc-row.is-dragging') || target?.closest?.('.case-media.is-draggable, .mc-row.is-draggable'));
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    px = e.clientX;
    py = e.clientY;
    place();
    show(overFrame(e.target));
    el.classList.toggle('is-pressed', Boolean(document.querySelector('.case-media.is-dragging, .mc-row.is-dragging')));
  }, { passive: true });
  document.addEventListener('pointerdown', (e) => { if (on && overFrame(e.target)) el.classList.add('is-pressed'); });
  document.addEventListener('pointerup', () => el.classList.remove('is-pressed'));
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (px === null || ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; show(overFrame(document.elementFromPoint(px, py))); });
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => show(false));
}


function cursorMate(gsap, hero) {
  const mate = document.querySelector('[data-mate]');
  const at = (el, fx = 0.5, fy = 0.5) => {
    const a = hero.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    return { x: b.left - a.left + b.width * fx, y: b.top - a.top + b.height * fy };
  };
  const swap = document.querySelector('[data-swap]');
  const open = document.querySelectorAll('.badge-info li')[1];
  const tools = document.querySelectorAll('.tool');
  const pill = mate.querySelector('span');
  const press = { scale: 0.9, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out', transformOrigin: '0 0' };

  const tl = gsap.timeline({ delay: 2.2 });
  tl.set(mate, { ...at(hero, 0.55, 0.62) })
    .to(mate, { opacity: 1, duration: 0.3 })
    .to(mate, { ...at(swap, 0.9, 0.92), duration: 1.1, ease: 'power3.inOut' })
    .to(pill, press)
    .to(mate, { ...at(open, 0.12, 0.6), duration: 1.0, ease: 'power3.inOut' }, '+=0.5')
    .to(pill, press)
    .to(mate, { ...at(tools[2], 0.6, 0.62), duration: 1.0, ease: 'power3.inOut' }, '+=0.5')
    .to(pill, press)
    .to(mate, { ...at(tools[5], 0.7, 0.7), duration: 0.9, ease: 'power3.inOut' }, '+=0.4')
    .to(mate, { opacity: 0, duration: 0.4 }, '+=1.2');
  return tl;
}

function swapWords(gsap) {
  const box = document.querySelector('[data-swap]');
  const word = document.querySelector('[data-swap-word]');
  if (!box || reduceMotion) return;
  const words = say.words;
  let index = 0;
  const setChars = (text) => {
    word.textContent = '';
    [...text].forEach((c) => {
      const span = document.createElement('span');
      span.className = 'ch';
      span.textContent = c;
      word.appendChild(span);
    });
    return word.querySelectorAll('.ch');
  };
  setChars(words[0]);
  gsap.set(box, { perspective: 600 });

  const settle = () => {
    gsap.killTweensOf(box);
    gsap.killTweensOf(word.querySelectorAll('.ch'));
    gsap.set(box, { clearProps: 'width' });
    gsap.set(word.querySelectorAll('.ch'), { clearProps: 'all' });
  };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) settle(); });

  const next = () => {
    if (document.hidden) return;
    settle();
    gsap.to(word.querySelectorAll('.ch'), {
      yPercent: -60, rotationX: 80, autoAlpha: 0, duration: 0.24, ease: 'power2.out', stagger: 0.012,
      onComplete: () => {
        const from = box.offsetWidth;
        index = (index + 1) % words.length;
        const chars = setChars(words[index]);
        const to = box.offsetWidth;
        gsap.fromTo(box, { width: from }, { width: to, duration: 0.5, ease: 'expo.out', clearProps: 'width' });
        gsap.from(chars, { yPercent: 60, rotationX: -80, autoAlpha: 0, duration: 0.5, ease: 'expo.out', stagger: 0.022 });
      },
    });
  };

  let timer = null;
  let steps = 0;
  let paused = false;
  const title = document.querySelector('.hero-title');
  title.addEventListener('pointerenter', () => { paused = true; });
  title.addEventListener('pointerleave', () => { paused = false; });
  const tick = () => {
    if (paused) return;
    next();
    steps += 1;
    if (steps >= words.length) {
      clearInterval(timer);
      setTimeout(settle, 1200);
    }
  };
  ScrollTrigger.create({
    trigger: '[data-hero]',
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => {
      clearInterval(timer);
      if (self.isActive && steps < words.length) timer = setInterval(tick, 2600);
    },
  });
}

function scrollScenes(gsap) {
  if (reduceMotion) return;

  gsap.utils.toArray('[data-split]').forEach((el) => {
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'split-line',
      autoSplit: true,
      onSplit: (self) => gsap.from(self.lines, {
        yPercent: 105, duration: 1.1, ease: 'expo.out', stagger: 0.08,
        scrollTrigger: { trigger: el, start: 'top 86%', once: true },
      }),
    });
  });

  gsap.utils.toArray('[data-rise]').forEach((el) => {
    gsap.from(el, { y: 26, autoAlpha: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });

  gsap.utils.toArray('[data-case]').forEach((item) => {
    const media = item.querySelector('.case-media');
    const plate = media.querySelector('.case-plate');
    const body = item.querySelector('.case-body');

    gsap.from(media, { autoAlpha: 0, yPercent: 8, scale: 0.96, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: media, start: 'top 88%', once: true } });
    gsap.from(body.children, { y: 30, autoAlpha: 0, duration: 0.9, ease: 'expo.out', stagger: 0.07, scrollTrigger: { trigger: body, start: 'top 84%', once: true } });
    tiltPlate(gsap, plate);
  });
  document.querySelectorAll('.cs-cover .case-plate').forEach((plate) => tiltPlate(gsap, plate));

  gsap.utils.toArray('[data-stagger]').forEach((group) => {
    gsap.from(group.children, {
      y: 30, autoAlpha: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08,
      scrollTrigger: { trigger: group, start: 'top 85%', once: true },
    });
  });

  gsap.utils.toArray('[data-bars]').forEach((chart) => {
    gsap.from(chart.querySelectorAll('.bar-fill'), {
      scaleX: 0, duration: 1.1, ease: 'expo.out', stagger: 0.09,
      scrollTrigger: { trigger: chart, start: 'top 80%', once: true },
    });
  });

  if (!document.querySelector('.steps')) return;
  gsap.from('[data-step]', { y: 50, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.12, scrollTrigger: { trigger: '.steps', start: 'top 82%', once: true } });
  gsap.utils.toArray('[data-write]').forEach((el, i) => {
    gsap.fromTo(el, { clipPath: 'inset(0% 100% 0% 0% round 16px)' }, {
      clipPath: 'inset(0% 0% 0% 0% round 16px)', duration: 1.1, ease: 'power3.inOut', delay: 0.25 + i * 0.15,
      scrollTrigger: { trigger: '.steps', start: 'top 82%', once: true },
    });
  });
}
