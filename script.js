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
// TIMELINE — new tl-* system
// =========================================================

// Click expand / collapse (new tl-* system — experience)
document.querySelectorAll('.tl-item').forEach(item => {
    item.querySelector('.tl-card').addEventListener('click', () => {
        item.classList.toggle('open');
    });
});

// Click expand / collapse (legacy — education & projects)
document.querySelectorAll('.timeline-item').forEach(item => {
    item.addEventListener('click', () => {
        item.classList.toggle('expanded');
    });
});

// Scroll reveal
(function() {
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
(function() {
    const tlEl  = document.getElementById('tl-exp');
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

    function cachePositions() {
        const tlAbs = tlEl.getBoundingClientRect().top + window.scrollY;
        const tlH   = tlEl.offsetHeight;
        dotData = Array.from(document.querySelectorAll('#tl-exp .tl-marker')).map(marker => {
            const dot   = marker.querySelector('.tl-dot');
            const dRect = dot.getBoundingClientRect();
            const dAbs  = dRect.top + window.scrollY + dRect.height / 2;
            return { marker, progress: (dAbs - tlAbs) / tlH };
        });
        itemData = Array.from(document.querySelectorAll('#tl-exp .tl-item')).map(item => {
            const rect = item.getBoundingClientRect();
            return {
                item,
                top:    rect.top + window.scrollY - tlAbs,
                bottom: rect.top + window.scrollY + rect.height - tlAbs,
                sweeping: false
            };
        });
    }

    setTimeout(cachePositions, 300);
    window.addEventListener('resize', cachePositions);
    document.querySelectorAll('#tl-exp .tl-item').forEach(item => {
        item.addEventListener('click', () => setTimeout(cachePositions, 1000));
    });

    const t0 = performance.now();
    let prevEnergized = new Set();

    function loop(now) {
        const elapsed = now - t0;
        const tlH = tlEl.offsetHeight;

        // Move particle
        const t = (elapsed / DURATION) % 1;
        const y = t * tlH;
        let alpha = 1;
        if (t < 0.07) alpha = t / 0.07;
        if (t > 0.93) alpha = (1 - t) / 0.07;
        pEl.style.transform = `translateY(${y}px)`;
        pEl.style.opacity   = alpha;

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
                if (hit && !wasOn)  marker.classList.add('energized');
                if (!hit && wasOn)  marker.classList.remove('energized');
            });
        }
        prevEnergized = nowEnergized;
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    // Auto-collapse when user scrolls away
    const section = document.getElementById('experience');
    if (section) {
        new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (!e.isIntersecting) {
                    document.querySelectorAll('#tl-exp .tl-item.open').forEach(i => i.classList.remove('open'));
                    setTimeout(cachePositions, 1000);
                }
            });
        }, { threshold: 0.05 }).observe(section);
    }
})();

// =========================================================
// RÉSEAU DE NEURONES 3D (Three.js)
// =========================================================

// Shockwave click system — smooth bell-curve boost
let shockwaveT  = -1;   // -1 = inactive, 0→1 = active
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
        shockwaveCX    = heroRightRect.left + heroRightRect.width  / 2 - heroBgRect.left;
        shockwaveCY    = heroRightRect.top  + heroRightRect.height / 2 - heroBgRect.top;
        shockwaveMaxR  = Math.max(heroRightRect.width, heroRightRect.height) * 0.9;
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
    const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    grad.addColorStop(0,    'rgba(255,255,255,1)');
    grad.addColorStop(0.25, 'rgba(255,255,255,0.6)');
    grad.addColorStop(0.6,  'rgba(255,255,255,0.15)');
    grad.addColorStop(1,    'rgba(255,255,255,0)');
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
let heroLeftRect  = null;
// Cursor halo position (in heroBgCanvas coords)
let heroBgMouseX = -2000, heroBgMouseY = -2000;

// Seuil de proximité pour l'activation des nœuds par les particules (3D units)
const NODE_ACTIVATION_RADIUS = 0.55;

function updateHeroRightRect() {
    const el = document.querySelector('.hero-right');
    if (el) heroRightRect = el.getBoundingClientRect();
    const elLeft = document.querySelector('.hero-left');
    if (elLeft) heroLeftRect = elLeft.getBoundingClientRect();
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
        cursorTargetY >= heroRightRect.top  && cursorTargetY <= heroRightRect.bottom;
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
        grad.addColorStop(0,    `hsla(${blob.hue}, 90%, 62%, ${0.10 + boost * 0.06})`);
        grad.addColorStop(0.45, `hsla(${blob.hue}, 85%, 58%, ${0.04 + boost * 0.025})`);
        grad.addColorStop(1,    `hsla(${blob.hue}, 80%, 55%, 0)`);
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
            const r     = eased * maxR * scale;

            const alpha = Math.min(pt / 0.12, 1) * Math.pow(1 - pt, 1.8) * 0.6;
            const lw    = (1 - pt) * 4.0 + 0.6;
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
        clipCX = heroRightRect.left + heroRightRect.width  / 2 - bgRect.left;
        clipCY = heroRightRect.top  + heroRightRect.height / 2 - bgRect.top;
        clipR  = Math.min(heroRightRect.width, heroRightRect.height) * 0.56;
    }
    // Zone de texte gauche — ellipse collée au texte, fade dans draw()
    if (heroLeftRect) {
        textCX = (heroLeftRect.left + heroLeftRect.right)  / 2 - bgRect.left;
        textCY = (heroLeftRect.top  + heroLeftRect.bottom) / 2 - bgRect.top;
        textRX = heroLeftRect.width  / 2 + 24;
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
                    const di = Math.sqrt(dxi*dxi + dyi*dyi);
                    const inner = clipR * 0.62;
                    fadeI = di < inner ? 0 : di < clipR ? (di - inner) / (clipR - inner) : 1;
                    const dxj = heroBgParticles[j].x - clipCX, dyj = heroBgParticles[j].y - clipCY;
                    const dj = Math.sqrt(dxj*dxj + dyj*dyj);
                    fadeJ = dj < inner ? 0 : dj < clipR ? (dj - inner) / (clipR - inner) : 1;
                }
                // Fade zone texte pour les connexions
                if (textRX > 0) {
                    const minFadeT = 0.18;
                    const niX = (heroBgParticles[i].x - textCX) / textRX;
                    const niY = (heroBgParticles[i].y - textCY) / textRY;
                    const ndI = Math.sqrt(niX*niX + niY*niY);
                    fadeI *= ndI < 0.70 ? minFadeT : ndI < 1.0 ? minFadeT + (1 - minFadeT) * (ndI - 0.70) / 0.30 : 1;
                    const njX = (heroBgParticles[j].x - textCX) / textRX;
                    const njY = (heroBgParticles[j].y - textCY) / textRY;
                    const ndJ = Math.sqrt(njX*njX + njY*njY);
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
    drawCursor(timestamp);

    requestAnimationFrame(animate);
}

// =========================================================
// CURSEUR — DOT + RING GRADIENT FLOU
// =========================================================

const cursorCanvas = document.getElementById('cursor-canvas');
const cursorCtx = cursorCanvas.getContext('2d');

let cursorTargetX = -500, cursorTargetY = -500;
let cursorX = -500, cursorY = -500;
let cursorAlpha = 1;
let cursorTargetAlpha = 1;

window.addEventListener('mousemove', (e) => {
    cursorTargetX = e.clientX;
    cursorTargetY = e.clientY;

    // Détecter si on survole un élément de contenu → estomper l'aura
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (el) {
        const tag = el.tagName.toLowerCase();
        cursorTargetAlpha = ['canvas', 'body', 'html'].includes(tag) ? 1.0 : 0.0;
    }
});

function resizeCursorCanvas() {
    cursorCanvas.width  = window.innerWidth;
    cursorCanvas.height = window.innerHeight;
}

function drawCursor(ts) {
    cursorCtx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);
    return; // aura curseur désactivée

    cursorX += (cursorTargetX - cursorX) * 0.15;
    cursorY += (cursorTargetY - cursorY) * 0.15;
    cursorAlpha += (cursorTargetAlpha - cursorAlpha) * 0.10;

    if (cursorAlpha < 0.01) return;

    cursorCtx.save();
    cursorCtx.globalAlpha = cursorAlpha;

    // Aura externe large et très douce
    const outer = cursorCtx.createRadialGradient(cursorX, cursorY, 0, cursorX, cursorY, 55);
    outer.addColorStop(0,    'rgba(56,189,248,0.12)');
    outer.addColorStop(0.35, 'rgba(56,189,248,0.07)');
    outer.addColorStop(0.65, 'rgba(129,140,248,0.04)');
    outer.addColorStop(1,    'rgba(129,140,248,0)');
    cursorCtx.fillStyle = outer;
    cursorCtx.beginPath();
    cursorCtx.arc(cursorX, cursorY, 55, 0, Math.PI * 2);
    cursorCtx.fill();

    // Halo intérieur plus concentré
    const inner = cursorCtx.createRadialGradient(cursorX, cursorY, 0, cursorX, cursorY, 20);
    inner.addColorStop(0,   'rgba(56,189,248,0.22)');
    inner.addColorStop(0.5, 'rgba(56,189,248,0.08)');
    inner.addColorStop(1,   'rgba(56,189,248,0)');
    cursorCtx.fillStyle = inner;
    cursorCtx.beginPath();
    cursorCtx.arc(cursorX, cursorY, 20, 0, Math.PI * 2);
    cursorCtx.fill();

    cursorCtx.restore();
}

window.addEventListener('resize', resizeCanvases);
window.addEventListener('resize', resizeCursorCanvas);
resizeCanvases();
resizeCursorCanvas();
animate(0);

// =========================================================
// NAVIGATION — FLOATING ISLAND
// =========================================================

(function initNavIsland() {
    const navEl     = document.getElementById('nav-wrapper');
    const island    = document.getElementById('nav-island');
    const indicator = document.getElementById('nav-indicator');
    const links     = island ? island.querySelectorAll('a[data-section]') : [];

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
        indicator.style.left    = (indX ?? 0) + 'px';
        indicator.style.width   = (indW ?? 0) + 'px';
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
            const isCompact  = window.scrollY > heroBottom;
            navEl.classList.toggle('nav-scrolled', window.scrollY > 50);
            navEl.classList.toggle('nav-compact',  isCompact);

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

    window.addEventListener('resize', () => trackActive(500));
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
        'exp.dassault.role': 'Stagiaire Data &amp; IA Scientist',
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
