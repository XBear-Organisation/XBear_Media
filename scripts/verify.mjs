import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";

const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const url = "http://127.0.0.1:5173/";
const out = new URL("./.verify/", import.meta.url);

await mkdir(out, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--use-gl=angle", "--enable-webgl"],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
});

const page = await browser.newPage();
page.setDefaultTimeout(45000);

const logs = [];
page.on("pageerror", (err) => logs.push("PAGEERROR " + err.message));
page.on("console", (msg) => {
  if (msg.type() === "error") logs.push("CONSOLE " + msg.text());
});

await page.goto(url, { waitUntil: "networkidle0" });
await page.waitForSelector(".hero-title");
await new Promise((r) => setTimeout(r, 800));

const hero = await page.evaluate(() => {
  const video = document.getElementById("irisVideo");
  const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
  return {
    paused: video.paused,
    time: video.currentTime,
    ready: video.classList.contains("is-ready"),
    duration: video.duration || 0,
    readyState: video.readyState,
    headline: document.querySelector(".hero-title")?.innerText,
    overflow,
    canvas: !!document.querySelector("#stageCanvas"),
  };
});

await page.screenshot({ path: new URL("01-hero.png", out).pathname, type: "png" });

await page.evaluate(() => window.scrollTo(0, Math.round(window.innerHeight * 1.4)));
await new Promise((r) => setTimeout(r, 600));
const mid = await page.evaluate(() => {
  const video = document.getElementById("irisVideo");
  return {
    time: video.currentTime,
    paused: video.paused,
    through: document.getElementById("gatewayPin").classList.contains("is-through"),
  };
});
await page.screenshot({ path: new URL("02-iris-dive.png", out).pathname, type: "png" });

await page.evaluate(() => window.scrollTo(0, 0));
await new Promise((r) => setTimeout(r, 500));
const reversed = await page.evaluate(() => {
  const video = document.getElementById("irisVideo");
  return { time: video.currentTime, paused: video.paused };
});

await page.evaluate(() => {
  const stage = document.getElementById("stage");
  window.scrollTo(0, stage.offsetTop + 80);
});

await page.evaluate(() => {
  const stage = document.getElementById("stage");
  window.scrollTo(0, stage.offsetTop + 80);
});
await new Promise((r) => setTimeout(r, 1200));
const stage = await page.evaluate(() => {
  const wrap = document.getElementById("stageCanvasWrap");
  const canvas = document.getElementById("stageCanvas");
  const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
  return {
    live: wrap.classList.contains("is-live"),
    through: document.getElementById("gatewayPin").classList.contains("is-through"),
    webgl: !!gl,
    canvasW: canvas.width,
    canvasH: canvas.height,
    videoTime: document.getElementById("irisVideo").currentTime,
    videoPaused: document.getElementById("irisVideo").paused,
    cue: document.querySelector(".cue.is-on .cue-name")?.textContent,
  };
});
await page.screenshot({ path: new URL("03-stage.png", out).pathname, type: "png" });

await page.evaluate(() => {
  const vault = document.getElementById("vault");
  window.scrollTo(0, vault.offsetTop + 40);
});
await new Promise((r) => setTimeout(r, 500));
const vault = await page.evaluate(() => {
  const imgs = [...document.querySelectorAll(".vault img")].filter((img) => !img.closest(".ribbon"));
  const unique = [...new Set(imgs.map((img) => img.getAttribute("src")))];
  return {
    unique,
    count: unique.length,
    natural: imgs.slice(0, 10).map((img) => [img.alt, img.naturalWidth, img.complete]),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
  };
});
await page.screenshot({ path: new URL("04-vault.png", out).pathname, type: "png" });

await page.evaluate(() => {
  const el = document.querySelector(".spread--diptych");
  window.scrollTo(0, el.offsetTop - 40);
});
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: new URL("07-wegh.png", out).pathname, type: "png" });

await page.evaluate(() => {
  const el = document.querySelector(".spread--civic");
  window.scrollTo(0, el.offsetTop - 20);
});
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: new URL("08-ankara.png", out).pathname, type: "png" });

await page.evaluate(() => {
  const el = document.querySelector(".spread--closer");
  window.scrollTo(0, el.offsetTop - 20);
});
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: new URL("09-blok3.png", out).pathname, type: "png" });

await page.evaluate(() => {
  document.querySelector("[data-open-drawer]").click();
});
await new Promise((r) => setTimeout(r, 300));
const drawer = await page.evaluate(() => document.getElementById("drawer").classList.contains("is-open"));
await page.screenshot({ path: new URL("10-drawer.png", out).pathname, type: "png" });

await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await page.evaluate(() => window.scrollTo(0, 0));
await new Promise((r) => setTimeout(r, 400));
const mobileHero = await page.evaluate(() => ({
  overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
  width: document.documentElement.scrollWidth,
  client: document.documentElement.clientWidth,
}));
await page.screenshot({ path: new URL("05-mobile-hero.png", out).pathname, type: "png" });

await page.evaluate(() => window.scrollTo(0, document.getElementById("vault").offsetTop + 20));
await new Promise((r) => setTimeout(r, 400));
const mobileVault = await page.evaluate(() => ({
  overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
  width: document.documentElement.scrollWidth,
  client: document.documentElement.clientWidth,
}));
await page.screenshot({ path: new URL("06-mobile-vault.png", out).pathname, type: "png" });

await browser.close();

console.log(JSON.stringify({ hero, mid, reversed, stage, vault, drawer, mobileHero, mobileVault, logs }, null, 2));
