import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function initGateway({ video, reducedMotion, onBlack, onLeaveBlack }) {
  if (!video) return { destroy() {} };

  video.pause();
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.loop = false;
  video.autoplay = false;
  video.currentTime = 0;

  const markReady = () => {
    video.pause();
    video.classList.add("is-ready");
  };

  video.addEventListener("loadeddata", markReady);
  video.addEventListener("canplay", markReady);
  video.addEventListener("canplaythrough", markReady);
  if (video.readyState >= 2) markReady();

  const prime = async () => {
    try {
      const t = video.currentTime;
      await video.play();
      video.pause();
      video.currentTime = t;
    } catch {
      /* autoplay policy */
    }
  };
  window.addEventListener("pointerdown", prime, { once: true, passive: true });
  window.addEventListener("wheel", prime, { once: true, passive: true });
  window.addEventListener("touchstart", prime, { once: true, passive: true });

  const pin = document.getElementById("gatewayPin");
  const fadeUi = document.querySelectorAll("[data-hero-fade]");
  const disperseUi = document.querySelectorAll("[data-hero-disperse]");
  const nav = document.getElementById("nav");
  let inBlack = false;

  const setBlack = (value) => {
    pin?.classList.toggle("is-through", value);
    if (value === inBlack) return;
    inBlack = value;
    if (value) onBlack?.();
    else onLeaveBlack?.();
  };

  if (reducedMotion) {
    video.pause();
    video.currentTime = 0;
    video.classList.add("is-ready");
    setBlack(false);
    return { destroy() {} };
  }

  let pending = 0;
  let seeking = false;
  let duration = video.duration || 0;

  const applyTime = (t) => {
    if (!duration) return;
    const next = Math.min(Math.max(t, 0), Math.max(duration - 0.04, 0));
    pending = next;
    if (seeking) return;
    if (Math.abs(video.currentTime - next) < 0.01) return;
    seeking = true;
    try {
      video.pause();
      video.currentTime = next;
    } catch {
      seeking = false;
    }
  };

  video.addEventListener("seeked", () => {
    seeking = false;
    if (Math.abs(video.currentTime - pending) > 0.02) applyTime(pending);
  });

  video.addEventListener("loadedmetadata", () => {
    duration = video.duration || 6.02;
  });

  const gateway = document.getElementById("gateway");

  const st = ScrollTrigger.create({
    trigger: gateway,
    start: "top top",
    end: "bottom bottom",
    onUpdate: (self) => {
      if (!duration) duration = video.duration || 6.02;
      const p = self.progress;
      applyTime(p * duration);

      const disperse = Math.min(p / 0.28, 1);
      gsap.set(fadeUi, { autoAlpha: 1 - disperse });
      gsap.set(disperseUi, {
        autoAlpha: 1 - disperse,
        scale: 1 + disperse * 0.72,
        y: disperse * -90,
        filter: `blur(${disperse * 10}px)`,
      });

      nav?.classList.toggle("is-solid", p > 0.12);
      setBlack(p >= 0.91);
    },
  });

  return {
    destroy() {
      st.kill();
    },
  };
}
