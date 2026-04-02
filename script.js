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
    // If a project card is expanded, collapse it first then navigate
    if (typeof window._projCollapseCard === 'function' && typeof window._projExpandedIdx !== 'undefined' && window._projExpandedIdx >= 0) {
        window._projCollapseCard();
        setTimeout(() => smoothScrollTo(targetId), 550);
        return;
    }

    // Align carousel to the correct edge based on nav direction relative to projects
    if (targetId !== 'projects' && typeof window._projSnapTo === 'function') {
        const projEl = document.getElementById('projects');
        const targetEl = document.getElementById(targetId);
        if (projEl && targetEl) {
            const projAbsTop = projEl.getBoundingClientRect().top + window.scrollY;
            const targetAbsTop = targetEl.getBoundingClientRect().top + window.scrollY;
            if (targetAbsTop > projAbsTop) {
                window._projSnapTo(window._projLastIdx);  // below projects → last card
            } else {
                window._projSnapTo(0);                    // above projects → first card
            }
        }
    }

    const target = document.getElementById(targetId);
    if (!target) return;
    const targetPosition = target.getBoundingClientRect().top + window.scrollY;
    const startPosition = window.scrollY;
    const distance = targetPosition - startPosition;
    const duration = 1500;
    let startTime = null;

    window._smoothScrollEndTime = Date.now() + duration + 50;
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
// TIMELINE — new tl-* system
// =========================================================

// Click expand / collapse (new tl-* system — experience)
const tlItems = document.querySelectorAll('.tl-item');
tlItems.forEach(item => {
    item.querySelector('.tl-card').addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        tlItems.forEach(i => i.classList.remove('open'));
        if (!isOpen) item.classList.add('open');
    });
});

// (Legacy timeline click removed — projects now uses carousel)

// Scroll reveal
(function () {
    const tlItems = document.querySelectorAll('#tl-exp .tl-item');
    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
        });
    }, { threshold: .1 });
    tlItems.forEach((el, i) => setTimeout(() => obs.observe(el), i * 160));
    setTimeout(() => tlItems.forEach((el, i) => setTimeout(() => el.classList.add('visible'), 280 + i * 240)), 80);
})();

// Particle system + dot energize + border light sweep
(function () {
    const tlEl = document.getElementById('tl-exp');
    const pCont = document.getElementById('tl-exp-particles');
    if (!tlEl || !pCont) return;

    const DURATION = 6200;

    // Inject card-bg and border-light elements
    document.querySelectorAll('#tl-exp .tl-card').forEach(card => {
        const bg = document.createElement('div');
        bg.className = 'tl-card-bg';
        card.prepend(bg);
        const glow = document.createElement('div');
        glow.className = 'tl-border-light';
        card.appendChild(glow);
    });

    // Create single particle
    const pEl = document.createElement('div');
    pEl.className = 'tl-p';
    pCont.appendChild(pEl);

    let dotData = [];
    let itemData = [];
    let cachedTlH = 0;

    function cachePositions() {
        cachedTlH = tlEl.offsetHeight;
        const tlAbs = tlEl.getBoundingClientRect().top + window.scrollY;
        const tlH = cachedTlH;
        dotData = Array.from(document.querySelectorAll('#tl-exp .tl-marker')).map(marker => {
            const dot = marker.querySelector('.tl-dot');
            const dRect = dot.getBoundingClientRect();
            const dAbs = dRect.top + window.scrollY + dRect.height / 2;
            return { marker, progress: (dAbs - tlAbs) / tlH };
        });
        itemData = Array.from(document.querySelectorAll('#tl-exp .tl-item')).map(item => {
            const rect = item.getBoundingClientRect();
            return {
                item,
                top: rect.top + window.scrollY - tlAbs,
                bottom: rect.top + window.scrollY + rect.height - tlAbs,
                sweeping: false
            };
        });
    }

    setTimeout(cachePositions, 300);
    window.addEventListener('resize', cachePositions);
    document.querySelectorAll('#tl-exp .tl-item').forEach(item => {
        item.addEventListener('click', () => {
            setTimeout(cachePositions, 500);
            setTimeout(cachePositions, 1100);
        });
    });

    const t0 = performance.now();
    let prevEnergized = new Set();
    let tlLoopRAF = null;

    function loop(now) {
        tlLoopRAF = null;
        if (document.hidden) return; // restarted by visibilitychange
        const elapsed = now - t0;
        const tlH = cachedTlH || tlEl.offsetHeight;

        // Move particle
        const t = (elapsed / DURATION) % 1;
        const y = t * tlH;
        let alpha = 1;
        if (t < 0.07) alpha = t / 0.07;
        if (t > 0.93) alpha = (1 - t) / 0.07;
        pEl.style.transform = `translateY(${y}px)`;
        pEl.style.opacity = alpha;

        // Border light sweep
        itemData.forEach(d => {
            if (!d.item.classList.contains('open')) { d.sweeping = false; return; }
            const cardH = d.bottom - d.top;
            const partY = t * tlH;
            const inCard = partY >= d.top - 30 && partY <= d.top + 60;

            if (inCard && !d.sweeping) {
                d.sweeping = true;
                const glowEl = d.item.querySelector('.tl-border-light');
                if (glowEl) {
                    const speed = tlH / (DURATION / 1000);
                    const sweepDur = (cardH / speed) + 0.4;
                    glowEl.style.setProperty('--sweep-duration', sweepDur.toFixed(2) + 's');
                    glowEl.classList.remove('sweeping');
                    void glowEl.offsetHeight;
                    glowEl.classList.add('sweeping');
                }
            } else if (!inCard && d.sweeping && (partY > d.bottom + 100 || partY < d.top - 100)) {
                d.sweeping = false;
            }
        });

        // Energize dots
        const nowEnergized = new Set();
        if (dotData.length) {
            dotData.forEach(({ marker, progress }) => {
                const hit = Math.abs(t - progress) < 0.046;
                if (hit) nowEnergized.add(marker);
                const wasOn = prevEnergized.has(marker);
                if (hit && !wasOn) marker.classList.add('energized');
                if (!hit && wasOn) marker.classList.remove('energized');
            });
        }
        prevEnergized = nowEnergized;
        tlLoopRAF = requestAnimationFrame(loop);
    }
    tlLoopRAF = requestAnimationFrame(loop);

    // Auto-collapse + pause loop when section leaves viewport
    const section = document.getElementById('experience');
    if (section) {
        new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (!e.isIntersecting) {
                    document.querySelectorAll('#tl-exp .tl-item.open').forEach(i => i.classList.remove('open'));
                    setTimeout(cachePositions, 1000);
                    cancelAnimationFrame(tlLoopRAF);
                    tlLoopRAF = null;
                } else {
                    if (!tlLoopRAF) tlLoopRAF = requestAnimationFrame(loop);
                }
            });
        }, { threshold: 0.05 }).observe(section);
    }

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && !tlLoopRAF) tlLoopRAF = requestAnimationFrame(loop);
    });
})();

// =========================================================
// RÉSEAU DE NEURONES 3D (Three.js)
// =========================================================

// Shockwave click system — smooth bell-curve boost
let shockwaveT = -1;   // -1 = inactive, 0→1 = active
let shockwaveFrame = 0;
const SHOCKWAVE_DUR = 150; // frames (~2.5s at 60fps)
let heroClickBoost = 0;   // derived each frame from shockwaveT
let heroClickBoostNode = 0; // smoothly lerped version for node scale
let heroClickBoostAmbient = 0; // slowly lerped version for ambient bg effects
let shockwaveCX = 0, shockwaveCY = 0, shockwaveMaxR = 0; // coords fixes en canvas px (calculées au clic)

function handleClickHero(e) {
    e.preventDefault();
    e.currentTarget.classList.add('pulse-off');
    shockwaveFrame = 0;
    shockwaveT = 0;
    updateHeroRightRect();
    // Fixer les coords en coordonnées canvas au moment du clic (avant que le scroll ne bouge tout)
    if (heroRightRect && heroBgCanvas) {
        const heroBgRect = heroBgCanvas.getBoundingClientRect();
        shockwaveCX = heroRightRect.left + heroRightRect.width / 2 - heroBgRect.left;
        shockwaveCY = heroRightRect.top + heroRightRect.height / 2 - heroBgRect.top;
        shockwaveMaxR = Math.max(heroRightRect.width, heroRightRect.height) * 0.9;
    }
    setTimeout(() => smoothScrollTo('about'), 1200);
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

// --- Texture glow radial (canvas → THREE.Texture) pour un halo doux ---
function makeGlowTexture() {
    const size = 128;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.25, 'rgba(255,255,255,0.6)');
    grad.addColorStop(0.6, 'rgba(255,255,255,0.15)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
}
const glowTexture = makeGlowTexture();

// --- Node meshes ---
const nodeObjects = [];
let cumCount = 0;
LAYER_COUNTS.forEach((count, li) => {
    const isSingle = count === 1;
    const radius = isSingle ? 0.15 : 0.09;

    for (let i = 0; i < count; i++) {
        const pos = allNodePositions[cumCount + i];

        // Core node
        const geo = new THREE.SphereGeometry(radius, 16, 16);
        const mat = new THREE.MeshBasicMaterial({ color: 0x818cf8 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        neuralGroup.add(mesh);

        // Glow halo — sprite avec texture gradient radial (face caméra, fondu doux)
        const glowMat = new THREE.SpriteMaterial({
            map: glowTexture,
            color: 0x818cf8,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const glowSprite = new THREE.Sprite(glowMat);
        glowSprite.position.copy(pos);
        const spriteSize = radius * 9;
        glowSprite.scale.set(spriteSize, spriteSize, 1);
        neuralGroup.add(glowSprite);

        nodeObjects.push({
            mesh, glowMesh: glowSprite,
            pulseOffset: Math.random() * Math.PI * 2,
            isSingle,
            activation: 0,
            freq: 0.6 + Math.random() * 1.2,
            phase: Math.random() * Math.PI * 2,
            clickFactor: 0.5 + Math.random() * 1.0,
        });
    }
    cumCount += count;
});

// --- Full connections ---
// Nœuds I/O (couches 0 et dernière) → connectés à TOUS les nœuds de la couche adjacente
// Autres couches → 4 plus proches voisins
const connectionObjects = [];

positionsByLayer.forEach((layerA, li) => {
    if (li >= positionsByLayer.length - 1) return;
    const layerB = positionsByLayer[li + 1];
    const isIOLayer = (li === 0 || li === LAYER_COUNTS.length - 2);

    layerA.forEach(posA => {
        const sorted = [...layerB].sort((a, b) => posA.distanceTo(a) - posA.distanceTo(b));
        // I/O layers : toutes les connexions ; autres : 4 plus proches
        const numConn = isIOLayer ? layerB.length : Math.min(4, layerB.length);

        sorted.slice(0, numConn).forEach(posB => {
            const weight = 0.3 + Math.random() * 0.7;
            const lineGeo = new THREE.BufferGeometry().setFromPoints([posA.clone(), posB.clone()]);
            const lineMat = new THREE.LineBasicMaterial({
                color: 0x818cf8,
                transparent: true,
                opacity: weight * 0.28, // plus visible au repos
            });
            const line = new THREE.Line(lineGeo, lineMat);
            neuralGroup.add(line);
            connectionObjects.push({ line, lineMat, weight, posA, posB });
        });
    });
});

// --- Système de particules dynamiques ---
// Pool de particules qui se déplacent sur des connexions aléatoires
// Chaque particule choisit une nouvelle connexion aléatoire après chaque traversée
const PARTICLE_POOL_SIZE = 18;
const particlePool = [];

(function initParticles() {
    const pgeo = new THREE.SphereGeometry(0.06, 8, 8);
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
        const pmat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const pmesh = new THREE.Mesh(pgeo.clone(), pmat);
        neuralGroup.add(pmesh);

        // Connexion aléatoire + délai de départ décalé pour éviter la synchronisation
        const conn = connectionObjects[Math.floor(Math.random() * connectionObjects.length)];
        particlePool.push({
            mesh: pmesh,
            conn,
            t: Math.random(),                        // position initiale décalée
            speed: 0.004 + Math.random() * 0.006,    // vitesse propre à chaque particule
            waitFrames: Math.floor(Math.random() * 90), // délai avant départ
        });
    }
})();

// --- Mouse + rotation state ---
// neuralMouseNX/NY: relative to full window (for vertical tilt)
// neuralMouseRelX: relative to the neural panel center (for horizontal rotation)
let neuralMouseNX = 0, neuralMouseNY = 0, neuralMouseRelX = 0;
let neuralVelY = 0;    // vitesse angulaire Y (rad/frame)
let neuralAngleY = 0;  // angle accumulé libre — rotation complète possible
let neuralRotX = 0;    // tilt X (limité)
let heroRightRect = null;
let heroLeftRect = null;
// Cursor halo position (in heroBgCanvas coords)
let heroBgMouseX = -2000, heroBgMouseY = -2000;
// Viewport cursor position — for neural hover detection
let cursorTargetX = -500, cursorTargetY = -500;

// Seuil de proximité pour l'activation des nœuds par les particules (3D units)
const NODE_ACTIVATION_RADIUS = 0.55;

function updateHeroRightRect() {
    const el = document.querySelector('.hero-right');
    if (el) heroRightRect = el.getBoundingClientRect();
    const elLeft = document.querySelector('.hero-left');
    if (elLeft) heroLeftRect = elLeft.getBoundingClientRect();
}

window.addEventListener('mousemove', (e) => {
    cursorTargetX = e.clientX;
    cursorTargetY = e.clientY;
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
    if (!prefersReducedMotion) {
        neuralVelY += neuralMouseRelX * 0.0007;
        neuralVelY *= 0.93;
        neuralAngleY += neuralVelY;
    }
    const targetRotX = -neuralMouseNY * 0.28;
    neuralRotX += (targetRotX - neuralRotX) * 0.05;
    neuralGroup.rotation.x = neuralRotX;
    neuralGroup.rotation.y = neuralAngleY;
    neuralGroup.updateMatrixWorld();

    const t = timestamp * 0.001;
    const clickSpeedBoost = 1 + heroClickBoost * 4;

    // Boost global quand le curseur survole la zone du réseau neuronal
    const isHoveringNeural = heroRightRect &&
        cursorTargetX >= heroRightRect.left && cursorTargetX <= heroRightRect.right &&
        cursorTargetY >= heroRightRect.top && cursorTargetY <= heroRightRect.bottom;
    const hoverAreaBoost = isHoveringNeural ? 2.2 : 1.0;

    // --- Reset cible d'activation des connexions ---
    connectionObjects.forEach(conn => { conn.actTarget = 0; });

    // --- Déplacer les particules du pool dynamique ---
    particlePool.forEach(p => {
        if (p.waitFrames > 0) {
            p.waitFrames--;
            p.mesh.visible = false;
            return;
        }
        p.mesh.visible = true;
        const proximityBoost = prefersReducedMotion ? 1 : getParticleBoost(p.mesh);
        p.t += p.speed * proximityBoost * clickSpeedBoost * hoverAreaBoost;
        if (p.t >= 1) {
            p.conn = connectionObjects[Math.floor(Math.random() * connectionObjects.length)];
            p.t = 0;
            p.speed = 0.004 + Math.random() * 0.006;
            p.waitFrames = Math.floor(Math.random() * 40);
        }
        p.mesh.position.lerpVectors(p.conn.posA, p.conn.posB, p.t);
        p.mesh.material.color.setHSL(194 / 360, 1.0, 0.75);

        // Courbe bell : activation maximale au milieu du trajet, nulle aux extrémités
        const bell = Math.sin(p.t * Math.PI);
        if (bell > p.conn.actTarget) p.conn.actTarget = bell;
    });

    // --- Connexions : lerp progressif vers la cible (attaque rapide, déclin lent) ---
    connectionObjects.forEach(conn => {
        if (conn.act === undefined) conn.act = 0;
        const lerpRate = conn.actTarget > conn.act ? 0.18 : 0.035;
        conn.act += (conn.actTarget - conn.act) * lerpRate;
        const a = conn.act;

        // Opacité : base visible + boost selon activation
        conn.lineMat.opacity = conn.weight * (0.28 + a * 0.60);
        // Couleur : glisse progressivement du violet au cyan
        conn.lineMat.color.setHSL((245 - a * 51) / 360, 0.75 + a * 0.25, 0.52 + a * 0.18);
    });

    // --- Activation des nœuds : SEULEMENT quand une particule est proche ---
    nodeObjects.forEach(n => {
        let maxAct = 0;
        particlePool.forEach(p => {
            if (!p.mesh.visible) return;
            const dist = n.mesh.position.distanceTo(p.mesh.position);
            if (dist < NODE_ACTIVATION_RADIUS) {
                const contrib = Math.exp(-(dist * dist) / (2 * 0.12));
                if (contrib > maxAct) maxAct = contrib;
            }
        });

        // Attaque rapide, décroissance lente — seulement quand particule présente
        const lerpRate = maxAct > n.activation ? 0.35 : 0.04;
        n.activation += (maxAct - n.activation) * lerpRate;
        const act = n.activation;

        // Couleur core : violet au repos → cyan à l'activation
        n.mesh.material.color.setHSL(
            (245 - act * 51) / 360,
            0.85 + act * 0.15,
            0.48 + act * 0.32
        );

        // Glow sprite : opacity 0 au repos, monte doucement à l'activation
        n.glowMesh.material.color.setHSL(194 / 360, 1.0, 0.70);
        n.glowMesh.material.opacity = act * 0.55;

        // Scale pulse
        const clickSpring = heroClickBoostNode > 0.001
            ? Math.pow(Math.sin(heroClickBoostNode * Math.PI), 0.6) * 1.4 * n.clickFactor : 0;
        const idlePulse = n.isSingle ? 0.3 : 0.18;
        const s = Math.max(0.1, (1 + Math.sin(t + n.pulseOffset) * idlePulse) + clickSpring);
        n.mesh.scale.setScalar(s);
    });

    neuralRenderer.render(neuralScene, neuralCamera);
}

// =========================================================
// CANVAS HERO BG — CONSTELLATION (particules + connexions)
// =========================================================

const heroBgCanvas = document.getElementById('hero-bg-canvas');
const heroBgCtx = heroBgCanvas.getContext('2d');
let heroBgParticles = [];
const HERO_BG_COUNT = 150;
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
        // Drift autonome persistant (vitesse constante, quasi pas d'amortissement)
        this.vx = (Math.random() - 0.5) * 0.30;
        this.vy = (Math.random() - 0.5) * 0.30;
        this.baseSize = Math.random() * 2.6 + 0.5;
        this.hue = Math.floor(Math.random() * 70) + 185;
        this.alpha = Math.random() * 0.5 + 0.2;
        this.twinkleSpeed = Math.random() * 0.018 + 0.006;
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
        // Très faible amortissement → dérive persistante
        this.vx *= 0.9998;
        this.vy *= 0.9998;
        const speed = 1 + boost * 2.2;
        this.x += this.vx * speed;
        this.y += this.vy * speed;
        // Wrap-around au lieu de reset → dérive continue sans disparition
        if (this.x < -10) this.x = heroBgCanvas.width + 10;
        if (this.x > heroBgCanvas.width + 10) this.x = -10;
        if (this.y < -10) this.y = heroBgCanvas.height + 10;
        if (this.y > heroBgCanvas.height + 10) this.y = -10;
        // Subtle twinkle
        this.currentAlpha = this.alpha * (0.88 + 0.12 * Math.sin(t * this.twinkleSpeed + this.twinkleOffset));
    }
    draw(boost, clipCX = -1, clipCY = -1, clipR = 0, textCX = -1, textCY = -1, textRX = 0, textRY = 0) {
        // Fade circulaire : invisible au centre du réseau neuronal
        let fade = 1;
        if (clipR > 0) {
            const dx = this.x - clipCX;
            const dy = this.y - clipCY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const innerR = clipR * 0.62;
            if (dist < innerR) return;
            if (dist < clipR) fade = (dist - innerR) / (clipR - innerR);
        }
        // Fade elliptique : particules légèrement visibles dans la zone de texte
        if (textRX > 0) {
            const ndx = (this.x - textCX) / textRX;
            const ndy = (this.y - textCY) / textRY;
            const nd = Math.sqrt(ndx * ndx + ndy * ndy);
            const minFade = 0.18;
            if (nd < 0.70) fade *= minFade;
            else if (nd < 1.0) fade *= minFade + (1 - minFade) * (nd - 0.70) / 0.30;
        }
        const s = this.baseSize * (1 + boost * 1.0);
        const a = (this.currentAlpha + boost * 0.14) * fade;
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
    const boost = heroClickBoostAmbient;
    heroBgCtx.clearRect(0, 0, heroBgCanvas.width, heroBgCanvas.height);

    if (!prefersReducedMotion) blobTime += 0.0008;
    const W = heroBgCanvas.width, H = heroBgCanvas.height;

    // Ambient glow blobs
    AMBIENT_BLOBS.forEach((blob, i) => {
        const cx = (blob.bx + Math.sin(blobTime * blob.drift + i * 2.09) * 0.13) * W;
        const cy = (blob.by + Math.cos(blobTime * blob.drift + i * 1.67) * 0.10) * H;
        const radius = blob.r * (1 + boost * 0.4);
        const grad = heroBgCtx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0, `hsla(${blob.hue}, 90%, 62%, ${0.10 + boost * 0.06})`);
        grad.addColorStop(0.45, `hsla(${blob.hue}, 85%, 58%, ${0.04 + boost * 0.025})`);
        grad.addColorStop(1, `hsla(${blob.hue}, 80%, 55%, 0)`);
        heroBgCtx.fillStyle = grad;
        heroBgCtx.fillRect(0, 0, W, H);
    });

    // Shockwave rings — coords fixes calculées au clic, ne bougent pas pendant le scroll
    if (shockwaveT >= 0 && shockwaveMaxR > 0) {
        const cx = shockwaveCX, cy = shockwaveCY, maxR = shockwaveMaxR;

        [[1.0, 0.0], [0.72, 0.09], [0.45, 0.18]].forEach(([scale, delay]) => {
            const pt = Math.max(0, (shockwaveT - delay) / (1 - delay));
            if (pt <= 0 || pt > 1) return;
            const eased = 1 - Math.pow(1 - pt, 2.8);
            const r = eased * maxR * scale;

            const alpha = Math.min(pt / 0.12, 1) * Math.pow(1 - pt, 1.8) * 0.6;
            const lw = (1 - pt) * 4.0 + 0.6;
            // Halo violet
            heroBgCtx.beginPath();
            heroBgCtx.arc(cx, cy, r, 0, Math.PI * 2);
            heroBgCtx.strokeStyle = `rgba(129, 140, 248, ${alpha * 0.4})`;
            heroBgCtx.lineWidth = lw * 3;
            heroBgCtx.stroke();
            // Anneau cyan principal
            heroBgCtx.beginPath();
            heroBgCtx.arc(cx, cy, r, 0, Math.PI * 2);
            heroBgCtx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
            heroBgCtx.lineWidth = lw;
            heroBgCtx.stroke();
        });
    }

    // Zone de clip CIRCULAIRE serrée autour du réseau neuronal
    let clipCX = -1, clipCY = -1, clipR = 0;
    let textCX = -1, textCY = -1, textRX = 0, textRY = 0;
    const bgRect = heroBgCanvas.getBoundingClientRect();
    if (heroRightRect) {
        clipCX = heroRightRect.left + heroRightRect.width / 2 - bgRect.left;
        clipCY = heroRightRect.top + heroRightRect.height / 2 - bgRect.top;
        clipR = Math.min(heroRightRect.width, heroRightRect.height) * 0.56;
    }
    // Zone de texte gauche — ellipse collée au texte, fade dans draw()
    if (heroLeftRect) {
        textCX = (heroLeftRect.left + heroLeftRect.right) / 2 - bgRect.left;
        textCY = (heroLeftRect.top + heroLeftRect.bottom) / 2 - bgRect.top;
        textRX = heroLeftRect.width / 2 + 24;
        textRY = heroLeftRect.height / 2 + 20;
    }

    // Connexions entre particules proches (avec fade circulaire + fade zone texte)
    for (let i = 0; i < heroBgParticles.length; i++) {
        for (let j = i + 1; j < heroBgParticles.length; j++) {
            const dx = heroBgParticles[i].x - heroBgParticles[j].x;
            const dy = heroBgParticles[i].y - heroBgParticles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < HERO_BG_CONNECT_DIST) {
                let fadeI = 1, fadeJ = 1;
                if (clipR > 0) {
                    const dxi = heroBgParticles[i].x - clipCX, dyi = heroBgParticles[i].y - clipCY;
                    const di = Math.sqrt(dxi * dxi + dyi * dyi);
                    const inner = clipR * 0.62;
                    fadeI = di < inner ? 0 : di < clipR ? (di - inner) / (clipR - inner) : 1;
                    const dxj = heroBgParticles[j].x - clipCX, dyj = heroBgParticles[j].y - clipCY;
                    const dj = Math.sqrt(dxj * dxj + dyj * dyj);
                    fadeJ = dj < inner ? 0 : dj < clipR ? (dj - inner) / (clipR - inner) : 1;
                }
                // Fade zone texte pour les connexions
                if (textRX > 0) {
                    const minFadeT = 0.18;
                    const niX = (heroBgParticles[i].x - textCX) / textRX;
                    const niY = (heroBgParticles[i].y - textCY) / textRY;
                    const ndI = Math.sqrt(niX * niX + niY * niY);
                    fadeI *= ndI < 0.70 ? minFadeT : ndI < 1.0 ? minFadeT + (1 - minFadeT) * (ndI - 0.70) / 0.30 : 1;
                    const njX = (heroBgParticles[j].x - textCX) / textRX;
                    const njY = (heroBgParticles[j].y - textCY) / textRY;
                    const ndJ = Math.sqrt(njX * njX + njY * njY);
                    fadeJ *= ndJ < 0.70 ? minFadeT : ndJ < 1.0 ? minFadeT + (1 - minFadeT) * (ndJ - 0.70) / 0.30 : 1;
                }
                const fade = Math.min(fadeI, fadeJ);
                if (fade <= 0) continue;
                const op = (1 - dist / HERO_BG_CONNECT_DIST) * (0.11 + boost * 0.10) * fade;
                heroBgCtx.strokeStyle = `rgba(129, 140, 248, ${op})`;
                heroBgCtx.lineWidth = 0.55;
                heroBgCtx.beginPath();
                heroBgCtx.moveTo(heroBgParticles[i].x, heroBgParticles[i].y);
                heroBgCtx.lineTo(heroBgParticles[j].x, heroBgParticles[j].y);
                heroBgCtx.stroke();
            }
        }
    }

    heroBgParticles.forEach(p => { p.update(boost, t); p.draw(boost, clipCX, clipCY, clipR, textCX, textCY, textRX, textRY); });
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
        this.size = Math.random() * 1.8 + 0.2;
        this.baseAlpha = Math.random() * 0.55 + 0.05;
        this.speedAlpha = Math.random() * 0.02 + 0.005;
        this.increasing = true;
        this.hue = Math.floor(Math.random() * 60) + 190;
        this.vx = (Math.random() - 0.5) * 0.12;
        this.vy = (Math.random() - 0.5) * 0.12;
    }
    draw() {
        bgCtx.fillStyle = `hsla(${this.hue}, 100%, 70%, ${this.baseAlpha})`;
        bgCtx.beginPath();
        bgCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        bgCtx.fill();
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0) this.x = bgCanvas.width;
        if (this.x > bgCanvas.width) this.x = 0;
        if (this.y < 0) this.y = bgCanvas.height;
        if (this.y > bgCanvas.height) this.y = 0;
        if (this.increasing) {
            this.baseAlpha += this.speedAlpha;
            if (this.baseAlpha >= 1) this.increasing = false;
        } else {
            this.baseAlpha -= this.speedAlpha;
            if (this.baseAlpha <= 0.1) {
                this.increasing = true;
                this.hue = Math.floor(Math.random() * 60) + 190;
            }
        }
        this.draw();
    }
}

function initBgStars() {
    bgStarsArray = [];
    for (let i = 0; i < 160; i++) {
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
    // Smooth boost curve: 0 → peak → 0 — exposant 0.12 = plateau long (~75% de la durée)
    heroClickBoost = shockwaveT >= 0
        ? Math.pow(Math.sin(shockwaveT * Math.PI), 0.12)
        : 0;
    heroClickBoostNode += (heroClickBoost - heroClickBoostNode) * 0.12;
    heroClickBoostAmbient += (heroClickBoost - heroClickBoostAmbient) * 0.08;

    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    for (let i = 0; i < bgStarsArray.length; i++) {
        bgStarsArray[i].update();
    }

    animateHeroBg(timestamp);
    animateNeural(timestamp);

    animRAF = requestAnimationFrame(animate);
}

let animRAF = null;
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        cancelAnimationFrame(animRAF);
        animRAF = null;
    } else if (!animRAF) {
        animRAF = requestAnimationFrame(animate);
    }
});


window.addEventListener('resize', resizeCanvases);
resizeCanvases();
animRAF = requestAnimationFrame(animate);

// =========================================================
// NAVIGATION — FLOATING ISLAND
// =========================================================

(function initNavIsland() {
    const navEl = document.getElementById('nav-wrapper');
    const island = document.getElementById('nav-island');
    const indicator = document.getElementById('nav-indicator');
    const links = island ? island.querySelectorAll('a[data-section]') : [];

    if (!island || !indicator || !links.length) return;

    const sections = ['hero', 'about', 'skills', 'experience', 'education', 'projects', 'contact'];

    // Verrou : click manuel bloque le scroll-tracking pendant 1.8s
    let manualLock = false;
    let manualLockTimer = null;
    function lockManual() {
        manualLock = true;
        clearTimeout(manualLockTimer);
        manualLockTimer = setTimeout(() => { manualLock = false; }, 1800);
    }

    function getActive() {
        return island.querySelector('a.active');
    }

    // Active un lien (sans toucher à l'indicateur — géré par le lerp)
    function setActive(sectionId) {
        links.forEach(l => l.classList.toggle('active', l.dataset.section === sectionId));
    }

    // Init
    requestAnimationFrame(() => setActive('hero'));

    // Lien survolé
    let hoveredLink = null;
    links.forEach(link => {
        link.addEventListener('mouseenter', () => { hoveredLink = link; });
        link.addEventListener('mouseleave', () => { hoveredLink = null; });
        link.addEventListener('click', () => {
            setActive(link.dataset.section);
            lockManual();
        });
    });

    // Lerp : l'indicateur suit en temps réel le lien cible (hover ou actif).
    // Gère à la fois la navigation fluide ET le suivi dynamique de la taille
    // de la nav bar (compact ↔ hover) sans conflit de transition CSS.
    let indX = null, indW = null, indO = 0;
    const LERP = 0.10;
    (function lerpLoop() {
        const target = hoveredLink || getActive();
        if (target) {
            const iRect = island.getBoundingClientRect();
            const eRect = target.getBoundingClientRect();
            const tL = eRect.left - iRect.left;
            const tW = eRect.width;
            if (indX === null) { indX = tL; indW = tW; }
            indX += (tL - indX) * LERP;
            indW += (tW - indW) * LERP;
            indO += (1 - indO) * 0.12;
        } else {
            indO += (0 - indO) * 0.12;
        }
        indicator.style.left = (indX ?? 0) + 'px';
        indicator.style.width = (indW ?? 0) + 'px';
        indicator.style.opacity = indO;
        requestAnimationFrame(lerpLoop);
    })();

    // Scroll : section active + compact
    const heroSection = document.getElementById('hero');
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            const heroBottom = heroSection ? heroSection.offsetTop + heroSection.offsetHeight * 0.3 : 300;
            const isCompact = window.scrollY > heroBottom;
            navEl.classList.toggle('nav-scrolled', window.scrollY > 50);
            navEl.classList.toggle('nav-compact', isCompact);

            // Mettre à jour la section active seulement si pas de verrou manuel
            if (!manualLock) {
                let current = sections[0];
                sections.forEach(id => {
                    const el = document.getElementById(id);
                    if (el && window.scrollY >= el.offsetTop - window.innerHeight * 0.35) current = id;
                });
                setActive(current === 'contact' ? null : current);
            }
            ticking = false;
        });
    }, { passive: true });

})();

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
        'hero.subtitle': '<strong>Ingénieur Machine Learning</strong><br>(IA & Software Systems)',
        'hero.btn': 'Découvrir mon profil',
        // About
        'about.title': 'À propos',
        'about.p1': 'Diplômé ingénieur des <strong class="about-highlight">Mines de Saint-Étienne</strong>, spécialisé en Data Science & IA, je recherche ma première opportunité dans ce domaine à partir de février 2026, à la suite de mon stage de fin d\'études chez <strong class="about-highlight">Dassault Aviation</strong>.',
        'about.p2': 'Mon <strong class="about-highlight">parcours technique</strong> m\'a permis de mener des projets concrets en Computer Vision, NLP, RAG, classification, LLM, Reinforcement Learning, développement logiciel et déploiement (Docker, CI/CD).',
        'about.p3': '<strong class="about-highlight">Curieux et motivé</strong>, je cherche à mettre mes compétences en Data Science au service de projets ambitieux où la technique rencontre un impact concret.',
        'about.p4': 'Disponible <strong class="about-highlight">immédiatement</strong>, je suis ouvert aux opportunités en région parisienne, lyonnaise ou à Genève — en présentiel, remote ou hybride.',
        'about.location': 'Boulogne Billancourt (92100)',
        'about.badge': 'Disponible',
        'about.stat1': 'ans de form.',
        'about.stat2': 'projets',
        'about.stat3': 'domaines',
        'about.available': 'Disponible fév. 2026',
        'about.remote': 'Remote / Hybride',
        // Skills
        'skills.title': 'Compétences',
        'skills.ai': 'IA & Data Science',
        'skills.programming': 'Programmation',
        'skills.office': 'Bureautique & Autres',
        'skills.french': 'Français (Natif)',
        'skills.french.name': 'Français',
        'skills.french.level': 'Natif',
        'skills.english': 'Anglais (C1)',
        'skills.english.name': 'Anglais',
        'skills.spanish': 'Espagnol (B2)',
        'skills.spanish.name': 'Espagnol',
        'skills.japanese': 'Japonais (A1)',
        'skills.japanese.name': 'Japonais',
        'skills.driving': 'Permis B - Véhiculé',
        // Experience
        'exp.hint': '<i class="fas fa-chevron-down"></i> Voir les détails',
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
        'proj.hint.expand': 'Voir le projet',
        'proj.hint.collapse': 'Réduire',
        'proj.trading.role': 'Agent de Trading Crypto Autonome',
        'proj.trading.short': 'Agent de trading autonome par Deep RL (PPO/SAC). Environnement Gym custom, 10 crypto-paires, reward multi-composants.',
        'proj.music.role': 'Application de Recommandation Musicale',
        'proj.music.short': 'Application mobile de recommandation musicale avec algorithmes de similarité, clustering et pipeline de données complet.',
        'proj.research.role': 'Débruitage d\'Images — Radiation Nucléaire',
        'proj.research.short': 'Réseau encodeur-décodeur pour débruiter des images endommagées par rayonnement ionisant (réacteur nucléaire).',
        'proj.thales.role': 'Détection de Piétons — Thales',
        'proj.thales.short': 'Classification infrarouge de piétons sous contraintes embarquées. Benchmark MobileNet/YOLO, cluster Linux GPU.',
        'proj.fermavers.role': 'Élevage de Larves BSF — Fermavers',
        'proj.fermavers.short': 'Module de valorisation de déchets organiques par élevage de larves. Conception CAO Inventor, gestion des flux.',
        'proj.hepse.role': 'App Patrimoine — HEPSE',
        'proj.hepse.short': 'App mobile pour le patrimoine de Saint-Étienne via une chasse au trésor interactive géolocalisée.',
        'proj.tipe.role': 'Pompe à Insuline — TIPE (CPGE)',
        'proj.tipe.short': 'Étude, simulation et modélisation d\'une pompe à insuline et de son effet sur le corps humain représenté mécaniquement.',
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

    if (typeof window._projRebuildExtra === 'function') {
        window._projRebuildExtra();
    }
}

function toggleLang() {
    applyLang(currentLang === 'en' ? 'fr' : 'en');
}

if (currentLang !== 'en') applyLang(currentLang);

// =========================================================
// PHOTO TILT (effet pièce de monnaie au hover)
// =========================================================
(function () {
    const wrapper = document.querySelector('.profile-ring-wrapper');
    if (!wrapper) return;

    const MAX_TILT = 6;   // degrés max (léger)
    const LERP = 0.06;    // vitesse de suivi — plus petit = plus progressif

    let targetRx = 0, targetRy = 0;
    let currentRx = 0, currentRy = 0;
    let isOver = false;
    let raf = null;

    function tick() {
        currentRx += (targetRx - currentRx) * LERP;
        currentRy += (targetRy - currentRy) * LERP;

        const ax = Math.abs(currentRx), ay = Math.abs(currentRy);
        wrapper.style.transform = `perspective(700px) rotateX(${currentRx.toFixed(3)}deg) rotateY(${currentRy.toFixed(3)}deg)`;
        wrapper.style.boxShadow = `${(-currentRy * 0.8).toFixed(1)}px ${(currentRx * 0.8).toFixed(1)}px 36px rgba(56,189,248,${(0.22 + (ax + ay) * 0.008).toFixed(3)})`;

        // Continuer tant qu'on est loin de la cible
        if (Math.abs(currentRx - targetRx) > 0.02 || Math.abs(currentRy - targetRy) > 0.02) {
            raf = requestAnimationFrame(tick);
        } else {
            raf = null;
        }
    }

    wrapper.addEventListener('mousemove', (e) => {
        const rect = wrapper.getBoundingClientRect();
        const dx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
        const dy = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
        targetRy = dx * MAX_TILT;
        targetRx = -dy * MAX_TILT;
        if (!raf) raf = requestAnimationFrame(tick);
    });

    wrapper.addEventListener('mouseleave', () => {
        targetRx = 0;
        targetRy = 0;
        if (!raf) raf = requestAnimationFrame(tick);
    });
})();

// =========================================================
// SKILLS — gauge animation on scroll reveal
// =========================================================
(function () {
    const fills = document.querySelectorAll('.gauge-fill');
    if (!fills.length) return;

    const io = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (!e.isIntersecting) return;
            const el = e.target;
            const idx = [...fills].indexOf(el);
            setTimeout(() => { el.style.width = el.dataset.w + '%'; }, 120 + idx * 110);
            io.unobserve(el);
        });
    }, { threshold: 0.4 });

    fills.forEach(f => io.observe(f));
})();

// =========================================================
// EDUCATION CARDS (Accordion + Animations)
// =========================================================

// Inject card-bg + border-spin into every card
document.querySelectorAll('#edu-list .edu-card').forEach(card => {
    const bg = document.createElement('div'); bg.className = 'edu-card-bg'; card.prepend(bg);
    const spin = document.createElement('div'); spin.className = 'edu-border-spin'; card.appendChild(spin);
});

// Accordion
const eduItems = document.querySelectorAll('#edu-list .edu-item');
eduItems.forEach(item => {
    item.querySelector('.edu-card').addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        eduItems.forEach(i => i.classList.remove('open'));
        if (!isOpen) item.classList.add('open');
    });
});

// Staggered scroll reveal
(function () {
    const items = document.querySelectorAll('#edu-list .edu-item');
    items.forEach((el, i) => { el.style.transitionDelay = `${i * 0.13}s`; });
    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
        });
    }, { threshold: .08 });
    items.forEach(el => setTimeout(() => obs.observe(el), 60));
    setTimeout(() => items.forEach(el => el.classList.add('visible')), 900);
})();

// =========================================================
// PROJECTS CAROUSEL
// =========================================================
(function () {
    const projOuter = document.getElementById('projCarouselOuter');
    const projTrack = document.getElementById('projCarouselTrack');
    const projDotsEl = document.getElementById('projDots');
    const projOverlay = document.getElementById('proj-expand-overlay');
    if (!projOuter || !projTrack) return;

    const projCards = Array.from(projTrack.querySelectorAll('.proj-card'));
    if (!projCards.length) return;

    // ── PROJECT DATA ──
    const PROJECTS = [
        {
            type: 'trading', rgb: '56,189,248', accent: '#38bdf8',
            period: 'January 2026 — Present', context: 'Personal Project · Paris',
            periodFr: 'Janvier 2026 — Présent', contextFr: 'Projet Personnel · Paris',
            desc: `<ul>
            <li>Design and development of an autonomous trading agent using Deep RL (PPO/SAC, PyTorch, Stable-Baselines3).</li>
            <li>Custom Gym environment: continuous action space, 10 crypto pairs, domain randomization.</li>
            <li>Multi-component reward: log-return, drawdown penalty, trend alignment, unrealized PnL.</li>
            <li>Multi-timeframe pipeline (1H/4H/1D/1W), z-score normalization, sentiment integration.</li>
            <li>Curriculum learning with GPU-optimized batch (CUDA).</li>
          </ul>`,
            descFr: `<ul>
            <li>Conception d'un agent de trading autonome par Deep RL (PPO/SAC, PyTorch, Stable-Baselines3).</li>
            <li>Environnement Gym custom : espace d'action continu, 10 paires crypto, domain randomization.</li>
            <li>Reward multi-composants : log-return, drawdown penalty, trend alignment, unrealized PnL.</li>
            <li>Pipeline multi-timeframes (1H/4H/1D/1W), normalisation z-score, intégration de sentiment.</li>
            <li>Curriculum learning avec batch GPU-optimisé (CUDA).</li>
          </ul>`,
            tags: ['Reinforcement Learning', 'TensorFlow / PyTorch', 'CUDA', 'Stable-Baselines3', 'Gymnasium', 'Time Series'],
        },
        {
            type: 'music', rgb: '167,139,250', accent: '#a78bfa',
            period: 'May 2025 — Present', context: 'Personal Project · Paris',
            periodFr: 'Mai 2025 — Présent', contextFr: 'Projet Personnel · Paris',
            desc: `<ul>
            <li>Complete mobile music recommendation app in React Native (Expo).</li>
            <li>Recommendation algorithms: cosine similarity, K-Means, DBSCAN.</li>
            <li>Backend architecture, app cache management and data pipelines.</li>
            <li>UI/UX design and end-to-end recommendation system implementation.</li>
          </ul>`,
            descFr: `<ul>
            <li>Application mobile de recommandation musicale complète en React Native (Expo).</li>
            <li>Algorithmes de recommandation : similarité cosinus, K-Means, DBSCAN.</li>
            <li>Architecture backend, gestion du cache applicatif et pipelines de données.</li>
            <li>Réflexion UI/UX et implémentation du système de recommandation end-to-end.</li>
          </ul>`,
            tags: ['React', 'Expo', 'Machine Learning', 'NLP', 'Data Pipeline'],
        },
        {
            type: 'noise', rgb: '96,165,250', accent: '#60a5fa',
            period: 'January — March 2025', context: 'EMSE · Saint-Étienne',
            periodFr: 'Janvier — Mars 2025', contextFr: 'EMSE · Saint-Étienne',
            desc: `<ul>
            <li>Deep learning model to denoise images damaged by ionizing radiation.</li>
            <li>U-Net encoder-decoder architecture with skip connections for image reconstruction.</li>
            <li>Synthetic data generation by reproducing radiation noise.</li>
            <li>Drafting of a research paper and scientific poster.</li>
          </ul>`,
            descFr: `<ul>
            <li>Modèle deep learning pour débruiter des images endommagées par rayonnement ionisant.</li>
            <li>Architecture U-Net encodeur-décodeur avec skip connections pour reconstruction d'images.</li>
            <li>Génération de données synthétiques par reproduction du bruit de radiation.</li>
            <li>Rédaction d'un article de recherche et d'un poster scientifique.</li>
          </ul>`,
            tags: ['Deep Learning', 'Computer Vision', 'TensorFlow / PyTorch', 'Synthetic Data'],
        },
        {
            type: 'detection', rgb: '129,140,248', accent: '#818cf8',
            period: 'September 2024 — January 2025', context: 'EMSE Project · Saint-Étienne',
            periodFr: 'Septembre 2024 — Janvier 2025', contextFr: 'Projet EMSE · Saint-Étienne',
            desc: `<ul>
            <li>Constrained image classification AI for infrared pedestrian detection.</li>
            <li>CNN benchmarking and training: MobileNet and YOLO (TensorFlow / PyTorch).</li>
            <li>Metrics analysis: mAP, F1, precision/recall.</li>
            <li>Training on Linux cluster with GPU resource management.</li>
          </ul>`,
            descFr: `<ul>
            <li>IA de classification d'images infrarouge pour la détection de piétons sous contraintes embarquées.</li>
            <li>Benchmark et entraînement CNN : MobileNet et YOLO (TensorFlow / PyTorch).</li>
            <li>Analyse des métriques : mAP, F1, précision/rappel.</li>
            <li>Entraînement sur cluster Linux avec gestion des ressources GPU.</li>
          </ul>`,
            tags: ['Computer Vision', 'TensorFlow / PyTorch', 'Linux', 'Machine Learning'],
        },
        {
            type: 'organic', rgb: '52,211,153', accent: '#34d399',
            period: 'February — June 2024', context: 'PRICE Program · EMSE',
            periodFr: 'Février — Juin 2024', contextFr: 'Programme PRICE · EMSE',
            desc: `<ul>
            <li>BSF larvae breeding module for organic waste valorization into protein.</li>
            <li>Modular CAD design (Autodesk Inventor) of an autonomous production module.</li>
            <li>Resource flow modeling for larval welfare (feeding, humidity, temperature).</li>
          </ul>`,
            descFr: `<ul>
            <li>Module d'élevage de larves BSF pour la valorisation de déchets organiques en protéines.</li>
            <li>Conception modulaire en CAO (Autodesk Inventor) d'un module de production autonome.</li>
            <li>Modélisation des flux de ressources pour le bien-être larvaire (alimentation, humidité, T°).</li>
          </ul>`,
            tags: ['SolidWorks', 'Systems Design', 'Biotech', 'Circular Economy'],
        },
        {
            type: 'map', rgb: '251,191,36', accent: '#fbbf24',
            period: 'September 2022 — May 2023', context: 'Civic Project · EMSE',
            periodFr: 'Septembre 2022 — Mai 2023', contextFr: 'Projet Civique · EMSE',
            desc: `<ul>
            <li>Mobile app for Saint-Étienne heritage: interactive treasure hunt.</li>
            <li>App architecture and full user experience design.</li>
            <li>Geolocation, heritage content and gamified progression system.</li>
          </ul>`,
            descFr: `<ul>
            <li>Application mobile pour le patrimoine de Saint-Étienne : chasse au trésor interactive.</li>
            <li>Conception de l'architecture applicative et de l'expérience utilisateur complète.</li>
            <li>Géolocalisation, contenus patrimoniaux et système de progression gamifiée.</li>
          </ul>`,
            tags: ['Mobile Dev', 'Geolocation', 'UI/UX Design', 'Gamification', 'Cultural Heritage'],
        },
        {
            type: 'wave', rgb: '251,113,133', accent: '#fb7185',
            period: 'September 2020 — July 2022', context: 'TIPE · Lycée Vaucanson, Grenoble',
            periodFr: 'Septembre 2020 — Juillet 2022', contextFr: 'TIPE · Lycée Vaucanson, Grenoble',
            desc: `<ul>
            <li>Study, simulation and modeling of an insulin pump and its effect on the human body.</li>
            <li>Modeling of insulin and glycemic dynamics via differential equations.</li>
            <li>Numerical implementation and validation under MATLAB/Simulink.</li>
          </ul>`,
            descFr: `<ul>
            <li>Étude, simulation et modélisation d'une pompe à insuline et de son effet sur le corps humain.</li>
            <li>Modélisation des dynamiques insuliniques et glycémiques par équations différentielles.</li>
            <li>Implémentation et validation numérique sous MATLAB/Simulink.</li>
          </ul>`,
            tags: ['Simulation', 'Modeling', 'MATLAB', 'Differential Equations', 'Biomedical'],
        },
    ];

    // ── CANVAS ANIMATIONS ──
    const CANVAS_W = 540, CANVAS_H = 240;
    const projCvObserver = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            e.target.__visible = e.isIntersecting;
            if (e.isIntersecting && e.target.__paused && e.target.__loop) {
                e.target.__paused = false;
                requestAnimationFrame(e.target.__loop);
            }
        });
    }, { threshold: 0.01 });

    function startProjAnimation(canvas, type, idx) {
        canvas.__stopped = false;
        canvas.width = CANVAS_W; canvas.height = CANVAS_H;
        canvas.__visible = true; projCvObserver.observe(canvas);
        const ctx = canvas.getContext('2d');
        const card = canvas.closest('.proj-card');
        const clr = getComputedStyle(card).getPropertyValue('--card-rgb').trim();
        ({ trading: animT, music: animM, noise: animN, detection: animD, organic: animO, map: animA, wave: animW })[type]?.(ctx, CANVAS_W, CANVAS_H, canvas, idx, clr);
    }

    function animT(ctx, w, h, cv, idx, clr) {
        const bg = ctx.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, `rgba(${clr},.12)`); bg.addColorStop(1, '#080e1a');
        const cols = 15, cw = (w / cols) * .75; let t = 0, candles = []; let curY = h * 0.5;
        for (let i = 0; i < cols + 2; i++) { let op = curY, cl = curY + (Math.random() - .5) * 70; if (cl < 50) cl = 50 + Math.random() * 20; if (cl > h - 50) cl = h - 50 - Math.random() * 20; let hi = Math.max(op, cl) + 5 + Math.random() * 30, lo = Math.min(op, cl) - 5 - Math.random() * 30; if (lo < 10) lo = 10; if (hi > h - 10) hi = h - 10; candles.push({ op, cl, hi, lo }); curY = cl; }
        (function d() {
            if (cv.__stopped) return;
            if (!cv.__visible) { cv.__paused = true; cv.__loop = d; return; } cv.__loop = d;
            ctx.clearRect(0, 0, w, h); ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = `rgba(${clr},.06)`; ctx.lineWidth = 1;
            for (let y = 20; y < h; y += h / 4) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
            for (let x = 0; x < w; x += w / cols) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
            let last = candles[candles.length - 1]; last.cl += (Math.random() - .5) * 9; if (last.cl < 50) last.cl = 50; if (last.cl > h - 50) last.cl = h - 50; last.hi = Math.max(last.hi, Math.max(last.op, last.cl) + 2); last.lo = Math.min(last.lo, Math.min(last.op, last.cl) - 2); if (last.lo < 10) last.lo = 10; if (last.hi > h - 10) last.hi = h - 10;
            if (t % 40 === 0) { let nextOp = last.cl, dY = (Math.random() - .5) * 70, nextCl = nextOp + dY; if (nextCl < 40) nextCl = 40 + Math.abs(dY) * .5; if (nextCl > h - 40) nextCl = h - 40 - Math.abs(dY) * .5; let nhi = Math.max(nextOp, nextCl) + 5 + Math.random() * 35, nlo = Math.min(nextOp, nextCl) - 5 - Math.random() * 35; if (nlo < 10) nlo = 10; if (nhi > h - 10) nhi = h - 10; candles.push({ op: nextOp, cl: nextCl, hi: nhi, lo: nlo }); if (candles.length > cols + 3) candles.shift(); }
            let offsetX = -(t % 40) / 40 * (w / cols);
            ctx.beginPath(); let ma = [];
            candles.forEach((c, i) => {
                const x = i * (w / cols) + offsetX; if (x < -cw || x > w + cw) return;
                const isUp = c.cl <= c.op, col = isUp ? 'rgba(52,211,153,1)' : 'rgba(251,113,133,1)';
                const bgCol = isUp ? 'rgba(52,211,153,.25)' : 'rgba(251,113,133,.25)';
                const bodyH = Math.max(5, Math.abs(c.cl - c.op)), bodyY = Math.min(c.cl, c.op);
                ctx.shadowBlur = 6; ctx.shadowColor = col; ctx.fillStyle = bgCol; ctx.strokeStyle = col; ctx.lineWidth = 2.5;
                ctx.beginPath(); ctx.moveTo(x, c.hi); ctx.lineTo(x, c.lo); ctx.stroke();
                ctx.fillRect(x - cw / 2, bodyY, cw, bodyH); ctx.strokeRect(x - cw / 2, bodyY, cw, bodyH); ctx.shadowBlur = 0;
                let sum = 0, cnt = 0; for (let j = Math.max(0, i - 3); j <= i; j++) { sum += candles[j].cl; cnt++; } ma.push({ x: x, y: sum / cnt });
            });
            if (ma.length > 0) { ctx.beginPath(); ma.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)); ctx.strokeStyle = `rgba(${clr},0.9)`; ctx.lineWidth = 3.5; ctx.shadowBlur = 8; ctx.shadowColor = `rgba(${clr},1)`; ctx.stroke(); ctx.shadowBlur = 0; }
            const fade = ctx.createLinearGradient(0, h - 40, 0, h); fade.addColorStop(0, 'transparent'); fade.addColorStop(1, '#080e1a');
            ctx.fillStyle = fade; ctx.fillRect(0, h - 40, w, 40);
            t++; requestAnimationFrame(d);
        })();
    }
    function animM(ctx, w, h, cv, idx, clr) {
        const bg = ctx.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, `rgba(${clr},.14)`); bg.addColorStop(1, '#080818');
        const num = 40, bw = w / num;
        const bars = Array.from({ length: num }, (_, i) => ({ x: i * bw + bw * .1, w: bw * .8, ph: i * .15, fr: .05 + Math.random() * .03 }));
        let t = 0; (function d() {
            if (cv.__stopped) return;
            if (!cv.__visible) { cv.__paused = true; cv.__loop = d; return; } cv.__loop = d;
            ctx.clearRect(0, 0, w, h); ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
            bars.forEach(b => {
                let env = Math.sin(b.x / w * Math.PI), amp = Math.max(0.1, Math.abs(Math.sin(t * b.fr + b.ph)) * Math.abs(Math.cos(t * .02 + b.ph * 2))) * env, bh = amp * h * 0.45;
                const g = ctx.createLinearGradient(0, h * .55 - bh, 0, h * .55 + bh); g.addColorStop(0, `rgba(${clr},1)`); g.addColorStop(0.5, `rgba(${clr},0.2)`); g.addColorStop(1, `rgba(${clr},0.7)`);
                ctx.fillStyle = g; ctx.shadowBlur = amp * 8; ctx.shadowColor = `rgba(${clr},1)`;
                ctx.beginPath(); ctx.roundRect(b.x, h * .55 - bh, b.w, bh * 2, [2]); ctx.fill();
            });
            ctx.shadowBlur = 0; ctx.beginPath();
            for (let x = 0; x < w; x += 2) { let y = h * .55 + Math.sin(x * .02 + t * .04) * 25 * Math.sin(x * Math.PI / w); x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
            ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();
            t++; requestAnimationFrame(d);
        })();
    }
    function animN(ctx, w, h, cv, idx, clr) {
        const bg = ctx.createLinearGradient(0, 0, w, h); bg.addColorStop(0, `rgba(${clr},.11)`); bg.addColorStop(1, '#0a0e1a');
        let t = 0, lastT = 0;
        const cn = []; for (let r = 0; r < 6; r++) { let rd = 20 + r * 20, c = 12 + r * 8; for (let i = 0; i < c; i++)cn.push({ x: w / 2 + Math.cos(i * (Math.PI * 2 / c) + r * .2) * rd, y: h / 2 + Math.sin(i * (Math.PI * 2 / c) + r * .2) * rd * 0.6, r: 1.5 }); }
        (function d(now) {
            if (cv.__stopped) return;
            if (!cv.__visible) { cv.__paused = true; cv.__loop = d; return; } cv.__loop = d;
            if (now && (now - lastT < 32)) { requestAnimationFrame(d); return; } lastT = now || 0;
            ctx.clearRect(0, 0, w, h); ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
            let sX = (t * 1.5) % (w * 1.5) - w * .2;
            ctx.strokeStyle = `rgba(${clr},.2)`; ctx.lineWidth = 1;
            cn.forEach(n => {
                if (n.x > sX) return;
                ctx.shadowBlur = 5; ctx.shadowColor = `rgba(${clr},1)`; ctx.fillStyle = `rgba(${clr},.9)`;
                ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
                if (Math.random() < .03) { ctx.beginPath(); ctx.moveTo(w / 2, h / 2); ctx.lineTo(n.x, n.y); ctx.stroke(); }
            });
            if (w / 2 <= sX) {
                ctx.shadowBlur = 12; ctx.shadowColor = `rgba(${clr},1)`;
                const gr = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, 15);
                gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'transparent');
                ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(w / 2, h / 2, 15, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
            }
            for (let i = 0; i < 150; i++) {
                let nx = Math.random() * w, ny = Math.random() * h; if (nx <= sX) continue;
                let intense = Math.hypot(nx - w / 2, ny - h / 2) < 130 ? Math.random() * .5 : 0;
                ctx.fillStyle = `rgba(200,220,255,${.15 + intense})`;
                ctx.fillRect(nx, ny, 1 + Math.random() * 3, 1 + Math.random() * 2);
            }
            const g = ctx.createLinearGradient(sX - 40, 0, sX, 0); g.addColorStop(0, 'transparent'); g.addColorStop(1, `rgba(${clr},0.8)`);
            ctx.fillStyle = g; ctx.fillRect(sX - 40, 0, 40, h);
            ctx.fillStyle = '#fff'; ctx.shadowBlur = 6; ctx.shadowColor = `rgba(${clr},1)`; ctx.fillRect(sX, 0, 2, h); ctx.shadowBlur = 0;
            t++; requestAnimationFrame(d);
        })();
    }
    function animD(ctx, w, h, cv, idx, clr) {
        const bg = ctx.createLinearGradient(0, 0, w, h); bg.addColorStop(0, `rgba(${clr},.10)`); bg.addColorStop(1, '#0a0e1a');
        const boxes = [{ x: w * .15, y: h * .3, w: w * .15, h: h * .4, ph: 0 }, { x: w * .45, y: h * .2, w: w * .2, h: h * .6, ph: 2 }, { x: w * .78, y: h * .4, w: w * .12, h: h * .35, ph: 4 }];
        let t = 0; (function d() {
            if (cv.__stopped) return;
            if (!cv.__visible) { cv.__paused = true; cv.__loop = d; return; } cv.__loop = d;
            ctx.clearRect(0, 0, w, h); ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = `rgba(${clr},.05)`; ctx.lineWidth = 1;
            for (let x = 0; x < w; x += 45) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
            for (let y = 0; y < h; y += 45) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
            boxes.forEach(b => {
                let act = Math.sin(t * .03 + b.ph) > 0, a = act ? .8 : .2, col = `rgba(${clr},${a})`;
                if (act) { const grd = ctx.createRadialGradient(b.x + b.w * .5, b.y + b.h * .5, 0, b.x + b.w * .5, b.y + b.h * .5, b.h * .6); grd.addColorStop(0, `rgba(${clr},.25)`); grd.addColorStop(1, 'transparent'); ctx.fillStyle = grd; ctx.fillRect(b.x, b.y, b.w, b.h); }
                ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.shadowBlur = act ? 8 : 0; ctx.shadowColor = `rgba(${clr},1)`;
                const cs = 10;[[b.x, b.y, 1, 1], [b.x + b.w, b.y, -1, 1], [b.x, b.y + b.h, 1, -1], [b.x + b.w, b.y + b.h, -1, -1]].forEach(([x, y, dx, dy]) => { ctx.beginPath(); ctx.moveTo(x + dx * cs, y); ctx.lineTo(x, y); ctx.lineTo(x, y + dy * cs); ctx.stroke(); });
                ctx.shadowBlur = 0;
                if (act) {
                    ctx.fillStyle = col; ctx.font = '600 9px sans-serif'; ctx.fillText('PERSON: ' + (85 + Math.round(Math.random() * 14)) + '%', b.x, b.y - 6);
                    ctx.beginPath(); ctx.arc(b.x + b.w * .5 + Math.sin(t * .1) * 5, b.y + b.h * .5 + Math.cos(t * .1) * 5, 3, 0, Math.PI * 2); ctx.fill();
                }
            });
            let sY = (t * 2) % h; ctx.fillStyle = `rgba(${clr},.5)`; ctx.fillRect(0, sY, w, 1);
            const sg = ctx.createLinearGradient(0, sY - 40, 0, sY); sg.addColorStop(0, 'transparent'); sg.addColorStop(1, `rgba(${clr},.15)`);
            ctx.fillStyle = sg; ctx.fillRect(0, sY - 40, w, 40);
            t++; requestAnimationFrame(d);
        })();
    }
    function animO(ctx, w, h, cv, idx, clr) {
        const bg = ctx.createLinearGradient(0, 0, w, h); bg.addColorStop(0, `rgba(${clr},.12)`); bg.addColorStop(1, '#080e14');
        let t = 0;
        (function d() {
            if (cv.__stopped) return;
            if (!cv.__visible) { cv.__paused = true; cv.__loop = d; return; } cv.__loop = d;
            ctx.clearRect(0, 0, w, h); ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = `rgba(${clr},.08)`; ctx.lineWidth = 1;
            for (let x = 0; x < w; x += 25) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
            for (let y = 0; y < h; y += 25) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
            const cx = w / 2, cy = h / 2;
            let ang = t * 0.01, radius = 60 + Math.sin(t * 0.05) * 5;
            ctx.shadowBlur = 12; ctx.shadowColor = `rgba(${clr},1)`;
            ctx.strokeStyle = `rgba(${clr},.8)`; ctx.lineWidth = 1.5;
            let pts = [];
            for (let i = 0; i < 6; i++) {
                let a = ang + i * Math.PI / 3;
                pts.push({ x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius * 0.6 });
            }
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                if (i === 0) ctx.moveTo(pts[i].x, pts[i].y);
                else ctx.lineTo(pts[i].x, pts[i].y);
            }
            ctx.closePath(); ctx.stroke();
            ctx.beginPath();
            for (let i = 0; i < 6; i += 2) { ctx.moveTo(cx, cy); ctx.lineTo(pts[i].x, pts[i].y); }
            ctx.stroke(); ctx.shadowBlur = 0;
            ctx.fillStyle = `rgba(${clr},.5)`; ctx.font = '9px monospace';
            ctx.fillText(`R: ${Math.round(radius)} mm`, cx + 70, cy - 30);
            ctx.fillText(`0: ${Math.round((ang * 180 / Math.PI) % 360)} deg`, cx - 100, cy + 40);
            ctx.strokeStyle = `rgba(${clr},.3)`;
            ctx.beginPath(); ctx.moveTo(cx - 100, cy); ctx.lineTo(cx + 100, cy); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx, cy - 80); ctx.lineTo(cx, cy + 80); ctx.stroke();
            let edgePhase = (t * 0.02) % 6, eIdx = Math.floor(edgePhase), eT = edgePhase - eIdx, nextIdx = (eIdx + 1) % 6;
            let px = pts[eIdx].x + (pts[nextIdx].x - pts[eIdx].x) * eT, py = pts[eIdx].y + (pts[nextIdx].y - pts[eIdx].y) * eT;
            ctx.fillStyle = `rgba(${clr},1)`; ctx.shadowBlur = 10; ctx.shadowColor = `rgba(${clr},1)`;
            ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
            t++; requestAnimationFrame(d);
        })();
    }
    function animA(ctx, w, h, cv, idx, clr) {
        const bg = ctx.createLinearGradient(0, 0, w, h); bg.addColorStop(0, `rgba(${clr},.11)`); bg.addColorStop(1, '#0a0c14');
        let t = 0; const nodes = [{ x: w * .2, y: h * .4 }, { x: w * .35, y: h * .7 }, { x: w * .5, y: h * .3 }, { x: w * .7, y: h * .6 }, { x: w * .85, y: h * .35 }];
        const routes = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 2], [1, 3]];
        (function d() {
            if (cv.__stopped) return;
            if (!cv.__visible) { cv.__paused = true; cv.__loop = d; return; } cv.__loop = d;
            ctx.clearRect(0, 0, w, h); ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = `rgba(${clr},.03)`; ctx.lineWidth = 1;
            for (let i = 10; i < w; i += 40) { ctx.beginPath(); for (let y = 0; y < h; y += 30) { let dx = Math.sin(y * .02 + i) * 15; if (y === 0) ctx.moveTo(i + dx, y); else ctx.lineTo(i + dx, y); } ctx.stroke(); }
            routes.forEach(([i, j]) => {
                const n1 = nodes[i], n2 = nodes[j], cx = (n1.x + n2.x) / 2, cy = (n1.y + n2.y) / 2 - 30;
                ctx.strokeStyle = `rgba(${clr},.15)`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(n1.x, n1.y); ctx.quadraticCurveTo(cx, cy, n2.x, n2.y); ctx.stroke();
                let p = (t * .005 + i * .1 + j * .2) % 1, px = (1 - p) * (1 - p) * n1.x + 2 * (1 - p) * p * cx + p * p * n2.x, py = (1 - p) * (1 - p) * n1.y + 2 * (1 - p) * p * cy + p * p * n2.y;
                ctx.fillStyle = `rgba(${clr},.8)`; ctx.shadowBlur = 10; ctx.shadowColor = `rgba(${clr},1)`; ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
            });
            nodes.forEach((n, i) => {
                let pulse = 1 + .2 * Math.sin(t * .05 + i);
                ctx.fillStyle = `rgba(${clr},.9)`; ctx.beginPath(); ctx.arc(n.x, n.y, 4, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = `rgba(${clr},${.3 - .3 * Math.sin(t * .05 + i)})`; ctx.beginPath(); ctx.arc(n.x, n.y, 12 * pulse, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = '10px Arial'; ctx.fillText('▼', n.x - 4, n.y - 6);
            });
            t++; requestAnimationFrame(d);
        })();
    }
    function animW(ctx, w, h, cv, idx, clr) {
        const bg = ctx.createLinearGradient(0, 0, w, h); bg.addColorStop(0, `rgba(${clr},.13)`); bg.addColorStop(1, '#0c0a14');
        let t = 0; const pts = [];
        (function d() {
            if (cv.__stopped) return;
            if (!cv.__visible) { cv.__paused = true; cv.__loop = d; return; } cv.__loop = d;
            ctx.clearRect(0, 0, w, h); ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = `rgba(${clr},.05)`; ctx.lineWidth = 1;
            for (let y = 0; y < h; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
            for (let x = 0; x < w; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
            const bY = h * .55; let sX = (t * 2.5) % w, y = bY;
            if (sX % 160 < 20) y = bY - 15 * Math.sin((sX % 160) / 20 * Math.PI); else if (sX % 160 < 40) y = bY + 25 * Math.sin((sX % 160 - 20) / 20 * Math.PI); else if (sX % 160 < 60) y = bY - 45 * Math.sin((sX % 160 - 40) / 20 * Math.PI); else if (sX % 160 < 80) y = bY + 15 * Math.sin((sX % 160 - 60) / 20 * Math.PI);
            pts.push({ x: sX, y: y }); if (pts.length > 150) pts.shift();
            if (pts.length > 1) {
                // Draw all segments in one pass without per-segment shadowBlur
                for (let i = 1; i < pts.length; i++) {
                    if (pts[i].x < pts[i - 1].x) continue;
                    let a = i / pts.length;
                    ctx.beginPath(); ctx.moveTo(pts[i - 1].x, pts[i - 1].y); ctx.lineTo(pts[i].x, pts[i].y);
                    ctx.strokeStyle = `rgba(${clr},${a})`; ctx.lineWidth = 2 + a / 2; ctx.stroke();
                }
                // Single glow only on the last few segments (leading edge)
                ctx.shadowBlur = 8; ctx.shadowColor = `rgba(${clr},1)`;
                for (let i = Math.max(1, pts.length - 6); i < pts.length; i++) {
                    if (pts[i].x < pts[i - 1].x) continue;
                    ctx.beginPath(); ctx.moveTo(pts[i - 1].x, pts[i - 1].y); ctx.lineTo(pts[i].x, pts[i].y);
                    ctx.strokeStyle = `rgba(${clr},1)`; ctx.lineWidth = 2.5; ctx.stroke();
                }
                ctx.shadowBlur = 0;
            }
            ctx.fillStyle = '#fff'; ctx.shadowBlur = 10; ctx.shadowColor = `rgba(${clr},1)`; ctx.beginPath(); ctx.arc(sX, y, 3, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
            ctx.strokeStyle = `rgba(${clr},0.3)`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sX, 0); ctx.lineTo(sX, h); ctx.stroke();
            t++; requestAnimationFrame(d);
        })();
    }

    // ── CAROUSEL MECHANICS ──
    const PROJ_CARD_W = 370, PROJ_CARD_GAP = 24, PROJ_STEP = PROJ_CARD_W + PROJ_CARD_GAP;
    const PROJ_NORMAL_H = 610, PROJ_EXPANDED_H = 730;
    let projSidePad = 0;

    function updateProjSidePad() {
        projSidePad = Math.max(40, Math.floor((window.innerWidth - PROJ_CARD_W) / 2));
        projTrack.style.paddingLeft = projSidePad + 'px';
        projTrack.style.paddingRight = projSidePad + 'px';
    }
    updateProjSidePad();
    window.addEventListener('resize', updateProjSidePad);

    // Inject smooth grid wrappers
    projCards.forEach((card) => {
        const pDesc = card.querySelector('.proj-desc-short');
        const pTags = card.querySelector('.proj-tags-short');
        const pExtra = card.querySelector('.proj-extra');

        const colWrap = document.createElement('div'); colWrap.className = 'proj-grid-collapse-wrapper';
        const colInner = document.createElement('div'); colInner.className = 'proj-grid-inner';
        colWrap.appendChild(colInner);
        pDesc.parentNode.insertBefore(colWrap, pDesc);
        colInner.appendChild(pDesc);
        colInner.appendChild(pTags);

        const expWrap = document.createElement('div'); expWrap.className = 'proj-grid-expand-wrapper';
        const expInner = document.createElement('div'); expInner.className = 'proj-grid-inner';
        expWrap.appendChild(expInner);
        pExtra.parentNode.insertBefore(expWrap, pExtra);
        expInner.appendChild(pExtra);
    });

    // Dots
    projCards.forEach((_, i) => {
        const d = document.createElement('div');
        d.className = 'dot' + (i === 0 ? ' active' : '');
        d.addEventListener('click', () => projSnapTo(i));
        projDotsEl.appendChild(d);
    });

    let projPos = 0, projTargetX = 0, projVelX = 0;
    let projIsDrag = false, projDragStartX = 0, projDragStartPos = 0, projLastDragX = 0, projLastDragT = 0, projDragMoved = false;
    let projActiveIdx = 0, projExpandedIdx = -1;

    function projClampPos(p) { return Math.max(-(projCards.length - 1) * PROJ_STEP, Math.min(0, p)); }
    function projGetActiveIdx() { return Math.max(0, Math.min(projCards.length - 1, Math.round(-projPos / PROJ_STEP))); }

    function projUpdateActiveCard() {
        const idx = projGetActiveIdx();
        if (idx === projActiveIdx) return;
        projActiveIdx = idx;
        projCards.forEach((c, i) => { if (projExpandedIdx < 0) c.classList.toggle('active', i === idx); });
        projDotsEl.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === idx));
    }

    function projSnapTo(idx) { projTargetX = projClampPos(-(idx * PROJ_STEP)); projVelX = 0; }

    // ── SCROLL-LOCK SYSTEM ──
    // When the projects section occupies a significant portion of the viewport,
    // page scrolling is intercepted and drives the carousel instead.
    // Once the carousel reaches first/last card, the lock releases.
    const projSection = document.getElementById('projects');
    let projScrollLocked = false;
    let projAtStart = true;   // carousel at card 0
    let projAtEnd = false;    // carousel at last card
    let projLockCooldown = 0; // prevent immediate re-lock after release
    let projIsRepositioning = false; // true during projScrollToSection() smooth scroll

    function projIsInView() {
        const r = projSection.getBoundingClientRect();
        const vh = window.innerHeight;
        // Lock as soon as section enters the viewport (top within lower 80% of screen)
        return r.top < vh * 0.8 && r.bottom > vh * 0.2;
    }

    function projScrollToSection() {
        const r = projSection.getBoundingClientRect();
        const vh = window.innerHeight;
        // Target: section top sits just above viewport top (at most by half the overflow)
        // cap at 0 so section never starts below viewport top
        const targetTop = Math.min(0, (vh - r.height) / 2);
        if (Math.abs(r.top - targetTop) < 25) return; // already well positioned
        projIsRepositioning = true;
        const targetScroll = window.scrollY + r.top - targetTop;
        window.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
        setTimeout(() => { projIsRepositioning = false; }, 700);
    }

    function projCheckEdges() {
        const maxOffset = (projCards.length - 1) * PROJ_STEP;
        projAtStart = (-projTargetX) <= 2;
        projAtEnd = (-projTargetX) >= maxOffset - 2;
    }

    // Global wheel handler for scroll-lock
    let projEdgeInertia = 0;

    window.addEventListener('wheel', function (e) {
        if (window._smoothScrollEndTime && Date.now() < window._smoothScrollEndTime) return; // avoid navbar transit bug
        if (projExpandedIdx >= 0) return; // expanded card has its own overlay
        if (Date.now() < projLockCooldown) return; // cooldown after release

        const scrollingDown = e.deltaY > 0;
        const scrollingUp = e.deltaY < 0;

        if (!projScrollLocked) {
            // Lock whenever section is in view (edge handled inside, not as pre-check)
            if (projIsInView()) {
                projCheckEdges();
                if ((scrollingDown && projAtEnd) || (scrollingUp && projAtStart)) {
                    return; // Allow scrolling past section without re-locking
                }
                projScrollLocked = true;
                projEdgeInertia = 0; // reset on new lock
                projScrollToSection();
            }
        }

        if (projScrollLocked) {
            e.preventDefault();
            projCheckEdges();

            // Release if at edge and user continues scrolling that direction
            // Dead-zone added to absorb trackpad inertia and avoid accidental exits
            if (scrollingDown && projAtEnd) {
                projEdgeInertia += e.deltaY;
                if (projEdgeInertia > 250) {
                    projScrollLocked = false;
                    projLockCooldown = Date.now() + 600;
                    projEdgeInertia = 0;
                    return;
                }
            } else if (scrollingUp && projAtStart) {
                projEdgeInertia -= e.deltaY; // e.deltaY is negative, subtract to accumulate positive inertia
                if (projEdgeInertia > 250) {
                    projScrollLocked = false;
                    projLockCooldown = Date.now() + 600;
                    projEdgeInertia = 0;
                    return;
                }
            } else {
                projEdgeInertia = 0; // Reset if user changes direction or is inside the carousel
            }

            // Drive carousel — 0.23 ≈ 0.35/1.5 → ~1.5× slower than page scroll
            projVelX -= e.deltaY * 0.23;
        }
    }, { passive: false });

    // Release lock if section scrolls out of view (e.g. via keyboard scroll)
    // Debounced: avoids premature release during projScrollToSection() smooth scroll
    let projScrollReleaseTimer = null;
    window.addEventListener('scroll', function () {
        if (!projScrollLocked || projIsRepositioning) return;
        if (!projIsInView()) {
            if (!projScrollReleaseTimer) {
                projScrollReleaseTimer = setTimeout(() => {
                    if (projScrollLocked && !projIsInView()) projScrollLocked = false;
                    projScrollReleaseTimer = null;
                }, 200);
            }
        } else {
            clearTimeout(projScrollReleaseTimer);
            projScrollReleaseTimer = null;
        }
    }, { passive: true });

    // Mouse drag
    projOuter.addEventListener('mousedown', e => {
        if (projExpandedIdx >= 0) return;
        projIsDrag = true; projDragMoved = false;
        projDragStartX = e.clientX; projDragStartPos = projTargetX; projLastDragX = e.clientX; projLastDragT = performance.now(); projVelX = 0;
        projOuter.classList.add('dragging');
    });
    window.addEventListener('mousemove', e => {
        if (!projIsDrag) return;
        if (Math.abs(e.clientX - projDragStartX) > 4) projDragMoved = true;
        projTargetX = projClampPos(projDragStartPos + (e.clientX - projDragStartX));
        const now = performance.now(); projVelX = (e.clientX - projLastDragX) / Math.max(1, now - projLastDragT) * 10;
        projLastDragX = e.clientX; projLastDragT = now;
    });
    window.addEventListener('mouseup', () => {
        if (!projIsDrag) return; projIsDrag = false; projOuter.classList.remove('dragging');
        if (!projDragMoved) return;
        projSnapTo(Math.max(0, Math.min(projCards.length - 1, Math.round(-projTargetX / PROJ_STEP) - Math.sign(projVelX))));
    });

    // Touch
    projOuter.addEventListener('touchstart', e => {
        if (projExpandedIdx >= 0) return;
        projDragStartX = e.touches[0].clientX; projDragStartPos = projTargetX; projLastDragX = projDragStartX; projLastDragT = performance.now(); projVelX = 0; projIsDrag = true; projDragMoved = false;
    }, { passive: true });
    projOuter.addEventListener('touchmove', e => {
        if (!projIsDrag) return;
        const dx = e.touches[0].clientX - projDragStartX; if (Math.abs(dx) > 4) projDragMoved = true;
        projTargetX = projClampPos(projDragStartPos + dx); const now = performance.now();
        projVelX = (e.touches[0].clientX - projLastDragX) / Math.max(1, now - projLastDragT) * 10; projLastDragX = e.touches[0].clientX; projLastDragT = now;
    }, { passive: true });
    projOuter.addEventListener('touchend', () => {
        projIsDrag = false; if (!projDragMoved) return;
        projSnapTo(Math.max(0, Math.min(projCards.length - 1, Math.round(-projTargetX / PROJ_STEP) - Math.sign(projVelX))));
    });

    // Main loop
    const PROJ_LERP = 0.1, PROJ_FRICTION = 0.75;
    function projLoop() {
        if (!projIsDrag && projExpandedIdx < 0) {
            projTargetX = projClampPos(projTargetX + projVelX); projVelX *= PROJ_FRICTION;
            if (Math.abs(projVelX) < .3) {
                projVelX = 0;
                const sn = projClampPos(-(Math.max(0, Math.min(projCards.length - 1, Math.round(-projTargetX / PROJ_STEP))) * PROJ_STEP));
                projTargetX += (sn - projTargetX) * .06;
            }
        }
        projPos += (projTargetX - projPos) * PROJ_LERP;
        projTrack.style.transform = `translateX(${projPos}px)`;
        projUpdateActiveCard();
        projCheckEdges();
        requestAnimationFrame(projLoop);
    }

    projCards[0].classList.add('active');
    projTrack.querySelectorAll('.card-canvas').forEach((c, idx) => startProjAnimation(c, c.dataset.type, idx));
    projSnapTo(0);
    projLoop();

    // Pause canvas animations when tab is hidden, resume on return
    document.addEventListener('visibilitychange', () => {
        const cvs = projTrack.querySelectorAll('.card-canvas');
        if (document.hidden) {
            cvs.forEach(cv => { cv.__savedVisible = cv.__visible; cv.__visible = false; });
        } else {
            cvs.forEach(cv => {
                if (cv.__savedVisible !== undefined) { cv.__visible = cv.__savedVisible; delete cv.__savedVisible; }
                if (cv.__paused && cv.__loop && cv.__visible) { cv.__paused = false; requestAnimationFrame(cv.__loop); }
            });
        }
    });

    // ── EXPAND / COLLAPSE ──
    projOverlay.addEventListener('click', projCollapseCard);

    window._projRebuildExtra = function () {
        projCards.forEach((c, idx) => {
            const extra = c.querySelector('.proj-extra');
            if (extra && extra.dataset.loaded) {
                extra.dataset.loaded = '';
                projPopulateExtra(c, idx);
            }
        });
    };

    function projPopulateExtra(card, idx) {
        const extra = card.querySelector('.proj-extra');
        if (extra.dataset.loaded) return;
        const p = PROJECTS[idx];
        const isFr = (typeof currentLang !== 'undefined' && currentLang === 'fr');
        const desc = isFr && p.descFr ? p.descFr : p.desc;
        const period = isFr && p.periodFr ? p.periodFr : p.period;
        const context = isFr && p.contextFr ? p.contextFr : p.context;
        extra.innerHTML = `
            <div class="proj-divider-exp"></div>
            <div class="proj-meta-exp">
                <span class="proj-meta-item"><i class="fas fa-calendar-alt"></i>${period}</span>
                <span class="proj-meta-item"><i class="fas fa-map-marker-alt"></i>${context}</span>
            </div>
            <div class="proj-desc-full">${desc}</div>
            <p class="proj-tags-title-exp">Technologies</p>
            <div class="proj-tags-exp">${p.tags.map(t => `<span class="proj-tag">${t}</span>`).join('')}</div>
        `;
        extra.dataset.loaded = '1';
    }

    function projExpandCard(idx) {
        const card = projCards[idx];
        projPopulateExtra(card, idx);
        projExpandedIdx = idx;
        window._projExpandedIdx = idx;

        // Center expanded card vertically in viewport before locking scroll
        // card top = outerAbsTop + track_pad(16) + expanded_margin_top(-170) = outerAbsTop - 154
        // card center = outerAbsTop - 154 + expandedHeight(760)/2 = outerAbsTop + 226
        const outerAbsTop = projOuter.getBoundingClientRect().top + window.scrollY;
        const targetScrollY = outerAbsTop + 226 - window.innerHeight / 2;
        window.scrollTo({ top: Math.max(0, targetScrollY) });

        // Lock body scroll
        document.body.style.overflow = 'hidden';

        projPos = projClampPos(-(idx * PROJ_STEP));
        projTargetX = projPos;
        projTrack.style.transform = `translateX(${projPos}px)`;

        projCards.forEach((c, i) => {
            c.classList.toggle('active', i === idx);
            if (i < idx) { c.classList.add('shift-left'); }
            else if (i > idx) { c.classList.add('shift-right'); }
            if (i !== idx) { c.style.opacity = '.28'; c.style.filter = 'blur(2.5px) brightness(0.6)'; }
        });

        projOverlay.classList.add('active');
        card.classList.add('expanded');
        projOuter.style.height = PROJ_EXPANDED_H + 'px';
    }

    function projCollapseCard() {
        if (projExpandedIdx < 0) return;
        const prevIdx = projExpandedIdx;
        const card = projCards[prevIdx];
        card.classList.remove('expanded');
        projOuter.style.height = PROJ_NORMAL_H + 'px';

        // Unlock body scroll
        document.body.style.overflow = '';

        projPos = projClampPos(-(prevIdx * PROJ_STEP));
        projTargetX = projPos;
        projTrack.style.transform = `translateX(${projPos}px)`;

        projCards.forEach(c => {
            c.style.opacity = ''; c.style.filter = '';
            c.classList.remove('shift-left', 'shift-right');
        });
        projOverlay.classList.remove('active');
        projExpandedIdx = -1;
        window._projExpandedIdx = -1;

        setTimeout(() => {
            const idx = projGetActiveIdx();
            projCards.forEach((c, i) => c.classList.toggle('active', i === idx));
            projDotsEl.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === idx));
        }, 100);
    }

    // Expose globally for smoothScrollTo nav integration
    window._projCollapseCard = projCollapseCard;
    window._projExpandedIdx = -1;
    window._projSnapTo = projSnapTo;
    window._projLastIdx = projCards.length - 1;

    projCards.forEach((card, idx) => {
        // Inject spin element
        const spin = document.createElement('div');
        spin.className = 'proj-border-spin';
        card.appendChild(spin);

        card.addEventListener('click', () => {
            if (projDragMoved) return;
            if (projExpandedIdx === idx) { projCollapseCard(); return; }
            if (projExpandedIdx >= 0) { projCollapseCard(); return; }
            projDoExpand(idx);
        });
    });

    function projDoExpand(idx) {
        const alreadyCentered = Math.abs(projPos - projClampPos(-(idx * PROJ_STEP))) < 2;
        if (alreadyCentered) {
            projExpandCard(idx);
        } else {
            projSnapTo(idx);
            setTimeout(() => projExpandCard(idx), 520);
        }
    }

    // ESC to collapse
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && projExpandedIdx >= 0) projCollapseCard(); });
})();

