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
// CANVAS 1 — PARTICULES HERO
// =========================================================

const heroCanvas = document.getElementById('particles-canvas');
const heroCtx = heroCanvas.getContext('2d');
let heroParticlesArray;
let mouse = { x: null, y: null, radius: 150 };
let flashActive = false;

window.addEventListener('mousemove', (event) => {
    mouse.x = event.x;
    mouse.y = event.y;
});

function handleClickHero(e) {
    e.preventDefault();
    flashActive = true;
    setTimeout(() => { flashActive = false; }, 280);
    setTimeout(() => { smoothScrollTo('about'); }, 1000);
}

class HeroParticle {
    constructor(x, y, directionX, directionY, size) {
        this.x = x; this.y = y;
        this.directionX = directionX; this.directionY = directionY;
        this.size = size; this.baseSize = size;
        this.baseR = 56; this.baseG = 189; this.baseB = 248; // #38bdf8
        this.currR = this.baseR; this.currG = this.baseG; this.currB = this.baseB;
    }
    draw() {
        heroCtx.beginPath();
        heroCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
        heroCtx.fillStyle = `rgb(${Math.floor(this.currR)}, ${Math.floor(this.currG)}, ${Math.floor(this.currB)})`;
        heroCtx.fill();
    }
    update() {
        // Interaction souris
        let dx = mouse.x - this.x;
        let dy = mouse.y - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < mouse.radius) {
            let forceDirectionX = dx / distance;
            let forceDirectionY = dy / distance;
            let force = (mouse.radius - distance) / mouse.radius;
            this.x -= forceDirectionX * force * 3;
            this.y -= forceDirectionY * force * 3;
        }
        // Mouvement
        if (this.x > heroCanvas.width || this.x < 0) this.directionX = -this.directionX;
        if (this.y > heroCanvas.height || this.y < 0) this.directionY = -this.directionY;
        this.x += this.directionX;
        this.y += this.directionY;
        // Animation flash
        const growthSpeed = 0.4;
        const colorSpeed = 8;
        const maxSizeScale = 5;
        if (flashActive) {
            if (this.size < this.baseSize * maxSizeScale) this.size += growthSpeed;
            if (this.currR < 255) this.currR += colorSpeed;
            if (this.currG < 255) this.currG += colorSpeed;
            if (this.currB < 255) this.currB += colorSpeed;
        } else {
            if (this.size > this.baseSize) this.size -= growthSpeed * 0.4;
            if (this.currR > this.baseR) this.currR -= colorSpeed * 0.4;
            if (this.currG > this.baseG) this.currG -= colorSpeed * 0.4;
            if (this.currB > this.baseB) this.currB -= colorSpeed * 0.4;
        }
        this.currR = Math.max(this.baseR, Math.min(255, this.currR));
        this.currG = Math.max(this.baseG, Math.min(255, this.currG));
        this.currB = Math.max(this.baseB, Math.min(255, this.currB));
        this.draw();
    }
}

function initHeroParticles() {
    heroParticlesArray = [];
    let numberOfParticles = (heroCanvas.height * heroCanvas.width) / 10000;
    for (let i = 0; i < numberOfParticles; i++) {
        let size = (Math.random() * 3) + 1;
        let x = Math.random() * heroCanvas.width;
        let y = Math.random() * heroCanvas.height;
        let directionX = (Math.random() * 1.5) - 0.75;
        let directionY = (Math.random() * 1.5) - 0.75;
        heroParticlesArray.push(new HeroParticle(x, y, directionX, directionY, size));
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
    heroCanvas.width = window.innerWidth;
    heroCanvas.height = window.innerHeight;
    bgCanvas.width = window.innerWidth;
    bgCanvas.height = window.innerHeight;
    initHeroParticles();
    initBgStars();
}

function animate() {
    heroCtx.clearRect(0, 0, heroCanvas.width, heroCanvas.height);
    for (let i = 0; i < heroParticlesArray.length; i++) {
        heroParticlesArray[i].update();
    }

    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    for (let i = 0; i < bgStarsArray.length; i++) {
        bgStarsArray[i].update();
    }

    requestAnimationFrame(animate);
}

window.addEventListener('resize', resizeCanvases);
resizeCanvases();
animate();

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
