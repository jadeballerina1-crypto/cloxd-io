import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const SAVE_KEY = 'cloxdio-prototype-v1';
const defaultSave = {
  name: 'Player', coins: 250, xp: 0, placed: 0, color: '#d4f578',
  owned: ['basic'], equipped: 'basic', sensitivity: 1, fov: 75, invert: false,
  selectedWorld: 'frontier'
};
let save;
try { save = { ...defaultSave, ...JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') }; }
catch { save = { ...defaultSave }; }
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
const cosmeticGrid = $('#cosmeticGrid');
const homeView = $('#homeView');
const gameHud = $('#gameHud');
const gameCanvas = $('#gameCanvas');
const settingsDialog = $('#settingsDialog');
const profileDialog = $('#profileDialog');
let currentPage = 'play';
let currentMode = 'CREATIVE';
let currentWorld = worlds[0];
let selectedBlock = 0;
let isGameActive = false;
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
function safeText(value) { return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
function refreshProfile() {
  $('#coinCount').textContent = save.coins;
  $('#avatarInitial').textContent = (save.name || 'P').slice(0,1).toUpperCase();
  $('#shopPlayerName').textContent = save.name;
  $('#profileName').textContent = save.name;
  $('#profileAvatar').textContent = (save.name || 'P').slice(0,1).toUpperCase();
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
  $$('[data-world]').forEach(button => button.addEventListener('click', () => startGame(worlds.find(w => w.id === button.dataset.world))));
}
function renderShop() {
  cosmeticGrid.innerHTML = cosmetics.map(item => {
    const owned = save.owned.includes(item.id);
    const equipped = save.equipped === item.id;
    return `<article class="cosmetic-card"><div class="cosmetic-art">${item.icon}</div><strong>${item.name}</strong><p>${item.description}</p><button class="button ${equipped ? 'primary' : ''}" data-cosmetic="${item.id}">${equipped ? 'Equipped' : owned ? 'Equip' : `${item.price} coins`}</button></article>`;
  }).join('');
  $$('[data-cosmetic]').forEach(button => button.addEventListener('click', () => {
    const item = cosmetics.find(c => c.id === button.dataset.cosmetic);
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
  currentPage = page;
  const shop = page === 'shop';
  const discover = page === 'discover';
  homeView.classList.toggle('hidden', shop || discover);
  $('#shopView').classList.toggle('hidden', !shop);
  $('#discoverView').classList.toggle('hidden', !discover);
  $$('.nav-link').forEach(button => button.classList.toggle('active', button.dataset.page === page));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
renderWorlds(); renderShop(); refreshProfile();
$$('.nav-link').forEach(button => button.addEventListener('click', () => showPage(button.dataset.page)));
$('#playButton').addEventListener('click', () => startGame(worlds.find(w => w.id === save.selectedWorld) || worlds[0]));
$('#communityPlay').addEventListener('click', () => startGame(worlds[0]));
$('#worldsButton').addEventListener('click', () => { $('#worldSection').scrollIntoView({ behavior: 'smooth' }); });
$('#allWorldsButton').addEventListener('click', () => showPage('discover'));
$$('[data-mode]').forEach(button => button.addEventListener('click', () => {
  const mode = button.dataset.mode.toUpperCase();
  startGame(worlds.find(w => w.mode === mode) || worlds[0]);
}));
$('#profileButton').addEventListener('click', () => { refreshProfile(); profileDialog.showModal(); });
$('#saveProfile').addEventListener('click', () => {
  save.name = $('#nameInput').value.trim().slice(0,18) || 'Player';
  store(); refreshProfile(); showToast('Profile saved on this device.');
});
$('#settingsButton').addEventListener('click', () => openSettings());
$('#menuSettingsButton').addEventListener('click', () => { $('#gameMenu').classList.add('hidden'); openSettings(); });
$('#sensitivity').value = save.sensitivity;
$('#fov').value = save.fov;
$('#invertLook').checked = save.invert;
function openSettings() { settingsDialog.showModal(); }
$('#saveSettings').addEventListener('click', () => {
  save.sensitivity = Number($('#sensitivity').value); save.fov = Number($('#fov').value); save.invert = $('#invertLook').checked;
  store(); if (camera) camera.fov = save.fov, camera.updateProjectionMatrix();
  if (isGameActive && !controls.isLocked) controls.lock();
});
$('#exitButton').addEventListener('click', showGameMenu);
$('#backHome').addEventListener('click', showGameMenu);
$('#resumeButton').addEventListener('click', () => controls.lock());
$('#leaveWorldButton').addEventListener('click', leaveGame);
$('#chatToggle').addEventListener('click', () => $('#chatPanel').classList.toggle('hidden'));
$('#closeChat').addEventListener('click', () => $('#chatPanel').classList.add('hidden'));
$('#chatForm').addEventListener('submit', event => {
  event.preventDefault(); const input = $('#chatInput'); const text = input.value.trim(); if (!text) return;
  const line = document.createElement('div'); line.className = 'chat-line';
  const name = document.createElement('b'); name.textContent = save.name.toUpperCase();
  const message = document.createElement('span'); message.textContent = text;
  line.append(name, message); $('#chatMessages').append(line); input.value = '';
  $('#chatMessages').scrollTop = $('#chatMessages').scrollHeight;
});

// Three.js creative sandbox. Worlds, movement and chat are local-only in this first playable build.
const scene = new THREE.Scene();
scene.background = new THREE.Color('#9da7a2');
scene.fog = new THREE.Fog('#9da7a2', 30, 95);
const camera = new THREE.PerspectiveCamera(save.fov, innerWidth / innerHeight, .1, 150);
camera.position.set(0, 1.7, 7);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('#gameCanvas').append(renderer.domElement);
const controls = new PointerLockControls(camera, renderer.domElement);
const hemi = new THREE.HemisphereLight(0xffffff, 0x55575a, 2.1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.1); sun.position.set(16, 24, 10); sun.castShadow = true; sun.shadow.mapSize.set(1024,1024); scene.add(sun);
const worldGroup = new THREE.Group(); scene.add(worldGroup);
const cubeGeometry = new THREE.BoxGeometry(1,1,1);
const blockMaterials = blocks.map(block => new THREE.MeshStandardMaterial({ color: block.color, roughness: .92 }));
const map = new Map();
const keyOf = (x,y,z) => `${x},${y},${z}`;
let activeWorldMaterial = new THREE.MeshStandardMaterial({ color: '#829379', roughness: 1 });
let activeSky = '#9da7a2';
const raycaster = new THREE.Raycaster();
raycaster.far = 7;
const center = new THREE.Vector2(0,0);
const keys = new Set();
let velocityY = 0;
let grounded = true;
let camera;
