import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const SAVE_KEY = 'cloxdio-prototype-v1';
const defaults = { name: 'Player', coins: 250, xp: 0, placed: 0, removed: 0, color: '#d4f578', owned: ['basic'], equipped: 'basic', sensitivity: 1, fov: 75, invert: false, selectedWorld: 'frontier' };
let save;
try { save = { ...defaults, ...JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') }; }
catch { save = { ...defaults }; }
const store = () => localStorage.setItem(SAVE_KEY, JSON.stringify(save));

const worlds = [
  { id: 'frontier', name: 'The Quiet Frontier', subtitle: 'A wide-open place to begin.', mode: 'CREATIVE', label: 'FEATURED', colors: ['#73856e','#727b82','#b5a985'], sky: '#9da7a2' },
  { id: 'basalt', name: 'Basalt Garden', subtitle: 'A calm build zone in dark stone.', mode: 'CREATIVE', label: 'BUILD', colors: ['#52565b','#8b8b83','#657469'], sky: '#8e9295' },
  { id: 'cloudline', name: 'Cloudline Course', subtitle: 'A tiny jumping route in the sky.', mode: 'PARKOUR', label: 'CHALLENGE', colors: ['#8c969a','#b3a995','#d0d1cc'], sky: '#b3bdc3' },
  { id: 'wilds', name: 'Northwood Wilds', subtitle: 'Explore a quiet block wilderness.', mode: 'SURVIVAL', label: 'EXPLORE', colors: ['#647768','#806f59','#8d9190'], sky: '#929f99' }
];
const blocks = [
  { name: 'Moss', color: '#829379' }, { name: 'Stone', color: '#888b8d' },
  { name: 'Timber', color: '#95785e' }, { name: 'Frost', color: '#c4ccd0' },
  { name: 'Clay', color: '#b07866' }, { name: 'Nightglass', color: '#505867' }
];
const cosmetics = [
  { id: 'basic', name: 'Field Kit', description: 'A dependable starter look.', price: 0, icon: '▦' },
  { id: 'visor', name: 'Surveyor Visor', description: 'For mapping the unknown.', price: 120, icon: '◈' },
  { id: 'cape', name: 'Cloud Cape', description: 'A soft trail of color.', price: 180, icon: '▱' },
  { id: 'crown', name: 'Builder Crown', description: 'A little extra prestige.', price: 300, icon: '♛' },
  { id: 'halo', name: 'Orbit Halo', description: 'A tiny cosmic accent.', price: 420, icon: '◉' },
  { id: 'prism', name: 'Prism Frame', description: 'A bright profile frame.', price: 550, icon: '◇' }
];
const worldGrid = $('#worldGrid');
const discoverGrid = $('#discoverGrid');
const homeView = $('#homeView');
const settingsDialog = $('#settingsDialog');
const profileDialog = $('#profileDialog');
let selectedBlock = 0;
let isGameActive = false;
let currentWorld = worlds[0];
let toastTimer;

function rankInfo(xp) {
  if (xp >= 1000) return { title: 'Super', badge: 'SUPER' };
  if (xp >= 250) return { title: 'Builder III', badge: 'BUILDER III' };
  if (xp >= 80) return { title: 'Builder II', badge: 'BUILDER II' };
  return { title: 'New Builder', badge: 'BUILDER' };
}
function showToast(message) {
  const toast = $('#welcomeToast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}
function refreshProfile() {
  $('#coinCount').textContent = save.coins;
  $('#avatarInitial').textContent = (save.name || 'P').slice(0, 1).toUpperCase();
  $('#shopPlayerName').textContent = save.name;
  $('#profileName').textContent = save.name;
  $('#profileAvatar').textContent = (save.name || 'P').slice(0, 1).toUpperCase();
  $('#profileAvatar').style.background = save.color;
  $('#profileRank').textContent = rankInfo(save.xp).title;
  $('#rankBadge').textContent = rankInfo(save.xp).badge;
  $('#profileXP').textContent = save.xp;
  $('#profileCoins').textContent = save.coins;
  $('#profileBlocks').textContent = save.placed;
  $('#nameInput').value = save.name;
  $('#avatarPreview').style.setProperty('--avatar', save.color);
}
function renderWorlds() {
  const markup = worlds.map(world => `<button class="world-card" data-world="${world.id}" style="--world-art:linear-gradient(130deg,${world.colors.join(',')})"><span class="world-tag">${world.label}</span><strong>${world.name}</strong><small>${world.subtitle}</small></button>`).join('');
  worldGrid.innerHTML = markup;
  discoverGrid.innerHTML = markup;
  $$('[data-world]').forEach(button => button.addEventListener('click', () => startGame(worlds.find(world => world.id === button.dataset.world))));
}
function renderShop() {
  $('#cosmeticGrid').innerHTML = cosmetics.map(item => {
    const owned = save.owned.includes(item.id);
    const equipped = save.equipped === item.id;
    return `<article class="cosmetic-card"><div class="cosmetic-art">${item.icon}</div><strong>${item.name}</strong><p>${item.description}</p><button class="button ${equipped ? 'primary' : ''}" data-cosmetic="${item.id}">${equipped ? 'Equipped' : owned ? 'Equip' : `${item.price} coins`}</button></article>`;
  }).join('');
  $$('[data-cosmetic]').forEach(button => button.addEventListener('click', () => {
    const item = cosmetics.find(cosmetic => cosmetic.id === button.dataset.cosmetic);
    if (!save.owned.includes(item.id)) {
      if (save.coins < item.price) return showToast('Not enough demo coins yet.');
      save.coins -= item.price;
      save.owned.push(item.id);
      showToast(`${item.name} unlocked.`);
    }
    save.equipped = item.id;
    store(); refreshProfile(); renderShop();
  }));
  const colors = ['#d4f578','#f4a476','#86c5d8','#ce9fe0','#f0e2b3','#e5e5e5'];
  $('#avatarSwatches').innerHTML = colors.map(color => `<button class="swatch ${save.color === color ? 'active' : ''}" style="--swatch:${color}" data-avatar-color="${color}" aria-label="Choose avatar color"></button>`).join('');
  $$('[data-avatar-color]').forEach(button => button.addEventListener('click', () => {
    save.color = button.dataset.avatarColor; store(); refreshProfile(); renderShop();
  }));
}
function showPage(page) {
  homeView.classList.toggle('hidden', page !== 'play');
  $('#shopView').classList.toggle('hidden', page !== 'shop');
  $('#discoverView').classList.toggle('hidden', page !== 'discover');
  $$('.nav-link').forEach(button => button.classList.toggle('active', button.dataset.page === page));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
renderWorlds(); renderShop(); refreshProfile();
$$('.nav-link').forEach(button => button.addEventListener('click', () => showPage(button.dataset.page)));
$('#playButton').addEventListener('click', () => startGame(worlds.find(world => world.id === save.selectedWorld) || worlds[0]));
$('#communityPlay').addEventListener('click', () => startGame(worlds[0]));
$('#worldsButton').addEventListener('click', () => $('#worldSection').scrollIntoView({ behavior: 'smooth' }));
$('#allWorldsButton').addEventListener('click', () => showPage('discover'));
$$('[data-mode]').forEach(button => button.addEventListener('click', () => {
  const mode = button.dataset.mode.toUpperCase();
  startGame(worlds.find(world => world.mode === mode) || worlds[0]);
}));
$('#profileButton').addEventListener('click', () => { refreshProfile(); profileDialog.showModal(); });
$('#saveProfile').addEventListener('click', () => {
  save.name = $('#nameInput').value.trim().slice(0, 18) || 'Player';
  store(); refreshProfile(); showToast('Profile saved on this device.');
});
$('#settingsButton').addEventListener('click', openSettings);
$('#menuSettingsButton').addEventListener('click', () => { $('#gameMenu').classList.add('hidden'); openSettings(); });
$('#sensitivity').value = save.sensitivity;
$('#fov').value = save.fov;
$('#invertLook').checked = save.invert;
function openSettings() { settingsDialog.showModal(); }
$('#saveSettings').addEventListener('click', () => {
  save.sensitivity = Number($('#sensitivity').value);
  save.fov = Number($('#fov').value);
  save.invert = $('#invertLook').checked;
  store(); camera.fov = save.fov; camera.updateProjectionMatrix();
  if (isGameActive && !controls.isLocked) controls.lock();
});
$('#exitButton').addEventListener('click', showGameMenu);
$('#backHome').addEventListener('click', showGameMenu);
$('#resumeButton').addEventListener('click', () => controls.lock());
$('#leaveWorldButton').addEventListener('click', leaveGame);
$('#chatToggle').addEventListener('click', () => $('#chatPanel').classList.toggle('hidden'));
$('#closeChat').addEventListener('click', () => $('#chatPanel').classList.add('hidden'));
$('#chatForm').addEventListener('submit', event => {
  event.preventDefault();
  const input = $('#chatInput');
  const text = input.value.trim();
  if (!text) return;
  const line = document.createElement('div'); line.className = 'chat-line';
  const name = document.createElement('b'); name.textContent = save.name.toUpperCase();
  const message = document.createElement('span'); message.textContent = text;
  line.append(name, message); $('#chatMessages').append(line); input.value = '';
  $('#chatMessages').scrollTop = $('#chatMessages').scrollHeight;
});

const scene = new THREE.Scene();
scene.background = new THREE.Color('#9da7a2');
scene.fog = new THREE.Fog('#9da7a2', 30, 95);
const camera = new THREE.PerspectiveCamera(save.fov, innerWidth / innerHeight, .1, 150);
camera.position.set(0, 4, 8);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('#gameCanvas').append(renderer.domElement);
const controls = new PointerLockControls(camera, renderer.domElement);
const hemi = new THREE.HemisphereLight(0xffffff, 0x55575a, 2.1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.1);
sun.position.set(16, 24, 10); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); scene.add(sun);
const worldGroup = new THREE.Group(); scene.add(worldGroup);
const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
const blockMaterials = blocks.map(block => new THREE.MeshStandardMaterial({ color: block.color, roughness: .92 }));
const blockMap = new Map();
const keyOf = (x, y, z) => `${x},${y},${z}`;
const raycaster = new THREE.Raycaster(); raycaster.far = 7;
const center = new THREE.Vector2(0, 0);
const keys = new Set();
let selectedBlock = 0;
let velocityY = 0;
let grounded = false;
let jumpWasDown = false;
let creatures = [];
let worldTime = 0;
let lastStep = 0;
const clock = new THREE.Clock();

function hash(x, z) {
  const value = Math.sin(x * 127.1 + z * 311.7 + 41.7) * 43758.5453;
  return value - Math.floor(value);
}
function terrainHeight(x, z) {
  if (currentWorld.id === 'cloudline') return -2;
  const hills = Math.sin(x * .31) * 1.1 + Math.cos(z * .26) * 1.0 + Math.sin((x + z) * .17) * .7;
  return Math.max(0, Math.floor(1.7 + hills + hash(x, z) * .7));
}
function addBlock(x, y, z, type, countAsPlaced = false) {
  x = Math.round(x); y = Math.round(y); z = Math.round(z);
  const key = keyOf(x, y, z);
  if (blockMap.has(key)) return false;
  const mesh = new THREE.Mesh(blockGeometry, blockMaterials[type]);
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.userData = { x, y, z, type };
  worldGroup.add(mesh); blockMap.set(key, mesh);
  if (countAsPlaced) {
    save.placed += 1; save.xp += 2;
    if (save.placed % 8 === 0) save.coins += 15;
    store(); refreshProfile();
    if (save.placed % 8 === 0) showToast('Build streak! +15 demo coins.');
  }
  return true;
}
function removeBlock(mesh) {
  if (!mesh || !blockMap.has(keyOf(mesh.userData.x, mesh.userData.y, mesh.userData.z))) return;
  blockMap.delete(keyOf(mesh.userData.x, mesh.userData.y, mesh.userData.z));
  worldGroup.remove(mesh);
  save.removed = (save.removed || 0) + 1; save.xp += 1;
  store(); refreshProfile();
}
function clearWorld() {
  for (const mesh of blockMap.values()) worldGroup.remove(mesh);
  blockMap.clear();
  for (const creature of creatures) scene.remove(creature);
  creatures = [];
}
function treeAt(x, z) {
  return Math.abs(x) > 3 && Math.abs(z) > 3 && hash(x * 5, z * 7) > .89;
}
function makeTree(x, z, baseY) {
  for (let y = 1; y <= 3; y++) addBlock(x, baseY + y, z, 2);
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
    const spread = Math.abs(dx) + Math.abs(dz);
    if (spread <= 3 && !(dx === 0 && dz === 0 && hash(x, z) > .5)) addBlock(x + dx, baseY + 3 + (spread < 2 ? 1 : 0), z + dz, 0);
  }
}
function makeParkour() {
  const route = [[0,0,0],[2,1,-2],[4,2,-4],[6,3,-6],[8,4,-8],[10,5,-10],[12,7,-12],[14,9,-14]];
  route.forEach(([x, y, z], index) => {
    for (let dx = 0; dx < 3; dx++) for (let dz = 0; dz < 3; dz++) addBlock(x + dx, y, z + dz, index % 2 ? 3 : 0);
  });
  for (let i = 0; i < 10; i++) addBlock(-5 + i * 2, 1 + (i % 3), -4 - i * 2, i % 2 ? 1 : 4);
}
function spawnCritter(x, y, z) {
  const color = new THREE.Color().setHSL(.28 + hash(x, z) * .22, .45, .57);
  const body = new THREE.Mesh(new THREE.BoxGeometry(.8, .65, .8), new THREE.MeshStandardMaterial({ color, roughness: .75 }));
  body.position.set(x, y + .33, z); body.castShadow = true;
  body.userData = { origin: new THREE.Vector3(x, y + .33, z), phase: hash(z, x) * 6.28, speed: .4 + hash(x + 2, z - 2) * .45 };
  scene.add(body); creatures.push(body);
}
function buildWorld(world) {
  currentWorld = world;
  save.selectedWorld = world.id; store();
  clearWorld();
  scene.background.set(world.sky); scene.fog.color.set(world.sky);
  const baseMaterial = new THREE.MeshStandardMaterial({ color: world.colors[0], roughness: 1 });
  const stoneMaterial = new THREE.MeshStandardMaterial({ color: world.colors[1], roughness: 1 });
  const underMaterial = new THREE.MeshStandardMaterial({ color: world.colors[2], roughness: 1 });
  if (world.id === 'cloudline') {
    for (let x = -6; x <= 6; x++) for (let z = -6; z <= 6; z++) addBlock(x, -2, z, 0);
    makeParkour();
  } else {
    for (let x = -14; x <= 14; x++) for (let z = -14; z <= 14; z++) {
      const top = terrainHeight(x, z);
      addBlock(x, top, z, 0);
      addBlock(x, top - 1, z, 1);
      if (hash(x + 73, z - 31) > .68) addBlock(x, top - 2, z, 4);
      if (treeAt(x, z)) makeTree(x, z, top);
    }
    // Distinct material accents for each destination.
    worldGroup.children.forEach(mesh => {
      const y = mesh.userData.y;
      if (y < terrainHeight(mesh.userData.x, mesh.userData.z) && mesh.userData.type === 0) mesh.material = underMaterial;
      if (y === terrainHeight(mesh.userData.x, mesh.userData.z) && currentWorld.id === 'basalt') mesh.material = stoneMaterial;
    });
    for (let i = 0; i < 5; i++) {
      const x = -8 + i * 4, z = -7 + (i % 2) * 4;
      spawnCritter(x, terrainHeight(x, z) + 1, z);
    }
  }
  camera.position.set(0, world.id === 'cloudline' ? 1.7 : terrainHeight(0, 6) + 2.2, world.id === 'cloudline' ? 5 : 6);
  velocityY = 0; grounded = true; worldTime = 0;
  $('#hudWorldName').textContent = world.name;
  $('#hudMode').textContent = world.mode;
  $('#hotbar').innerHTML = blocks.map((block, index) => `<button class="hotbar-slot ${index === selectedBlock ? 'selected' : ''}" data-slot="${index}" title="${block.name}"><i style="--block-color:${block.color}"></i>${index + 1} ${block.name}</button>`).join('');
  $$('.hotbar-slot').forEach(button => button.addEventListener('click', () => selectBlock(Number(button.dataset.slot))));
}
function selectBlock(index) {
  selectedBlock = (index + blocks.length) % blocks.length;
  $$('.hotbar-slot').forEach(button => button.classList.toggle('selected', Number(button.dataset.slot) === selectedBlock));
}
function startGame(world) {
  if (!world) world = worlds[0];
  buildWorld(world);
  isGameActive = true;
  $('#gameMenu').classList.add('hidden');
  $('#chatPanel').classList.add('hidden');
  $('#gameHud').classList.remove('hidden');
  gameCanvas.classList.add('active');
  document.body.classList.add('in-game');
  controls.lock();
}
function showGameMenu() {
  if (!isGameActive) return;
  $('#gameMenu').classList.remove('hidden');
  if (controls.isLocked) controls.unlock();
}
function leaveGame() {
  isGameActive = false;
  if (controls.isLocked) controls.unlock();
  $('#gameHud').classList.add('hidden');
  $('#gameMenu').classList.add('hidden');
  gameCanvas.classList.remove('active');
  document.body.classList.remove('in-game');
  homeView.classList.remove('hidden');
  showPage('play');
}
controls.addEventListener('unlock', () => {
  if (isGameActive && !settingsDialog.open) $('#gameMenu').classList.remove('hidden');
});
controls.addEventListener('lock', () => $('#gameMenu').classList.add('hidden'));

function targetedBlock() {
  raycaster.setFromCamera(center, camera);
  return raycaster.intersectObjects(worldGroup.children, false)[0] || null;
}
function interact(event) {
  if (!controls.isLocked || !isGameActive) return;
  const hit = targetedBlock();
  if (!hit) return;
  if (event.button === 0) {
    removeBlock(hit.object);
    return;
  }
  if (event.button === 2) {
    const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    const point = hit.object.position.clone().add(normal);
    const position = new THREE.Vector3(Math.round(point.x), Math.round(point.y), Math.round(point.z));
    if (camera.position.distanceTo(position) < 1.8) return;
    if (addBlock(position.x, position.y, position.z, selectedBlock, true)) showToast(`${blocks[selectedBlock].name} placed.`);
  }
}
window.addEventListener('contextmenu', event => { if (isGameActive) event.preventDefault(); });
window.addEventListener('mousedown', interact);
window.addEventListener('keydown', event => {
  keys.add(event.code);
  if (event.code === 'Escape' && isGameActive) { event.preventDefault(); showGameMenu(); }
  if (/^[1-6]$/.test(event.key)) selectBlock(Number(event.key) - 1);
  if (event.code === 'KeyE' && isGameActive && !$('#chatPanel').classList.contains('hidden')) $('#chatInput').focus();
  if (event.code === 'Space' && controls.isLocked) event.preventDefault();
});
window.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => keys.clear());

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), .05);
  if (controls.isLocked && isGameActive) {
    const speed = 5.2 * delta * save.sensitivity;
    if (keys.has('KeyW')) controls.moveForward(speed);
    if (keys.has('KeyS')) controls.moveForward(-speed);
    if (keys.has('KeyA')) controls.moveRight(-speed);
    if (keys.has('KeyD')) controls.moveRight(speed);
    const jumpDown = keys.has('Space');
    if (jumpDown && !jumpWasDown && grounded) { velocityY = 7.1; grounded = false; }
    jumpWasDown = jumpDown;
    velocityY -= 18 * delta;
    camera.position.y += velocityY * delta;
    const groundY = currentWorld.id === 'cloudline' ? -.9 : terrainHeight(Math.round(camera.position.x), Math.round(camera.position.z)) + 1.72;
    if (camera.position.y < groundY) { camera.position.y = groundY; velocityY = 0; grounded = true; }
    if (camera.position.y < -15) {
      camera.position.set(0, currentWorld.id === 'cloudline' ? 2 : terrainHeight(0, 6) + 2.2, currentWorld.id === 'cloudline' ? 5 : 6);
      velocityY = 0; showToast('Back at the spawn point.');
    }
    if (keys.has('KeyW') || keys.has('KeyA') || keys.has('KeyS') || keys.has('KeyD')) {
      if (performance.now() - lastStep > 300) { lastStep = performance.now(); }
    }
  }
  worldTime += delta;
  sun.position.x = Math.cos(worldTime * .025) * 24;
  sun.position.y = 21 + Math.sin(worldTime * .025) * 7;
  for (const creature of creatures) {
    const data = creature.userData;
    creature.position.x = data.origin.x + Math.sin(worldTime * data.speed + data.phase) * 1.7;
    creature.position.z = data.origin.z + Math.cos(worldTime * data.speed * .7 + data.phase) * 1.4;
    creature.position.y = data.origin.y + Math.abs(Math.sin(worldTime * 2 + data.phase)) * .13;
    creature.rotation.y = Math.sin(worldTime * data.speed + data.phase) * .2;
  }
  renderer.render(scene, camera);
}
animate();
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
