const WHATSAPP = "905064781490";

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function initUi() {
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  const navToggle = document.getElementById("navToggle");
  const mobileMenu = document.getElementById("mobileMenu");
  navToggle?.addEventListener("click", () => {
    const open = mobileMenu.hasAttribute("hidden") === false;
    mobileMenu.hidden = open;
    navToggle.setAttribute("aria-expanded", String(!open));
  });

  mobileMenu?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mobileMenu.hidden = true;
      navToggle?.setAttribute("aria-expanded", "false");
    });
  });

  const drawer = document.getElementById("drawer");
  const openers = document.querySelectorAll("[data-open-drawer]");
  const closers = document.querySelectorAll("[data-close-drawer]");

  const openDrawer = () => {
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    mobileMenu.hidden = true;
    navToggle?.setAttribute("aria-expanded", "false");
    drawer.querySelector("input")?.focus();
  };

  const closeDrawer = () => {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
  };

  openers.forEach((btn) => btn.addEventListener("click", openDrawer));
  closers.forEach((btn) => btn.addEventListener("click", closeDrawer));
  drawer?.addEventListener("click", (e) => {
    if (e.target === drawer) closeDrawer();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });

  document.getElementById("inquiryForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const type = String(data.get("type") || "").trim();
    const date = String(data.get("date") || "").trim();
    const message = String(data.get("message") || "").trim();
    const lines = [
      `XBear Media inquiry from ${name}`,
      `Email: ${email}`,
      type && `Type: ${type}`,
      date && `Date: ${date}`,
      "",
      message,
    ].filter(Boolean);
    const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(lines.join("\n"))}`;
    window.open(url, "_blank", "noopener");
  });

  const lightbox = document.getElementById("lightbox");
  const lightboxImg = lightbox?.querySelector("img");
  document.querySelectorAll("[data-lightbox]").forEach((frame) => {
    frame.addEventListener("click", () => {
      const img = frame.querySelector("img");
      if (!img || !lightbox) return;
      lightboxImg.src = img.currentSrc || img.src;
      lightboxImg.alt = img.alt || "";
      lightbox.showModal();
    });
  });
  lightbox?.querySelector(".lightbox-close")?.addEventListener("click", () => lightbox.close());
  lightbox?.addEventListener("click", (e) => {
    if (e.target === lightbox) lightbox.close();
  });

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const id = anchor.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const y = target.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: y, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    });
  });

  const nav = document.getElementById("nav");
  const onScroll = () => {
    nav?.classList.toggle("is-solid", window.scrollY > window.innerHeight * 0.35);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}
