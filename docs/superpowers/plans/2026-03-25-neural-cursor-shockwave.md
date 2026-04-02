# Neural Network + Cursor + Shockwave Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Améliorer le réseau de neurones 3D (heatmap activation + wave propagation), ajouter un curseur blob avec particules grossières, et aplatir la courbe shockwave pour un plateau plus long.

**Architecture:** Toutes les modifications sont dans 3 fichiers statiques (script.js, style.css, index.html). Pas de build system. Le curseur est un canvas overlay fixe. Le réseau de neurones étend le système Three.js existant avec un système de poids + wave d'activation.

**Tech Stack:** Three.js r134 (CDN), Canvas 2D API, CSS custom properties (`--primary: #38bdf8`, `--secondary: #818cf8`)

---

## File Map

| Fichier | Modifications |
|---------|---------------|
| `script.js:568-571` | Shockwave exponent fix |
| `script.js:130-168` | Edges : ajouter `weight`, augmenter particles density + size |
| `script.js:112-129` | Nodes : augmenter radii, ajouter glow spheres (AdditiveBlending) |
| `script.js:236-275` | `animateNeural` : wave propagation system + heatmap colors |
| `script.js:170-204` | Mouse interaction : wave speed multiplier |
| `script.js:~587` | Ajouter le système CursorBlob |
| `style.css:21` | `body { cursor: none }` + canvas overlay styles |
| `index.html:14-16` | Ajouter `<canvas id="cursor-canvas">` |

---

## Task 1 : Shockwave plateau — courbe aplatie

**Files:**
- Modify: `script.js:569-571`

- [ ] **Step 1 : Localiser la courbe**

Dans `script.js`, chercher `Math.pow(Math.sin(shockwaveT * Math.PI), 0.65)` (ligne ~570).

- [ ] **Step 2 : Changer l'exposant**

```js
// AVANT
heroClickBoost = shockwaveT >= 0
    ? Math.pow(Math.sin(shockwaveT * Math.PI), 0.65)
    : 0;

// APRÈS — exposant 0.12 = plateau très plat, reste "activé" ~75% de la durée
heroClickBoost = shockwaveT >= 0
    ? Math.pow(Math.sin(shockwaveT * Math.PI), 0.12)
    : 0;
```

- [ ] **Step 3 : Vérifier visuellement**

Ouvrir `http://localhost:8080`, cliquer "Découvrir mon profil". L'animation doit rester à pleine intensité plus longtemps avant de redescendre.

- [ ] **Step 4 : Commit**

```bash
git add script.js
git commit -m "fix: aplatir la courbe shockwave pour un plateau plus long"
```

---

## Task 2 : Réseau de neurones — nœuds, glow, tailles

**Files:**
- Modify: `script.js:111-129` (node meshes section)

- [ ] **Step 1 : Augmenter les rayons et ajouter un glow sphère**

Remplacer la section `// --- Node meshes ---` (lignes ~112–129) :

```js
// --- Node meshes ---
const nodeObjects = [];
let cumCount = 0;
LAYER_COUNTS.forEach((count, li) => {
    const isSingle = count === 1;
    const isEdge = li === 1 || li === LAYER_COUNTS.length - 2;
    const radius = isSingle ? 0.15 : 0.09;

    for (let i = 0; i < count; i++) {
        const pos = allNodePositions[cumCount + i];

        // Core node — couleur mise à jour chaque frame par animateNeural
        const geo = new THREE.SphereGeometry(radius, 16, 16);
        const mat = new THREE.MeshBasicMaterial({ color: 0x818cf8 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        neuralGroup.add(mesh);

        // Glow halo — sphère plus grande, blending additif
        const glowGeo = new THREE.SphereGeometry(radius * 3.5, 12, 12);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0x818cf8,
            transparent: true,
            opacity: 0.07,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const glowMesh = new THREE.Mesh(glowGeo, glowMat);
        glowMesh.position.copy(pos);
        neuralGroup.add(glowMesh);

        nodeObjects.push({
            mesh, glowMesh,
            pulseOffset: Math.random() * Math.PI * 2,
            isSingle,
            activation: 0,
            freq: 0.6 + Math.random() * 1.2,
            phase: Math.random() * Math.PI * 2,
        });
    }
    cumCount += count;
});
```

- [ ] **Step 2 : Vérifier en browser**

Les nœuds doivent être nettement plus grands et avoir un halo visible.

- [ ] **Step 3 : Commit**

```bash
git add script.js
git commit -m "feat: augmenter taille nœuds et ajouter glow halo 3D"
```

---

## Task 3 : Réseau de neurones — connexions avec poids + particles

**Files:**
- Modify: `script.js:131-168` (connections section)

- [ ] **Step 1 : Ajouter `weight` aux edges et augmenter les particules**

Remplacer la section `// --- Full connections ---` (lignes ~131–168) :

```js
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
            const weight = 0.25 + Math.random() * 0.75; // poids simulé 0.25–1.0
            const lineGeo = new THREE.BufferGeometry().setFromPoints([posA.clone(), posB.clone()]);
            const lineMat = new THREE.LineBasicMaterial({
                color: 0x818cf8,
                transparent: true,
                opacity: weight * 0.12, // opacité de base proportionnelle au poids
            });
            const line = new THREE.Line(lineGeo, lineMat);
            neuralGroup.add(line);

            // Particles — 60% des edges (au lieu de 35%)
            const edgeParticles = [];
            if (Math.random() < 0.60) {
                const pRadius = 0.05 + Math.random() * 0.04; // plus grosses : 0.05–0.09
                const pgeo = new THREE.SphereGeometry(pRadius, 8, 8);
                const pmat = new THREE.MeshBasicMaterial({
                    color: 0x38bdf8,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                });
                const pmesh = new THREE.Mesh(pgeo, pmat);
                const t0 = Math.random();
                pmesh.position.lerpVectors(posA, posB, t0);
                neuralGroup.add(pmesh);
                edgeParticles.push({
                    mesh: pmesh, t: t0,
                    baseSpeed: 0.003 + Math.random() * 0.004,
                    posA, posB, weight,
                });
            }
            connectionObjects.push({ line, lineMat, edgeParticles, weight });
        });
    });
});
```

- [ ] **Step 2 : Vérifier en browser**

Plus de particules, plus grosses, connexions avec opacité variable selon poids.

- [ ] **Step 3 : Commit**

```bash
git add script.js
git commit -m "feat: connexions avec poids simulés, particles plus denses et grosses"
```

---

## Task 4 : Réseau de neurones — wave d'activation + heatmap couleurs

> ⚠️ **Dépendance** : Task 3 doit être commitée avant d'appliquer Task 4. `animateNeural` référence `conn.lineMat` et `conn.weight` qui n'existent que dans la nouvelle structure de `connectionObjects`.

**Files:**
- Modify: `script.js:170-204` (mouse state section — ajouter wavePos)
- Modify: `script.js:236-275` (animateNeural function)

- [ ] **Step 1 : Ajouter l'état de la wave juste après les variables de rotation (~ligne 176)**

Insérer après `let heroRightRect = null;` :

```js
// Wave d'activation — se propage de gauche (input) à droite (output)
let wavePos = 0;          // 0..1 : position dans le réseau
const WAVE_BASE_SPEED = 0.004;
```

- [ ] **Step 2 : Remplacer le corps de `animateNeural`**

Remplacer entièrement la fonction `animateNeural` (lignes ~237–275) :

```js
function animateNeural(timestamp) {
    if (!prefersReducedMotion) {
        neuralVelY += neuralMouseRelX * 0.0011;
        neuralVelY *= 0.93;
        neuralAngleY += neuralVelY;
    }
    const targetRotX = -neuralMouseNY * 0.28;
    neuralRotX += (targetRotX - neuralRotX) * 0.05;
    neuralGroup.rotation.x = neuralRotX;
    neuralGroup.rotation.y = neuralAngleY;
    neuralGroup.updateMatrixWorld();

    const t = timestamp * 0.001;

    // Mouse proximity → accélère la wave
    const mouseBoost = heroRightRect
        ? Math.max(0, 1 - Math.abs(neuralMouseRelX)) * 3.5
        : 0;
    const waveSpeed = WAVE_BASE_SPEED * (1 + mouseBoost + heroClickBoost * 4);
    wavePos = (wavePos + waveSpeed) % 1;

    // Helpers couleur heatmap : activation 0=violet, 1=cyan
    function actToColor(act) {
        // Lerp HSL : 245° (indigo) → 194° (cyan)
        const hue = 245 - act * 51;
        const sat = 80 + act * 20;
        const light = 55 + act * 25;
        // Convertir en hex Three.js via CSS string
        const c = new THREE.Color();
        c.setHSL(hue / 360, sat / 100, light / 100);
        return c;
    }

    // Mettre à jour l'activation de chaque nœud
    nodeObjects.forEach((n, ni) => {
        // Position normalisée du nœud dans le réseau (0=input, 1=output)
        const layerIdx = (() => {
            let cum = 0;
            for (let li = 0; li < LAYER_COUNTS.length; li++) {
                cum += LAYER_COUNTS[li];
                if (ni < cum) return li;
            }
            return LAYER_COUNTS.length - 1;
        })();
        const nodeNorm = layerIdx / (LAYER_COUNTS.length - 1); // 0..1

        // Activation = bell curve autour de wavePos
        const distToWave = Math.abs(nodeNorm - wavePos);
        const wrappedDist = Math.min(distToWave, 1 - distToWave);
        const waveAct = Math.max(0, 1 - wrappedDist / 0.22);
        const idle = 0.18 + 0.12 * Math.sin(t * n.freq + n.phase);
        n.activation = Math.min(1, waveAct * 0.85 + idle);

        // Appliquer couleur heatmap au nœud
        const col = actToColor(n.activation);
        n.mesh.material.color.copy(col);

        // Glow : opacité + couleur selon activation
        n.glowMesh.material.color.copy(col);
        n.glowMesh.material.opacity = 0.04 + n.activation * 0.18;

        // Scale pulse
        const clickSpring = heroClickBoost > 0
            ? Math.pow(Math.sin(heroClickBoost * Math.PI), 0.6) * 1.4
            : 0;
        const idlePulse = n.isSingle ? 0.3 : 0.18;
        const s = (1 + Math.sin(t + n.pulseOffset) * idlePulse) + clickSpring;
        n.mesh.scale.setScalar(Math.max(0.1, s));
        n.glowMesh.scale.setScalar(Math.max(0.1, s));
    });

    // Mettre à jour les connexions + particules
    connectionObjects.forEach(conn => {
        conn.edgeParticles.forEach(p => {
            const proximityBoost = prefersReducedMotion ? 1 : getParticleBoost(p.mesh);
            const clickSpeedBoost = 1 + heroClickBoost * 4;
            p.t += p.baseSpeed * proximityBoost * clickSpeedBoost * (1 + mouseBoost);
            if (p.t > 1) p.t = 0;
            p.mesh.position.lerpVectors(p.posA, p.posB, p.t);

            // Couleur particle selon position dans la wave
            const pNorm = p.posA.x / X_SPAN + 0.5; // approx layer norm
            const distP = Math.abs(pNorm - wavePos);
            const pAct = Math.max(0, 1 - Math.min(distP, 1-distP) / 0.25);
            const c = new THREE.Color();
            c.setHSL((245 - pAct * 51) / 360, 1, 0.65 + pAct * 0.15);
            p.mesh.material.color.copy(c);
        });

        // Opacité connexion = poids × activation moyenne des deux extrémités
        const edgePts = conn.line.geometry.attributes.position;
        if (edgePts) {
            // Proxy activation via wavePos distance
            const x0 = edgePts.getX(0), x1 = edgePts.getX(1);
            const norm0 = x0 / X_SPAN + 0.5;
            const norm1 = x1 / X_SPAN + 0.5;
            const avgNorm = (norm0 + norm1) / 2;
            const d = Math.abs(avgNorm - wavePos);
            const lineAct = Math.max(0, 1 - Math.min(d, 1-d) / 0.25);
            conn.lineMat.opacity = conn.weight * (0.06 + lineAct * 0.55);

            // Couleur connexion heatmap
            const hue = (245 - lineAct * 51) / 360;
            conn.lineMat.color.setHSL(hue, 0.9, 0.6);
        }
    });

    neuralRenderer.render(neuralScene, neuralCamera);
}
```

- [ ] **Step 3 : Vérifier en browser**

La vague doit se propager de gauche à droite en continu. Les nœuds et connexions actifs brillent en cyan, les inactifs sont violet sombre. La souris sur le panel doit accélérer la propagation.

- [ ] **Step 4 : Commit**

```bash
git add script.js
git commit -m "feat: wave d'activation + heatmap couleurs sur réseau 3D"
```

---

## Task 5 : Curseur blob avec particules grossières

**Files:**
- Modify: `index.html:14-16` (après le canvas bg-stars)
- Modify: `style.css:21` (body + canvas overlay)
- Modify: `script.js:583-586` (avant `resizeCanvases`)

- [ ] **Step 1 : Ajouter le canvas dans index.html**

Juste après `<canvas id="bg-stars"></canvas>` (ligne ~16), insérer :

```html
<canvas id="cursor-canvas"></canvas>
```

- [ ] **Step 2 : Ajouter les styles dans style.css**

Dans la règle `body { ... }` (ligne ~21), ajouter `cursor: none;`.

Ensuite, après la règle `body`, ajouter :

```css
#cursor-canvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    z-index: 99999;
}
```

- [ ] **Step 3 : Ajouter le système CursorBlob dans script.js**

Insérer juste avant la ligne `window.addEventListener('resize', resizeCanvases);` (~ligne 584) :

```js
// =========================================================
// CURSEUR BLOB — aura avec particules grossières
// =========================================================

const cursorCanvas = document.getElementById('cursor-canvas');
const cursorCtx = cursorCanvas.getContext('2d');

// State
let cursorTargetX = -500, cursorTargetY = -500;
let cursorBlobX   = -500, cursorBlobY   = -500;
let cursorVelX = 0, cursorVelY = 0; // pour calculer la direction
let prevCursorX = -500, prevCursorY = -500;

const blobParticles = [];

class BlobParticle {
    constructor(x, y, dirX, dirY) {
        const spread = (Math.random() - 0.5) * 2.8;
        const speed  = 1.5 + Math.random() * 2.5;
        this.x = x + (Math.random() - 0.5) * 12;
        this.y = y + (Math.random() - 0.5) * 12;
        this.vx = (dirX + spread) * speed;
        this.vy = (dirY + spread) * speed;
        this.radius = 8 + Math.random() * 12;      // grossier : 8–20px
        this.life   = 1.0;
        this.decay  = 0.022 + Math.random() * 0.018;
        this.hue    = Math.random() > 0.5 ? 194 : 255; // cyan ou violet
    }
    update() {
        this.x  += this.vx;
        this.y  += this.vy;
        this.vx *= 0.92;
        this.vy *= 0.92;
        this.life -= this.decay;
        this.radius *= 0.97;
    }
    draw(ctx) {
        if (this.life <= 0) return;
        const a = this.life * 0.55;
        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        grad.addColorStop(0, `hsla(${this.hue}, 100%, 70%, ${a})`);
        grad.addColorStop(1, `hsla(${this.hue}, 100%, 70%, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    get dead() { return this.life <= 0 || this.radius < 1; }
}

window.addEventListener('mousemove', (e) => {
    cursorTargetX = e.clientX;
    cursorTargetY = e.clientY;

    // Direction du mouvement
    const dx = e.clientX - prevCursorX;
    const dy = e.clientY - prevCursorY;
    const len = Math.sqrt(dx*dx + dy*dy);
    if (len > 2) { // on ne spawn que si le curseur bouge vraiment
        const dirX = dx / len, dirY = dy / len;
        const count = 3 + Math.floor(Math.random() * 3); // 3–5 particules
        for (let i = 0; i < count; i++) {
            blobParticles.push(new BlobParticle(e.clientX, e.clientY, dirX, dirY));
        }
    }
    prevCursorX = e.clientX;
    prevCursorY = e.clientY;
});

// Resize du canvas curseur
function resizeCursorCanvas() {
    cursorCanvas.width  = window.innerWidth;
    cursorCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCursorCanvas);
resizeCursorCanvas();

function drawCursor(ts) {
    cursorCtx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);

    // Lerp du blob vers la cible
    cursorBlobX += (cursorTargetX - cursorBlobX) * 0.14;
    cursorBlobY += (cursorTargetY - cursorBlobY) * 0.14;

    // Particules
    for (let i = blobParticles.length - 1; i >= 0; i--) {
        blobParticles[i].update();
        blobParticles[i].draw(cursorCtx);
        if (blobParticles[i].dead) blobParticles.splice(i, 1);
    }

    // Blob principal — double halo gradient
    if (cursorTargetX > -400) {
        const pulse = 1 + 0.1 * Math.sin(ts * 0.004);
        const r = 22 * pulse;

        // Halo externe diffus
        const outerGrad = cursorCtx.createRadialGradient(
            cursorBlobX, cursorBlobY, 0,
            cursorBlobX, cursorBlobY, r * 3.5
        );
        outerGrad.addColorStop(0, 'rgba(56,189,248,0.08)');
        outerGrad.addColorStop(0.5, 'rgba(129,140,248,0.05)');
        outerGrad.addColorStop(1, 'rgba(129,140,248,0)');
        cursorCtx.fillStyle = outerGrad;
        cursorCtx.beginPath();
        cursorCtx.arc(cursorBlobX, cursorBlobY, r * 3.5, 0, Math.PI * 2);
        cursorCtx.fill();

        // Core blob
        const coreGrad = cursorCtx.createRadialGradient(
            cursorBlobX, cursorBlobY, 0,
            cursorBlobX, cursorBlobY, r
        );
        coreGrad.addColorStop(0,   'rgba(56,189,248,0.75)');
        coreGrad.addColorStop(0.55,'rgba(56,189,248,0.35)');
        coreGrad.addColorStop(1,   'rgba(129,140,248,0)');
        cursorCtx.fillStyle = coreGrad;
        cursorCtx.beginPath();
        cursorCtx.arc(cursorBlobX, cursorBlobY, r, 0, Math.PI * 2);
        cursorCtx.fill();
    }
}
```

- [ ] **Step 4 : Intégrer `drawCursor` dans la boucle principale**

Dans la fonction `animate(timestamp)` (~ligne 561), ajouter `drawCursor(timestamp);` juste après `animateNeural(timestamp);` :

```js
function animate(timestamp) {
    // ... code existant ...
    animateHeroBg(timestamp);
    animateNeural(timestamp);
    drawCursor(timestamp);   // ← ajouter cette ligne
    requestAnimationFrame(animate);
}
```

- [ ] **Step 5 : Vérifier en browser**

Le curseur par défaut doit avoir disparu. Un blob cyan/indigo doit suivre la souris avec un léger lag. En le bougeant, des particules grossières se libèrent dans la direction du mouvement.

- [ ] **Step 6 : Commit**

```bash
git add index.html style.css script.js
git commit -m "feat: curseur blob avec aura et particules grossières"
```

---

## Task 6 : Lancer le serveur local et vérification finale

- [ ] **Step 1 : Lancer**

```bash
python3 -m http.server 8080
```

Ouvrir `http://localhost:8080`.

- [ ] **Step 2 : Checklist visuelle**

- [ ] Réseau 3D : vague d'activation cyan→violet visible qui se propage
- [ ] Réseau 3D : nœuds plus grands avec halo glowing
- [ ] Réseau 3D : connexions plus lumineuses sur le passage de la vague
- [ ] Réseau 3D : souris sur le panel droit → la vague accélère nettement
- [ ] Curseur : blob cyan/indigo qui suit la souris
- [ ] Curseur : particules grossières émises en mouvement
- [ ] Shockwave : clic "Découvrir mon profil" → animation reste active plus longtemps
- [ ] Mobile (≤1024px) : réseau toujours en arrière-plan, curseur blob fonctionne

- [ ] **Step 3 : Commit final si ajustements**

```bash
git add -p
git commit -m "fix: ajustements visuels finaux après vérification"
```
