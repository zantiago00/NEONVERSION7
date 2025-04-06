/**
 * Script para el juego Cuadrado Saltarín Combo + Ranking
 * Incorpora mejoras de estructura, manejo de clases y limpieza.
 */

// --- REFERENCIAS A ELEMENTOS DEL DOM ---
const player = document.getElementById('player');
const container = document.getElementById('gameContainer');
const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer');
const comboEl = document.getElementById('combo');

// Pantallas y Formularios
const emailScreen = document.getElementById('emailScreen');
const emailForm = document.getElementById('emailForm');
const initialEmailInput = document.getElementById('initialEmail');

const registerScreen = document.getElementById('registerScreen');
const registerForm = document.getElementById('registerForm');
const startScreen = document.getElementById('startScreen');
const rankingDisplayScreen = document.getElementById('rankingDisplay');

// Botones, Inputs y Elementos UI
const startButton = document.getElementById('startButton');
const playerNameInput = document.getElementById('playerName');
const playerEmailInput = document.getElementById('playerEmail');
const rankingDiv = document.getElementById('ranking');
const finalScoreTextEl = document.getElementById('finalScoreText');
const restartButton = document.getElementById('restartButton');
const registerButton = document.getElementById('registerButton'); // Aunque el submit del form es suficiente
const mobileInstructions = document.querySelector('.mobile-instructions');
const orientationMessage = document.getElementById('orientation-message');

// Elementos de Términos y Condiciones
const termsModal = document.getElementById('termsModal');
const openTermsBtn = document.getElementById('openTermsBtn');
const closeBtn = document.querySelector('.close-btn');
const acceptTermsBtn = document.getElementById('acceptTermsBtn');
const termsCheckbox = document.getElementById('termsCheckbox');

// --- CONSTANTES DE CONFIGURACIÓN ---
const GRAVITY = 0.65;
const INITIAL_JUMP_STRENGTH = 18;
const JUMP_STRENGTH_COMBO_MULTIPLIER = 1.15; // Multiplicador salto con combo >= 3
const DOUBLE_JUMP_STRENGTH_MULTIPLIER = 1.1; // Multiplicador doble salto
const GROUND_Y = 0;
const BASE_SPEED = 7;
const SPEED_MULTIPLIER_COMBO3 = 1.2;
const SPEED_MULTIPLIER_COMBO6 = 1.5;
const SPEED_BOOST_MULTIPLIER = 1.5; // Velocidad durante boost temporal
const SPEED_BOOST_DURATION = 5; // Segundos que dura el boost temporal
const INITIAL_TIME = 120; // Segundos
const MAX_TIME_CAP = INITIAL_TIME + 30; // Tiempo máximo acumulable
const OBSTACLE_HIT_PENALTY = 1; // Segundos restados al chocar
const COIN_SCORE_MULTIPLIER = 5; // Puntos por moneda = MULTIPLIER * combo actual
const RANKING_URL = "https://script.google.com/macros/s/AKfycbzBUuj5qYyp9PnnP83ofKBGwStiqmk8ixX4CcQiPZWAevi1_vB6rqiXtYioXM4GcnHidw/exec"; // URL del Ranking API
const RANKING_MAX_NAME_LENGTH = 15;
const RANKING_TOP_N = 20;

// Configuración de generación de elementos
const OBSTACLE_BASE_INTERVAL = 1800; // ms (intervalo base entre obstáculos)
const OBSTACLE_MIN_GAP_TIME = 120;   // ms (tiempo mínimo absoluto entre obstáculos)
const OBSTACLE_RATE_DECREASE_FACTOR = 0.97; // Factor de reducción de intervalo por combo
const MAX_CONSECUTIVE_OBSTACLES = 3;   // Máximo número de obstáculos seguidos antes de forzar un respiro
const CONSECUTIVE_OBSTACLE_BREAK_MULTIPLIER = 1.5; // Multiplica intervalo después de MAX_CONSECUTIVE
const COIN_BASE_INTERVAL = 2500;    // ms (intervalo base entre monedas)
const MIN_COIN_INTERVAL_TIME = 1800;  // ms (tiempo mínimo absoluto entre monedas)
const COIN_INTERVAL_RANDOMNESS = 1000; // ms (aleatoriedad añadida al intervalo de monedas)
const COIN_INTERVAL_COMBO6_MULTIPLIER = 0.75; // Reduce intervalo con combo >= 6
const MIN_OBSTACLE_VISUAL_GAP_PX = 100; // Espacio visual mínimo (px) entre obstáculos dobles
const OBSTACLE_LARGE_CHANCE = 0.3;   // Probabilidad (0-1) de obstáculo grande con combo >= 3
const OBSTACLE_DOUBLE_CHANCE = 0.4;  // Probabilidad (0-1) de obstáculo doble con combo >= 3
const OBSTACLE_DOUBLE_LARGE_CHANCE = 0.5; // Probabilidad de que el segundo sea grande si el primero lo fue

// --- VARIABLES DE ESTADO DEL JUEGO ---
let gameRunning = false;
let score = 0;
let combo = 0;
let gameTime = INITIAL_TIME;
let gameLoopId = null; // Para requestAnimationFrame
let obstacleIntervalId = null; // Para setTimeout de obstáculos
let coinIntervalId = null; // Para setTimeout de monedas

let playerName = "Anónimo";
let playerEmail = "";

let playerY = 0;
let velocityY = 0;
let isJumping = false;
let canDoubleJump = false;

let obstacles = [];
let coins = [];
let currentSpeed = BASE_SPEED;
let speedBoostActive = false;
let boostEndTime = 0; // Timestamp de cuando termina el boost

let lastObstacleTime = 0;
let consecutiveObstacles = 0;
let lastCoinTime = 0;

let resizeTimeout = null; // Para debounce de resize/orientation

// --- CLASES CSS PARA ESTADOS ---
const HIDDEN_CLASS = 'screen--hidden'; // Clase para ocultar elementos

// --- FUNCIONES AUXILIARES ---

// Función para detectar si es un dispositivo móvil (movida desde script inline)
function isMobileDevice() {
    // Regex más común y actualizada
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Función para mostrar/ocultar elementos usando clases CSS
function setElementVisibility(element, isVisible) {
    if (!element) return;
    if (isVisible) {
        element.classList.remove(HIDDEN_CLASS);
    } else {
        element.classList.add(HIDDEN_CLASS);
    }
}

// Función para escapar HTML simple (prevención XSS básica)
function escapeHTML(str) {
    return String(str).replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// --- FUNCIONES DE ADAPTACIÓN RESPONSIVA ---

// Ajustar el contenedor del juego según el entorno y dispositivo
function adjustGameContainer() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    let containerWidth, containerHeight;

    // Determinar dimensiones óptimas manteniendo ratio 2:1 (priorizando ancho)
    if (windowWidth / windowHeight >= 2) {
        containerHeight = windowHeight * 0.9; // Limita altura
        containerWidth = containerHeight * 2;
    } else {
        containerWidth = windowWidth * 0.95; // Limita ancho
        containerHeight = containerWidth / 2;
    }

    // Aplicar límites máximos absolutos
    containerWidth = Math.min(containerWidth, 1600);
    containerHeight = Math.min(containerHeight, 800);

    // Aplicar dimensiones al contenedor
    container.style.width = `${containerWidth}px`;
    container.style.height = `${containerHeight}px`;

    // Lógica específica para móviles (incluyendo mensaje de orientación)
    if (isMobileDevice()) {
        document.documentElement.style.touchAction = 'none'; // Prevenir scroll/zoom global
        if (window.innerHeight > window.innerWidth) { // Modo Retrato
            document.body.classList.add('portrait'); // Clase para posible CSS adicional
            setElementVisibility(orientationMessage, true); // Mostrar mensaje
            // Aquí se podría pausar el juego si estuviera corriendo y se implementara pausa
        } else { // Modo Horizontal
            document.body.classList.remove('portrait');
            setElementVisibility(orientationMessage, false); // Ocultar mensaje
            // Aquí se podría reanudar el juego si se hubiera pausado
        }
    } else {
        setElementVisibility(orientationMessage, false); // Ocultar mensaje en escritorio
    }
}

// Función para manejar el debounce del resize/orientation
function debouncedAdjustGameContainer() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(adjustGameContainer, 150); // Espera 150ms antes de ajustar
}

// --- FUNCIONES DE GESTIÓN DE PANTALLAS Y FORMULARIOS ---

function showScreen(screenToShow) {
    [emailScreen, registerScreen, startScreen, rankingDisplayScreen].forEach(screen => {
        setElementVisibility(screen, screen === screenToShow);
    });
}

// Funciones para el modal de términos y condiciones
function openTermsModal() {
    if (termsModal) termsModal.style.display = "block"; // El modal usa display directo
}
function closeTermsModal() {
    if (termsModal) termsModal.style.display = "none";
}
function acceptTerms() {
    if (termsCheckbox) termsCheckbox.checked = true;
    closeTermsModal();
}

// Manejo del formulario de correo inicial
function handleEmailSubmit(e) {
    e.preventDefault();
    const email = initialEmailInput.value.trim().toLowerCase(); // Normalizar a minúsculas

    // Validación básica de correo (se podría mejorar con Regex)
    if (!email || !email.includes('@') || !email.includes('.')) {
        alert("Por favor, ingresa un correo electrónico válido.");
        initialEmailInput.focus();
        return;
    }

    playerEmail = email;
    playerEmailInput.value = email; // Pre-rellenar en pantalla de registro
    playerEmailInput.readOnly = true; // Marcar como no editable
    playerEmailInput.style.backgroundColor = '#222'; // Estilo visual (opcional, también en CSS)

    showScreen(registerScreen);
    playerNameInput.focus();
}

// Manejo del formulario de registro
function handleRegisterSubmit(e) {
    e.preventDefault();
    const name = playerNameInput.value.trim();

    if (!name) {
        alert("Por favor, ingresa tu nombre de jugador.");
        playerNameInput.focus();
        return;
    }
    if (!playerEmailInput.value) { // Doble chequeo por si algo falló
        alert("Error con el correo. Por favor, vuelve a empezar.");
        showScreen(emailScreen); // Regresar al paso inicial
        initialEmailInput.focus();
        return;
    }
    if (!termsCheckbox.checked) {
        alert("Debes aceptar los términos y condiciones para continuar.");
        // openTermsModal(); // Opcional: Abrir modal automáticamente
        return;
    }

    playerName = name.substring(0, RANKING_MAX_NAME_LENGTH); // Guardar y limitar longitud
    playerNameInput.value = playerName; // Actualizar input por si se cortó

    showScreen(startScreen);
}

// --- LÓGICA PRINCIPAL DEL JUEGO ---

function startGame() {
    if (gameRunning) return; // Evitar iniciar si ya está corriendo
    // console.log("Iniciando juego..."); // Log de debug eliminado

    gameRunning = true;

    // Resetear estado
    score = 0; combo = 0; gameTime = INITIAL_TIME;
    obstacles = []; coins = [];
    playerY = GROUND_Y; velocityY = 0; isJumping = false;
    canDoubleJump = false;
    speedBoostActive = false; boostEndTime = 0; currentSpeed = BASE_SPEED;
    lastObstacleTime = 0; consecutiveObstacles = 0; lastCoinTime = 0;

    // Limpiar elementos de partida anterior
    container.querySelectorAll('.obstacle, .coin, .floating-text').forEach(el => el.remove());
    player.style.bottom = `${playerY}px`;
    player.className = 'player'; // Resetear clases CSS (powered, jumping, collected)
    container.classList.remove('hit', 'shake'); // Resetear clases del contenedor

    updateUI();
    clearScheduledSpawns(); // Limpiar timeouts anteriores // <--- CORREGIDO
    // Programar generación inicial
    scheduleNextObstacle();
    scheduleNextCoin();
    
    // Iniciar bucle de juego
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    gameLoopId = requestAnimationFrame(updateGame);

    showScreen(null); // Ocultar todas las pantallas (email, register, start, ranking)
}

function updateGame(timestamp) { // timestamp es proporcionado por requestAnimationFrame
    if (!gameRunning) return;

    // Calcular delta time (tiempo desde el último frame) para física más estable
    // (Simplificado aquí: asumiendo 60 FPS constantes para restar 1/60)
    // Para delta time real: necesitarías guardar el timestamp anterior.
    gameTime = Math.max(0, gameTime - (1 / 60));

    // Actualizar UI
    updateUI();

    // Comprobar fin de juego por tiempo
    if (gameTime <= 0) {
        gameOver();
        return;
    }

    // Actualizar velocidad del juego
    updateSpeed(timestamp);

    // Actualizar física del jugador
    updatePlayerPhysics();

    // Actualizar y comprobar colisiones de obstáculos y monedas
    updateObstacles();
    updateCoins();

    // Solicitar el próximo frame
    gameLoopId = requestAnimationFrame(updateGame);
}

function updateSpeed(currentTime) {
    if (speedBoostActive) {
        if (currentTime >= boostEndTime) {
            speedBoostActive = false;
            // Podría añadirse efecto visual al terminar boost
        } else {
            currentSpeed = BASE_SPEED * SPEED_BOOST_MULTIPLIER;
            return; // Salir si estamos en boost temporal
        }
    }

    // Velocidad base ajustada por combo si no hay boost activo
    let speedMultiplier = 1;
    if (combo >= 6) {
        speedMultiplier = SPEED_MULTIPLIER_COMBO6;
    } else if (combo >= 3) {
        speedMultiplier = SPEED_MULTIPLIER_COMBO3;
    }
    currentSpeed = BASE_SPEED * speedMultiplier;
}

function updatePlayerPhysics() {
    velocityY -= GRAVITY;
    playerY += velocityY;

    if (playerY <= GROUND_Y) {
        playerY = GROUND_Y;
        velocityY = 0;
        if (isJumping) {
            isJumping = false;
            // player.classList.remove('jumping'); // La clase jumping se maneja en jump() con timeout
        }
    }
    player.style.bottom = `${playerY}px`;
}

function jump() {
    if (!gameRunning) return;

    const baseJump = INITIAL_JUMP_STRENGTH;
    const comboJumpMultiplier = (combo >= 3) ? JUMP_STRENGTH_COMBO_MULTIPLIER : 1;
    const currentJumpStrength = baseJump * comboJumpMultiplier;

    // Salto Normal (solo si está en el suelo)
    if (!isJumping && playerY === GROUND_Y) {
        isJumping = true;
        velocityY = currentJumpStrength;
        player.classList.add('jumping');
        // Quitar clase después de un tiempo para animación/efecto visual
        setTimeout(() => { player.classList.remove('jumping'); }, 200);
    }
    // Doble Salto (solo si ya está saltando Y tiene el poder)
    else if (isJumping && canDoubleJump) {
        velocityY = currentJumpStrength * DOUBLE_JUMP_STRENGTH_MULTIPLIER; // Impulso extra
        canDoubleJump = false; // Consumir poder
        player.classList.remove('powered'); // Quitar efecto visual
        player.classList.add('jumping'); // Reaplicar efecto visual de salto
        setTimeout(() => { player.classList.remove('jumping'); }, 200);
    }
}

// --- GENERACIÓN Y ACTUALIZACIÓN DE OBSTÁCULOS ---

function scheduleNextObstacle() {
    if (!gameRunning) return;

    const now = Date.now();
    let baseInterval = OBSTACLE_BASE_INTERVAL;

    // Ajustar intervalo por combo
    if (combo >= 3) {
        baseInterval *= Math.pow(OBSTACLE_RATE_DECREASE_FACTOR, Math.min(10, combo - 2)); // Limita efecto
    }

    // Forzar respiro si hubo muchos obstáculos seguidos
    if (consecutiveObstacles >= MAX_CONSECUTIVE_OBSTACLES) {
        baseInterval *= CONSECUTIVE_OBSTACLE_BREAK_MULTIPLIER;
        consecutiveObstacles = 0; // Resetear contador para el próximo ciclo
    }

    // Calcular delay asegurando el mínimo y compensando tiempo pasado
    const timeSinceLast = now - lastObstacleTime;
    const delay = Math.max(OBSTACLE_MIN_GAP_TIME, baseInterval - timeSinceLast);

    obstacleIntervalId = setTimeout(() => {
        spawnObstacle();
        lastObstacleTime = Date.now();
        scheduleNextObstacle(); // Programar el siguiente
    }, delay);
}

function spawnObstacle() {
    if (!gameRunning) return;

    const obsData = createObstacleElement();
    obstacles.push(obsData);
    container.appendChild(obsData.element);
    consecutiveObstacles++;

    // Posibilidad de generar un segundo obstáculo cercano
    if (combo >= 3 && Math.random() < OBSTACLE_DOUBLE_CHANCE && consecutiveObstacles < MAX_CONSECUTIVE_OBSTACLES) {
        const secondObsData = createObstacleElement(obsData.width); // Pasar ancho del primero
        obstacles.push(secondObsData);
        container.appendChild(secondObsData.element);
        consecutiveObstacles++;
    }
}

// Helper para crear un elemento obstáculo
function createObstacleElement(firstObstacleWidth = 0) {
    const element = document.createElement('div');
    element.className = 'obstacle';
    let width = 62; // Ancho base (debería coincidir con CSS o ser dinámico)
    let height = 62; // Altura base

    // Posibilidad de hacerlo grande
    const isLarge = (combo >= 3 && Math.random() < OBSTACLE_LARGE_CHANCE);
    if (isLarge) {
        element.classList.add('large');
        width = 74; // Ancho grande
        height = 74; // Altura grande
    }

    element.style.width = `${width}px`; // O usar % si el CSS lo define así
    element.style.height = `${height}px`;
    element.style.bottom = `${GROUND_Y}px`;

    // Calcular posición inicial (derecha, fuera de pantalla)
    let initialLeft = container.offsetWidth;
    if (firstObstacleWidth > 0) { // Si es el segundo obstáculo
        const gap = MIN_OBSTACLE_VISUAL_GAP_PX + Math.random() * 50;
        initialLeft += firstObstacleWidth + gap;
    }
    element.style.left = `${initialLeft}px`;

    return { element, width, height };
}

function updateObstacles() {
    obstacles = obstacles.filter(obstacleData => {
        const element = obstacleData.element;
        if (!element || !element.isConnected) return false; // Limpiar si fue removido

        // Mover obstáculo
        let currentLeft = parseFloat(element.style.left);
        let newLeft = currentLeft - currentSpeed;
        element.style.left = `${newLeft}px`;

        // Comprobar colisión con el jugador
        if (checkCollision(player, element, -10)) { // Margen negativo pequeño
            handleObstacleCollision(element);
            return false; // Eliminar de la lista y del DOM
        }

        // Comprobar si salió de pantalla por la izquierda
        if (newLeft < -obstacleData.width) {
            score++; // Punto por esquivar
            updateUI();
            element.remove();
            return false;
        }

        return true; // Mantener obstáculo en la lista
    });
}

function handleObstacleCollision(obstacleElement) {
    gameTime = Math.max(0, gameTime - OBSTACLE_HIT_PENALTY);
    combo = 0; // Resetear combo
    consecutiveObstacles = 0; // Resetear contador de seguidos
    speedBoostActive = false; // Perder boost temporal
    if (canDoubleJump) { // Perder doble salto persistente
        canDoubleJump = false;
        player.classList.remove('powered');
    }
    updateUI();

    // Feedback visual de colisión
    container.classList.add('hit', 'shake');
    setTimeout(() => { container.classList.remove('hit', 'shake'); }, 300);

    // Texto flotante de penalización
    const rect = obstacleElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    showFloatingText(
        rect.left - containerRect.left + rect.width / 2,
        rect.top - containerRect.top - 10, // Un poco arriba del obstáculo
        `-${OBSTACLE_HIT_PENALTY}s`,
        false // false = minus
    );

    obstacleElement.remove(); // Eliminar el obstáculo colisionado
}

// --- GENERACIÓN Y ACTUALIZACIÓN DE MONEDAS ---

function scheduleNextCoin() {
    if (!gameRunning) return;

    const now = Date.now();
    let baseInterval = COIN_BASE_INTERVAL;

    // Ajustar intervalo por combo
    if (combo >= 6) {
        baseInterval *= COIN_INTERVAL_COMBO6_MULTIPLIER;
    }
    baseInterval += Math.random() * COIN_INTERVAL_RANDOMNESS;

    // Calcular delay asegurando el mínimo y compensando tiempo pasado
    const timeSinceLast = now - lastCoinTime;
    const delay = Math.max(MIN_COIN_INTERVAL_TIME, baseInterval - timeSinceLast);

    coinIntervalId = setTimeout(() => {
        spawnCoin();
        lastCoinTime = Date.now();
        scheduleNextCoin(); // Programar la siguiente
    }, delay);
}

function spawnCoin() {
    if (!gameRunning) return;

    let type = 'green';
    let bonus = 1;
    if (combo >= 6) { type = 'yellow'; bonus = 5; }
    else if (combo >= 3) { type = 'blue'; bonus = 2; }

    const coinData = createCoinElement(type, bonus);
    coins.push(coinData);
    container.appendChild(coinData.element);
}

// Helper para crear un elemento moneda
function createCoinElement(type, bonus) {
    const element = document.createElement('div');
    element.className = `coin ${type}`; // Clases para estilo CSS
    const width = 50; // Ancho base (debe coincidir con CSS)
    const height = 50; // Altura base

    element.style.width = `${width}px`;
    element.style.height = `${height}px`;
    element.style.left = `${container.offsetWidth + Math.random() * 100}px`; // Posición X inicial

    // Calcular posición Y segura (evitar suelo y techo)
    const containerHeight = container.offsetHeight;
    const safeBottom = Math.min(containerHeight * 0.7, containerHeight - 80); // Límite superior
    const randomBottom = 50 + Math.random() * (safeBottom - 50); // Entre 50 y el límite
    element.style.bottom = `${randomBottom}px`;

    return { element, type, bonus, width, height };
}

function updateCoins() {
    coins = coins.filter(coinData => {
        const element = coinData.element;
        if (!element || !element.isConnected) return false;

        // Mover moneda
        let currentLeft = parseFloat(element.style.left);
        let newLeft = currentLeft - currentSpeed;
        element.style.left = `${newLeft}px`;

        // Comprobar colisión con el jugador
        if (checkCollision(player, element, 5)) { // Margen positivo
            handleCoinCollection(element, coinData);
            return false; // Eliminar de la lista y del DOM
        }

        // Comprobar si salió de pantalla por la izquierda
        if (newLeft < -coinData.width) {
            element.remove();
            return false;
        }

        return true; // Mantener moneda en la lista
    });
}

function handleCoinCollection(coinElement, coinData) {
    combo++;
    gameTime = Math.min(MAX_TIME_CAP, gameTime + coinData.bonus); // Añadir tiempo con límite
    score += COIN_SCORE_MULTIPLIER * combo; // Puntos basados en combo
    updateUI();

    // Aplicar efectos especiales de la moneda
    if (coinData.type === 'blue' || coinData.type === 'yellow') {
        speedBoostActive = true;
        boostEndTime = Date.now() + (SPEED_BOOST_DURATION * 1000); // Marcar cuándo termina
    }
    if (coinData.type === 'yellow') {
        canDoubleJump = true; // Otorgar doble salto persistente
        player.classList.add('powered'); // Efecto visual amarillo
    }

    // Feedback visual de recolección
    player.classList.add('collected');
    setTimeout(() => player.classList.remove('collected'), 200);

    // Texto flotante de bonus
    const rect = coinElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    showFloatingText(
        rect.left - containerRect.left + rect.width / 2,
        rect.top - containerRect.top - 10,
        `+${coinData.bonus}s`,
        true // true = plus
    );

    coinElement.remove(); // Eliminar la moneda recolectada
}

// --- UTILIDADES (Colisión, Texto Flotante, UI, Limpieza) ---

function checkCollision(el1, el2, margin = 0) {
    try {
        // Comprobaciones básicas para evitar errores
        if (!el1 || !el2 || !el1.isConnected || !el2.isConnected) {
            return false;
        }
        const rect1 = el1.getBoundingClientRect();
        const rect2 = el2.getBoundingClientRect();

        // Si un elemento no tiene dimensiones (quizás display: none), no hay colisión
        if (rect1.width <= 0 || rect1.height <= 0 || rect2.width <= 0 || rect2.height <= 0) {
            return false;
        }

        // Lógica de colisión AABB con margen
        return (
            rect1.left < rect2.right + margin &&
            rect1.right > rect2.left - margin &&
            rect1.top < rect2.bottom + margin &&
            rect1.bottom > rect2.top - margin
        );
    } catch (e) {
        console.error("Error en checkCollision:", e, el1, el2);
        return false; // Asumir no colisión si hay error
    }
}

function showFloatingText(x, y, text, isPositive) {
    const el = document.createElement('div');
    el.className = `floating-text ${isPositive ? 'plus' : 'minus'}`;
    el.textContent = text;

    // Posición (ajustada para centrar aproximadamente)
    const textWidthEstimate = text.length * 10; // Estimación simple
    el.style.left = `${x - textWidthEstimate / 2}px`;
    el.style.top = `${y}px`;

    // Añadir al contenedor y eliminar después de la animación
    container.appendChild(el);
    setTimeout(() => { if (el && el.isConnected) el.remove(); }, 1150); // Duración animación CSS + buffer
}

function updateUI() {
    scoreEl.textContent = score;
    timerEl.textContent = gameTime.toFixed(1);
    comboEl.textContent = `Combo: ${combo}`;
}

function clearScheduledSpawns() {
    clearTimeout(obstacleIntervalId);
    clearTimeout(coinIntervalId);
    obstacleIntervalId = null;
    coinIntervalId = null;
}

// --- FIN DE JUEGO Y RANKING ---

async function gameOver() {
    if (!gameRunning) return; // Evitar doble llamada si el tiempo es exactamente 0
    gameRunning = false;

    // Detener bucle y generación
    clearScheduledSpawns();
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    gameLoopId = null;

    // Mostrar pantalla de fin de juego y mensaje inicial
    finalScoreTextEl.textContent = `${playerName}, tu puntuación: ${score}`;
    rankingDiv.innerHTML = "<p>Enviando puntuación y cargando ranking...</p>";
    showScreen(rankingDisplayScreen);

    // Preparar datos para enviar (usando el correo global validado)
    const requestParams = new URLSearchParams({
        nombre: playerName,
        email: playerEmail,
        puntaje: score
    });
    const urlEnviar = `${RANKING_URL}?${requestParams.toString()}`;

    // Variables para almacenar resultados/errores
    let rankingData = null;
    let sendError = null;
    let fetchError = null;

    // Intentar enviar puntuación y obtener ranking en paralelo
    const sendPromise = fetch(urlEnviar)
        .catch(err => {
            console.error("Error al enviar puntuación:", err);
            sendError = err; // Guardar error de envío
        });

    const fetchPromise = fetch(RANKING_URL) // GET para obtener ranking
        .then(response => {
            if (!response.ok) throw new Error(`Error HTTP al obtener ranking: ${response.status}`);
            return response.json();
        })
        .then(data => { rankingData = data; }) // Guardar datos si éxito
        .catch(err => {
            console.error("Error al obtener ranking:", err);
            fetchError = err; // Guardar error de obtención
        });

    // Esperar a que ambas operaciones terminen
    await Promise.all([sendPromise, fetchPromise]);

    // Si el juego se reinició mientras cargaba, no actualizar la pantalla de ranking
    if (gameRunning || rankingDisplayScreen.classList.contains(HIDDEN_CLASS)) {
        return;
    }

    // Procesar y mostrar el ranking (o errores)
    displayRanking(rankingData, sendError, fetchError);
}

function displayRanking(data, sendErr, fetchErr) {
    if (data) { // Si se obtuvieron datos del ranking
        try {
            const topPlayers = data
                .map(r => ({ // Mapear y limpiar datos
                    nombre: String(r.nombre || "Anónimo").substring(0, RANKING_MAX_NAME_LENGTH),
                    puntaje: parseInt(String(r.puntaje || '0').replace(/[^\d-]/g, ''), 10) || 0
                }))
                .filter(r => r.puntaje >= 0) // Filtrar puntajes inválidos/negativos
                .sort((a, b) => b.puntaje - a.puntaje) // Ordenar descendente por puntaje
                .slice(0, RANKING_TOP_N); // Tomar el Top N

            // Construir tabla HTML (manteniendo escape simple)
            let tableHTML = '<h2>Ranking Top 20</h2><table><thead><tr><th>#</th><th>Nombre</th><th>Puntos</th></tr></thead><tbody>';
            topPlayers.forEach((r, i) => {
                tableHTML += `<tr><td>${i + 1}</td><td>${escapeHTML(r.nombre)}</td><td>${r.puntaje}</td></tr>`;
            });
            tableHTML += '</tbody></table>';
            rankingDiv.innerHTML = tableHTML;

            // Añadir nota si hubo error al enviar pero el ranking cargó
            if (sendErr) {
                rankingDiv.innerHTML += "<p style='color:orange; font-size:0.8em;'>Nota: No se pudo guardar tu puntuación, pero el ranking se cargó.</p>";
            }

        } catch (processingError) {
            console.error("Error al procesar datos del ranking:", processingError);
            rankingDiv.innerHTML = "<p>Error al mostrar el ranking. Intenta de nuevo más tarde.</p>";
        }
    } else if (fetchErr) { // Si falló la obtención del ranking
        rankingDiv.innerHTML = "<p>No se pudo cargar el ranking. Verifica tu conexión.</p>";
        if (sendErr) {
            rankingDiv.innerHTML += "<p style='color:red; font-size:0.8em;'>Tampoco se pudo guardar tu puntuación.</p>";
        } else {
             // Envío ok, pero no se pudo cargar ranking
            rankingDiv.innerHTML += "<p style='color:orange; font-size:0.8em;'>Tu puntuación fue enviada, pero el ranking no está disponible ahora.</p>";
        }
    } else { // Caso improbable: ni datos ni error de fetch (quizás solo error de envío)
        rankingDiv.innerHTML = "<p>Ranking no disponible.</p>";
        if (sendErr) {
            rankingDiv.innerHTML += "<p style='color:red; font-size:0.8em;'>Error al guardar tu puntuación.</p>";
        }
    }
}

// --- INICIALIZACIÓN Y EVENT LISTENERS ---

function initializeGame() {
    // Ajuste inicial de tamaño
    adjustGameContainer();

    // Mostrar pantalla inicial de correo
    showScreen(emailScreen);
    // Ocultar instrucciones móviles inicialmente (se mostrarán si es móvil)
    setElementVisibility(mobileInstructions, false);
     // Ocultar mensaje de orientación inicialmente
    setElementVisibility(orientationMessage, false);

    // Mostrar instrucciones móviles si aplica
    if (isMobileDevice()) {
        setElementVisibility(mobileInstructions, true);
    }

    // Poner foco en el input inicial (con pequeño delay)
    setTimeout(() => { initialEmailInput?.focus(); }, 100);

    // --- Bind Event Listeners ---

    // Formularios
    emailForm.addEventListener('submit', handleEmailSubmit);
    registerForm.addEventListener('submit', handleRegisterSubmit);

    // Botones de acción
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', () => {
        // Solo reiniciar si el juego NO está corriendo
        if (!gameRunning) {
            rankingDiv.innerHTML = ""; // Limpiar contenido del ranking anterior
            finalScoreTextEl.textContent = "";
            showScreen(startScreen); // Volver a la pantalla de inicio
        }
    });

    // Modal Términos y Condiciones
    openTermsBtn?.addEventListener('click', (e) => {
        e.preventDefault(); // Evitar que el enlace '#' navegue
        openTermsModal();
    });
    closeBtn?.addEventListener('click', closeTermsModal);
    acceptTermsBtn?.addEventListener('click', acceptTerms);
    // Cerrar modal al hacer clic fuera del contenido
    window.addEventListener('click', (e) => {
        if (e.target === termsModal) {
            closeTermsModal();
        }
    });

    // Controles del Juego (Teclado y Táctil)
    document.addEventListener('keydown', (e) => {
        // Saltar con Espacio durante el juego
        if ((e.code === 'Space' || e.key === ' ' || e.keyCode === 32) && gameRunning) {
            e.preventDefault(); // Evitar scroll de página
            jump();
        }
        // Iniciar juego con Enter/Espacio desde StartScreen
        else if (!gameRunning && !startScreen.classList.contains(HIDDEN_CLASS) && (e.key === 'Enter' || e.keyCode === 13 || e.code === 'Space' || e.key === ' ' || e.keyCode === 32)) {
            e.preventDefault();
            startGame();
        }
        // Reiniciar juego con Enter/Espacio desde RankingScreen
        else if (!gameRunning && !rankingDisplayScreen.classList.contains(HIDDEN_CLASS) && (e.key === 'Enter' || e.keyCode === 13 || e.code === 'Space' || e.key === ' ' || e.keyCode === 32)) {
            e.preventDefault();
            restartButton.click(); // Simular clic en botón reiniciar
        }
    });

    // Controles Táctiles
    container.addEventListener('touchstart', (e) => {
        // Saltar si el juego está activo y el toque es dentro del contenedor principal (no en botones/links/etc.)
        if (gameRunning && !e.target.closest('button, a, input, .modal')) {
            jump();
            // No siempre prevenir default aquí, podría interferir con scroll en ranking si se implementa
            // e.preventDefault();
        }
    }, { passive: true }); // passive: true si no necesitas preventDefault aquí

    // Prevenir scroll con touchmove durante el juego en móviles
    if (isMobileDevice()) {
        document.body.addEventListener('touchmove', (e) => {
            if (gameRunning) {
                e.preventDefault(); // Prevenir scroll mientras se juega activamente
            }
        }, { passive: false });
    }

    // Ajustar tamaño al cambiar tamaño/orientación (con debounce)
    window.addEventListener('resize', debouncedAdjustGameContainer);
    // Usar API de orientación si existe, con fallback
    if (window.screen?.orientation) {
        try {
            window.screen.orientation.addEventListener('change', debouncedAdjustGameContainer);
        } catch (e) {
            console.warn("Screen Orientation API no soportada o con errores. Usando fallback.");
            window.addEventListener('orientationchange', debouncedAdjustGameContainer);
        }
    } else {
        window.addEventListener('orientationchange', debouncedAdjustGameContainer);
    }

    // Manejador de errores global (opcional)
    window.onerror = function(message, source, lineno, colno, error) {
        console.error("Error global detectado:", { message, source, lineno, colno, error });
        // Considerar enviar a un servicio de logging en producción
        // return true; // Descomentar con precaución, puede ocultar errores útiles
    };
}

// --- Iniciar el juego cuando el DOM esté listo ---
document.addEventListener('DOMContentLoaded', initializeGame);
