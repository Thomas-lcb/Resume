# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A personal portfolio/resume website — single-page, static, with no build system. Everything lives in `index.html`: HTML structure, embedded CSS, and embedded JavaScript.

## Development

**No build step.** Open `index.html` directly in a browser or serve it locally:

```bash
python3 -m http.server 8080
# then visit http://localhost:8080
```

There is no package.json, no npm, no bundler.

## Architecture

**Three files**, chacun avec un rôle distinct :
- `index.html` — HTML uniquement (structure, sections, contenu)
- `style.css` — tout le CSS (variables, layout, animations, responsive)
- `script.js` — tout le JavaScript (animations, canvas, i18n, interactions)

**External dependencies** (CDN only):
- Google Fonts (Poppins)
- Font Awesome 6.4.0

**Key JavaScript systems:**

1. **Hero split layout** — CSS Grid (43/57), texte à gauche, canvas neural à droite. Sur mobile (≤1024px) le canvas passe en arrière-plan à 20% d'opacité.

2. **Réseau de neurones 3D (Three.js r134)** — 7 couches `[1, 6, 9, 12, 9, 6, 1]`, chaque couche est une grille 2D (rows × cols) dans Y×Z pour une structure cubique.
   - Nœuds I/O (couches 0 et 6) connectés à **tous** les nœuds de la couche adjacente ; autres couches → 4 plus proches voisins.
   - Chaque nœud a un **glow sprite** (THREE.Sprite avec texture canvas radial gradient) — opacité 0 au repos, s'allume en cyan uniquement quand une particule passe à proximité (`NODE_ACTIVATION_RADIUS = 0.55`). Attaque rapide (lerp 0.35), déclin lent (lerp 0.04).
   - **Pool dynamique de 18 particules** (`particlePool`) — chaque particule choisit une connexion aléatoire après chaque traversée, avec vitesse et délai de pause aléatoires.
   - Connexions : opacité de base `weight × 0.28`. Quand une particule traverse, activation via bell curve `sin(t×π)`, couleur glisse violet → cyan.
   - Rotation : `neuralVelY` piloté par la souris (coefficient 0.0007), friction 0.93, rotation libre 360°.
   - **Hover** : quand le curseur est sur `.hero-right`, toutes les particules passent à 2.2× vitesse (`hoverAreaBoost`).
   - **Clic "Découvrir mon profil"** : shockwave 3 anneaux (150 frames), coords fixées en canvas px au moment du clic (`updateHeroRightRect()` appelé avant), scroll après 1200ms. Boost ambiant progressif via `heroClickBoostAmbient` (lerp 0.08). Chaque nœud a un `clickFactor` [0.5–1.5] pour varier la taille au pulse. `heroClickBoostNode` (lerp 0.12) pour le scale des nœuds.

3. **Hero background (2D canvas)** — 150 particules en dérive autonome avec :
   - Vitesse initiale `±0.30`, amortissement `0.9998` → dérive persistante, wrap-around aux bords.
   - 3 ambient glow blobs (radial gradients cyan/indigo) pilotés par `heroClickBoostAmbient`.
   - Répulsion douce autour du curseur (rayon 110px).
   - **Zone de clip circulaire** autour du réseau neuronal (`clipR = min(w,h) × 0.56`, inner 62%) — particules invisibles dans cette zone, connexions aussi.
   - **Zone de fade elliptique** autour du texte gauche (`heroLeftRect`) — opacité minimum 0.18 dans l'ellipse, transition douce sur le bord extérieur. Même principe que le clip du réseau neuronal.
   - Connexions entre particules proches avec le même fade circulaire.

4. **Background stars (2D canvas fixe)** — 160 étoiles cyan-violet sur toute la page. Chaque étoile dérive lentement (`vx/vy ±0.12`, wrap-around), scintillement alpha.

5. **Curseur** — `#cursor-canvas` overlay fixe présent dans le DOM mais `drawCursor()` retourne immédiatement (aura désactivée). Le curseur système natif est conservé.

6. **Parallax scroll hero** — `.hero-split` descend de 35px et fade out en quadratique pendant le scroll du hero. Gradient `::after` sur `.hero` pour la transition vers les sections suivantes.

7. **Nav floating island** — île flottante centrale avec indicateur capsule lerp (LERP=0.10, opacité en lerp aussi).
   - Structure HTML : `nav#nav-wrapper` en CSS Grid `1fr auto 1fr` → `.lang-toggle` (gauche) | `.nav-island` (centre) | `.nav-contact-btn` (droite).
   - **Capsule indicateur** : positionnée en JS via boucle `requestAnimationFrame` + lerp (LERP=0.10). Suit le lien survolé ou actif. Opacité en lerp (0.12) : disparaît quand aucun lien actif (section contact).
   - **Mode compact** (`nav.nav-compact`) : activé quand on quitte le hero, liens plus petits, nav moins haute. Hover sur nav compact la regonfle légèrement.
   - **Section contact** : aucun lien actif dans l'île, capsule disparaît en fondu.
   - **Verrou manuel** (`manualLock`) : après un clic, bloque le scroll-tracking pendant 1.8s pour que la capsule reste sur la section cliquée.
   - `pointer-events: none` sur `nav`, `pointer-events: all` sur les enfants + `nav::after` pour détecter le hover.
   - `will-change: transform` **retiré** de `.hero-split` (causait un problème de capture du canvas par backdrop-filter).

8. **i18n (EN/FR)** — language toggle stored in `localStorage`. Translations applied via `data-i18n` (text) and `data-i18n-html` (HTML content) attributes. The translation object is a large literal in the JS section with ~1500+ keys.
   - Sous-titre hero : `<strong>Machine Learning Engineer</strong><br>(AI & Software Systems)` — identique EN et FR (sauf "Ingénieur" en FR).

9. **Scroll reveal** — IntersectionObserver adds `.visible` class to animate elements into view.

10. **Interactive timeline** — click-to-expand experience/education entries.

11. **Photo tilt (section About)** — effet pièce de monnaie au survol de `.profile-ring-wrapper`. Loop `requestAnimationFrame` + lerp (0.06) pour suivi progressif. MAX_TILT = 6°. Le transform (`perspective rotateX/Y`) et le box-shadow directionnel sont appliqués directement via JS, sans transition CSS.

**Section About — structure actuelle :**
- `.about-card` : fond transparent, pas de border, grid `1fr 2fr`, `align-items: center`.
- Colonne gauche (`.about-left`) : photo avec anneau animé uniquement.
- Colonne droite (`.about-text`) : 4 paragraphes (`about.p1`–`about.p4`) sans icônes + `.about-meta` (badge "Open to work" + séparateur + adresse).
- `.about-meta` : flex row, badge à gauche, séparateur `.about-meta-sep` (1px), adresse à droite en `var(--text-dim)`.
- Hero layout remonté : `.hero-split` padding-top `20px` (au lieu de `55px`).

**Hero text sizes** (CSS):
```
.hero-left h1        → 6.5rem
.hero-left p         → 1.48rem
.hero-left p strong  → 1.72rem  (Machine Learning Engineer)
.hero-btn-primary    → 1.18rem, padding 17px 42px
```

**Color scheme** (CSS custom properties):
```
--bg-color: #0f172a   (dark navy)
--primary:  #38bdf8   (cyan)
--secondary:#818cf8   (indigo)
```

## Assets

- `PP.JPG` — profile photo
- `Thomas_Lacombe_CV.pdf` — downloadable CV
