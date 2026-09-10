import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { initUi, prefersReducedMotion } from "./ui.js";
import { initGateway } from "./gateway.js";
import { initStage } from "./stage.js";

gsap.registerPlugin(ScrollTrigger);

initUi();
fetch("/assets/models/bear.glb").catch(() => {});

const reducedMotion = prefersReducedMotion();
const video = document.getElementById("irisVideo");

let stageApi = {
  show() {},
  hide() {},
};

initGateway({
  video,
  reducedMotion,
  onBlack: () => stageApi.show(),
  onLeaveBlack: () => {
    const stageEl = document.getElementById("stage");
    const top = stageEl?.getBoundingClientRect().top ?? 0;
    if (top > window.innerHeight * 0.85) stageApi.hide();
  },
});

try {
  stageApi = initStage({ reducedMotion }) || stageApi;
} catch (err) {
  console.warn("Stage rig unavailable:", err);
  document.documentElement.classList.add("no-webgl");
}

if (!reducedMotion) {
  gsap.utils.toArray(".spread, .pillar, .vault-head, .pillars-head, .backstage-inner").forEach((el) => {
    gsap.from(el, {
      y: 28,
      duration: 0.95,
      ease: "power3.out",
      scrollTrigger: {
        trigger: el,
        start: "top 90%",
        once: true,
      },
    });
  });
}

window.addEventListener("load", () => ScrollTrigger.refresh());
