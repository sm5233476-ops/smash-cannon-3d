import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// --- PROCEDURAL AUDIO & MUSIC SYNTHESIZER ---
let soundEnabled = true;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
  if (!soundEnabled) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;

  if (type === 'fire') {
    // Cannon blast with deep sub-bass punch
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  } else if (type === 'metal_hit') {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.22);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.22);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  } else if (type === 'crunch') {
    const bufferSize = audioCtx.sampleRate * 0.16;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

    const whiteNoise = audioCtx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(500, now);
    filter.Q.setValueAtTime(3.0, now);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    whiteNoise.start(now);
  } else if (type === 'win') {
    [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.18, now + i * 0.06);
      g.gain.linearRampToValueAtTime(0.01, now + i * 0.06 + 0.3);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start(now + i * 0.06);
      o.stop(now + i * 0.06 + 0.3);
    });
  } else if (type === 'fail') {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.35);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }
}

// --- PROCEDURAL PBR TEXTURES (NO EXTERNAL IMAGES NEEDED) ---
function createWoodTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#b45309';
  ctx.fillRect(0, 0, 256, 256);
  // Wood grain lines
  ctx.strokeStyle = '#92400e';
  ctx.lineWidth = 2;
  for (let i = 0; i < 256; i += 8) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.bezierCurveTo(i + 5, 80, i - 5, 180, i, 256);
    ctx.stroke();
  }
  return new THREE.CanvasTexture(canvas);
}

function createBrickTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#334155'; // Mortar
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#ef4444'; // Red Brick
  const rows = 8, cols = 4;
  const rh = 256 / rows, cw = 256 / cols;
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2 === 0) ? 0 : cw / 2;
    for (let c = -1; c <= cols; c++) {
      ctx.fillRect(c * cw + offset + 2, r * rh + 2, cw - 4, rh - 4);
    }
  }
  return new THREE.CanvasTexture(canvas);
}

function createStoneTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#64748b';
  ctx.fillRect(0, 0, 256, 256);
  // Stone speckles
  for (let i = 0; i < 600; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#475569' : '#94a3b8';
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
  }
  return new THREE.CanvasTexture(canvas);
}

const woodTex = createWoodTexture();
const brickTex = createBrickTexture();
const stoneTex = createStoneTexture();

// --- 50 HANDCRAFTED LEVELS CONFIGURATION ---
const levelConfigs = {
  1:  { title: "SLENDER TOWER", ammo: 3, target: 50, type: "tower", l: 5 },
  2:  { title: "SKY CABIN", ammo: 4, target: 55, type: "house" },
  3:  { title: "TWIN PILLARS", ammo: 4, target: 55, type: "bridge" },
  4:  { title: "TRI-PEAKS", ammo: 5, target: 60, type: "tripeaks" },
  5:  { title: "FORTRESS KEEP", ammo: 5, target: 60, type: "fortress" },
  6:  { title: "ANCIENT ARCH", ammo: 4, target: 60, type: "arch" },
  7:  { title: "THE GREAT WALL", ammo: 5, target: 60, type: "wall" },
  8:  { title: "PYRAMID SHRINE", ammo: 5, target: 65, type: "pyramid" },
  9:  { title: "TWIN CITADELS", ammo: 5, target: 65, type: "twins" },
  10: { title: "MEGA SKYSCRAPER", ammo: 6, target: 65, type: "skyscraper", l: 9 },
  11: { title: "PENTAGON RING", ammo: 5, target: 65, type: "ring" },
  12: { title: "SUSPENSION BRIDGE", ammo: 5, target: 65, type: "suspension" },
  13: { title: "THE MEGALITH", ammo: 4, target: 65, type: "megalith" },
  14: { title: "THE HIGH CRANE", ammo: 4, target: 70, type: "crane" },
  15: { title: "COLOSSEUM STADIUM", ammo: 6, target: 65, type: "colosseum" },
  16: { title: "THE HOURGLASS", ammo: 5, target: 70, type: "hourglass" },
  17: { title: "TWIN SPIRE BASTION", ammo: 5, target: 70, type: "bastion" },
  18: { title: "THE CITADEL", ammo: 6, target: 70, type: "citadel" },
  19: { title: "SPIRAL TOWER", ammo: 5, target: 70, type: "spiral" },
  20: { title: "THE GRAND OBELISK", ammo: 6, target: 70, type: "boss" },
  21: { title: "CASTLE BATTLEMENTS", ammo: 4, target: 70, type: "battlements" },
  22: { title: "TRIPLE SUSPENSION", ammo: 5, target: 70, type: "triplesuspension" },
  23: { title: "THE STILT BUNKER", ammo: 3, target: 70, type: "stiltbunker" },
  24: { title: "STONEHENGE CIRCLE", ammo: 4, target: 65, type: "stonehenge" },
  25: { title: "THE GIANT CROSS", ammo: 4, target: 70, type: "giantcross" },
  26: { title: "DOUBLE DECK FORT", ammo: 5, target: 70, type: "doubledeck" },
  27: { title: "CATHEDRAL SPIRE", ammo: 4, target: 70, type: "cathedral" },
  28: { title: "THE JENGA STACK", ammo: 4, target: 70, type: "jenga" },
  29: { title: "DUAL STRONGHOLDS", ammo: 5, target: 70, type: "strongholds" },
  30: { title: "TITAN CITADEL", ammo: 5, target: 75, type: "titancitadel" },
  31: { title: "STEPPED ZIGGURAT", ammo: 5, target: 70, type: "ziggurat" },
  32: { title: "THE 4-POINT STAR ⭐", ammo: 4, target: 75, type: "starfort" },
  33: { title: "SUSPENSION CANOPY", ammo: 4, target: 70, type: "canopy" },
  34: { title: "HOLLOW DIAMOND", ammo: 4, target: 70, type: "diamond" },
  35: { title: "THE WINDMILL", ammo: 4, target: 75, type: "windmill" },
  36: { title: "THE T-HAMMER", ammo: 3, target: 75, type: "thammer" },
  37: { title: "3-TIER PAGODA", ammo: 5, target: 70, type: "pagoda" },
  38: { title: "ARC DE TRIOMPHE", ammo: 4, target: 70, type: "arctriomphe" },
  39: { title: "CANTILEVER BALCONY", ammo: 3, target: 75, type: "cantilever" },
  40: { title: "BASTIONS & SKYBRIDGE", ammo: 5, target: 70, type: "skybridge" },
  41: { title: "THE OCTAGON SILO", ammo: 5, target: 70, type: "octagonsilo" },
  42: { title: "HOURGLASS OF DOOM", ammo: 4, target: 75, type: "doomhourglass" },
  43: { title: "ASYMMETRIC TOWERS", ammo: 5, target: 75, type: "asymtowers" },
  44: { title: "SUN TEMPLE RING", ammo: 4, target: 70, type: "suntemple" },
  45: { title: "SPIRAL STAIRCASE", ammo: 4, target: 75, type: "spiralstair" },
  46: { title: "3-PEG STILT FORT", ammo: 3, target: 75, type: "threepegs" },
  47: { title: "3D PLUS (+) FORT", ammo: 4, target: 75, type: "plusfort" },
  48: { title: "LABYRINTH VAULT", ammo: 5, target: 75, type: "labyrinth" },
  49: { title: "GOTHIC CATHEDRAL", ammo: 5, target: 75, type: "gothic" },
  50: { title: "TITAN APEX (BOSS)", ammo: 5, target: 80, type: "titanapex" }
};

function getWeaponConfig(lvl) {
  if (lvl <= 10) return { name: "CANNONBALL", icon: "💣", mass: 32, type: "ball" };
  if (lvl <= 20) return { name: "FIREBALL", icon: "☄️", mass: 35, type: "fireball" };
  if (lvl <= 30) return { name: "BOULDER", icon: "🪨", mass: 38, type: "rock" };
  if (lvl <= 40) return { name: "WRECKING MACE", icon: "⚙️", mass: 40, type: "wrecking" };
  return { name: "APEX CORE", icon: "⚡", mass: 44, type: "anvil" };
}

// GAME STATE
let isGameStarted = false;
let savedLevel = parseInt(localStorage.getItem('smash_cannon_level')) || 1;
let currentLevel = savedLevel;
let levelsPlayedSinceAd = 0;

let ammo = 3;
let totalBlocks = 0;
let isLevelEnded = false;
let screenShake = 0;
let lastShakeTime = 0;

let isMonitoringSettle = false;
let settleTimer = 0;
let lastShootTime = 0;

// UI Elements
const mainMenu = document.getElementById('main-menu');
const playBtn = document.getElementById('play-btn');
const soundBtn = document.getElementById('sound-btn');
const gameUI = document.getElementById('game-ui');
const crosshair = document.getElementById('crosshair');
const levelTitleEl = document.getElementById('level-title');
const ammoEl = document.getElementById('ammo-count');
const weaponIconEl = document.getElementById('weapon-icon');
const weaponNameEl = document.getElementById('weapon-name');
const progressBar = document.getElementById('progress-bar');
const destructionText = document.getElementById('destruction-text');
const endModal = document.getElementById('end-modal');
const endTitle = document.getElementById('end-title');
const endSub = document.getElementById('end-sub');
const modalBtn = document.getElementById('modal-btn');
const adBallBtn = document.getElementById('ad-ball-btn');
const adSkipBtn = document.getElementById('ad-skip-btn');

// Sound Toggle
soundBtn.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundBtn.innerText = soundEnabled ? "🔊 SOUND: ON" : "🔇 SOUND: OFF";
});

// START GAME HANDLER
playBtn.addEventListener('click', () => {
  mainMenu.style.opacity = '0';
  setTimeout(() => {
    mainMenu.classList.add('hidden');
    gameUI.classList.remove('hidden');
    isGameStarted = true;
    crosshair.style.display = 'block';
  }, 400);
});

modalBtn.addEventListener('click', () => {
  if (endTitle.innerText.includes('WON')) {
    currentLevel = currentLevel >= 50 ? 1 : currentLevel + 1;
    localStorage.setItem('smash_cannon_level', currentLevel);
    levelsPlayedSinceAd++;
  }
  loadLevel(currentLevel);
});

adBallBtn.addEventListener('click', () => {
  ammo += 1;
  ammoEl.innerText = ammo;
  isLevelEnded = false;
  isMonitoringSettle = false;
  endModal.classList.add('hidden');
  playSound('fire');
});

adSkipBtn.addEventListener('click', () => {
  currentLevel = currentLevel >= 50 ? 1 : currentLevel + 1;
  localStorage.setItem('smash_cannon_level', currentLevel);
  loadLevel(currentLevel);
});

// --- THREE.JS SCENE SETUP ---
const canvas = document.getElementById('game-canvas');
const scene = new THREE.Scene();

const baseCamPos = new THREE.Vector3(0, 11, 26);
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 450);
camera.position.copy(baseCamPos);
camera.lookAt(0, 5, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff7ea, 1.4);
sunLight.position.set(30, 50, 30);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.bias = -0.0004;
scene.add(sunLight);

// --- 3D INTERACTIVE MECHANICAL CANNON MODEL ---
const cannonGroup = new THREE.Group();

// Wooden Carriage Base
const carriage = new THREE.Mesh(
  new THREE.BoxGeometry(2.2, 0.6, 2.8),
  new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.7 })
);
carriage.position.y = 0.3;
carriage.castShadow = true;
cannonGroup.add(carriage);

// Wheels
const wheelGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.3, 16);
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
[-1.2, 1.2].forEach(x => {
  const wheel = new THREE.Mesh(wheelGeo, wheelMat);
  wheel.rotation.z = Math.PI / 2;
  wheel.position.set(x, 0.4, 0.2);
  wheel.castShadow = true;
  cannonGroup.add(wheel);
});

// Metallic Barrel Assembly
const barrelPivot = new THREE.Group();
barrelPivot.position.set(0, 0.8, 0.4);

const barrelMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(0.42, 0.65, 3.2, 24),
  new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 })
);
barrelMesh.rotation.x = -Math.PI / 2;
barrelMesh.position.z = 1.0;
barrelMesh.castShadow = true;
barrelPivot.add(barrelMesh);

// Barrel Muzzle Rim
const rim = new THREE.Mesh(
  new THREE.TorusGeometry(0.45, 0.08, 16, 32),
  new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9 })
);
rim.position.z = 2.6;
barrelPivot.add(rim);

cannonGroup.add(barrelPivot);
cannonGroup.position.set(0, 0.8, 19); // Placed prominently in front of camera
scene.add(cannonGroup);

let cannonRecoil = 0;

// --- VALLEY GROUND & RIVER ---
const groundGeo = new THREE.PlaneGeometry(500, 500, 20, 20);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.9 });
const valleyGround = new THREE.Mesh(groundGeo, groundMat);
valleyGround.rotation.x = -Math.PI / 2;
valleyGround.position.y = -65;
scene.add(valleyGround);

const riverGeo = new THREE.PlaneGeometry(30, 500);
const riverMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.15, metalness: 0.65 });
const riverMesh = new THREE.Mesh(riverGeo, riverMat);
riverMesh.rotation.x = -Math.PI / 2;
riverMesh.position.set(-18, -64.7, 0);
scene.add(riverMesh);

for (let i = 0; i < 150; i++) {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 3, 5), new THREE.MeshBasicMaterial({ color: 0x452310 }));
  const leaves = new THREE.Mesh(new THREE.ConeGeometry(2.2, 5.5, 5), new THREE.MeshBasicMaterial({ color: 0x0e4420 }));
  leaves.position.y = 3.2;
  tree.add(trunk);
  tree.add(leaves);
  tree.position.set((Math.random() - 0.5) * 300, -64, -20 - Math.random() * 250);
  const s = 1.2 + Math.random() * 1.8;
  tree.scale.set(s, s, s);
  scene.add(tree);
}

// --- BIOME UPDATE ---
function applyBiome(lvl) {
  if (lvl <= 10) {
    scene.background = new THREE.Color(0x62b5fc);
    scene.fog = new THREE.FogExp2(0x62b5fc, 0.006);
    document.body.style.background = "#62b5fc";
    groundMat.color.set(0x14532d);
    riverMat.color.set(0x0284c7);
    riverMat.emissive = new THREE.Color(0x000000);
    ambientLight.color.set(0xffffff);
    sunLight.color.set(0xfff7ea);
  } else if (lvl <= 20) {
    scene.background = new THREE.Color(0xf97316);
    scene.fog = new THREE.FogExp2(0xf97316, 0.007);
    document.body.style.background = "#f97316";
    groundMat.color.set(0x78350f);
    riverMat.color.set(0xfbbf24);
    riverMat.emissive = new THREE.Color(0x221100);
    ambientLight.color.set(0xffeedd);
    sunLight.color.set(0xffedd5);
  } else if (lvl <= 30) {
    scene.background = new THREE.Color(0x2563eb);
    scene.fog = new THREE.FogExp2(0x2563eb, 0.006);
    document.body.style.background = "#2563eb";
    groundMat.color.set(0x1e293b);
    riverMat.color.set(0x00f0ff);
    riverMat.emissive = new THREE.Color(0x006688);
    ambientLight.color.set(0xdbeafe);
    sunLight.color.set(0x93c5fd);
  } else if (lvl <= 40) {
    scene.background = new THREE.Color(0xfbbf24);
    scene.fog = new THREE.FogExp2(0xfbbf24, 0.0065);
    document.body.style.background = "#fbbf24";
    groundMat.color.set(0xd97706);
    riverMat.color.set(0xb45309);
    riverMat.emissive = new THREE.Color(0x000000);
    ambientLight.color.set(0xfffbeb);
    sunLight.color.set(0xfef3c7);
  } else {
    scene.background = new THREE.Color(0xd946ef);
    scene.fog = new THREE.FogExp2(0xd946ef, 0.006);
    document.body.style.background = "#d946ef";
    groundMat.color.set(0x312e81);
    riverMat.color.set(0xff4500);
    riverMat.emissive = new THREE.Color(0xff2200);
    ambientLight.color.set(0xffe4e6);
    sunLight.color.set(0xfecdd3);
  }
}

// --- CLOUDS ---
const clouds = [];
const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
for (let i = 0; i < 16; i++) {
  const cloud = new THREE.Group();
  const width = 9 + Math.random() * 7;
  for (let c = 0; c < 5; c++) {
    const radius = 2.4 + Math.random() * 1.8;
    const puff = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 20), cloudMat);
    puff.position.set(c * (width / 5) - width / 2, (Math.random() - 0.3) * 1.2, (Math.random() - 0.5) * 2.2);
    cloud.add(puff);
  }
  cloud.scale.set(1.4, 0.55, 0.9);
  cloud.position.set((Math.random() - 0.5) * 180, -4 + Math.random() * 28, -30 - Math.random() * 100);
  cloud.userData = { speed: 0.015 + Math.random() * 0.02 };
  scene.add(cloud);
  clouds.push(cloud);
}

// --- CANNON PHYSICS SETUP ---
let world, physicsBodies = [], obstacleBodies = [], platformBody;

function initPhysics() {
  world = new CANNON.World({ gravity: new CANNON.Vec3(0, -26, 0) });
  world.allowSleep = true;

  const defaultMat = new CANNON.Material('default');
  const contactMat = new CANNON.ContactMaterial(defaultMat, defaultMat, {
    friction: 0.85,
    restitution: 0.02
  });
  world.addContactMaterial(contactMat);

  const islandRadius = 5.2;
  const islandHeight = 24;

  const islandGroup = new THREE.Group();
  const cliff = new THREE.Mesh(
    new THREE.CylinderGeometry(islandRadius, islandRadius * 0.65, islandHeight, 32),
    new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.8 })
  );
  cliff.position.y = -islandHeight / 2 + 1;
  cliff.receiveShadow = true;
  islandGroup.add(cliff);

  const grass = new THREE.Mesh(
    new THREE.CylinderGeometry(islandRadius + 0.15, islandRadius + 0.15, 0.5, 32),
    new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.6 })
  );
  grass.position.y = 1.05;
  grass.receiveShadow = true;
  islandGroup.add(grass);
  scene.add(islandGroup);

  platformBody = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Cylinder(islandRadius, islandRadius, islandHeight, 32)
  });
  platformBody.position.set(0, -islandHeight / 2 + 1, 0);
  world.addBody(platformBody);
}

function spawnObstacleBumpers(lvl) {
  obstacleBodies.forEach(item => {
    scene.remove(item.mesh);
    world.removeBody(item.body);
  });
  obstacleBodies = [];

  let count = 0;
  if (lvl > 20 && lvl <= 30) count = 2;
  else if (lvl > 30 && lvl <= 40) count = 3;
  else if (lvl > 40) count = 4;

  for (let i = 0; i < count; i++) {
    const angle = (i * (Math.PI * 2 / count)) + 0.4;
    const x = Math.cos(angle) * 4.6;
    const z = Math.sin(angle) * 4.6;

    const bMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.8, 0.8),
      new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.9 })
    );
    bMesh.position.set(x, 1.4, z);
    bMesh.rotation.y = -angle;
    bMesh.castShadow = true;
    bMesh.receiveShadow = true;
    scene.add(bMesh);

    const bBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(0.8, 0.4, 0.4))
    });
    bBody.position.copy(bMesh.position);
    bBody.quaternion.copy(bMesh.quaternion);
    world.addBody(bBody);

    obstacleBodies.push({ mesh: bMesh, body: bBody });
  }
}

// --- BLOCK SPAWNER WITH REALISTIC PROCEDURAL TEXTURES ---
const blockGeo = new THREE.BoxGeometry(1.2, 0.9, 1.2);
const blockShape = new CANNON.Box(new CANNON.Vec3(0.6, 0.45, 0.6));

function spawnBlock(x, y, z, matType = "wood", isHeavy = false) {
  let material;
  if (isHeavy) {
    material = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.3
    });
  } else if (matType === "brick") {
    material = new THREE.MeshStandardMaterial({
      map: brickTex,
      roughness: 0.6
    });
  } else if (matType === "stone") {
    material = new THREE.MeshStandardMaterial({
      map: stoneTex,
      roughness: 0.7
    });
  } else {
    // Wood
    material = new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.5
    });
  }

  const mesh = new THREE.Mesh(blockGeo, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  const body = new CANNON.Body({
    mass: isHeavy ? 5.2 : 2.4,
    shape: blockShape,
    allowSleep: true,
    sleepSpeedLimit: 0.15,
    sleepTimeLimit: 0.25
  });
  body.position.set(x, y, z);
  body.linearDamping = 0.3;
  body.angularDamping = 0.3;
  body.sleep();

  body.addEventListener('collide', (e) => {
    if (e.contact.getImpactVelocityAlongNormal() > 3.0) {
      playSound('crunch');
    }
  });

  world.addBody(body);
  physicsBodies.push({ mesh, body, initialY: y });
  totalBlocks++;
}

// --- LOAD LEVEL & BUILD STRUCTURES ---
const mats = ["wood", "brick", "stone"];

function loadLevel(lvl) {
  physicsBodies.forEach(item => {
    scene.remove(item.mesh);
    world.removeBody(item.body);
  });
  physicsBodies = [];
  totalBlocks = 0;
  isLevelEnded = false;
  isMonitoringSettle = false;
  settleTimer = 0;
  screenShake = 0;
  endModal.classList.add('hidden');
  adBallBtn.classList.add('hidden');
  adSkipBtn.classList.add('hidden');

  applyBiome(lvl);
  spawnObstacleBumpers(lvl);

  const conf = levelConfigs[lvl];
  const weapon = getWeaponConfig(lvl);
  levelTitleEl.innerText = `LEVEL ${lvl}: ${conf.title}`;
  ammo = conf.ammo;
  ammoEl.innerText = ammo;
  weaponIconEl.innerText = weapon.icon;
  weaponNameEl.innerText = weapon.name;
  progressBar.style.width = "0%";
  destructionText.innerText = `KNOCK ${conf.target}% INTO THE ABYSS`;

  const startY = 1.6;

  // Levels 1 - 30
  if (conf.type === "tower") {
    for (let y = 0; y < conf.l; y++) {
      const m = mats[y % mats.length];
      for (let x = -0.6; x <= 0.6; x += 1.2) {
        for (let z = -0.6; z <= 0.6; z += 1.2) spawnBlock(x, startY + y * 0.92, z, m);
      }
    }
  } else if (conf.type === "house") {
    for (let y = 0; y < 4; y++) {
      const m = mats[y % mats.length];
      for (let x = -1.3; x <= 1.3; x += 1.3) {
        for (let z = -1.3; z <= 1.3; z += 1.3) {
          if (x === 0 && z === 0 && y < 3) continue;
          spawnBlock(x, startY + y * 0.92, z, m);
        }
      }
    }
    spawnBlock(0, startY + 4 * 0.92, 0, "brick");
  } else if (conf.type === "bridge") {
    [-1.8, 1.8].forEach(ox => {
      for (let y = 0; y < 5; y++) spawnBlock(ox, startY + y * 0.92, 0, mats[y % mats.length]);
    });
    spawnBlock(0, startY + 4.92, 0, "stone");
  } else if (conf.type === "tripeaks") {
    [-2, 0, 2].forEach(ox => {
      for (let y = 0; y < 4; y++) spawnBlock(ox, startY + y * 0.92, 0, mats[y % mats.length]);
    });
  } else if (conf.type === "fortress") {
    for (let y = 0; y < 5; y++) {
      [-1.8, 1.8].forEach(x => {
        [-1.8, 1.8].forEach(z => spawnBlock(x, startY + y * 0.92, z, mats[y % mats.length]));
      });
      spawnBlock(0, startY + y * 0.92, 0, "stone");
    }
  } else if (conf.type === "arch") {
    for (let y = 0; y < 6; y++) {
      spawnBlock(-2, startY + y * 0.92, 0, mats[y % mats.length]);
      spawnBlock(2, startY + y * 0.92, 0, mats[y % mats.length]);
    }
    for (let x = -1; x <= 1; x++) spawnBlock(x, startY + 5.92, 0, "brick");
  } else if (conf.type === "wall") {
    for (let y = 0; y < 5; y++) {
      for (let x = -2.4; x <= 2.4; x += 1.2) spawnBlock(x, startY + y * 0.92, 0, mats[y % mats.length]);
    }
  } else if (conf.type === "pyramid") {
    for (let y = 0; y < 4; y++) {
      const count = 4 - y;
      for (let x = -(count - 1) * 0.6; x <= (count - 1) * 0.6; x += 1.2) spawnBlock(x, startY + y * 0.92, 0, mats[y % mats.length]);
    }
  } else if (conf.type === "twins") {
    [-1.8, 1.8].forEach(ox => {
      for (let y = 0; y < 6; y++) {
        for (let z = -0.6; z <= 0.6; z += 1.2) spawnBlock(ox, startY + y * 0.92, z, mats[y % mats.length]);
      }
    });
  } else if (conf.type === "skyscraper") {
    for (let y = 0; y < conf.l; y++) {
      for (let x = -1.2; x <= 1.2; x += 1.2) {
        for (let z = -1.2; z <= 1.2; z += 1.2) {
          if (x === 0 && z === 0) continue;
          spawnBlock(x, startY + y * 0.92, z, mats[y % mats.length]);
        }
      }
    }
  } else if (conf.type === "ring") {
    for (let y = 0; y < 5; y++) {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        const isH = (y === 0);
        spawnBlock(Math.cos(a) * 2.4, startY + y * 0.92, Math.sin(a) * 2.4, mats[y % mats.length], isH);
      }
    }
  } else if (conf.type === "suspension") {
    [-2.2, 2.2].forEach(ox => {
      for (let y = 0; y < 7; y++) spawnBlock(ox, startY + y * 0.92, 0, mats[y % mats.length]);
    });
    for (let x = -2.2; x <= 2.2; x += 1.1) spawnBlock(x, startY + 6.92, 0, "stone", true);
  } else if (conf.type === "megalith") {
    [-2, 0, 2].forEach(ox => {
      spawnBlock(ox, startY, 0, "stone", true);
      spawnBlock(ox, startY + 0.92, 0, "stone", true);
    });
    for (let y = 2; y < 6; y++) {
      for (let x = -2; x <= 2; x += 1.2) spawnBlock(x, startY + y * 0.92, 0, mats[y % mats.length]);
    }
  } else if (conf.type === "crane") {
    for (let y = 0; y < 7; y++) spawnBlock(0, startY + y * 0.92, 0, mats[y % mats.length]);
    for (let x = -3; x <= 3; x += 1.2) spawnBlock(x, startY + 6.92, 0, "stone", true);
  } else if (conf.type === "colosseum") {
    for (let y = 0; y < 4; y++) {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 5) spawnBlock(Math.cos(a) * 3, startY + y * 0.92, Math.sin(a) * 3, mats[y % mats.length]);
    }
  } else if (conf.type === "hourglass") {
    for (let x = -1.8; x <= 1.8; x += 1.2) spawnBlock(x, startY, 0, "wood");
    spawnBlock(0, startY + 0.92, 0, "brick");
    for (let y = 2; y < 5; y++) {
      for (let x = -2.4; x <= 2.4; x += 1.2) spawnBlock(x, startY + y * 0.92, 0, "stone", true);
    }
  } else if (conf.type === "bastion") {
    [-2.2, 2.2].forEach(ox => {
      for (let y = 0; y < 8; y++) {
        const isH = y === 0 || y === 7;
        spawnBlock(ox, startY + y * 0.92, 0, mats[y % mats.length], isH);
      }
    });
    for (let y = 0; y < 4; y++) spawnBlock(0, startY + y * 0.92, 0, "stone");
  } else if (conf.type === "citadel") {
    for (let y = 0; y < 6; y++) {
      for (let x = -2; x <= 2; x += 2) {
        for (let z = -2; z <= 2; z += 2) {
          const isH = (y === 0);
          spawnBlock(x, startY + y * 0.92, z, mats[y % mats.length], isH);
        }
      }
    }
  } else if (conf.type === "spiral") {
    for (let y = 0; y < 9; y++) {
      const a = y * 0.6;
      spawnBlock(Math.cos(a) * 1.5, startY + y * 0.92, Math.sin(a) * 1.5, mats[y % mats.length]);
      spawnBlock(-Math.cos(a) * 1.5, startY + y * 0.92, -Math.sin(a) * 1.5, mats[y % mats.length]);
    }
  } else if (conf.type === "boss") {
    for (let y = 0; y < 10; y++) {
      const isH = (y < 2);
      for (let x = -1.2; x <= 1.2; x += 1.2) {
        for (let z = -1.2; z <= 1.2; z += 1.2) spawnBlock(x, startY + y * 0.92, z, mats[y % mats.length], isH);
      }
    }
  } else if (conf.type === "battlements") {
    for (let y = 0; y < 5; y++) {
      for (let x = -2.4; x <= 2.4; x += 1.2) spawnBlock(x, startY + y * 0.92, 0, mats[y % mats.length]);
    }
    [-2.4, 0, 2.4].forEach(x => spawnBlock(x, startY + 5 * 0.92, 0, "stone", true));
  } else if (conf.type === "triplesuspension") {
    [-2.4, 0, 2.4].forEach(x => {
      for (let y = 0; y < 6; y++) spawnBlock(x, startY + y * 0.92, 0, mats[y % mats.length]);
    });
    for (let x = -2.4; x <= 2.4; x += 1.2) spawnBlock(x, startY + 6 * 0.92, 0, "stone", true);
  } else if (conf.type === "stiltbunker") {
    spawnBlock(-1.5, startY, 0, "wood");
    spawnBlock(1.5, startY, 0, "wood");
    for (let y = 1; y < 5; y++) {
      for (let x = -2.4; x <= 2.4; x += 1.2) {
        for (let z = -1.2; z <= 1.2; z += 1.2) spawnBlock(x, startY + y * 0.92, z, "stone", true);
      }
    }
  } else if (conf.type === "stonehenge") {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
      const x = Math.cos(a) * 2.5;
      const z = Math.sin(a) * 2.5;
      spawnBlock(x, startY, z, "stone", true);
      spawnBlock(x, startY + 0.92, z, "stone", true);
      spawnBlock(x, startY + 1.84, z, "brick");
    }
  } else if (conf.type === "giantcross") {
    for (let y = 0; y < 8; y++) spawnBlock(0, startY + y * 0.92, 0, mats[y % mats.length]);
    for (let x = -2.4; x <= 2.4; x += 1.2) {
      if (x !== 0) spawnBlock(x, startY + 5 * 0.92, 0, "stone", true);
    }
  } else if (conf.type === "doubledeck") {
    [-1.8, 1.8].forEach(x => {
      [-1.8, 1.8].forEach(z => {
        spawnBlock(x, startY, z, "wood");
        spawnBlock(x, startY + 0.92, z, "brick");
      });
    });
    for (let x = -1.8; x <= 1.8; x += 1.2) {
      for (let z = -1.8; z <= 1.8; z += 1.2) spawnBlock(x, startY + 2 * 0.92, z, "stone", true);
    }
    for (let y = 3; y < 7; y++) spawnBlock(0, startY + y * 0.92, 0, mats[y % mats.length]);
  } else if (conf.type === "cathedral") {
    for (let y = 0; y < 3; y++) {
      for (let x = -2.4; x <= 2.4; x += 1.2) spawnBlock(x, startY + y * 0.92, 0, "stone", true);
    }
    for (let y = 3; y < 6; y++) {
      for (let x = -1.2; x <= 1.2; x += 1.2) spawnBlock(x, startY + y * 0.92, 0, mats[y % mats.length]);
    }
    for (let y = 6; y < 9; y++) spawnBlock(0, startY + y * 0.92, 0, "brick");
  } else if (conf.type === "jenga") {
    for (let y = 0; y < 9; y++) {
      const isX = (y % 2 === 0);
      const m = mats[y % mats.length];
      if (isX) {
        spawnBlock(-0.8, startY + y * 0.92, 0, m);
        spawnBlock(0.8, startY + y * 0.92, 0, m);
      } else {
        spawnBlock(0, startY + y * 0.92, -0.8, m);
        spawnBlock(0, startY + y * 0.92, 0.8, m);
      }
    }
  } else if (conf.type === "strongholds") {
    [-2.2, 2.2].forEach(ox => {
      for (let y = 0; y < 7; y++) {
        for (let z = -0.8; z <= 0.8; z += 1.6) {
          const isH = (y === 0 || y === 6);
          spawnBlock(ox, startY + y * 0.92, z, mats[y % mats.length], isH);
        }
      }
    });
  } else if (conf.type === "titancitadel") {
    for (let y = 0; y < 10; y++) {
      const isH = (y < 2);
      for (let x = -1.8; x <= 1.8; x += 1.2) {
        for (let z = -1.2; z <= 1.2; z += 1.2) {
          if (Math.abs(x) < 1.0 && Math.abs(z) < 1.0 && y > 2) continue;
          spawnBlock(x, startY + y * 0.92, z, mats[y % mats.length], isH);
        }
      }
    }
  }
  // Levels 31 - 50 Handcrafted
  else if (conf.type === "ziggurat") {
    for (let step = 0; step < 5; step++) {
      const count = 5 - step;
      const span = (count - 1) * 0.6;
      for (let x = -span; x <= span; x += 1.2) {
        for (let z = -span; z <= span; z += 1.2) spawnBlock(x, startY + step * 0.92, z, mats[step % mats.length], step === 0);
      }
    }
  } else if (conf.type === "starfort") {
    for (let y = 0; y < 6; y++) {
      const m = mats[y % mats.length];
      spawnBlock(0, startY + y * 0.92, 0, m);
      spawnBlock(-1.5, startY + y * 0.92, 0, m);
      spawnBlock(1.5, startY + y * 0.92, 0, m);
      spawnBlock(0, startY + y * 0.92, -1.5, m);
      spawnBlock(0, startY + y * 0.92, 1.5, m);
    }
    spawnBlock(0, startY + 6 * 0.92, 0, "stone", true);
  } else if (conf.type === "canopy") {
    for (let y = 0; y < 6; y++) {
      spawnBlock(-2, startY + y * 0.92, 0, "wood");
      spawnBlock(2, startY + y * 0.92, 0, "wood");
    }
    for (let x = -3.2; x <= 3.2; x += 1.1) {
      for (let z = -1.2; z <= 1.2; z += 1.2) spawnBlock(x, startY + 6 * 0.92, z, "stone", true);
    }
  } else if (conf.type === "diamond") {
    const coords = [[0, -2], [-1.2, -1.2], [1.2, -1.2], [-2, 0], [2, 0], [-1.2, 1.2], [1.2, 1.2], [0, 2]];
    for (let y = 0; y < 6; y++) {
      const m = mats[y % mats.length];
      coords.forEach(pt => spawnBlock(pt[0], startY + y * 0.92, pt[1], m));
    }
  } else if (conf.type === "windmill") {
    for (let y = 0; y < 9; y++) spawnBlock(0, startY + y * 0.92, 0, mats[y % mats.length]);
    for (let o = 1; o <= 3; o++) {
      spawnBlock(-o * 1.2, startY + 6 * 0.92, 0, "stone", true);
      spawnBlock(o * 1.2, startY + 6 * 0.92, 0, "stone", true);
      spawnBlock(0, startY + (6 + o) * 0.92, 0, "stone", true);
      spawnBlock(0, startY + (6 - o) * 0.92, 0, "stone", true);
    }
  } else if (conf.type === "thammer") {
    for (let y = 0; y < 6; y++) spawnBlock(0, startY + y * 0.92, 0, "wood");
    for (let x = -3; x <= 3; x += 1.2) {
      for (let z = -1.2; z <= 1.2; z += 1.2) spawnBlock(x, startY + 6 * 0.92, z, "stone", true);
    }
  } else if (conf.type === "pagoda") {
    for (let x = -1.8; x <= 1.8; x += 1.2) for (let z = -1.8; z <= 1.8; z += 1.2) spawnBlock(x, startY, z, "wood");
    for (let x = -2.4; x <= 2.4; x += 1.2) spawnBlock(x, startY + 0.92, 0, "stone", true);
    for (let x = -1.2; x <= 1.2; x += 1.2) for (let z = -1.2; z <= 1.2; z += 1.2) spawnBlock(x, startY + 2 * 0.92, z, "brick");
    for (let x = -1.8; x <= 1.8; x += 1.2) spawnBlock(x, startY + 3 * 0.92, 0, "stone", true);
    spawnBlock(0, startY + 4 * 0.92, 0, "stone");
    spawnBlock(0, startY + 5 * 0.92, 0, "brick");
  } else if (conf.type === "arctriomphe") {
    for (let y = 0; y < 6; y++) {
      for (let z = -0.8; z <= 0.8; z += 1.6) {
        spawnBlock(-2.2, startY + y * 0.92, z, mats[y % mats.length]);
        spawnBlock(2.2, startY + y * 0.92, z, mats[y % mats.length]);
      }
    }
    for (let x = -2.4; x <= 2.4; x += 1.2) {
      for (let z = -0.8; z <= 0.8; z += 1.6) spawnBlock(x, startY + 6 * 0.92, z, "stone", true);
    }
  } else if (conf.type === "cantilever") {
    for (let y = 0; y < 6; y++) {
      spawnBlock(-2, startY + y * 0.92, 0, "stone");
      spawnBlock(-1, startY + y * 0.92, 0, "stone");
    }
    for (let x = -1; x <= 3.2; x += 1.1) spawnBlock(x, startY + 6 * 0.92, 0, "stone", true);
  } else if (conf.type === "skybridge") {
    [-2.2, 2.2].forEach(ox => {
      for (let y = 0; y < 7; y++) {
        spawnBlock(ox, startY + y * 0.92, -0.6, mats[y % mats.length]);
        spawnBlock(ox, startY + y * 0.92, 0.6, mats[y % mats.length]);
      }
    });
    for (let x = -1.2; x <= 1.2; x += 1.2) spawnBlock(x, startY + 5 * 0.92, 0, "stone", true);
  } else if (conf.type === "octagonsilo") {
    for (let y = 0; y < 6; y++) {
      const m = mats[y % mats.length];
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) spawnBlock(Math.cos(a) * 2.8, startY + y * 0.92, Math.sin(a) * 2.8, m);
    }
    for (let y = 0; y < 8; y++) spawnBlock(0, startY + y * 0.92, 0, "stone", true);
  } else if (conf.type === "doomhourglass") {
    for (let x = -2; x <= 2; x += 1.3) for (let z = -2; z <= 2; z += 1.3) spawnBlock(x, startY, z, "wood");
    spawnBlock(0, startY + 0.92, 0, "brick");
    for (let y = 2; y < 6; y++) {
      for (let x = -2.2; x <= 2.2; x += 1.1) for (let z = -1.1; z <= 1.1; z += 1.1) spawnBlock(x, startY + y * 0.92, z, "stone", true);
    }
  } else if (conf.type === "asymtowers") {
    for (let y = 0; y < 9; y++) spawnBlock(-1.8, startY + y * 0.92, 0, mats[y % mats.length]);
    for (let y = 0; y < 4; y++) spawnBlock(1.8, startY + y * 0.92, 0, mats[y % mats.length]);
    spawnBlock(0, startY + 3.92, 0, "stone", true);
  } else if (conf.type === "suntemple") {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
      spawnBlock(Math.cos(a) * 2.6, startY, Math.sin(a) * 2.6, "stone", true);
      spawnBlock(Math.cos(a) * 2.6, startY + 0.92, Math.sin(a) * 2.6, "brick");
    }
    for (let y = 0; y < 8; y++) spawnBlock(0, startY + y * 0.92, 0, mats[y % mats.length]);
    spawnBlock(0, startY + 8 * 0.92, 0, "stone");
  } else if (conf.type === "spiralstair") {
    for (let y = 0; y < 10; y++) {
      const a = y * 0.7;
      spawnBlock(Math.cos(a) * 1.8, startY + y * 0.92, Math.sin(a) * 1.8, mats[y % mats.length]);
      spawnBlock(0, startY + y * 0.92, 0, "stone", true);
    }
  } else if (conf.type === "threepegs") {
    spawnBlock(-2, startY, -1.2, "wood");
    spawnBlock(2, startY, -1.2, "wood");
    spawnBlock(0, startY, 1.8, "wood");
    for (let y = 1; y < 5; y++) {
      for (let x = -2.4; x <= 2.4; x += 1.2) {
        for (let z = -1.8; z <= 1.8; z += 1.2) spawnBlock(x, startY + y * 0.92, z, "stone", true);
      }
    }
  } else if (conf.type === "plusfort") {
    for (let y = 0; y < 6; y++) {
      const m = mats[y % mats.length];
      for (let x = -2.4; x <= 2.4; x += 1.2) spawnBlock(x, startY + y * 0.92, 0, m);
      for (let z = -2.4; z <= 2.4; z += 1.2) if (z !== 0) spawnBlock(0, startY + y * 0.92, z, m);
    }
    spawnBlock(0, startY + 6 * 0.92, 0, "stone", true);
  } else if (conf.type === "labyrinth") {
    for (let y = 0; y < 5; y++) {
      for (let x = -2.4; x <= 2.4; x += 2.4) {
        for (let z = -2.4; z <= 2.4; z += 2.4) spawnBlock(x, startY + y * 0.92, z, "stone", true);
      }
      for (let x = -1; x <= 1; x += 1.2) {
        for (let z = -1; z <= 1; z += 1.2) spawnBlock(x, startY + y * 0.92, z, mats[y % mats.length]);
      }
    }
  } else if (conf.type === "gothic") {
    for (let y = 0; y < 9; y++) {
      spawnBlock(-2.2, startY + y * 0.92, 0, mats[y % mats.length]);
      spawnBlock(2.2, startY + y * 0.92, 0, mats[y % mats.length]);
    }
    for (let y = 0; y < 5; y++) {
      spawnBlock(-1.1, startY + y * 0.92, 0, "stone", true);
      spawnBlock(1.1, startY + y * 0.92, 0, "stone", true);
      spawnBlock(0, startY + y * 0.92, 0, "brick");
    }
  } else if (conf.type === "titanapex") {
    for (let y = 0; y < 10; y++) {
      const isH = (y < 3);
      const span = y < 4 ? 2.4 : (y < 7 ? 1.6 : 0.8);
      for (let x = -span; x <= span; x += 1.2) for (let z = -span; z <= span; z += 1.2) spawnBlock(x, startY + y * 0.92, z, mats[y % mats.length], isH);
    }
    spawnBlock(0, startY + 10 * 0.92, 0, "stone", true);
  }
}

// --- INTERACTIVE AIMING & FIRING ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const targetPoint = new THREE.Vector3(0, 5, 0);

window.addEventListener('pointermove', (e) => {
  if (!isGameStarted) return;
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  crosshair.style.left = `${e.clientX}px`;
  crosshair.style.top = `${e.clientY}px`;

  // Aim Cannon barrel toward crosshair in 3D
  raycaster.setFromCamera(mouse, camera);
  const intersectPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  raycaster.ray.intersectPlane(intersectPlane, targetPoint);
  barrelPivot.lookAt(targetPoint.x, targetPoint.y, targetPoint.z);
});

function shoot(event) {
  if (!isGameStarted || ammo <= 0 || isLevelEnded) return;

  const clientX = event.clientX || (event.touches && event.touches[0].clientX);
  const clientY = event.clientY || (event.touches && event.touches[0].clientY);
  if (!clientX || !clientY) return;

  mouse.x = (clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const shootDir = raycaster.ray.direction.clone().normalize();
  const weapon = getWeaponConfig(currentLevel);

  let pMesh, pBody;

  if (weapon.type === "fireball") {
    pMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 24, 24),
      new THREE.MeshStandardMaterial({
        color: 0xf97316,
        emissive: 0xff3b00,
        emissiveIntensity: 0.9,
        roughness: 0.2
      })
    );
    pBody = new CANNON.Body({ mass: weapon.mass, shape: new CANNON.Sphere(0.8) });
  } else if (weapon.type === "rock") {
    pMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85), new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.9 }));
    pBody = new CANNON.Body({ mass: weapon.mass, shape: new CANNON.Sphere(0.85) });
  } else if (weapon.type === "wrecking") {
    const group = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.75, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 })
    );
    group.add(core);

    const spikeGeo = new THREE.ConeGeometry(0.18, 0.5, 8);
    const spikeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95 });
    const spikeDirs = [
      [1,0,0], [-1,0,0], [0,1,0], [0,-1,0], [0,0,1], [0,0,-1],
      [0.7,0.7,0], [-0.7,-0.7,0], [0.7,-0.7,0], [-0.7,0.7,0]
    ];
    spikeDirs.forEach(dir => {
      const spike = new THREE.Mesh(spikeGeo, spikeMat);
      spike.position.set(dir[0]*0.75, dir[1]*0.75, dir[2]*0.75);
      spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...dir).normalize());
      group.add(spike);
    });

    pMesh = group;
    pBody = new CANNON.Body({ mass: weapon.mass, shape: new CANNON.Sphere(0.85) });
    pBody.angularVelocity.set(8, 6, 4);
  } else if (weapon.type === "anvil") {
    pMesh = new THREE.Mesh(new THREE.SphereGeometry(0.85, 32, 32), new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.95, roughness: 0.1 }));
    pBody = new CANNON.Body({ mass: weapon.mass, shape: new CANNON.Sphere(0.85) });
  } else {
    // Standard Steel Cannonball
    pMesh = new THREE.Mesh(new THREE.SphereGeometry(0.75, 32, 32), new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.95, roughness: 0.15 }));
    pBody = new CANNON.Body({ mass: weapon.mass, shape: new CANNON.Sphere(0.75) });
  }

  pMesh.castShadow = true;
  scene.add(pMesh);

  // Spawn exactly at cannon muzzle tip!
  const muzzlePos = new THREE.Vector3();
  rim.getWorldPosition(muzzlePos);
  pBody.position.set(muzzlePos.x, muzzlePos.y, muzzlePos.z);

  const force = 52;
  pBody.velocity.set(shootDir.x * force, shootDir.y * force, shootDir.z * force);

  // CANNON RECOIL KICKBACK
  cannonRecoil = 0.8;

  pBody.addEventListener('collide', (e) => {
    const impact = e.contact ? e.contact.getImpactVelocityAlongNormal() : 0;
    const now = performance.now();
    if (impact > 7.0 && now - lastShakeTime > 400) {
      screenShake = 0.35;
      lastShakeTime = now;
      if (weapon.type === 'wrecking') playSound('metal_hit');
    }
  });

  world.addBody(pBody);
  physicsBodies.push({ mesh: pMesh, body: pBody });

  playSound('fire');
  ammo--;
  ammoEl.innerText = ammo;
  lastShootTime = performance.now();

  if (ammo === 0) {
    isMonitoringSettle = true;
    settleTimer = 0;
  }
}

window.addEventListener('pointerdown', (e) => {
  if (e.target.closest('#end-modal') || e.target.closest('#main-menu')) return;
  shoot(e);
});

// --- DESTRUCTION & SETTLE ENGINE ---
function updateDestruction() {
  if (isLevelEnded) return;

  let fallen = 0;
  physicsBodies.forEach(item => {
    if (item.initialY && item.body.position.y < 0.5) {
      fallen++;
    }
  });

  const percent = Math.min(100, Math.floor((fallen / totalBlocks) * 100));
  progressBar.style.width = `${percent}%`;
  destructionText.innerText = `FALLEN INTO ABYSS: ${percent}% / ${levelConfigs[currentLevel].target}%`;

  if (percent >= levelConfigs[currentLevel].target && !isLevelEnded) {
    isLevelEnded = true;
    isMonitoringSettle = false;
    playSound('win');
    showModal(true, `Epic Destruction! ${percent}% collapsed into the abyss!`);
    return;
  }

  if (isMonitoringSettle && ammo === 0) {
    const elapsedSinceLastShot = performance.now() - lastShootTime;

    if (elapsedSinceLastShot > 1500) {
      let isAnyBlockMoving = false;
      for (let i = 0; i < physicsBodies.length; i++) {
        const body = physicsBodies[i].body;
        if (body.position.y > -5) {
          const speed = body.velocity.length();
          if (speed > 0.6) {
            isAnyBlockMoving = true;
            break;
          }
        }
      }

      if (isAnyBlockMoving) {
        settleTimer = 0;
      } else {
        settleTimer += 1 / 60;
        if (settleTimer > 0.8 || elapsedSinceLastShot > 6000) {
          isLevelEnded = true;
          isMonitoringSettle = false;
          playSound('fail');
          showModal(false, "Out of Ammo! The structure survived.");
        }
      }
    }
  }
}

function showModal(isWin, msg) {
  endModal.classList.remove('hidden');
  endTitle.innerText = isWin ? "🎉 LEVEL WON!" : "💥 LEVEL FAILED!";
  endTitle.style.color = isWin ? "#10b981" : "#f43f5e";
  endSub.innerText = msg;

  if (isWin) {
    modalBtn.innerText = "NEXT LEVEL ➔";
    modalBtn.className = "action-btn";
    adBallBtn.classList.add('hidden');
    adSkipBtn.classList.add('hidden');
  } else {
    modalBtn.innerText = "TRY AGAIN ↻";
    modalBtn.className = "action-btn retry";
    adBallBtn.classList.remove('hidden');
    adSkipBtn.classList.remove('hidden');
  }
}

// --- ENGINE LOOP ---
initPhysics();
loadLevel(currentLevel);

let menuAngle = 0;
const timeStep = 1 / 60;

function animate() {
  requestAnimationFrame(animate);

  world.step(timeStep);

  for (let i = 0; i < physicsBodies.length; i++) {
    const { mesh, body } = physicsBodies[i];
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);
  }

  clouds.forEach(c => {
    c.position.x += c.userData.speed;
    if (c.position.x > 90) c.position.x = -90;
  });

  if (riverMesh) {
    riverMesh.position.z = (performance.now() * 0.005) % 20;
  }

  // CINEMATIC MENU CAMERA ROTATION
  if (!isGameStarted) {
    menuAngle += 0.003;
    camera.position.x = Math.sin(menuAngle) * 26;
    camera.position.z = Math.cos(menuAngle) * 26;
    camera.position.y = 12;
    camera.lookAt(0, 5, 0);
  } else {
    // Cannon Recoil recovery animation
    if (cannonRecoil > 0) {
      cannonGroup.position.z = 19 + cannonRecoil;
      cannonRecoil *= 0.85;
      if (cannonRecoil < 0.02) cannonRecoil = 0;
    } else {
      cannonGroup.position.z = 19;
    }
  }

  // Screen Shake
  if (screenShake > 0) {
    camera.position.x = baseCamPos.x + (Math.random() - 0.5) * screenShake;
    camera.position.y = baseCamPos.y + (Math.random() - 0.5) * screenShake;
    screenShake *= 0.82;
    if (screenShake < 0.01) {
      screenShake = 0;
      if (isGameStarted) camera.position.copy(baseCamPos);
    }
  }

  if (isGameStarted) updateDestruction();
  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
