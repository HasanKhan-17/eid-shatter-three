import "./style.css";
import * as THREE from "three";

/* -----------------------------
   Utilities: easing + textures
------------------------------ */
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function makeCanvas(size = 1024) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  return { c, ctx };
}

function createEidFaceTexture({
  text = "EID\nMUBARAK",
  bg = "#1f8a4c",
  border = "#d6b24a",
  accent = "#fff3c4",
  size = 1024,
} = {}) {
  const { c, ctx } = makeCanvas(size);

  // Background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // Subtle diagonal pattern
  ctx.save();
  ctx.globalAlpha = 0.10;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 6;
  for (let i = -size; i < size * 2; i += 60) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i - size, size);
    ctx.stroke();
  }
  ctx.restore();

  // Gold border + inner border
  const m = Math.floor(size * 0.06);
  ctx.lineWidth = Math.floor(size * 0.03);
  ctx.strokeStyle = border;
  ctx.strokeRect(m, m, size - 2 * m, size - 2 * m);

  ctx.save();
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = Math.floor(size * 0.012);
  ctx.strokeStyle = accent;
  const m2 = Math.floor(size * 0.11);
  ctx.strokeRect(m2, m2, size - 2 * m2, size - 2 * m2);
  ctx.restore();

  // Corner ornaments (simple arcs)
  function corner(x, y, dirX, dirY) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dirX, dirY);
    ctx.globalAlpha = 0.9;

    ctx.strokeStyle = border;
    ctx.lineWidth = Math.floor(size * 0.012);

    ctx.beginPath();
    ctx.arc(0, 0, Math.floor(size * 0.12), 0, Math.PI / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(Math.floor(size * 0.05), Math.floor(size * 0.05), Math.floor(size * 0.08), 0, Math.PI / 2);
    ctx.stroke();

    ctx.restore();
  }

  corner(m2, m2, 1, 1);
  corner(size - m2, m2, -1, 1);
  corner(m2, size - m2, 1, -1);
  corner(size - m2, size - m2, -1, -1);

  // Text
  const lines = text.split("\n");
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const centerY = size * 0.50;
  const lineGap = size * 0.14;

  // Shadow
  ctx.save();
  ctx.translate(3, 3);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.font = `800 ${Math.floor(size * 0.12)}px system-ui, sans-serif`;
  lines.forEach((ln, i) => ctx.fillText(ln, size / 2, centerY + (i - (lines.length - 1) / 2) * lineGap));
  ctx.restore();

  // Main gold text
  ctx.fillStyle = "#ffe6a6";
  ctx.strokeStyle = "rgba(70,45,0,0.35)";
  ctx.lineWidth = Math.floor(size * 0.010);
  ctx.font = `900 ${Math.floor(size * 0.12)}px system-ui, sans-serif`;
  lines.forEach((ln, i) => {
    const y = centerY + (i - (lines.length - 1) / 2) * lineGap;
    ctx.strokeText(ln, size / 2, y);
    ctx.fillText(ln, size / 2, y);
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function createMoneyTexture({ size = 512 } = {}) {
  const { c, ctx } = makeCanvas(size);

  ctx.fillStyle = "#2ecc71";
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.fillRect(size * 0.06, size * 0.12, size * 0.88, size * 0.76);

  ctx.strokeStyle = "#0b4f2a";
  ctx.lineWidth = Math.floor(size * 0.06);
  ctx.strokeRect(size * 0.08, size * 0.08, size * 0.84, size * 0.84);

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = "#0b4f2a";
  ctx.lineWidth = 8;
  for (let y = 40; y < size; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#0b4f2a";
  ctx.font = `900 ${Math.floor(size * 0.50)}px system-ui, sans-serif`;
  ctx.fillText("$", size * 0.50, size * 0.52);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/* -----------------------------
   UI Elements (Top Text & Button)
------------------------------ */
function createUI() {
  // Top text container
  const topText = document.createElement('div');
  topText.id = 'top-text';
  topText.className = 'top-text';
  topText.textContent = 'Click the cube to shatter it';
  document.body.appendChild(topText);

  // Reassemble button (hidden initially)
  const reassembleBtn = document.createElement('button');
  reassembleBtn.id = 'reassemble-btn';
  reassembleBtn.className = 'reassemble-btn';
  reassembleBtn.textContent = 'REASSEMBLE';
  reassembleBtn.style.display = 'none';
  document.body.appendChild(reassembleBtn);

  return { topText, reassembleBtn };
}

/* -----------------------------
   Three.js setup
------------------------------ */
const app = document.querySelector("#app");

// Create UI elements
const { topText, reassembleBtn } = createUI();

const scene = new THREE.Scene();
scene.fog = new THREE.Fog("#05040a", 7, 18);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, window.innerWidth < 640 ? 6.2 : 5.2);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.setClearColor(new THREE.Color("#05040a"), 1);
app.appendChild(renderer.domElement);

// Lights (warm gold + purple accent)
scene.add(new THREE.AmbientLight(0xffffff, 0.55));

const dir = new THREE.DirectionalLight("#ffd88a", 1.0);
dir.position.set(5, 6, 4);
scene.add(dir);

const point = new THREE.PointLight("#8a5cff", 0.8);
point.position.set(-6, -2, 6);
scene.add(point);

// Optional "floor"
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(50, 50),
  new THREE.MeshStandardMaterial({ color: "#07060d", metalness: 0.0, roughness: 1.0 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -2.2;
scene.add(floor);

// Star field (simple Points)
function makeStars(count = 1200) {
  const geom = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 35 * Math.cbrt(Math.random());
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.06, transparent: true, opacity: 0.75 });
  const pts = new THREE.Points(geom, mat);
  pts.position.set(0, 2, -5);
  return { pts, geom, mat };
}
const stars = makeStars();
scene.add(stars.pts);

/* -----------------------------
   Eid Cube (6 separate faces)
------------------------------ */
const cubeGroup = new THREE.Group();
scene.add(cubeGroup);

const faceSize = 0.8;
const half = faceSize / 2;

const schemes = [
  { bg: "#1f8a4c", border: "#d6b24a", accent: "#fff3c4" }, // green
  { bg: "#6a1bb1", border: "#d6b24a", accent: "#fff3c4" }, // purple
  { bg: "#b31237", border: "#d6b24a", accent: "#fff3c4" }, // red
  { bg: "#0a4ccf", border: "#d6b24a", accent: "#fff3c4" }, // blue
  { bg: "#b8860b", border: "#fff0b8", accent: "#2b1900" }, // gold-ish
  { bg: "#0b2239", border: "#d6b24a", accent: "#fff3c4" }, // deep navy
];

const faceDefs = [
  { name: "front",  pos: [0, 0,  half], rot: [0, 0, 0],            normal: [0, 0, 1],  scheme: schemes[0] },
  { name: "back",   pos: [0, 0, -half], rot: [0, Math.PI, 0],      normal: [0, 0,-1],  scheme: schemes[1] },
  { name: "right",  pos: [ half, 0, 0], rot: [0, Math.PI / 2, 0],  normal: [1, 0, 0],  scheme: schemes[2] },
  { name: "left",   pos: [-half, 0, 0], rot: [0,-Math.PI / 2, 0],  normal: [-1,0, 0],  scheme: schemes[3] },
  { name: "top",    pos: [0,  half, 0], rot: [-Math.PI / 2, 0, 0], normal: [0, 1, 0],  scheme: schemes[4] },
  { name: "bottom", pos: [0, -half, 0], rot: [ Math.PI / 2, 0, 0], normal: [0,-1, 0],  scheme: schemes[5] },
];

const faceMeshes = [];
const faceTextures = [];

const planeGeom = new THREE.PlaneGeometry(faceSize, faceSize);

for (let i = 0; i < faceDefs.length; i++) {
  const f = faceDefs[i];

  const tex = createEidFaceTexture({
    text: "EID\nMUBARAK",
    bg: f.scheme.bg,
    border: f.scheme.border,
    accent: f.scheme.accent,
    size: 1024,
  });
  faceTextures.push(tex);

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    metalness: 0.35,
    roughness: 0.45,
    emissive: new THREE.Color("#241400"),
    emissiveIntensity: 0.22,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(planeGeom, mat);
  mesh.name = `face_${f.name}`;
  mesh.position.set(...f.pos);
  mesh.rotation.set(...f.rot);

  // Save baseline transform (for shatter start)
  mesh.userData.basePos = new THREE.Vector3(...f.pos);
  mesh.userData.baseRot = new THREE.Euler(...f.rot);
  mesh.userData.normal = new THREE.Vector3(...f.normal);

  cubeGroup.add(mesh);
  faceMeshes.push(mesh);
}

/* -----------------------------
   Money bundle (hidden until click)
   No band, just stacked bills
------------------------------ */
const moneyGroup = new THREE.Group();
moneyGroup.visible = false;
scene.add(moneyGroup);

const moneyTex = createMoneyTexture({ size: 512 });
const moneyMat = new THREE.MeshStandardMaterial({
  map: moneyTex,
  metalness: 0.15,
  roughness: 0.55,
  emissive: new THREE.Color("#0d2b1c"),
  emissiveIntensity: 0.35,
});

// Create 8 bills stacked with a slight offset
for (let i = 0; i < 8; i++) {
  const bill = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.34, 0.01), moneyMat);
  bill.position.set(0, 0, (i - 3.5) * 0.012);
  moneyGroup.add(bill);
}

/* -----------------------------
   State variables for reassemble
------------------------------ */
let shattered = false;
let reassembling = false;
let shatterStart = 0;
let reassembleStart = 0;
const shatterDurationMs = 900;
const reassembleDurationMs = 900;

// Store original positions for reassembly
faceMeshes.forEach(mesh => {
  mesh.userData.originalPos = mesh.userData.basePos.clone();
  mesh.userData.originalRot = mesh.userData.baseRot.clone();
});

// Precompute shatter targets – now faces go to positions on a ring
function computeShatterTargets() {
  const baseRadius = 2.2;               // average distance from center
  const count = faceMeshes.length;

  for (let i = 0; i < count; i++) {
    const m = faceMeshes[i];

    // Random starting angle around the circle
    const startAngle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
    m.userData.startAngle = startAngle;

    // Random orbital properties
    m.userData.angularSpeed = 0.4 + Math.random() * 0.6;        // radians per second
    m.userData.baseRadius = baseRadius * (0.8 + Math.random() * 0.6); // 1.76 – 2.64
    m.userData.radiusAmp = 0.5 + Math.random() * 0.5;           // amplitude of radius oscillation
    m.userData.radiusFreq = 0.6 + Math.random() * 0.8;          // frequency of oscillation
    m.userData.verticalAmp = 0.15 + Math.random() * 0.2;        // vertical bob amplitude
    m.userData.verticalFreq = 0.5 + Math.random() * 0.7;

    // Target position for the initial shatter (still on a ring, but now with random radius)
    const ringPos = new THREE.Vector3(
      m.userData.baseRadius * Math.cos(startAngle),
      0,
      m.userData.baseRadius * Math.sin(startAngle)
    );
    m.userData.targetPos = ringPos;

    // Random spin (for the face's own rotation)
    m.userData.spin = new THREE.Vector3(
      (Math.random() - 0.5) * 1.2,
      (Math.random() - 0.5) * 1.2,
      (Math.random() - 0.5) * 1.2
    );

    // Random target rotation during shatter
    m.userData.targetRot = new THREE.Euler(
      m.userData.baseRot.x + (Math.random() - 0.5) * 1.2,
      m.userData.baseRot.y + (Math.random() - 0.5) * 1.2,
      m.userData.baseRot.z + (Math.random() - 0.5) * 1.2
    );
  }
}

// Reassemble function
function reassembleCube() {
  if (!shattered || reassembling) return;
  
  reassembling = true;
  reassembleStart = performance.now();
  reassembleBtn.style.display = 'none'; // Hide button during reassembly
  topText.textContent = 'Reassembling...';
  
  // Hide money bundle
  moneyGroup.visible = false;
  
  // Store current positions for animation
  faceMeshes.forEach(mesh => {
    mesh.userData.reassembleStartPos = mesh.position.clone();
    mesh.userData.reassembleStartRot = mesh.rotation.clone();
  });
}

/* -----------------------------
   Click handling (raycaster)
------------------------------ */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function onPointerDown(ev) {
  if (shattered || reassembling) return;

  const rect = renderer.domElement.getBoundingClientRect();
  const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);

  pointer.set(x, y);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(faceMeshes, false);

  if (hits.length > 0) {
    // Trigger shatter
    shattered = true;
    reassembling = false;
    shatterStart = performance.now();
    computeShatterTargets();
    topText.textContent = 'Shattering...';
  }
}
renderer.domElement.addEventListener("pointerdown", onPointerDown);

// Cursor feedback
function onPointerMove(ev) {
  if (shattered || reassembling) {
    renderer.domElement.style.cursor = "default";
    return;
  }
  const rect = renderer.domElement.getBoundingClientRect();
  const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);
  pointer.set(x, y);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(faceMeshes, false);
  renderer.domElement.style.cursor = hits.length ? "pointer" : "default";
}
renderer.domElement.addEventListener("pointermove", onPointerMove);

// Reassemble button click handler
reassembleBtn.addEventListener('click', reassembleCube);

/* -----------------------------
   Resize handling (with cleanup)
------------------------------ */
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.position.set(0, 0, window.innerWidth < 640 ? 6.2 : 5.2);
  camera.updateProjectionMatrix();

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", onResize);

/* -----------------------------
   Animation loop
------------------------------ */
let rafId = 0;

function animate() {
  rafId = requestAnimationFrame(animate);

  const now = performance.now();
  const t = now * 0.001; // seconds

  if (!shattered && !reassembling) {
    // Idle cube rotation (whole group)
    cubeGroup.rotation.y = t * 0.6;
    cubeGroup.rotation.x = Math.sin(t * 0.4) * 0.08;
  } else if (reassembling) {
    // Reassemble animation
    const elapsed = now - reassembleStart;
    const p = Math.min(elapsed / reassembleDurationMs, 1);
    const e = easeInOutCubic(p);

    // Freeze the group rotation
    cubeGroup.rotation.set(0, 0, 0);

    for (const m of faceMeshes) {
      // Move back to original positions
      m.position.lerpVectors(m.userData.reassembleStartPos, m.userData.originalPos, e);
      m.rotation.x = THREE.MathUtils.lerp(m.userData.reassembleStartRot.x, m.userData.originalRot.x, e);
      m.rotation.y = THREE.MathUtils.lerp(m.userData.reassembleStartRot.y, m.userData.originalRot.y, e);
      m.rotation.z = THREE.MathUtils.lerp(m.userData.reassembleStartRot.z, m.userData.originalRot.z, e);
    }

    if (p >= 1) {
      // Reassembly complete
      reassembling = false;
      shattered = false;
      topText.textContent = 'Click the cube to shatter it';
    }
  } else if (shattered) {
    // Shatter state
    const elapsed = now - shatterStart;
    const p = Math.min(elapsed / shatterDurationMs, 1);
    const e = easeOutCubic(p);

    // Freeze the group rotation so faces move independently
    cubeGroup.rotation.set(0, 0, 0);

    for (const m of faceMeshes) {
      if (p < 1) {
        // Transition from base position to target ring position
        m.position.lerpVectors(m.userData.basePos, m.userData.targetPos, e);

        // Interpolate rotation toward target rotation (tumble during shatter)
        m.rotation.x = THREE.MathUtils.lerp(m.userData.baseRot.x, m.userData.targetRot.x, e);
        m.rotation.y = THREE.MathUtils.lerp(m.userData.baseRot.y, m.userData.targetRot.y, e);
        m.rotation.z = THREE.MathUtils.lerp(m.userData.baseRot.z, m.userData.targetRot.z, e);
      } else {
        // After shatter: organic rotational motion
        const shatterEndTime = (shatterStart + shatterDurationMs) / 1000; // in seconds
        const orbitTime = Math.max(0, t - shatterEndTime);

        // Calculate current radius with oscillation (in and out motion)
        const r = m.userData.baseRadius + 
                  m.userData.radiusAmp * Math.sin(orbitTime * m.userData.radiusFreq);

        // Calculate current angle (rotational motion)
        const angle = m.userData.startAngle + m.userData.angularSpeed * orbitTime;

        // Position on a horizontal circle with varying radius
        m.position.x = r * Math.cos(angle);
        m.position.z = r * Math.sin(angle);

        // Add a gentle vertical bob for more organic feel
        m.position.y = m.userData.verticalAmp * Math.sin(orbitTime * m.userData.verticalFreq);

        // Continuous gentle spin of the face itself (individual rotation)
        m.rotation.x += m.userData.spin.x * 0.0025;
        m.rotation.y += m.userData.spin.y * 0.0025;
        m.rotation.z += m.userData.spin.z * 0.0025;
      }
    }

    // Show money bundle and button when shatter completes
    if (p >= 1 && !moneyGroup.visible) {
      moneyGroup.visible = true;
      reassembleBtn.style.display = 'block';
      topText.textContent = 'EIDI FOR YOU ALL :)';
    }
  }

  // Money bundle animation (only when visible) – fixed position, horizontal spin
  if (moneyGroup.visible) {
    moneyGroup.position.set(0, 0, 0);
    moneyGroup.rotation.y = t * 1.7;
    moneyGroup.rotation.x = 0;
    moneyGroup.rotation.z = 0;
  }

  renderer.render(scene, camera);
}

animate();

/* -----------------------------
   Cleanup (proper disposal)
------------------------------ */
function cleanup() {
  cancelAnimationFrame(rafId);

  renderer.domElement.removeEventListener("pointerdown", onPointerDown);
  renderer.domElement.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("resize", onResize);
  
  // Remove UI elements
  if (topText && topText.parentNode) {
    topText.parentNode.removeChild(topText);
  }
  if (reassembleBtn && reassembleBtn.parentNode) {
    reassembleBtn.removeEventListener('click', reassembleCube);
    reassembleBtn.parentNode.removeChild(reassembleBtn);
  }

  // Dispose geometries/materials/textures
  planeGeom.dispose();
  floor.geometry.dispose();
  floor.material.dispose();

  for (const tex of faceTextures) tex.dispose();
  moneyTex.dispose();
  moneyMat.dispose();
  moneyGroup.traverse((obj) => {
    if (obj.isMesh && obj.geometry) obj.geometry.dispose();
    if (obj.isMesh && obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach(m => m.dispose());
      } else {
        obj.material.dispose();
      }
    }
  });

  stars.geom?.dispose?.();
  stars.mat?.dispose?.();

  renderer.dispose();

  // Remove canvas
  if (renderer.domElement && renderer.domElement.parentNode) {
    renderer.domElement.parentNode.removeChild(renderer.domElement);
  }
}

// In a real SPA you’d call cleanup when leaving the page/route:
window.addEventListener("beforeunload", cleanup);