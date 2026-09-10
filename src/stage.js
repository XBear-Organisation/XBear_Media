import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function coneMaterial(color) {
  return new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uGain: { value: 0 },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vPos;
      uniform vec3 uColor;
      uniform float uGain;
      void main() {
        float along = clamp(1.0 - (vPos.y + 0.5), 0.0, 1.0);
        float radial = length(vPos.xz) * 2.15;
        float a = uGain * along * pow(max(1.0 - radial, 0.0), 1.35) * 0.32;
        gl_FragColor = vec4(uColor, a);
      }
    `,
  });
}

export function initStage({ reducedMotion }) {
  const wrap = document.getElementById("stageCanvasWrap");
  const canvas = document.getElementById("stageCanvas");
  const cues = [...document.querySelectorAll(".cue")];

  const glOptions = {
    alpha: false,
    antialias: window.innerWidth > 800,
    powerPreference: "high-performance",
    failIfMajorPerformanceCaveat: false,
  };
  const gl =
    canvas.getContext("webgl2", glOptions) ||
    canvas.getContext("webgl", glOptions) ||
    canvas.getContext("experimental-webgl", glOptions);

  if (!gl) {
    document.documentElement.classList.add("no-webgl");
    return { show() {}, hide() {}, destroy() {} };
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      context: gl,
      antialias: window.innerWidth > 800,
      alpha: false,
      powerPreference: "high-performance",
      failIfMajorPerformanceCaveat: false,
    });
  } catch (err) {
    console.warn(err);
    document.documentElement.classList.add("no-webgl");
    return { show() {}, hide() {}, destroy() {} };
  }

  renderer.setClearColor(0x050506, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050506, 0.045);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.06).texture;

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
  camera.position.set(0, 1.4, 8.4);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(1, 1),
    window.innerWidth < 800 ? 0.38 : 0.72,
    0.7,
    0.18
  );
  composer.addPass(bloom);

  scene.add(new THREE.AmbientLight(0x14151c, 0.35));

  const key = new THREE.SpotLight(0xf2b544, 0, 24, Math.PI / 7, 0.45, 1.2);
  key.position.set(0.2, 7.4, 3.2);
  key.target.position.set(0, 1.1, 0);
  scene.add(key, key.target);

  const cyan = new THREE.SpotLight(0x5ce1ff, 0, 28, Math.PI / 6, 0.55, 1);
  cyan.position.set(-6.2, 6.8, 1.4);
  cyan.target.position.set(0, 1.2, 0);
  scene.add(cyan, cyan.target);

  const magenta = new THREE.SpotLight(0xff3d9a, 0, 28, Math.PI / 6, 0.55, 1);
  magenta.position.set(6.4, 6.5, 0.6);
  magenta.target.position.set(0, 1.1, 0);
  scene.add(magenta, magenta.target);

  const rim = new THREE.DirectionalLight(0xe10600, 0);
  rim.position.set(-2.4, 2.2, -4.2);
  scene.add(rim);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(18, 64),
    new THREE.MeshStandardMaterial({
      color: 0x0a0a0e,
      metalness: 0.86,
      roughness: 0.22,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const truss = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({
    color: 0x8a8680,
    metalness: 0.95,
    roughness: 0.28,
  });
  const bar = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), steel);
    m.position.set(x, y, z);
    truss.add(m);
  };
  bar(10.4, 0.08, 0.08, 0, 5.6, -1.6);
  bar(10.4, 0.08, 0.08, 0, 5.6, 1.6);
  bar(0.08, 0.08, 3.28, -5.2, 5.6, 0);
  bar(0.08, 0.08, 3.28, 5.2, 5.6, 0);
  bar(0.09, 5.7, 0.09, -5.2, 2.75, -1.6);
  bar(0.09, 5.7, 0.09, 5.2, 2.75, -1.6);
  bar(0.09, 5.7, 0.09, -5.2, 2.75, 1.6);
  bar(0.09, 5.7, 0.09, 5.2, 2.75, 1.6);
  for (let i = -4; i <= 4; i += 2) {
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.18, 0.34),
      new THREE.MeshStandardMaterial({ color: 0x16161c, metalness: 0.7, roughness: 0.35 })
    );
    head.position.set(i * 0.9, 5.42, -1.55);
    truss.add(head);
  }
  scene.add(truss);

  const cones = [
    { color: 0x5ce1ff, pos: [-3.4, 5.35, 0.2], rot: [0.15, 0, 0.32] },
    { color: 0xff3d9a, pos: [3.5, 5.3, -0.2], rot: [0.12, 0, -0.34] },
    { color: 0xf2b544, pos: [0, 5.45, 1.1], rot: [0.42, 0, 0] },
  ].map((spec) => {
    const geo = new THREE.ConeGeometry(1.35, 6.2, 32, 1, true);
    const mat = coneMaterial(spec.color);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...spec.pos);
    mesh.rotation.set(...spec.rot);
    mesh.rotation.x += Math.PI;
    scene.add(mesh);
    return mat;
  });

  const dustGeo = new THREE.BufferGeometry();
  const count = 420;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 16;
    positions[i * 3 + 1] = Math.random() * 7.5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
  }
  dustGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({
      color: 0xc9c2b6,
      size: 0.018,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    })
  );
  scene.add(dust);

  const bearRoot = new THREE.Group();
  scene.add(bearRoot);

  new GLTFLoader().load(
    "/assets/models/bear.glb",
    (gltf) => {
      const model = gltf.scene;
      model.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.envMapIntensity = 1.15;
          child.material.needsUpdate = true;
        }
      });
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);
      model.scale.setScalar(3.35 / Math.max(size.y, 0.001));
      model.rotation.y = Math.PI * 0.18;
      const grounded = new THREE.Box3().setFromObject(model);
      model.position.y -= grounded.min.y;
      bearRoot.add(model);
    },
    undefined,
    () => {
      const fallback = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.4, 1),
        new THREE.MeshStandardMaterial({ color: 0x222228, metalness: 0.6, roughness: 0.4 })
      );
      fallback.position.y = 1.4;
      bearRoot.add(fallback);
    }
  );

  const state = { live: false, visible: false, raf: 0 };

  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
  };
  resize();
  window.addEventListener("resize", resize);

  const applyProgress = (p) => {
    const lights = THREE.MathUtils.smootherstep(p, 0.04, 0.38);
    const reveal = THREE.MathUtils.smootherstep(p, 0.18, 0.7);
    key.intensity = 8.5 * lights;
    cyan.intensity = 18 * lights;
    magenta.intensity = 16 * lights;
    rim.intensity = 1.8 * reveal;
    cones.forEach((mat, i) => {
      mat.uniforms.uGain.value = lights * (0.55 + i * 0.12);
    });
    bloom.strength = (window.innerWidth < 800 ? 0.28 : 0.55) + reveal * 0.35;

    const angle = -0.55 + p * 1.15;
    const radius = 8.6 - reveal * 2.4;
    const elev = 1.05 + p * 1.55;
    camera.position.set(Math.sin(angle) * radius, elev, Math.cos(angle) * radius);
    camera.lookAt(0, 1.15 + reveal * 0.25, 0);
    bearRoot.rotation.y = p * 0.45;

    const cueIndex = p < 0.38 ? 0 : p < 0.72 ? 1 : 2;
    cues.forEach((el, i) => el.classList.toggle("is-on", i === cueIndex));
  };

  const render = (time) => {
    if (!state.live || document.hidden) {
      state.raf = 0;
      return;
    }
    state.raf = requestAnimationFrame(render);
    dust.rotation.y = time * 0.00004;
    const pos = dust.geometry.attributes.position;
    for (let i = 1; i < pos.count * 3; i += 3) {
      pos.array[i] += 0.002;
      if (pos.array[i] > 7.6) pos.array[i] = 0;
    }
    pos.needsUpdate = true;
    if (!reducedMotion) {
      cyan.position.x = -6.2 + Math.sin(time * 0.0007) * 0.45;
      magenta.position.x = 6.4 + Math.cos(time * 0.0006) * 0.4;
    }
    composer.render();
  };

  const startLoop = () => {
    state.live = true;
    if (!state.raf) state.raf = requestAnimationFrame(render);
  };

  const stopLoop = () => {
    state.live = false;
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = 0;
  };

  const setVisible = (on) => {
    wrap.classList.toggle("is-live", on);
    state.visible = on;
    if (on) startLoop();
    else stopLoop();
  };

  const stage = document.getElementById("stage");
  const vault = document.getElementById("vault");

  ScrollTrigger.create({
    trigger: stage,
    start: "top bottom",
    end: "bottom top",
    onUpdate: (self) => applyProgress(self.progress),
  });

  ScrollTrigger.create({
    trigger: stage,
    start: "top 90%",
    endTrigger: vault,
    end: "top 55%",
    onToggle: (self) => setVisible(self.isActive),
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopLoop();
    else if (state.visible) startLoop();
  });

  if (reducedMotion) {
    setVisible(true);
    applyProgress(0.72);
    composer.render();
    stopLoop();
  } else {
    applyProgress(0);
    composer.render();
  }

  return {
    show: () => {
      setVisible(true);
      applyProgress(0);
    },
    hide: () => setVisible(false),
    destroy() {
      stopLoop();
      renderer.dispose();
    },
  };
}
