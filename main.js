(() => {
  "use strict";

  /* ------------------------------------------------------------------
     Confetti canvas — lightweight particle burst, no dependencies
  ------------------------------------------------------------------ */
  const canvas = document.getElementById("confetti-canvas");
  const ctx = canvas.getContext("2d");
  let particles = [];
  const colors = ["#FF6F91", "#FFC145", "#6FE7CB", "#FDF6EC"];

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  function burstConfetti(originX, originY, count = 90) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 6;
      particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        size: 4 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        spin: (Math.random() - 0.5) * 12,
        life: 0,
        maxLife: 90 + Math.random() * 40,
      });
    }
    if (!animating) {
      animating = true;
      requestAnimationFrame(tick);
    }
  }

  let animating = false;
  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p) => {
      p.vy += 0.12; // gravity
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.spin;
      p.life++;
      const fade = Math.max(0, 1 - p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    });
    particles = particles.filter((p) => p.life < p.maxLife && p.y < canvas.height + 40);
    if (particles.length > 0) {
      requestAnimationFrame(tick);
    } else {
      animating = false;
    }
  }

  /* ------------------------------------------------------------------
     Candle blowing
  ------------------------------------------------------------------ */
  const candles = Array.from(document.querySelectorAll(".candle"));
  const hint = document.getElementById("stage-hint");
  const cakeEl = document.getElementById("cake");
  let blownCount = 0;

  candles.forEach((candle) => {
    candle.addEventListener("click", () => {
      if (candle.dataset.lit === "false") return;
      candle.dataset.lit = "false";
      blownCount++;
      const rect = candle.getBoundingClientRect();
      burstConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2, 18);

      if (blownCount === candles.length) {
        hint.textContent = "🎉 Wish made! Happy Birthday! 🎉";
        const cakeRect = cakeEl.getBoundingClientRect();
        setTimeout(() => burstConfetti(cakeRect.left + cakeRect.width / 2, cakeRect.top, 160), 150);
        playTune();
        setTimeout(relightCandles, 3200);
      }
    });
  });

  function relightCandles() {
    candles.forEach((c) => (c.dataset.lit = "true"));
    blownCount = 0;
    hint.textContent = "Tap the candles to blow them out 🕯️";
  }

  /* ------------------------------------------------------------------
     Generated "Happy Birthday" tune via Web Audio oscillators
     (no external audio file — nothing to license)
  ------------------------------------------------------------------ */
  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
  }

  // Simple note-frequency melody, phrased as short/long beats.
  const NOTE = {
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23,
    G4: 392.00, A4: 440.00, B4: 493.88, C5: 523.25,
  };
  const melody = [
    [NOTE.C4, 0.35], [NOTE.C4, 0.2], [NOTE.D4, 0.55], [NOTE.C4, 0.55],
    [NOTE.F4, 0.55], [NOTE.E4, 1.0],
    [NOTE.C4, 0.35], [NOTE.C4, 0.2], [NOTE.D4, 0.55], [NOTE.C4, 0.55],
    [NOTE.G4, 0.55], [NOTE.F4, 1.0],
  ];

  function playTune() {
    const ctxA = getAudioCtx();
    if (ctxA.state === "suspended") ctxA.resume();
    let t = ctxA.currentTime + 0.05;
    melody.forEach(([freq, dur]) => {
      const osc = ctxA.createOscillator();
      const gain = ctxA.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.03);
      gain.gain.linearRampToValueAtTime(0, t + dur * 0.9);
      osc.connect(gain).connect(ctxA.destination);
      osc.start(t);
      osc.stop(t + dur);
      t += dur;
    });
  }

  const playTuneBtn = document.getElementById("play-tune");
  if (playTuneBtn) playTuneBtn.addEventListener("click", playTune);

  /* ------------------------------------------------------------------
     Like buttons
  ------------------------------------------------------------------ */
  document.querySelectorAll(".like-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      try {
        const res = await fetch(`/like/${id}`, { method: "POST" });
        if (!res.ok) return;
        const data = await res.json();
        const countEl = btn.querySelector(".like-count");
        countEl.textContent = data.likes;
        btn.classList.remove("liked");
        void btn.offsetWidth; // restart animation
        btn.classList.add("liked");
      } catch (err) {
        console.error("Could not register like", err);
      }
    });
  });

  /* ------------------------------------------------------------------
     File input label
  ------------------------------------------------------------------ */
  const photoInput = document.getElementById("photo");
  const fileChosen = document.getElementById("file-chosen");
  if (photoInput && fileChosen) {
    photoInput.addEventListener("change", () => {
      fileChosen.textContent = photoInput.files.length ? photoInput.files[0].name : "";
    });
  }

  /* ------------------------------------------------------------------
     Party-lights (theme) toggle
  ------------------------------------------------------------------ */
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      document.body.classList.toggle("lights-off");
    });
  }

  /* ------------------------------------------------------------------
     A little ambient confetti drift on load, for delight
  ------------------------------------------------------------------ */
  window.addEventListener("load", () => {
    setTimeout(() => burstConfetti(window.innerWidth / 2, 0, 40), 500);
  });
})();
