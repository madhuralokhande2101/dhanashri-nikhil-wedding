/* =========================================================
   ROYAL WEDDING INVITATION — INTERACTIONS
========================================================= */

// stop the browser from auto-restoring a previous scroll position on
// reload — without this, refreshing mid-page could make it look like
// the envelope cover "didn't open" when really the page just jumped
// straight back to wherever you'd scrolled to before
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}
window.scrollTo(0, 0);

// if the page is restored from the back/forward cache (e.g. after
// swiping back on mobile), force a real reload so the envelope cover
// and all animations start fresh instead of resuming mid-state
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    window.location.reload();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  window.scrollTo(0, 0);
  initEnvelope();
  initEnvelopeOverlayAlignment();
  initMusicToggle();
  initCountdown();
  initScratchCard();
  initRsvpForm();
  initScrollReveal();
});

/* =========================================================
   1a. KEEP THE SEAL + TEXT LOCKED TO THE SAME SPOT ON THE PHOTO
========================================================= */
// The envelope photo now fills the whole screen with object-fit:
// cover, which crops differently on every screen size/aspect ratio.
// Percentage-based CSS alone can't track a fixed point in the
// underlying image once cropping kicks in, so this recalculates the
// on-screen pixel position for the seal and both text labels from
// the image's *actual* rendered geometry every time it changes.
function initEnvelopeOverlayAlignment() {
  const img = document.querySelector(".envelope-image");
  const wrap = document.querySelector(".envelope-wrap");
  if (!img || !wrap) return;

  // fraction (0–1) of where each element sits WITHIN THE ORIGINAL
  // PHOTO — tune these three lines if your envelope.jpg places the
  // seal or text zones somewhere slightly different
  const points = [
    { el: document.getElementById("waxSeal"), fx: 0.5, fy: 0.575 },
    { el: document.querySelector(".envelope-title-text"), fx: 0.5, fy: 0.27 },
    { el: document.querySelector(".envelope-tap-text"), fx: 0.5, fy: 0.75 },
  ].filter((p) => p.el);

  function reposition() {
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    if (!nw || !nh) return;

    const cw = wrap.clientWidth;
    const ch = wrap.clientHeight;

    // a media query switches the image between cover (wide screens)
    // and contain (tall/narrow screens, so it isn't cropped down to
    // a sliver) — read whichever is actually active rather than
    // assuming one, so the math always matches what's on screen
    const isContain = getComputedStyle(img).objectFit === "contain";
    const scale = isContain
      ? Math.min(cw / nw, ch / nh)
      : Math.max(cw / nw, ch / nh);
    const renderedW = nw * scale;
    const renderedH = nh * scale;
    const offsetX = (cw - renderedW) / 2;
    const offsetY = (ch - renderedH) / 2;

    points.forEach(({ el, fx, fy }) => {
      el.style.left = offsetX + fx * renderedW + "px";
      el.style.top = offsetY + fy * renderedH + "px";
    });
  }

  if (img.complete && img.naturalWidth) {
    reposition();
  } else {
    img.addEventListener("load", reposition);
  }

  window.addEventListener("resize", reposition);
  window.addEventListener("orientationchange", reposition);
}

/* =========================================================
   1. ENVELOPE COVER + WAX SEAL + PETALS + MUSIC
========================================================= */
function initEnvelope() {
  const waxSeal = document.getElementById("waxSeal");
  const envelope3d = document.getElementById("envelope3d");
  const envelopeScreen = document.getElementById("envelopeScreen");
  const invitation = document.getElementById("invitation");
  const bgMusic = document.getElementById("bgMusic");

  if (!waxSeal) return;

  let hasOpened = false;

  waxSeal.addEventListener("click", () => {
    if (hasOpened) return;
    hasOpened = true;

    // 1. play music (best-effort — browsers require a user gesture, which this click satisfies)
    if (bgMusic) {
      bgMusic.volume = 0.55;
      bgMusic.play().catch(() => {
        /* music file may be missing locally — fail silently */
      });
    }

    // 2. burst of petals, then a continuous ambient shower for the rest of the session
    launchPetals(70);
    startAmbientPetals();

    // 3. the flap folds open and the seal fades — a single, self-contained animation
    envelope3d.classList.add("is-open");

    // 4. shortly after, the *entire* cover screen dissolves as one unit straight into
    //    the main page — there is no separate element left behind to "pop" mid-transition
    setTimeout(() => {
      envelopeScreen.classList.add("is-hidden");
    }, 550);

    setTimeout(() => {
      invitation.removeAttribute("aria-hidden");
      document.body.style.overflow = "auto";
    }, 550 + 900);
  });

  // lock scroll behind the envelope until it's opened
  document.body.style.overflow = "hidden";
}

function launchPetals(count) {
  const layer = document.getElementById("petalLayer");
  if (!layer) return;

  for (let i = 0; i < count; i++) {
    const petal = document.createElement("div");
    petal.className = "petal";

    const startX = Math.random() * 100;
    const drift = (Math.random() - 0.5) * 220;
    const duration = 4.5 + Math.random() * 3.5;
    const delay = Math.random() * 0.6;
    const size = 10 + Math.random() * 10;

    petal.style.left = startX + "vw";
    petal.style.width = size + "px";
    petal.style.height = size + "px";
    petal.style.setProperty("--drift", drift + "px");
    petal.style.animationDuration = duration + "s";
    petal.style.animationDelay = delay + "s";

    layer.appendChild(petal);

    setTimeout(() => petal.remove(), (duration + delay) * 1000 + 200);
  }
}

// keeps a gentle, continuous shower of petals falling for the entire session
function startAmbientPetals() {
  setInterval(() => {
    launchPetals(2 + Math.floor(Math.random() * 3));
  }, 2200);
}

/* =========================================================
   2. FLOATING MUSIC TOGGLE
========================================================= */
function initMusicToggle() {
  const button = document.getElementById("musicToggle");
  const bgMusic = document.getElementById("bgMusic");
  if (!button || !bgMusic) return;

  function updateUI(isPlaying) {
    button.classList.toggle("is-playing", isPlaying);
    button.setAttribute("aria-pressed", String(isPlaying));
    button.setAttribute("aria-label", isPlaying ? "Mute background music" : "Play background music");
  }

  button.addEventListener("click", () => {
    if (bgMusic.paused) {
      bgMusic.play().catch(() => {});
    } else {
      bgMusic.pause();
    }
  });

  // keep the button's state in sync with whatever actually controls playback
  // (including the wax seal, which also starts the music)
  bgMusic.addEventListener("play", () => updateUI(true));
  bgMusic.addEventListener("pause", () => updateUI(false));
}

/* =========================================================
   3. COUNTDOWN TIMER
========================================================= */
function initCountdown() {
  const daysEl = document.getElementById("cd-days");
  const hoursEl = document.getElementById("cd-hours");
  const minutesEl = document.getElementById("cd-minutes");
  const secondsEl = document.getElementById("cd-seconds");

  if (!daysEl) return;

  // 26 November 2026, 10:21 AM — Shubh Muhurt
  const weddingDate = new Date("2026-11-26T10:21:00");

  function pad(num) {
    return String(Math.max(num, 0)).padStart(2, "0");
  }

  function updateCountdown() {
    const now = new Date();
    const diff = weddingDate - now;

    if (diff <= 0) {
      daysEl.textContent = "00";
      hoursEl.textContent = "00";
      minutesEl.textContent = "00";
      secondsEl.textContent = "00";
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    daysEl.textContent = pad(days);
    hoursEl.textContent = pad(hours);
    minutesEl.textContent = pad(minutes);
    secondsEl.textContent = pad(seconds);
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);
}

/* =========================================================
   4. SCRATCH-TO-REVEAL CARD
========================================================= */
function initScratchCard() {
  const canvas = document.getElementById("scratchCanvas");
  const hint = document.getElementById("scratchHint");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let isDrawing = false;
  let hasRevealed = false;
  let checkCounter = 0;

  function sizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    paintScratchLayer();
  }

  function paintScratchLayer() {
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#f1d989");
    gradient.addColorStop(0.5, "#d4af37");
    gradient.addColorStop(1, "#a9822a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(58, 4, 15, 0.85)";
    ctx.font = "600 15px 'Poppins', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✦ Scratch Here ✦", canvas.width / 2, canvas.height / 2);

    hasRevealed = false;
    canvas.style.opacity = "1";
    canvas.style.transition = "";
    canvas.style.pointerEvents = "auto";
  }

  function getPos(evt) {
    const rect = canvas.getBoundingClientRect();
    if (evt.touches && evt.touches.length) {
      return {
        x: evt.touches[0].clientX - rect.left,
        y: evt.touches[0].clientY - rect.top,
      };
    }
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top,
    };
  }

  function scratchAt(x, y) {
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2);
    ctx.fill();
  }

  function checkRevealProgress() {
    checkCounter++;
    if (checkCounter % 6 !== 0 || hasRevealed) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparent = 0;
    const totalSamples = imageData.length / 4;

    for (let i = 3; i < imageData.length; i += 4 * 8) {
      if (imageData[i] === 0) transparent++;
    }

    const ratio = transparent / (totalSamples / 8);

    if (ratio > 0.55) {
      revealCard();
    }
  }

  function revealCard() {
    hasRevealed = true;
    canvas.style.transition = "opacity 0.6s ease";
    canvas.style.opacity = "0";
    if (hint) hint.textContent = "✨Our Shubh Muhurt has been revealed!✨";
    setTimeout(() => {
      canvas.style.pointerEvents = "none";
    }, 600);
  }

  function startScratch(evt) {
    if (hasRevealed) return;
    isDrawing = true;
    const pos = getPos(evt);
    scratchAt(pos.x, pos.y);
  }

  function moveScratch(evt) {
    if (!isDrawing || hasRevealed) return;
    evt.preventDefault();
    const pos = getPos(evt);
    scratchAt(pos.x, pos.y);
    checkRevealProgress();
  }

  function endScratch() {
    isDrawing = false;
  }

  canvas.addEventListener("mousedown", startScratch);
  canvas.addEventListener("mousemove", moveScratch);
  window.addEventListener("mouseup", endScratch);

  canvas.addEventListener("touchstart", startScratch, { passive: true });
  canvas.addEventListener("touchmove", moveScratch, { passive: false });
  canvas.addEventListener("touchend", endScratch);

  window.addEventListener("resize", sizeCanvas);
  sizeCanvas();
}

/* =========================================================
   5. RSVP FORM
========================================================= */
function initRsvpForm() {
  const form = document.getElementById("rsvpForm");
  const confirmation = document.getElementById("rsvpConfirmation");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = form.querySelector("#rsvpName").value.trim();
    const attendance = form.querySelector('input[name="attendance"]:checked').value;

    if (!name) {
      confirmation.textContent = "Please share your name so we know who to expect.";
      confirmation.classList.add("is-visible");
      return;
    }

    const message =
      attendance === "joyfully-accept"
        ? `Thank you, ${name}! We are overjoyed that you'll be celebrating with us. 💛`
        : `Thank you for letting us know, ${name}. You will be missed and always in our hearts.`;

    confirmation.textContent = message;
    confirmation.classList.add("is-visible");
    form.reset();
  });
}

/* =========================================================
   6. SCROLL-TRIGGERED FADE-IN FOR EACH SECTION
========================================================= */
function initScrollReveal() {
  const sections = document.querySelectorAll(".fade-section");
  if (!sections.length) return;

  if (!("IntersectionObserver" in window)) {
    sections.forEach((section) => section.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
  );

  sections.forEach((section) => observer.observe(section));
}