// =========================================================
// ANIMATIONS GÉNÉRALES (scroll reveal + smooth scroll)
// =========================================================

const revealElements = document.querySelectorAll('.reveal');
const revealOnScroll = () => {
    const windowHeight = window.innerHeight;
    revealElements.forEach((reveal) => {
        const elementTop = reveal.getBoundingClientRect().top;
        if (elementTop < windowHeight - 100) reveal.classList.add('active');
    });
};
window.addEventListener('scroll', revealOnScroll);
revealOnScroll();

function smoothScrollTo(targetId) {
    const target = document.getElementById(targetId);
    if (!target) return;
    const targetPosition = target.getBoundingClientRect().top + window.scrollY;
    const startPosition = window.scrollY;
    const distance = targetPosition - startPosition;
    const duration = 1500;
    let startTime = null;
    function animation(currentTime) {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const run = ease(Math.min(timeElapsed / duration, 1));
        window.scrollTo(0, startPosition + (distance * run));
        if (timeElapsed < duration) requestAnimationFrame(animation);
    }
    requestAnimationFrame(animation);
}

// =========================================================
// TIMELINE (expand / collapse)
// =========================================================

const timelineItems = document.querySelectorAll('.timeline-item');
timelineItems.forEach(item => {
    item.addEventListener('click', () => {
        item.classList.toggle('expanded');
    });
});

// =========================================================
// RÉSEAU DE NEURONES 3D (Three.js)
// =========================================================

// Shockwave click system — smooth bell-curve boost
let shockwaveT  = -1;   // -1 = inactive, 0→1 = active
let shockwaveFrame = 0;
const SHOCKWAVE_DUR = 75; // frames (~1.25s at 60fps)
let heroClickBoost = 0;   // derived each frame from shockwaveT

function handleClickHero(e) {
    e.preventDefault();
    shockwaveFrame = 0;
    shockwaveT = 0;
    smoothScrollTo('about');
}

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// --- Scene setup ---
const neuralCanvas = document.getElementById('neural-canvas');
const neuralScene = new THREE.Scene();
const neuralGroup = new THREE.Group();
neuralScene.add(neuralGroup);

const neuralCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
neuralCamera.position.z = 8;

const neuralRenderer = new THREE.WebGLRenderer({ canvas: neuralCanvas, antialias: true, alpha: true });
neuralRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
neuralRenderer.setClearColor(0x000000, 0);

// --- Node layout: 7 layers [1,6,9,12,9,6,1] — single I/O nodes + hidden cube ---
const LAYER_COUNTS = [1, 6, 9, 12, 9, 6, 1];
const LAYER_GRID = [
    { rows: 1, cols: 1 },
    { rows: 2, cols: 3 },
    { rows: 3, cols: 3 },
    { rows: 4, cols: 3 },
    { rows: 3, cols: 3 },
    { rows: 2, cols: 3 },
    { rows: 1, cols: 1 },
];
const X_SPAN = 6.0;
const NODE_Y_STEP = 1.2;
const NODE_Z_STEP = 1.45;
const allNodePositions = [];
const positionsByLayer = [];

LAYER_COUNTS.forEach((count, li) => {
    const layerPositions = [];
    const x = (li / (LAYER_COUNTS.length - 1)) * X_SPAN - X_SPAN / 2;
    const { rows, cols } = LAYER_GRID[li];
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const y = (row - (rows - 1) / 2) * NODE_Y_STEP;
            const z = (col - (cols - 1) / 2) * NODE_Z_STEP;
            const pos = new THREE.Vector3(x, y, z);
            allNodePositions.push(pos);
            layerPositions.push(pos);
        }
    }
    positionsByLayer.push(layerPositions);
});

// --- Node meshes ---
const nodeObjects = [];
let cumCount = 0;
LAYER_COUNTS.forEach((count, li) => {
    const isSingle = count === 1;
    const isEdgeGroup = li === 1 || li === LAYER_COUNTS.length - 2;
    const color = isSingle ? 0x38bdf8 : isEdgeGroup ? 0x38bdf8 : 0x818cf8;
    const radius = isSingle ? 0.09 : 0.055;
    for (let i = 0; i < count; i++) {
        const pos = allNodePositions[cumCount + i];
        const geo = new THREE.SphereGeometry(radius, 12, 12);
        const mat = new THREE.MeshBasicMaterial({ color });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        neuralGroup.add(mesh);
        nodeObjects.push({ mesh, pulseOffset: Math.random() * Math.PI * 2, isSingle });
    }
    cumCount += count;
});

// --- Full connections: each node → 4 nearest in next layer ---
const connectionObjects = [];
const CONNS_PER_NODE = 4;

positionsByLayer.forEach((layerA, li) => {
    if (li >= positionsByLayer.length - 1) return;
    const layerB = positionsByLayer[li + 1];

    layerA.forEach(posA => {
        const sorted = [...layerB].sort((a, b) => posA.distanceTo(a) - posA.distanceTo(b));
        const numConn = Math.min(CONNS_PER_NODE, layerB.length);

        sorted.slice(0, numConn).forEach(posB => {
            const lineGeo = new THREE.BufferGeometry().setFromPoints([posA.clone(), posB.clone()]);
            const lineMat = new THREE.LineBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0.08 });
            const line = new THREE.Line(lineGeo, lineMat);
            neuralGroup.add(line);

            // Sparse particles — ~35% of edges
            const edgeParticles = [];
            if (Math.random() < 0.35) {
                const pgeo = new THREE.SphereGeometry(0.022, 8, 8);
                const pColor = Math.random() > 0.5 ? 0x38bdf8 : 0xa78bfa;
                const pmat = new THREE.MeshBasicMaterial({ color: pColor });
                const pmesh = new THREE.Mesh(pgeo, pmat);
                const t0 = Math.random();
                pmesh.position.lerpVectors(posA, posB, t0);
                neuralGroup.add(pmesh);
                edgeParticles.push({
                    mesh: pmesh, t: t0,
                    baseSpeed: 0.003 + Math.random() * 0.004,
                    posA, posB
                });
            }
            connectionObjects.push({ line, edgeParticles });
        });
    });
});

// --- Mouse + rotation state ---
// neuralMouseNX/NY: relative to full window (for vertical tilt)
// neuralMouseRelX: relative to the neural panel center (for horizontal rotation)
let neuralMouseNX = 0, neuralMouseNY = 0, neuralMouseRelX = 0;
let neuralVelY = 0;    // vitesse angulaire Y (rad/frame)
let neuralAngleY = 0;  // angle accumulé libre — rotation complète possible
let neuralRotX = 0;    // tilt X (limité)
let heroRightRect = null;
// Cursor halo position (in heroBgCanvas coords)
let heroBgMouseX = -2000, heroBgMouseY = -2000;

function updateHeroRightRect() {
    const el = document.querySelector('.hero-right');
    if (el) heroRightRect = el.getBoundingClientRect();
}

window.addEventListener('mousemove', (e) => {
    neuralMouseNX = (e.clientX / window.innerWidth) * 2 - 1;
    neuralMouseNY = -((e.clientY / window.innerHeight) * 2 - 1);
    // Mouse relative to the neural panel center → equal range left/right
    if (heroRightRect) {
        const panelCX = (heroRightRect.left + heroRightRect.right) / 2;
        neuralMouseRelX = Math.max(-1, Math.min(1,
            (e.clientX - panelCX) / (heroRightRect.width / 2)
        ));
    } else {
        neuralMouseRelX = neuralMouseNX;
    }
    // Track mouse relative to hero canvas
    if (heroBgCanvas) {
        const rect = heroBgCanvas.getBoundingClientRect();
        heroBgMouseX = e.clientX - rect.left;
        heroBgMouseY = e.clientY - rect.top;
    }
});

// --- Per-particle mouse proximity boost ---
function getParticleBoost(particleMesh) {
    if (!heroRightRect) return 1;
    const worldPos = particleMesh.position.clone();
    worldPos.applyMatrix4(neuralGroup.matrixWorld);
    const v = worldPos.clone().project(neuralCamera);

    const screenX = (v.x + 1) / 2 * heroRightRect.width + heroRightRect.left;
    const screenY = (-v.y + 1) / 2 * heroRightRect.height + heroRightRect.top;
    const mx = (neuralMouseNX + 1) / 2 * window.innerWidth;
    const my = (-neuralMouseNY + 1) / 2 * window.innerHeight;

    const dist = Math.sqrt((screenX - mx) ** 2 + (screenY - my) ** 2);
    const threshold = 180;
    if (dist > threshold) return 1;
    return 1 + (1 - dist / threshold) * 3.5;
}

// --- Canvas resize ---
function resizeNeuralCanvas() {
    const el = document.querySelector('.hero-right');
    if (!el) return;
    const w = Math.max(1, el.clientWidth);
    const h = Math.max(1, el.clientHeight);
    neuralRenderer.setSize(w, h);
    neuralCamera.aspect = w / h;
    neuralCamera.updateProjectionMatrix();
    updateHeroRightRect();
}

// --- Neural animate ---
function animateNeural(timestamp) {
    // Rotation Y : vitesse angulaire pilotée par la souris, friction pour la douceur
    if (!prefersReducedMotion) {
        neuralVelY += neuralMouseRelX * 0.0011; // accélération proportionnelle au curseur
        neuralVelY *= 0.93;                      // friction — décélère naturellement au centre
        neuralAngleY += neuralVelY;              // angle libre : 360° complets possibles
    }
    // Tilt X suivi doux de la souris (limité ±25°)
    const targetRotX = -neuralMouseNY * 0.28;
    neuralRotX += (targetRotX - neuralRotX) * 0.05;

    neuralGroup.rotation.x = neuralRotX;
    neuralGroup.rotation.y = neuralAngleY;
    neuralGroup.updateMatrixWorld();

    // Pulse nodes — spring-like scale on click, gentle idle pulse
    const t = timestamp * 0.001;
    const clickSpring = heroClickBoost > 0
        ? Math.pow(Math.sin(heroClickBoost * Math.PI), 0.6) * 1.4
        : 0;
    nodeObjects.forEach(n => {
        const idlePulse = n.isSingle ? 0.3 : 0.18;
        const s = (1 + Math.sin(t + n.pulseOffset) * idlePulse) + clickSpring;
        n.mesh.scale.setScalar(Math.max(0.1, s));
    });

    // Animate data-flow particles
    connectionObjects.forEach(conn => {
        conn.edgeParticles.forEach(p => {
            const proximityBoost = prefersReducedMotion ? 1 : getParticleBoost(p.mesh);
            const clickSpeedBoost = 1 + heroClickBoost * 4;
            p.t += p.baseSpeed * proximityBoost * clickSpeedBoost;
            if (p.t > 1) p.t = 0;
            p.mesh.position.lerpVectors(p.posA, p.posB, p.t);
        });
    });

    neuralRenderer.render(neuralScene, neuralCamera);
}

// =========================================================
// CANVAS HERO BG — CONSTELLATION (particules + connexions)
// =========================================================

const heroBgCanvas = document.getElementById('hero-bg-canvas');
const heroBgCtx = heroBgCanvas.getContext('2d');
let heroBgParticles = [];
const HERO_BG_COUNT = 80;
const HERO_BG_CONNECT_DIST = 115;

// Ambient glow blobs — slow-drifting radial light fields
const AMBIENT_BLOBS = [
    { bx: 0.72, by: 0.35, r: 300, hue: 195, drift: 0.31 },
    { bx: 0.28, by: 0.65, r: 220, hue: 248, drift: 0.19 },
    { bx: 0.52, by: 0.50, r: 260, hue: 215, drift: 0.25 },
];
let blobTime = 0;

class HeroBgParticle {
    constructor() { this.reset(true); }
    reset(initial = false) {
        this.x = Math.random() * heroBgCanvas.width;
        this.y = initial
            ? Math.random() * heroBgCanvas.height
            : (Math.random() < 0.5 ? -5 : heroBgCanvas.height + 5);
        this.vx = (Math.random() - 0.5) * 0.38;
        this.vy = (Math.random() - 0.5) * 0.38;
        this.baseSize = Math.random() * 2.0 + 0.4;
        this.hue = Math.floor(Math.random() * 70) + 185;
        this.alpha = Math.random() * 0.5 + 0.2;
        this.twinkleSpeed = Math.random() * 0.018 + 0.006; // slower = subtler
        this.twinkleOffset = Math.random() * Math.PI * 2;
    }
    update(boost, t) {
        // Cursor repulsion — gentle push away
        if (heroBgMouseX > -1000) {
            const dx = this.x - heroBgMouseX;
            const dy = this.y - heroBgMouseY;
            const distSq = dx * dx + dy * dy;
            const repR = 110;
            if (distSq < repR * repR && distSq > 1) {
                const dist = Math.sqrt(distSq);
                const force = (1 - dist / repR) * 0.28;
                this.vx += (dx / dist) * force;
                this.vy += (dy / dist) * force;
            }
        }
        // Velocity damping + boost
        this.vx *= 0.988;
        this.vy *= 0.988;
        const speed = 1 + boost * 2.2;
        this.x += this.vx * speed;
        this.y += this.vy * speed;
        if (this.x < -10 || this.x > heroBgCanvas.width + 10 ||
            this.y < -10 || this.y > heroBgCanvas.height + 10) {
            this.reset();
        }
        // Subtle twinkle — amplitude reduced
        this.currentAlpha = this.alpha * (0.88 + 0.12 * Math.sin(t * this.twinkleSpeed + this.twinkleOffset));
    }
    draw(boost) {
        const s = this.baseSize * (1 + boost * 1.0);
        const a = this.currentAlpha + boost * 0.14;
        heroBgCtx.beginPath();
        heroBgCtx.arc(this.x, this.y, s, 0, Math.PI * 2);
        heroBgCtx.fillStyle = `hsla(${this.hue}, 100%, 72%, ${a})`;
        heroBgCtx.fill();
        // Glow halo on larger particles only
        if (this.baseSize > 1.5) {
            const grad = heroBgCtx.createRadialGradient(this.x, this.y, 0, this.x, this.y, s * 3.2);
            grad.addColorStop(0, `hsla(${this.hue}, 100%, 75%, ${a * 0.2})`);
            grad.addColorStop(1, `hsla(${this.hue}, 100%, 75%, 0)`);
            heroBgCtx.fillStyle = grad;
            heroBgCtx.beginPath();
            heroBgCtx.arc(this.x, this.y, s * 3.2, 0, Math.PI * 2);
            heroBgCtx.fill();
        }
    }
}

function initHeroBg() {
    heroBgCanvas.width = window.innerWidth;
    heroBgCanvas.height = document.querySelector('.hero').offsetHeight || window.innerHeight;
    heroBgParticles = Array.from({ length: HERO_BG_COUNT }, () => new HeroBgParticle());
}

function animateHeroBg(t) {
    const boost = heroClickBoost;
    heroBgCtx.clearRect(0, 0, heroBgCanvas.width, heroBgCanvas.height);

    if (!prefersReducedMotion) blobTime += 0.0008;
    const W = heroBgCanvas.width, H = heroBgCanvas.height;

    // Ambient glow blobs
    AMBIENT_BLOBS.forEach((blob, i) => {
        const cx = (blob.bx + Math.sin(blobTime * blob.drift + i * 2.09) * 0.13) * W;
        const cy = (blob.by + Math.cos(blobTime * blob.drift + i * 1.67) * 0.10) * H;
        const radius = blob.r * (1 + boost * 0.4);
        const grad = heroBgCtx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0,    `hsla(${blob.hue}, 90%, 62%, ${0.10 + boost * 0.06})`);
        grad.addColorStop(0.45, `hsla(${blob.hue}, 85%, 58%, ${0.04 + boost * 0.025})`);
        grad.addColorStop(1,    `hsla(${blob.hue}, 80%, 55%, 0)`);
        heroBgCtx.fillStyle = grad;
        heroBgCtx.fillRect(0, 0, W, H);
    });

    // Shockwave rings — expand from neural network center on click
    if (shockwaveT >= 0 && heroRightRect) {
        const heroBgRect = heroBgCanvas.getBoundingClientRect();
        const cx = heroRightRect.left + heroRightRect.width  / 2 - heroBgRect.left;
        const cy = heroRightRect.top  + heroRightRect.height / 2 - heroBgRect.top;
        const maxR = Math.max(heroRightRect.width, heroRightRect.height) * 0.9;

        // Two staggered rings
        [[1.0, 0.0], [0.72, 0.12]].forEach(([scale, delay]) => {
            const pt = Math.max(0, (shockwaveT - delay) / (1 - delay));
            if (pt <= 0 || pt > 1) return;
            const eased = 1 - Math.pow(1 - pt, 2.8);
            const r     = eased * maxR * scale;
            const alpha = Math.pow(1 - pt, 1.8) * 0.6;
            const lw    = (1 - pt) * 2.5 + 0.3;
            heroBgCtx.beginPath();
            heroBgCtx.arc(cx, cy, r, 0, Math.PI * 2);
            heroBgCtx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
            heroBgCtx.lineWidth = lw;
            heroBgCtx.stroke();
        });
    }

    // Connexions entre particules proches
    for (let i = 0; i < heroBgParticles.length; i++) {
        for (let j = i + 1; j < heroBgParticles.length; j++) {
            const dx = heroBgParticles[i].x - heroBgParticles[j].x;
            const dy = heroBgParticles[i].y - heroBgParticles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < HERO_BG_CONNECT_DIST) {
                const op = (1 - dist / HERO_BG_CONNECT_DIST) * (0.11 + boost * 0.10);
                heroBgCtx.strokeStyle = `rgba(129, 140, 248, ${op})`;
                heroBgCtx.lineWidth = 0.55;
                heroBgCtx.beginPath();
                heroBgCtx.moveTo(heroBgParticles[i].x, heroBgParticles[i].y);
                heroBgCtx.lineTo(heroBgParticles[j].x, heroBgParticles[j].y);
                heroBgCtx.stroke();
            }
        }
    }

    heroBgParticles.forEach(p => { p.update(boost, t); p.draw(boost); });

    // Réticule de scan — curseur stylisé (scan-target)
    if (heroBgMouseX > -1000 && !prefersReducedMotion) {
        const ts = t * 0.001;
        const pulse   = Math.sin(ts * 2.8) * 0.12;
        const innerR  = 26 * (1 + pulse) + boost * 12;
        const outerR  = 54 + boost * 22;
        const alphaI  = 0.28 + boost * 0.22;
        const alphaO  = 0.14 + boost * 0.14;
        const mx = heroBgMouseX, my = heroBgMouseY;

        heroBgCtx.save();

        // Diffuse glow derrière le réticule
        const glow = heroBgCtx.createRadialGradient(mx, my, outerR * 0.5, mx, my, outerR * 2.2);
        glow.addColorStop(0, `rgba(129, 140, 248, ${alphaO * 0.35})`);
        glow.addColorStop(1, `rgba(129, 140, 248, 0)`);
        heroBgCtx.fillStyle = glow;
        heroBgCtx.beginPath();
        heroBgCtx.arc(mx, my, outerR * 2.2, 0, Math.PI * 2);
        heroBgCtx.fill();

        // Anneau extérieur
        heroBgCtx.beginPath();
        heroBgCtx.arc(mx, my, outerR, 0, Math.PI * 2);
        heroBgCtx.strokeStyle = `rgba(129, 140, 248, ${alphaO})`;
        heroBgCtx.lineWidth = 0.8;
        heroBgCtx.stroke();

        // Anneau intérieur
        heroBgCtx.beginPath();
        heroBgCtx.arc(mx, my, innerR, 0, Math.PI * 2);
        heroBgCtx.strokeStyle = `rgba(56, 189, 248, ${alphaI})`;
        heroBgCtx.lineWidth = 1.4;
        heroBgCtx.stroke();

        // Croix — segments courts aux 4 directions
        const gap = innerR + 4;
        const len = 10 + boost * 6;
        heroBgCtx.strokeStyle = `rgba(56, 189, 248, ${alphaI * 0.7})`;
        heroBgCtx.lineWidth = 0.9;
        [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => {
            heroBgCtx.beginPath();
            heroBgCtx.moveTo(mx + dx * gap,       my + dy * gap);
            heroBgCtx.lineTo(mx + dx * (gap + len), my + dy * (gap + len));
            heroBgCtx.stroke();
        });

        // Point central
        heroBgCtx.beginPath();
        heroBgCtx.arc(mx, my, 2 + boost * 2.5, 0, Math.PI * 2);
        heroBgCtx.fillStyle = `rgba(56, 189, 248, ${alphaI * 1.3})`;
        heroBgCtx.fill();

        heroBgCtx.restore();
    }
}

// =========================================================
// CANVAS 2 — ÉTOILES DE FOND
// =========================================================

const bgCanvas = document.getElementById('bg-stars');
const bgCtx = bgCanvas.getContext('2d');
let bgStarsArray = [];

class Star {
    constructor() {
        this.x = Math.random() * bgCanvas.width;
        this.y = Math.random() * bgCanvas.height;
        this.size = Math.random() * 1.5;
        this.baseAlpha = Math.random();
        this.speedAlpha = Math.random() * 0.02 + 0.005;
        this.increasing = true;
        // Couleur aléatoire entre Cyan (190) et Violet (250)
        this.hue = Math.floor(Math.random() * 60) + 190;
    }
    draw() {
        bgCtx.fillStyle = `hsla(${this.hue}, 100%, 70%, ${this.baseAlpha})`;
        bgCtx.beginPath();
        bgCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        bgCtx.fill();
    }
    update() {
        if (this.increasing) {
            this.baseAlpha += this.speedAlpha;
            if (this.baseAlpha >= 1) this.increasing = false;
        } else {
            this.baseAlpha -= this.speedAlpha;
            if (this.baseAlpha <= 0.1) {
                this.increasing = true;
                this.x = Math.random() * bgCanvas.width;
                this.y = Math.random() * bgCanvas.height;
                this.hue = Math.floor(Math.random() * 60) + 190;
            }
        }
        this.draw();
    }
}

function initBgStars() {
    bgStarsArray = [];
    for (let i = 0; i < 80; i++) {
        bgStarsArray.push(new Star());
    }
}

// =========================================================
// BOUCLE D'ANIMATION PRINCIPALE
// =========================================================

function resizeCanvases() {
    bgCanvas.width = window.innerWidth;
    bgCanvas.height = window.innerHeight;
    initBgStars();
    initHeroBg();
    resizeNeuralCanvas();
}

// --- Hero parallax on scroll ---
const heroSplitEl = document.querySelector('.hero-split');
const heroEl = document.querySelector('.hero');
window.addEventListener('scroll', () => {
    if (!heroEl || !heroSplitEl) return;
    const scrollY = window.scrollY;
    const heroH = heroEl.offsetHeight;
    if (scrollY < heroH) {
        const p = scrollY / heroH;
        const ease = 1 - Math.pow(1 - p, 2);
        heroSplitEl.style.transform = `translateY(${ease * -35}px)`;
        heroSplitEl.style.opacity = Math.max(0, 1 - p * 2.2);
    } else {
        heroSplitEl.style.opacity = '0';
    }
}, { passive: true });

function animate(timestamp) {
    // Update shockwave progress
    if (shockwaveT >= 0) {
        shockwaveFrame++;
        shockwaveT = shockwaveFrame / SHOCKWAVE_DUR;
        if (shockwaveT > 1) shockwaveT = -1;
    }
    // Smooth boost curve: 0 → peak → 0 (bell curve)
    heroClickBoost = shockwaveT >= 0
        ? Math.pow(Math.sin(shockwaveT * Math.PI), 0.65)
        : 0;

    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    for (let i = 0; i < bgStarsArray.length; i++) {
        bgStarsArray[i].update();
    }

    animateHeroBg(timestamp);
    animateNeural(timestamp);

    requestAnimationFrame(animate);
}

window.addEventListener('resize', resizeCanvases);
resizeCanvases();
animate(0);

// =========================================================
// INTERNATIONALISATION (i18n) EN / FR
// =========================================================

let currentLang = localStorage.getItem('lang') || 'en';

const translations = {
    fr: {
        // Nav
        'nav.home': 'Accueil',
        'nav.about': 'À propos',
        'nav.skills': 'Compétences',
        'nav.experience': 'Expérience',
        'nav.education': 'Formation',
        'nav.projects': 'Projets',
        'nav.contact': 'Contact/CV',
        // Hero
        'hero.subtitle': 'Ingénieur Machine Learning (IA & Systèmes Logiciels)',
        'hero.btn': 'Découvrir mon profil',
        // About
        'about.title': 'À propos',
        'about.p1': 'Diplômé ingénieur spécialisé en Data Science et Intelligence Artificielle, je recherche ma première opportunité professionnelle à partir de février 2026, à la suite de mon stage de fin d\'études.',
        'about.p2': 'Mon parcours hybride m\'a permis de mener divers projets concrets en Computer Vision, NLP, systèmes RAG (Retrieval-Augmented Generation) et classification.',
        'about.p3': 'Curieux et motivé, je suis impatient de mettre mes compétences en Data Science au service de défis variés et concrets.',
        'about.location': 'Boulogne Billancourt (92100)',
        // Skills
        'skills.title': 'Compétences',
        'skills.ai': 'IA & Data Science',
        'skills.programming': 'Programmation',
        'skills.office': 'Bureautique & Autres',
        'skills.french': 'Français (Natif)',
        'skills.english': 'Anglais (C1)',
        'skills.spanish': 'Espagnol (B2)',
        'skills.japanese': 'Japonais (A1)',
        'skills.driving': 'Permis B - Véhiculé',
        // Experience
        'exp.title': 'Expérience',
        'exp.dassault.date': 'Mars 2025 - Sept 2025 (6 mois)',
        'exp.dassault.role': 'Stagiaire Data Scientist – Intelligence Artificielle',
        'exp.dassault.desc': '<li>Développement et déploiement de solutions IA pour améliorer la performance de la Direction des Achats.</li><li>Mise en place de modèles de classification (arbres de décision, gradient boosting, réseaux de neurones), extraction de données via OCR, et développement de programmes pour simplifier les processus.</li><li>Travail sur des projets LLM, notamment la mise en œuvre de systèmes RAG (et auto-RAG) pour faciliter l\'accès à l\'information et optimiser la prise de décision.</li><li>Outil conteneurisé et déployé via Docker, avec une interface simple (Streamlit) accessible via navigateur web.</li><li>Web scraping (avec Selenium) pour alimenter les bases de connaissances.</li><li>Présentation des résultats dans Power BI lié aux données Dassault via des requêtes SQL.</li>',
        'exp.mgf.date': 'Mai 2024 - Août 2024 (3 mois)',
        'exp.mgf.role': 'Stagiaire Ingénieur Conception CAO',
        'exp.mgf.desc': '<li>Stage de 3 mois en tant qu\'ingénieur assistant au Bureau des Méthodes chez MGF Grimaldi :<br>- Création de montages adaptés à l\'usinage de haute précision (SolidWorks)<br>- Reproduction de pièces en 3D<br>- Impression 3D de pièces/prototypes<br>- Lecture/Création de plans</li>',
        'exp.je.date': 'Décembre 2022 - Mai 2024 (1,5 ans)',
        'exp.je.role': 'Chargé d\'Affaires',
        'exp.je.desc': '<li>Chargé d\'affaires et chef de projet au sein de la Junior-Entreprise de l\'école.<br>- Définir et piloter les études soumises par les entreprises à notre Junior-Entreprise.<br>- Gérer les phases administratives : cadrage, proposition, budgétisation, signature...<br>- Manager des équipes de consultants.<br>- Gérer des parties prenantes aux profils et attentes variés.<br>- Participation au Congrès National des Junior-Entrepreneurs.</li>',
        'exp.tecumseh.date': 'Janvier 2023 - Février 2023 (1 mois)',
        'exp.tecumseh.role': 'Stagiaire Opérateur de Production',
        'exp.tecumseh.desc': '<li>Stage en tant qu\'opérateur de production :<br>- Production sur différentes machines de l\'atelier d\'usinage.<br>- Contrôle qualité des pièces.<br>- Maintenance des machines.</li>',
        // Education
        'edu.title': 'Formation',
        'edu.mines.date': 'Septembre 2022 - Octobre 2025',
        'edu.mines.role': 'Majeure Data Science & IA - Option Mécanique (Diplôme d\'ingénieur)',
        'edu.mines.desc': '<strong>3ème année – Majeure Data Science :</strong><br>Cours : Fondements probabilistes, apprentissage statistique, machine learning, métamodélisation et optimisation, intelligence artificielle.<br>Projets : Détection de piétons pour Thales via ML, reconstruction d\'images bruitées par radiation via deep learning.<br><br><strong>2ème année :</strong><br>Cours : Semestre à Seoul National University, management de la transition.<br>Électifs : Entrepreneuriat, économie, design thinking.<br>Projet : Conception CAO d\'un module autonome de production et d\'élevage.<br><br><strong>1ère année – Tronc commun :</strong><br>Cours : Physique (matériaux, thermodynamique, mécanique des fluides, mécanique des milieux continus), Informatique (C, Java, Python, SQL, algorithmique), Mathématiques (statistiques, RO, traitement du signal), marketing, économie, droit des sociétés, développement durable.<br>Projets : Étude d\'une centrale solaire (logiciel PRO II), conception d\'un véhicule à énergie mécanique, création d\'une app pour l\'association HPSE.',
        'edu.snu.date': 'Septembre 2023 - Janvier 2024',
        'edu.snu.role': 'Échange International (6 mois)',
        'edu.snu.desc': 'Semestre d\'échange académique au département de Génie Mécanique :<br>- Analyse numérique en génie mécanique<br>- Mécanique des robots<br>- Finance de marché',
        'edu.vaucanson.name': 'Lycée Vaucanson (Grenoble)',
        'edu.vaucanson.date': 'Septembre 2020 - Juillet 2022',
        'edu.vaucanson.role': 'Classes Préparatoires Scientifiques PTSI-PT*',
        'edu.vaucanson.desc': 'Fondamentaux dans les domaines de l\'ingénierie (Mathématiques, Physique, Sciences de l\'Ingénieur, Informatique) pour préparer les concours d\'entrée aux Grandes Écoles.',
        // Projects
        'proj.title': 'Projets',
        'proj.music.date': 'Mai 2025 - Présent',
        'proj.music.role': 'Application de Recommandation Musicale (Dev & IA)',
        'proj.music.desc': '<li>Développement en React (avec Expo), mise en place du backend, et test d\'algorithmes de recommandation (similarité, clustering). Réflexion UI/UX et implémentation du système complet de recommandation. Gestion du cache/données de l\'app et des pipelines de données.</li>',
        'proj.trading.date': 'Janvier 2026 - Présent',
        'proj.trading.role': 'Agent de Trading Crypto Autonome (Deep Reinforcement Learning)',
        'proj.trading.desc': '<li>Conception et développement d\'un agent de trading autonome utilisant le Deep Reinforcement Learning (PPO/SAC, PyTorch, Stable-Baselines3).</li><li>Construction d\'un environnement Gym personnalisé avec espace d\'action continu, support multi-actifs (10 paires crypto) et randomisation de domaine.</li><li>Implémentation d\'une fonction de récompense multi-composantes (log-return, pénalité de drawdown, alignement de tendance, PnL latent).</li><li>Pipeline de données avec feature engineering multi-timeframe (1H/4H/1D/1W), normalisation z-score glissante et intégration de sentiment.</li><li>Entraînement progressif via curriculum learning avec traitement par batch optimisé GPU (CUDA).</li>',
        'proj.research.date': 'Janvier 2025 - Mars 2025',
        'proj.research.role': 'Projet de Recherche (École des Mines)',
        'proj.research.desc': '<li>Développement et entraînement d\'un modèle de deep learning pour débruiter des images endommagées par des radiations ionisantes (réacteur nucléaire). Utilisation de réseaux encodeur-décodeur et reproduction de bruit pour générer des données d\'entraînement. Rédaction d\'un article de recherche et d\'un poster pour présenter les résultats.</li>',
        'proj.thales.date': 'Sept 2024 - Jan 2025',
        'proj.thales.role': 'Projet Industriel (École des Mines)',
        'proj.thales.desc': '<li>Entraînement d\'une IA de classification d\'images contrainte pour la détection infrarouge de piétons. Benchmarking de modèles existants et entraînement de modèles CNN avec TensorFlow et PyTorch (MobileNet et YOLO). Tests et analyse des métriques d\'évaluation et d\'entraînement. Entraînement des modèles sur cluster Linux avec gestion des ressources GPU.</li>',
        'proj.fermavers.date': 'Février 2024 - Juin 2024',
        'proj.fermavers.role': 'Programme PRICE (École des Mines)',
        'proj.fermavers.desc': '<li>Développement d\'un outil d\'élevage de larves de mouches soldat noires pour la valorisation des déchets organiques en protéines. Conception du module en CAO (Inventor) et gestion des flux de ressources pour le bien-être des larves.</li>',
        'proj.hepse.date': 'Septembre 2022 - Mai 2023',
        'proj.hepse.role': 'Projet Civique (École des Mines)',
        'proj.hepse.desc': '<li>Développement d\'une application pour promouvoir le patrimoine de Saint-Étienne via une chasse au trésor interactive à travers la ville.</li>',
        'proj.tipe.date': 'Septembre 2020 - Juillet 2022',
        'proj.tipe.role': 'Projet de Classe Préparatoire (TIPE)',
        'proj.tipe.desc': '<li>Étude, simulation et modélisation d\'une pompe à insuline et de son effet sur le corps humain (représenté mécaniquement).</li>',
        // Contact
        'contact.title': 'Me Contacter / CV',
        'contact.resume': 'Mon CV',
        'contact.backtotop': 'Retour en haut',
    }
};

function applyLang(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;

    const btn = document.querySelector('.lang-toggle');
    if (btn) btn.textContent = lang === 'en' ? 'EN' : 'FR';

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (lang === 'fr' && translations.fr[key]) {
            if (!el.dataset.i18nOriginal) el.dataset.i18nOriginal = el.textContent;
            el.textContent = translations.fr[key];
        } else if (lang === 'en' && el.dataset.i18nOriginal) {
            el.textContent = el.dataset.i18nOriginal;
        }
    });

    document.querySelectorAll('[data-i18n-html]').forEach(el => {
        const key = el.getAttribute('data-i18n-html');
        if (lang === 'fr' && translations.fr[key]) {
            if (!el.dataset.i18nOriginalHtml) el.dataset.i18nOriginalHtml = el.innerHTML;
            el.innerHTML = translations.fr[key];
        } else if (lang === 'en' && el.dataset.i18nOriginalHtml) {
            el.innerHTML = el.dataset.i18nOriginalHtml;
        }
    });
}

function toggleLang() {
    applyLang(currentLang === 'en' ? 'fr' : 'en');
}

if (currentLang !== 'en') applyLang(currentLang);
