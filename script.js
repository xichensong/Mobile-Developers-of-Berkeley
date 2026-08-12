// ---------- Liquid glass (https://github.com/dashersw/liquid-glass-js) ----------
// Hydrates buttons + the nav pill into WebGL glass panels once html2canvas
// has taken its one-time page snapshot; falls back to plain CSS buttons/nav
// (already styled via styles.css) if the library failed to load.
function fallbackButton(mount) {
  const a = document.createElement('a');
  a.href = mount.dataset.href || '#';
  a.target = mount.dataset.target || '_self';
  a.rel = 'noopener';
  a.innerHTML = mount.dataset.text || 'Button';
  a.className = mount.dataset.tint && parseFloat(mount.dataset.tint) >= 0.3 ? 'btn btn-primary' : 'btn btn-outline';
  mount.replaceWith(a);
}

function hydrateGlassButtons() {
  document.querySelectorAll('[data-glass-button]').forEach(mount => {
    const text = mount.dataset.text || 'Button';
    const size = parseInt(mount.dataset.size, 10) || 18;
    const tint = mount.dataset.tint !== undefined ? parseFloat(mount.dataset.tint) : 0.2;
    const href = mount.dataset.href;
    const target = mount.dataset.target || '_self';
    const darkText = mount.dataset.darkText === 'true';

    try {
      const btn = new Button({
        text,
        size,
        type: 'pill',
        tintOpacity: tint,
        onClick: () => { if (href) window.open(href, target, 'noopener'); }
      });

      if (darkText && btn.textElement) btn.textElement.style.color = '#253c7d';
      btn.element.setAttribute('role', 'link');
      btn.element.setAttribute('tabindex', '0');
      btn.element.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (href) window.open(href, target, 'noopener'); }
      });

      mount.replaceWith(btn.element);
    } catch (err) {
      console.warn('liquid-glass button failed, using fallback', err);
      fallbackButton(mount);
    }
  });
}

function hydrateNavGlass() {
  const navPill = document.getElementById('navPill');
  if (!navPill) return;
  try {
    const glassBg = new Container({ type: 'pill', borderRadius: 24, tintOpacity: 0.12 });
    glassBg.element.style.position = 'absolute';
    glassBg.element.style.inset = '0';
    glassBg.element.style.zIndex = '-1';
    glassBg.element.style.padding = '0';
    navPill.style.position = 'relative';
    navPill.insertBefore(glassBg.element, navPill.firstChild);
    glassBg.updateSizeFromDOM();
    window.addEventListener('resize', () => glassBg.updateSizeFromDOM());
  } catch (err) {
    console.warn('liquid-glass nav background failed, keeping CSS fallback', err);
  }
}

if (typeof Button !== 'undefined' && typeof Container !== 'undefined') {
  hydrateGlassButtons();
  hydrateNavGlass();
} else {
  document.querySelectorAll('[data-glass-button]').forEach(fallbackButton);
}

// ---------- Letters fall away; bears rotate through three story chapters ----------
(function () {
  const heroSection = document.querySelector('.hero');
  const logoWrap = document.querySelector('.hero-logo-wrap');
  const staticArtwork = [...document.querySelectorAll('.hero-logo-img, .hero-logo-decor')];
  const heroText = document.querySelector('.hero-text');
  const storyPanels = [...document.querySelectorAll('[data-story-panel]')];
  const storyStatEls = [...document.querySelectorAll('.story-stat-number')];
  const bearWraps = [...document.querySelectorAll('.bear-wrap[data-fall]')];
  const letterEls = [...document.querySelectorAll('.falling-letter[data-fall-letter]')];
  if (!heroSection || !logoWrap || (!bearWraps.length && !letterEls.length)) return;

  const bearNames = ['red', 'pink', 'green'];
  const bears = bearWraps.map(el => ({
    el,
    name: bearNames.find(name => el.classList.contains(`bear-${name}-wrap`))
  }));
  const letters = letterEls.map(el => ({
    el,
    anchorX: parseFloat(el.dataset.anchorX),
    anchorY: parseFloat(el.dataset.anchorY),
    targetX: parseFloat(el.dataset.targetX),
    finalScreenY: parseFloat(el.dataset.finalScreenY),
    rotate: parseFloat(el.dataset.rotate) || 160,
    finalScale: parseFloat(el.dataset.finalScale) || 1
  }));
  let ticking = false;
  let geometry = null;
  let storyStatsStarted = false;

  const storyStates = [
    { featured:'green', slots:{ green:'featured', red:'left', pink:'right' } },
    { featured:'red', slots:{ red:'featured', pink:'left', green:'right' } },
    { featured:'pink', slots:{ pink:'featured', green:'left', red:'right' } }
  ];
  const desktopSlotLayout = {
    featured:{ x:.25, screenY:.48, scale:3.5 },
    left:{ x:.12, screenY:1.20, scale:1.4 },
    right:{ x:.40, screenY:1.20, scale:1.55 }
  };
  const mobileSlotLayout = {
    featured:{ x:.22, screenY:.40, scale:2.15 },
    left:{ x:.18, screenY:1.16, scale:1.1 },
    right:{ x:.72, screenY:1.16, scale:1.15 }
  };

  const clamp01 = value => Math.min(Math.max(value, 0), 1);
  const smooth = value => {
    const t = clamp01(value);
    return t * t * (3 - 2 * t);
  };
  const smoother = value => {
    const t = clamp01(value);
    return t * t * t * (t * (t * 6 - 15) + 10);
  };
  const mix = (a, b, amount) => a + (b - a) * amount;

  function startStoryStats() {
    if (storyStatsStarted) return;
    storyStatsStarted = true;
    storyStatEls.forEach(el => {
      const target = parseInt(el.dataset.target, 10);
      const duration = 1500;
      const startedAt = performance.now();
      const tick = now => {
        const amount = smoother((now - startedAt) / duration);
        el.textContent = Math.round(target * amount);
        if (amount < 1) requestAnimationFrame(tick);
        else el.textContent = target;
      };
      requestAnimationFrame(tick);
    });
  }

  function measureGeometry() {
    const rect = logoWrap.getBoundingClientRect();
    geometry = {
      wrapWidth: logoWrap.offsetWidth,
      wrapHeight: logoWrap.offsetHeight,
      wrapScreenTop: rect.top,
      bearStarts: new Map(bears.map(b => [b.el, {
        x: b.el.offsetLeft + b.el.offsetWidth / 2,
        y: b.el.offsetTop + b.el.offsetHeight / 2
      }]))
    };
  }

  measureGeometry();

  function update() {
    ticking = false;
    const scrollRange = Math.max(heroSection.offsetHeight - window.innerHeight, 1);
    const progress = Math.min(Math.max(window.scrollY / scrollRange, 0), 1);
    const fallEnd = .22;
    const fallProgress = smooth(progress / fallEnd);
    const { wrapWidth, wrapHeight, wrapScreenTop, bearStarts } = geometry;
    const slotLayout = window.innerWidth <= 900 ? mobileSlotLayout : desktopSlotLayout;

    staticArtwork.forEach(el => { el.style.opacity = String(Math.max(1 - fallProgress * 1.35, 0)); });
    if (heroText) {
      heroText.style.opacity = String(1 - fallProgress);
      heroText.style.transform = `translateY(${-35 * fallProgress}px)`;
      heroText.style.pointerEvents = fallProgress > .8 ? 'none' : '';
      heroText.style.visibility = progress >= fallEnd ? 'hidden' : 'visible';
    }

    // Each chapter has a long resting interval, separated by a short transition.
    let rawStoryProgress = 0;
    if (progress >= .42 && progress < .58) rawStoryProgress = smoother((progress - .42) / .16);
    else if (progress >= .58 && progress < .72) rawStoryProgress = 1;
    else if (progress >= .72 && progress < .88) rawStoryProgress = 1 + smoother((progress - .72) / .16);
    else if (progress >= .88) rawStoryProgress = 2;
    const outroProgress = smooth((progress - .965) / .035);
    const fromStateIndex = Math.min(Math.floor(rawStoryProgress), 1);
    const toStateIndex = Math.min(fromStateIndex + 1, 2);
    // rawStoryProgress already uses the quintic curve; easing it again made
    // bears stall and then rush through the middle of each swap.
    const stateMix = rawStoryProgress - fromStateIndex;
    const nearestStateIndex = Math.min(Math.round(rawStoryProgress), 2);

    bears.forEach(b => {
      const start = bearStarts.get(b.el);
      const startX = start.x;
      const startY = start.y;
      const firstSlot = slotLayout[storyStates[0].slots[b.name]];
      let targetX = firstSlot.x;
      let targetScreenY = firstSlot.screenY;
      let targetScale = firstSlot.scale;

      if (progress > fallEnd) {
        const fromSlot = slotLayout[storyStates[fromStateIndex].slots[b.name]];
        const toSlot = slotLayout[storyStates[toStateIndex].slots[b.name]];
        targetX = mix(fromSlot.x, toSlot.x, stateMix);
        targetScreenY = mix(fromSlot.screenY, toSlot.screenY, stateMix);
        targetScale = mix(fromSlot.scale, toSlot.scale, stateMix);
      }

      // Clear the featured bear below the viewport for the final MDB outro.
      targetScreenY = mix(targetScreenY, 1.22, outroProgress);
      targetScale = mix(targetScale, 1.5, outroProgress);

      const destinationX = wrapWidth * targetX;
      const destinationY = window.innerHeight * targetScreenY - wrapScreenTop;
      const movementProgress = progress <= fallEnd ? fallProgress : 1;
      const x = (destinationX - startX) * movementProgress;
      const y = (destinationY - startY) * movementProgress;
      const scale = 1 + (targetScale - 1) * movementProgress;
      b.el.classList.toggle('is-falling', progress > .025);
      b.el.classList.toggle('is-settled', progress >= fallEnd);
      const distanceFromFeatured = Math.abs(rawStoryProgress - storyStates.findIndex(state => state.featured === b.name));
      const featuredBlend = smoother(1 - distanceFromFeatured);
      const isFeatured = progress >= fallEnd * .88 && outroProgress < .05 && featuredBlend > .82;
      b.el.classList.toggle('is-featured', isFeatured);
      b.el.style.opacity = '1';
      if (b.el.classList.contains('bear-green-wrap')) {
        const greenArmAngle = -61 + fallProgress * 49;
        b.el.style.setProperty('--green-arm-return', `${greenArmAngle}deg`);
      }
      b.el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
    });

    letters.forEach(letter => {
      const x = wrapWidth * (letter.targetX - letter.anchorX) * fallProgress + wrapWidth * .125 * outroProgress;
      const startScreenY = wrapScreenTop + wrapHeight * letter.anchorY;
      const finalLetterScreenY = mix(letter.finalScreenY, .94, outroProgress);
      const targetScreenY = window.innerHeight * finalLetterScreenY;
      const y = (targetScreenY - startScreenY) * fallProgress;
      const r = letter.rotate * fallProgress;
      const scale = 1 + (letter.finalScale - 1) * fallProgress;
      letter.el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${r}deg) scale(${scale})`;
    });

    let panelOpacities;
    if (progress < .22) panelOpacities = [0, 0, 0];
    else if (progress < .27) panelOpacities = [smooth((progress - .22) / .05), 0, 0];
    else if (progress < .42) panelOpacities = [1, 0, 0];
    else if (progress < .49) panelOpacities = [1 - smooth((progress - .42) / .07), 0, 0];
    else if (progress < .51) panelOpacities = [0, 0, 0];
    else if (progress < .58) panelOpacities = [0, smooth((progress - .51) / .07), 0];
    else if (progress < .72) panelOpacities = [0, 1, 0];
    else if (progress < .79) panelOpacities = [0, 1 - smooth((progress - .72) / .07), 0];
    else if (progress < .81) panelOpacities = [0, 0, 0];
    else if (progress < .88) panelOpacities = [0, 0, smooth((progress - .81) / .07)];
    else panelOpacities = [0, 0, 1];

    storyPanels.forEach((panel, index) => {
      const opacity = panelOpacities[index];
      panel.style.opacity = String(opacity);
      panel.style.transform = `translateY(${(1 - opacity) * 28}px)`;
      panel.style.pointerEvents = opacity > .8 ? 'auto' : 'none';
    });
    if (panelOpacities[0] > .72) startStoryStats();

  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    measureGeometry();
    onScroll();
  });
  update();
})();

// ---------- Header scroll state ----------
const header = document.querySelector('.site-header');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 20);
});

// ---------- Mobile nav toggle ----------
const navToggle = document.getElementById('navToggle');
const navLinksMobile = document.getElementById('navLinksMobile');
navToggle.addEventListener('click', () => {
  navLinksMobile.classList.toggle('open');
});

// ---------- Reusable typewriter effect ----------
function startTypewriter(el, words) {
  let wIndex = 0, cIndex = 0, deleting = false;
  function loop() {
    const current = words[wIndex];
    if (!deleting) {
      cIndex++;
      el.textContent = current.slice(0, cIndex);
      if (cIndex === current.length) {
        deleting = true;
        setTimeout(loop, 1400);
        return;
      }
    } else {
      cIndex--;
      el.textContent = current.slice(0, cIndex);
      if (cIndex === 0) {
        deleting = false;
        wIndex = (wIndex + 1) % words.length;
      }
    }
    setTimeout(loop, deleting ? 55 : 90);
  }
  loop();
}

startTypewriter(document.getElementById('typewriter'), ['MDB.', 'MDBesties.', 'Developers.', 'Creators.', 'Innovators.']);
startTypewriter(document.getElementById('communityTypewriter'), ['MDBesties.', 'Family.', 'Friends.', 'Builders.']);

// ---------- Reveal on scroll ----------
// IntersectionObserver handles the smooth case; a scroll/resize fallback
// guarantees nothing stays hidden if a fast/instant scroll skips the
// intersection callback (e.g. jump-to-anchor, automated scroll, etc).
const revealEls = document.querySelectorAll('.reveal-up, .reveal-right');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });
revealEls.forEach(el => revealObserver.observe(el));

function revealFallback() {
  const vh = window.innerHeight;
  revealEls.forEach(el => {
    if (el.classList.contains('in-view')) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < vh && rect.bottom > 0) {
      el.classList.add('in-view');
      revealObserver.unobserve(el);
    }
  });
}
window.addEventListener('scroll', revealFallback, { passive: true });
window.addEventListener('resize', revealFallback);
revealFallback();

// ---------- Stat counters ----------
const statEls = document.querySelectorAll('.stat-number');
const statObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !entry.target.dataset.done) {
      entry.target.dataset.done = '1';
      animateCount(entry.target);
      statObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.4 });
statEls.forEach(el => statObserver.observe(el));

function statFallback() {
  const vh = window.innerHeight;
  statEls.forEach(el => {
    if (el.dataset.done) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < vh * 0.85 && rect.bottom > 0) {
      el.dataset.done = '1';
      animateCount(el);
      statObserver.unobserve(el);
    }
  });
}
window.addEventListener('scroll', statFallback, { passive: true });
statFallback();

function animateCount(el) {
  const target = parseInt(el.dataset.target, 10);
  const duration = 1400;
  const start = performance.now();
  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    el.textContent = Math.floor(progress * target);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target;
  }
  requestAnimationFrame(step);
}

// ---------- Community marquee (real MDB photos) ----------
const col1Photos = [
  { src: 'images/lafayette5.jpg', caption: 'Lafayette Square Contract Team' },
  { src: 'images/edan-goat.JPEG', caption: "PM Edan planning our W against Codebase" },
  { src: 'images/table1.JPEG', caption: 'MDB Picnic at the Glade' },
  { src: 'images/mdb-ride.jpg', caption: 'MDB Banquet Dinner' },
  { src: 'images/car2.JPEG', caption: 'Riding the Superman at Six Flags' },
  { src: 'images/stpat.JPEG', caption: "St. Patty's Day!" },
  { src: 'images/wnc.jpg', caption: 'Wine and Cheese Night!' },
  { src: 'images/noah-goat.JPEG', caption: "Noah, our beloved president" },
  { src: 'images/jefflineage5.jpg', caption: "Jeff's Lineage - MDB Legacy" },
  { src: 'images/newbies.JPEG', caption: 'Newbie Hike!' }
];
const col2Photos = [
  { src: 'images/mdb-goats.JPEG', caption: 'MDB LShip GOATs' },
  { src: 'images/8ball.JPEG', caption: '8-Ball Night' },
  { src: 'images/wbn1.JPEG', caption: 'Welcome Back Night' },
  { src: 'images/circuit7.jpg', caption: 'Circuit Contract Team' },
  { src: 'images/table3.JPEG', caption: 'MDB Banquet Dinner' },
  { src: 'images/mdb-hawaii.JPG', caption: 'MDB Hawaii Retreat' },
  { src: 'images/car1.JPEG', caption: 'MDB in Hawaii, the Car' },
  { src: 'images/mdb5 2.jpg', caption: 'Mobile Developers of Berkeley' },
  { src: 'images/pms2.jpg', caption: 'Project Manager Team' },
  { src: 'images/6flags-selfie.jpg', caption: 'MDB Selfie @ Six Flags' }
];
const col3Photos = [
  { src: 'images/soccer-w.jpg', caption: 'MDB supporting our IM Soccer Team' },
  { src: 'images/tp-over.jpg', caption: 'TP Instructor ending the semester with a bang' },
  { src: 'images/wbn2.JPEG', caption: 'Welcome Back Night' },
  { src: 'images/sur7.jpg', caption: 'Sur Contract Team' },
  { src: 'images/mdb-newnite.JPG', caption: 'Newbie Night <3' },
  { src: 'images/mdb-6flags.jpeg', caption: 'MDB @ Six Flags' },
  { src: 'images/car3.JPEG', caption: 'MDB in Hawaii, the Car' },
  { src: 'images/edan-pair.jpg', caption: 'Edan and his Little' },
  { src: 'images/table2.JPEG', caption: 'MDB Banquet Dinner' }
];

function buildColumn(colId, photos) {
  const col = document.getElementById(colId);
  if (!col) return;
  let html = '';
  for (let r = 0; r < 2; r++) { // duplicate set for seamless loop
    photos.forEach(p => {
      html += `<div class="photo-card">
        <div class="photo-card-img" style="background-image:url('${encodeURI(p.src)}')"></div>
        <div class="photo-card-caption">${p.caption}</div>
      </div>`;
    });
  }
  col.innerHTML = html;
}
buildColumn('col1', col1Photos);
buildColumn('col2', col2Photos);
buildColumn('col3', col3Photos);

function buildStoryPhotoRow(rowId, photos) {
  const row = document.getElementById(rowId);
  if (!row) return;
  row.innerHTML = [...photos, ...photos].map(photo =>
    `<div class="story-photo-card">
      <img src="${encodeURI(photo.src)}" alt="${photo.caption}" loading="lazy">
      <span>${photo.caption}</span>
    </div>`
  ).join('');
}
buildStoryPhotoRow('storyCommunityPhotos1', col1Photos);
buildStoryPhotoRow('storyCommunityPhotos2', col2Photos);
buildStoryPhotoRow('storyCommunityPhotos3', col3Photos);

// ---------- Destinations logo grid ----------
const logos = [
  { name: 'Google', src: 'images/google.svg' },
  { name: 'Jane Street', src: 'images/janestreet.png' },
  { name: 'Amazon', src: 'images/amazon.svg' },
  { name: 'Microsoft', src: 'images/microsoft.svg' },
  { name: 'Apple', src: 'images/apple.svg' },
  { name: 'Atlassian', src: 'images/atlassian.png' },
  { name: 'Databricks', src: 'images/databricks.png' },
  { name: 'LinkedIn', src: 'images/linkedin.png' },
  { name: 'Tesla', src: 'images/tesla.svg' },
  { name: 'Bloomberg', src: 'images/bloomberg.webp' },
  { name: 'Retool', src: 'images/retool.png' },
  { name: 'SpaceX', src: 'images/spacex.svg' },
  { name: 'IMC', src: 'images/imc.png' },
  { name: 'Y Combinator', src: 'images/ycombinator.png' },
  { name: 'Goldman Sachs', src: 'images/goldmansachs.svg' },
  { name: 'BlackRock', src: 'images/blackrock.png' },
  { name: 'Stripe', src: 'images/stripe.svg' },
  { name: 'Blackstone', src: 'images/blackstone.png' },
  { name: 'Meta', src: 'images/meta.svg' },
  { name: 'Point72', src: 'images/point72.png' }
];
const logoGrid = document.getElementById('logoGrid');
if (logoGrid) {
  logoGrid.innerHTML = logos.map(l =>
    `<div class="logo-cell"><img src="${encodeURI(l.src)}" alt="${l.name}" loading="lazy"></div>`
  ).join('');
}

const storyLogoGrid = document.getElementById('storyLogoGrid');
if (storyLogoGrid) {
  storyLogoGrid.innerHTML = logos.map(logo =>
    `<div class="story-logo-cell" aria-label="${logo.name} alumni destination">
      <img src="${encodeURI(logo.src)}" alt="${logo.name}" loading="lazy">
    </div>`
  ).join('');
}
