import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { initGateway } from "./gateway.js";

gsap.registerPlugin(ScrollTrigger);

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const lite = document.getElementById("lite");
const liteImg = lite?.querySelector("img");
const liteFrame = lite?.querySelector(".lite-frame");
const liteVideo = liteFrame?.querySelector("video");
const litePlay = lite?.querySelector("[data-lite-play]");
const liteSeek = lite?.querySelector("[data-lite-seek]");
let liteSeeking = false;

const playing = new Set();

function pageVideos() {
  return [...document.querySelectorAll("video")].filter((video) => !video.closest(".lite"));
}

function pauseAll(except) {
  pageVideos().forEach((video) => {
    if (video === except) return;
    video.pause();
    video.muted = true;
    playing.delete(video);
  });
}

function playOne(video) {
  if (!video || reduce || video.closest(".lite") || lite?.open) return;
  video.muted = true;
  pauseAll(video);
  if (video.preload === "none") video.preload = "metadata";
  const run = video.play();
  if (run && typeof run.catch === "function") run.catch(() => {});
  playing.add(video);
}

document.querySelectorAll("video[data-rotate]").forEach((video) => {
  video.addEventListener("loadedmetadata", () => {
    if (video.currentTime === 0) video.currentTime = 0.6;
  });
});

const boards = [...document.querySelectorAll(".board")];
const boardGhost = document.getElementById("boardGhost");
const boardFill = document.getElementById("boardFill");
const boardStage = document.getElementById("boardStage");
const boardsHold = document.getElementById("isler");
let boardIndex = 0;

function setBoardLive(on) {
  boardStage?.classList.toggle("is-live", on);
}

function showBoard(next) {
  if (!boards.length) return;
  boardIndex = (next + boards.length) % boards.length;
  boards.forEach((board, i) => board.classList.toggle("is-on", i === boardIndex));
  const n = String(boardIndex + 1).padStart(2, "0");
  if (boardGhost) boardGhost.textContent = n;
  if (boardFill) {
    boardFill.style.height = `${((boardIndex + 1) / boards.length) * 100}%`;
  }
  const video = boards[boardIndex].querySelector("video");
  if (video) playOne(video);
  else pauseAll();
}

function holdInView() {
  if (!boardsHold) return false;
  const box = boardsHold.getBoundingClientRect();
  return box.top < window.innerHeight && box.bottom > 80;
}

document.querySelectorAll("[data-prev]").forEach((btn) => {
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    showBoard(boardIndex - 1);
  });
});
document.querySelectorAll("[data-next]").forEach((btn) => {
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    showBoard(boardIndex + 1);
  });
});

window.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
  if (lite?.open) {
    if (event.key === "ArrowLeft") stepLite(-1);
    if (event.key === "ArrowRight") stepLite(1);
    return;
  }
  if (event.key === "ArrowLeft") showBoard(boardIndex - 1);
  if (event.key === "ArrowRight") showBoard(boardIndex + 1);
});

let touchX = 0;
const track = document.getElementById("boardStage");
track?.addEventListener("touchstart", (event) => {
  touchX = event.changedTouches[0].clientX;
}, { passive: true });
track?.addEventListener("touchend", (event) => {
  const dx = event.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) < 48) return;
  showBoard(dx > 0 ? boardIndex - 1 : boardIndex + 1);
}, { passive: true });

if (boardFill && boards.length) boardFill.style.height = `${100 / boards.length}%`;

const iris = document.getElementById("irisVideo");
initGateway({
  video: iris,
  reducedMotion: reduce,
  onBlack: () => {
    setBoardLive(true);
    const video = boards[boardIndex]?.querySelector("video");
    if (video) playOne(video);
  },
  onLeaveBlack: () => {
    if (holdInView()) return;
    setBoardLive(false);
    boards.forEach((board) => board.querySelectorAll("video").forEach((video) => video.pause()));
  },
});

if (!reduce && boardsHold) {
  ScrollTrigger.create({
    trigger: boardsHold,
    start: "top bottom",
    end: "bottom top",
    onToggle: (self) => {
      if (self.isActive) setBoardLive(true);
      else if (!document.getElementById("gatewayPin")?.classList.contains("is-through")) {
        setBoardLive(false);
      }
    },
  });
} else {
  setBoardLive(true);
}

if (!reduce) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (lite?.open) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.45) playOne(video);
        else if (!entry.isIntersecting) {
          video.pause();
          playing.delete(video);
        }
      });
    },
    { threshold: [0, 0.45, 0.75] }
  );
  document.querySelectorAll("video[data-inview]").forEach((video) => io.observe(video));
}

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const id = link.getAttribute("href");
    if (!id || id === "#") return;
    const target = document.querySelector(id);
    if (!target) return;
    event.preventDefault();
    const top = Math.max(0, window.scrollY + target.getBoundingClientRect().top - 76);
    window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
    history.replaceState(null, "", id);
  });
});

const litePrev = lite?.querySelector("[data-lite-prev]");
const liteNext = lite?.querySelector("[data-lite-next]");
let gallery = [];
let galleryIndex = 0;
let filmOn = false;
let liteOpenedAt = 0;
let liteToken = 0;
let filmTimer = 0;
let liteSwitching = false;

function syncLitePlay() {
  const paused = !liteVideo || liteVideo.paused;
  if (litePlay) {
    litePlay.textContent = paused ? "▶" : "❚❚";
    litePlay.setAttribute("aria-label", paused ? "Oynat" : "Duraklat");
  }
}

function syncLiteSeek() {
  if (!liteVideo || !liteSeek || liteSeeking) return;
  const duration = liteVideo.duration;
  if (!duration || !Number.isFinite(duration)) {
    liteSeek.value = "0";
    return;
  }
  liteSeek.value = String(Math.round((liteVideo.currentTime / duration) * 1000));
}

function clearFilmTimer() {
  if (!filmTimer) return;
  window.clearTimeout(filmTimer);
  filmTimer = 0;
}

function resetLiteVideo() {
  liteToken += 1;
  clearFilmTimer();
  if (!liteVideo) return;
  liteVideo.pause();
  liteVideo.muted = true;
  liteVideo.controls = false;
  liteVideo.removeAttribute("src");
  liteVideo.removeAttribute("poster");
  try {
    liteVideo.load();
  } catch {
    /* boş kaynak */
  }
  liteFrame?.classList.remove("vid--turn", "vid--portrait", "is-turn", "is-portrait");
  if (liteSeek) liteSeek.value = "0";
  syncLitePlay();
}

function waitLiteReady() {
  if (!liteVideo) return Promise.reject();
  if (liteVideo.readyState >= 1) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const ok = () => {
      liteVideo.removeEventListener("error", fail);
      resolve();
    };
    const fail = () => {
      liteVideo.removeEventListener("loadedmetadata", ok);
      reject();
    };
    liteVideo.addEventListener("loadedmetadata", ok, { once: true });
    liteVideo.addEventListener("error", fail, { once: true });
  });
}

async function playLiteVideo(source) {
  const token = ++liteToken;
  const src = videoSrc(source);
  if (!src || !liteVideo || !lite?.open) return;
  liteVideo.controls = false;
  liteVideo.poster = source.getAttribute("poster") || "";
  if (liteVideo.src !== src) liteVideo.src = src;
  try {
    await waitLiteReady();
  } catch {
    return;
  }
  if (token !== liteToken || !lite?.open) return;
  const startAt = Number(source.currentTime);
  if (Number.isFinite(startAt) && startAt > 0.05) {
    try {
      liteVideo.currentTime = startAt;
    } catch {
      /* henüz seek yok */
    }
  }
  liteVideo.muted = true;
  try {
    await liteVideo.play();
  } catch {
    /* jest yok */
  }
  if (token !== liteToken || !lite?.open) return;
  liteVideo.muted = false;
  syncLiteSeek();
  syncLitePlay();
}

function resumePageVideo() {
  const onScreen = pageVideos().find((video) => {
    if (!video.hasAttribute("data-inview") && !video.closest(".board.is-on")) return false;
    const box = video.getBoundingClientRect();
    return box.top < window.innerHeight * 0.7 && box.bottom > window.innerHeight * 0.25;
  });
  if (onScreen) playOne(onScreen);
}

function videoSrc(video) {
  if (!video) return "";
  return (
    video.currentSrc ||
    video.src ||
    video.querySelector("source")?.src ||
    video.querySelector("source")?.getAttribute("src") ||
    ""
  );
}

function isPortraitVideo(item, source) {
  const fit = item.getAttribute("data-fit");
  if (fit === "portrait") return true;
  if (fit === "landscape") return false;
  const rotated = source.hasAttribute("data-rotate") || item.classList.contains("vid--turn");
  if (source.videoWidth && source.videoHeight) {
    const width = rotated ? source.videoHeight : source.videoWidth;
    const height = rotated ? source.videoWidth : source.videoHeight;
    return height > width;
  }
  return item.classList.contains("vid--portrait");
}

function phoneFilm() {
  return window.matchMedia("(max-width: 860px)").matches;
}

async function enterFilmMode() {
  if (!lite || filmOn || !phoneFilm()) return;
  lite.classList.add("is-film");
  try {
    if (lite.requestFullscreen) await lite.requestFullscreen();
    filmOn = document.fullscreenElement === lite;
  } catch {
    filmOn = false;
  }
  if (!filmOn) return;
  try {
    if (screen.orientation?.lock) await screen.orientation.lock("landscape");
  } catch {
    /* Safari kilidi yok */
  }
}

async function exitFilmMode() {
  if (!lite) return;
  filmOn = false;
  lite.classList.remove("is-film");
  try {
    screen.orientation?.unlock?.();
  } catch {
    /* yok */
  }
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
  } catch {
    /* yok */
  }
}

function caseMedia(el) {
  const group = el.closest(".case");
  if (!group) return [el];
  return [...group.querySelectorAll("[data-lite], [data-lite-video]")];
}

function showLiteItem(index) {
  if (!gallery.length || !lite) return;
  liteSwitching = true;
  clearFilmTimer();
  galleryIndex = (index + gallery.length) % gallery.length;
  const item = gallery[galleryIndex];
  const many = gallery.length > 1;
  if (litePrev) litePrev.hidden = !many;
  if (liteNext) liteNext.hidden = !many;
  const firstOpen = !lite.open;

  if (item.hasAttribute("data-lite-video")) {
    const source = item.querySelector("video");
    if (!source || !videoSrc(source) || !liteVideo || !liteFrame || !liteImg) {
      liteSwitching = false;
      return;
    }
    lite.classList.add("is-video");
    lite.classList.remove("is-image");
    liteImg.hidden = true;
    liteFrame.hidden = false;
    const portrait = isPortraitVideo(item, source);
    liteFrame.classList.toggle("vid--turn", item.classList.contains("vid--turn") || source.hasAttribute("data-rotate"));
    liteFrame.classList.toggle("vid--portrait", portrait);
    pauseAll();
    if (firstOpen) {
      lite.showModal();
      liteOpenedAt = performance.now();
      if (!portrait) filmTimer = window.setTimeout(() => enterFilmMode(), 350);
    }
    playLiteVideo(source).finally(() => {
      liteSwitching = false;
    });
    return;
  }

  const img = item.querySelector("img");
  if (!img || !liteImg) {
    liteSwitching = false;
    return;
  }
  liteToken += 1;
  lite.classList.add("is-image");
  lite.classList.remove("is-video");
  if (liteVideo) {
    liteVideo.pause();
    liteVideo.muted = true;
  }
  if (liteFrame) liteFrame.hidden = true;
  liteImg.hidden = false;
  liteImg.src = img.currentSrc || img.src;
  liteImg.alt = img.alt || "";
  pauseAll();
  if (firstOpen) {
    lite.showModal();
    liteOpenedAt = performance.now();
  }
  liteSwitching = false;
}

function openLite(el) {
  gallery = caseMedia(el);
  const at = gallery.indexOf(el);
  showLiteItem(at < 0 ? 0 : at);
}

function stepLite(dir) {
  if (!gallery.length) return;
  showLiteItem(galleryIndex + dir);
}

document.querySelectorAll("[data-lite]").forEach((btn) => {
  btn.addEventListener("click", (event) => {
    event.stopPropagation();
    openLite(btn);
  });
});

document.querySelectorAll("[data-lite-video]").forEach((box) => {
  box.addEventListener("click", (event) => {
    event.stopPropagation();
    openLite(box);
  });
  box.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openLite(box);
    }
  });
});

litePrev?.addEventListener("click", (event) => {
  event.stopPropagation();
  stepLite(-1);
});
liteNext?.addEventListener("click", (event) => {
  event.stopPropagation();
  stepLite(1);
});

let liteTouchX = null;
let liteTouchY = 0;
lite?.addEventListener("touchstart", (event) => {
  const node = event.target;
  if (node.closest("video") || node.closest(".lite-nav") || node.closest(".lite-x") || node.closest(".lite-bar")) {
    liteTouchX = null;
    return;
  }
  liteTouchX = event.changedTouches[0].clientX;
  liteTouchY = event.changedTouches[0].clientY;
}, { passive: true });
lite?.addEventListener("touchend", (event) => {
  if (liteTouchX == null) return;
  const dx = event.changedTouches[0].clientX - liteTouchX;
  const dy = event.changedTouches[0].clientY - liteTouchY;
  liteTouchX = null;
  if (Math.hypot(dx, dy) < 48) return;
  stepLite(dx > 0 ? -1 : 1);
}, { passive: true });

litePlay?.addEventListener("click", (event) => {
  event.stopPropagation();
  if (!liteVideo) return;
  if (liteVideo.paused) {
    const run = liteVideo.play();
    if (run && typeof run.catch === "function") run.catch(() => {});
  } else {
    liteVideo.pause();
  }
});

liteSeek?.addEventListener("pointerdown", (event) => {
  event.stopPropagation();
  liteSeeking = true;
});
liteSeek?.addEventListener("input", () => {
  if (!liteVideo || !Number.isFinite(liteVideo.duration) || !liteVideo.duration) return;
  liteVideo.currentTime = (Number(liteSeek.value) / 1000) * liteVideo.duration;
});
liteSeek?.addEventListener("change", () => {
  liteSeeking = false;
  syncLiteSeek();
});
window.addEventListener("pointerup", () => {
  if (!liteSeeking) return;
  liteSeeking = false;
  syncLiteSeek();
});

liteVideo?.addEventListener("timeupdate", syncLiteSeek);
liteVideo?.addEventListener("durationchange", syncLiteSeek);
liteVideo?.addEventListener("play", syncLitePlay);
liteVideo?.addEventListener("pause", syncLitePlay);

lite?.querySelector(".lite-x")?.addEventListener("click", (event) => {
  event.stopPropagation();
  lite.close();
});
lite?.addEventListener("click", (event) => {
  if (performance.now() - liteOpenedAt < 400) return;
  const stage = lite.querySelector(".lite-stage");
  if (event.target === lite || event.target === stage) lite.close();
});
lite?.addEventListener("close", () => {
  gallery = [];
  lite.classList.remove("is-video", "is-image");
  resetLiteVideo();
  exitFilmMode();
  if (liteImg) {
    liteImg.removeAttribute("src");
    liteImg.alt = "";
  }
  resumePageVideo();
});

document.addEventListener("fullscreenchange", () => {
  if (liteSwitching) return;
  if (!document.fullscreenElement && lite?.open && filmOn) {
    filmOn = false;
    lite.close();
  }
});

window.addEventListener("load", () => ScrollTrigger.refresh());

const BRANDS = {
  mackbear: {
    name: "Mackbear",
    tag: "Kahve · Sinematik + still",
    info: "Açıklama buraya. Ürün, mekân, ton.",
    about: "Hakkında metni buraya. Kahve markası için çekim ve still.",
    photo: "",
    work: "index.html#work-mackbear",
  },
  mypoint: {
    name: "MYPOINT",
    tag: "Mekân filmi",
    info: "Açıklama buraya. Bar, ürün, kadro.",
    about: "Hakkında metni buraya. Mekânın kendi dili.",
    photo: "",
    work: "index.html#work-mypoint",
  },
  extrablatt: {
    name: "Extrablatt",
    tag: "Yemek ve mekân",
    info: "Açıklama buraya. Restoran kimliği.",
    about: "Hakkında metni buraya. Tabak, salon, tempo.",
    photo: "",
    work: "index.html#work-extrablatt",
  },
  lafinkas: {
    name: "LaFinkas",
    tag: "Gece çekimi",
    info: "Açıklama buraya. Mekân, ışık, marka.",
    about: "Hakkında metni buraya. Gece çekiminin durduğu yer.",
    photo: "",
    work: "index.html#work-lafinkas",
  },
  lupen: {
    name: "Lupen",
    tag: "Sinematik",
    info: "Açıklama buraya. Stüdyodan sete.",
    about: "Hakkında metni buraya. Kamera, ışık, kesim.",
    photo: "",
    work: "index.html#work-lupen",
  },
  blok3: {
    name: "BLOK3",
    tag: "Sahne stilleri",
    info: "Açıklama buraya. Işık, truss, kadro.",
    about: "Hakkında metni buraya. Still olarak bırakılan sahne.",
    photo: "",
    work: "index.html#work-blok3",
  },
};

const brandPop = document.getElementById("brandPop");
const brandCard = document.getElementById("brandCard");
let brandOrigin = null;
let brandAnim = null;
let brandBusy = false;

function brandGenie(el, origin, reverse) {
  const last = el.getBoundingClientRect();
  const ox = origin.left + origin.width / 2;
  const oy = origin.top + origin.height / 2;
  const cx = last.left + last.width / 2;
  const cy = last.top + last.height / 2;
  const dx = ox - cx;
  const dy = oy - cy;
  const sx = Math.max(origin.width / last.width, 0.04);
  const sy = Math.max(origin.height / last.height, 0.015);
  const from = {
    transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
    filter: "blur(12px)",
    opacity: 0.2,
  };
  const mid = {
    transform: `translate(${dx * 0.22}px, ${dy * 0.12}px) scale(0.58, 1.18)`,
    filter: "blur(2px)",
    opacity: 1,
    offset: 0.4,
  };
  const to = { transform: "none", filter: "none", opacity: 1 };
  const frames = reverse ? [to, { ...mid, offset: 0.38 }, from] : [from, mid, to];
  return el.animate(frames, {
    duration: reduce ? 1 : 760,
    easing: reverse ? "cubic-bezier(0.64, 0, 0.78, 0.2)" : "cubic-bezier(0.16, 1, 0.3, 1)",
    fill: "forwards",
  });
}

function fillBrand(id) {
  const data = BRANDS[id];
  if (!data || !brandPop) return;
  const tag = brandPop.querySelector("[data-brand-tag]");
  const name = brandPop.querySelector("[data-brand-name]");
  const info = brandPop.querySelector("[data-brand-info]");
  const about = brandPop.querySelector("[data-brand-about]");
  const photo = brandPop.querySelector("[data-brand-photo]");
  const photoPh = brandPop.querySelector("[data-brand-photo-ph]");
  const work = brandPop.querySelector("[data-brand-work]");
  if (tag) tag.textContent = data.tag;
  if (name) name.textContent = data.name;
  if (info) info.textContent = data.info || "Açıklama buraya.";
  if (about) about.textContent = data.about || "Hakkında metni buraya.";
  if (photo && photoPh) {
    if (data.photo) {
      photo.hidden = false;
      photo.src = data.photo;
      photo.alt = data.name;
      photoPh.hidden = true;
    } else {
      photo.hidden = true;
      photo.removeAttribute("src");
      photo.alt = "";
      photoPh.hidden = false;
    }
  }
  if (work) work.href = data.work || "index.html#isler";
}

function openBrand(btn) {
  const id = btn.getAttribute("data-brand");
  if (!id || !BRANDS[id] || !brandPop || !brandCard || brandBusy) return;
  brandBusy = true;
  brandOrigin = btn.getBoundingClientRect();
  fillBrand(id);
  brandPop.hidden = false;
  brandAnim?.cancel();
  const veil = brandPop.querySelector(".brand-pop-veil");
  veil?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduce ? 1 : 420, fill: "forwards" });
  brandAnim = brandGenie(brandCard, brandOrigin, false);
  brandAnim.onfinish = () => {
    brandBusy = false;
  };
}

function closeBrand() {
  if (!brandPop || brandPop.hidden || brandBusy) return;
  brandBusy = true;
  const origin = brandOrigin || {
    left: window.innerWidth / 2 - 8,
    top: window.innerHeight / 2 - 8,
    width: 16,
    height: 16,
  };
  brandAnim?.cancel();
  const veil = brandPop.querySelector(".brand-pop-veil");
  veil?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduce ? 1 : 380, fill: "forwards" });
  brandAnim = brandGenie(brandCard, origin, true);
  brandAnim.onfinish = () => {
    brandPop.hidden = true;
    brandBusy = false;
    brandAnim = null;
  };
}

const brandGrid = document.querySelector(".brand-grid");
if (brandGrid) {
  const wait = `<div class="brand is-wait"><span class="brand-slot"><span class="brand-ph">Logo</span></span><span class="brand-name">Yeni marka</span></div>`;
  const need = 100 - brandGrid.querySelectorAll(".brand").length;
  if (need > 0) brandGrid.insertAdjacentHTML("beforeend", wait.repeat(need));
}

document.querySelectorAll("[data-brand]").forEach((btn) => {
  btn.addEventListener("click", () => openBrand(btn));
});

brandPop?.querySelectorAll("[data-brand-close]").forEach((el) => {
  el.addEventListener("click", () => closeBrand());
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && brandPop && !brandPop.hidden) closeBrand();
});
