/**
 * ==========================================================================
 * MASCOTA OFICIAL MUNDO SOCIAL: "SOCIOBOT"
 * Versión: 2.1 (paleta editorial, accesible y discreta)
 * ==========================================================================
 *
 * Para activarlo en cualquier página de tu web, añade antes de cerrar </body>:
 *
 * <script src="mascota/mascota.js" defer></script>
 */

(function () {
  'use strict';

  const STORAGE_MINIMIZADA = 'mundo-social-mascota-minimizada';
  const STORAGE_SALUDO = 'mundo-social-mascota-saludo';

  // Guardar y leer preferencias sin romper si el almacenamiento está bloqueado
  function leer(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  function guardar(key, value) {
    try { localStorage.setItem(key, value); } catch { /* sin persistencia */ }
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  // 1. Cargar automáticamente el CSS si no ha sido incluido manualmente
  //    (currentScript solo existe durante la ejecución inicial del script)
  const scriptSrc = document.currentScript && document.currentScript.src;

  function ensureStylesheet() {
    if (document.getElementById('sociobot-styles')) return;
    const link = document.createElement('link');
    link.id = 'sociobot-styles';
    link.rel = 'stylesheet';
    const basePath = scriptSrc ? scriptSrc.substring(0, scriptSrc.lastIndexOf('/') + 1) : 'mascota/';
    link.href = basePath + 'mascota.css';
    document.head.appendChild(link);
  }

  // 2. Robotito con la paleta de Mundo Social: verde bosque, latón y marfil.
  //    Colores planos, sin degradados ni resplandores.
  const ROBOT_SVG = `
    <svg id="sociobot-svg" width="115" height="120" viewBox="0 0 140 145" aria-hidden="true" focusable="false">
      <!-- Orejitas -->
      <g id="sb-ears">
        <path d="M 40 24 Q 28 8 46 6 Q 52 14 54 22 Z" fill="#0f4c3a"/>
        <path d="M 42 22 Q 33 11 44 9 Q 49 15 50 20 Z" fill="#c9a24a"/>
        <path d="M 100 24 Q 112 8 94 6 Q 88 14 86 22 Z" fill="#0f4c3a"/>
        <path d="M 98 22 Q 107 11 96 9 Q 91 15 90 20 Z" fill="#c9a24a"/>
      </g>

      <!-- Antenita -->
      <path d="M 70 17 L 70 7" stroke="#0f4c3a" stroke-width="3" stroke-linecap="round"/>
      <circle cx="70" cy="6" r="4" fill="#c9a24a"/>

      <!-- Brazo izquierdo -->
      <g id="sb-arm-left">
        <circle cx="44" cy="74" r="6" fill="#c9a24a"/>
        <path d="M 44 74 Q 30 82 28 92" stroke="#0f4c3a" stroke-width="7" stroke-linecap="round" fill="none"/>
        <circle cx="27" cy="93" r="5.5" fill="#c9a24a"/>
      </g>

      <!-- Brazo derecho (saluda) -->
      <g id="sb-arm-right">
        <circle cx="96" cy="74" r="6" fill="#c9a24a"/>
        <path d="M 96 74 Q 110 82 112 92" stroke="#0f4c3a" stroke-width="7" stroke-linecap="round" fill="none"/>
        <circle cx="113" cy="93" r="5.5" fill="#c9a24a"/>
      </g>

      <!-- Cuerpo -->
      <g>
        <rect x="42" y="64" width="56" height="42" rx="18" fill="#0f4c3a"/>
        <rect x="50" y="70" width="40" height="30" rx="12" fill="#fbf9f4" stroke="#c2ccc4" stroke-width="1"/>
        <circle cx="70" cy="85" r="3.5" fill="#c9a24a"/>
      </g>

      <!-- Base de levitación -->
      <g>
        <ellipse cx="70" cy="106" rx="14" ry="5" fill="#092c22"/>
        <path d="M 60 108 Q 70 122 80 108 Z" fill="#1a7a5a" opacity="0.35"/>
      </g>

      <!-- Cabeza -->
      <g id="sb-head">
        <rect x="28" y="16" width="84" height="54" rx="27" fill="#fbf9f4" stroke="#c2ccc4" stroke-width="1.5"/>
        <path d="M 44 17 Q 70 13 96 17 L 93 23 Q 70 20 47 23 Z" fill="#0f4c3a"/>

        <!-- Visera -->
        <rect x="36" y="24" width="68" height="40" rx="20" fill="#1b2420"/>
        <path d="M 42 29 Q 70 24 94 29 A 17 17 0 0 0 42 29 Z" fill="#ffffff" opacity="0.1"/>

        <!-- Mejillas -->
        <ellipse id="sb-blush-l" cx="44" cy="50" rx="4.5" ry="2.5" fill="#9e2a2b" opacity="0.35"/>
        <ellipse id="sb-blush-r" cx="96" cy="50" rx="4.5" ry="2.5" fill="#9e2a2b" opacity="0.35"/>

        <!-- Ojos -->
        <g id="sb-eyes">
          <rect id="sb-eye-l" x="48" y="34" width="13" height="15" rx="6.5" fill="#60c99a"/>
          <circle id="sb-spark-l" cx="50" cy="37" r="2.2" fill="#fbf9f4"/>
          <rect id="sb-eye-r" x="79" y="34" width="13" height="15" rx="6.5" fill="#60c99a"/>
          <circle id="sb-spark-r" cx="81" cy="37" r="2.2" fill="#fbf9f4"/>
        </g>
      </g>
    </svg>
  `;

  const ICON_CERRAR = `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>`;

  // Cabecita mínima para el botón de restaurar
  const ICON_CABEZA = `<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="7" fill="#fbf9f4"/><rect x="5.5" y="7.5" width="13" height="9" rx="4.5" fill="#1b2420"/><rect x="8" y="10" width="2.6" height="3.4" rx="1.3" fill="#60c99a"/><rect x="13.4" y="10" width="2.6" height="3.4" rx="1.3" fill="#60c99a"/></svg>`;

  // 3. Crear e inyectar el elemento en el DOM
  function initSocioBot() {
    if (document.getElementById('sociobot-container')) return;

    ensureStylesheet();

    const container = document.createElement('div');
    container.id = 'sociobot-container';
    container.innerHTML = `
      <div id="sociobot-bubble" class="sociobot-bubble" aria-hidden="true">
        <span id="sociobot-text" class="sociobot-bubble-text"></span>
      </div>

      <button id="sociobot-stage" class="sociobot-stage" type="button" aria-label="SocioBot, la mascota de Mundo Social. Pulsa para un consejo">
        <span id="sociobot-body-wrap" class="sociobot-body sociobot-floating">${ROBOT_SVG}</span>
        <span id="sociobot-shadow" class="sociobot-shadow"></span>
      </button>

      <button id="sociobot-close" class="sociobot-close-btn" type="button" aria-label="Ocultar a SocioBot">${ICON_CERRAR}</button>

      <button id="sociobot-restore-btn" class="sociobot-minimized-btn" type="button" aria-label="Mostrar a SocioBot">${ICON_CABEZA}</button>
    `;

    document.body.appendChild(container);

    setupInteractions(container);
  }

  // 4. Interacción, seguimiento ocular y mensajes
  function setupInteractions(container) {
    const stage = container.querySelector('#sociobot-stage');
    const bodyWrap = container.querySelector('#sociobot-body-wrap');
    const head = container.querySelector('#sb-head');
    const eyeL = container.querySelector('#sb-eye-l');
    const eyeR = container.querySelector('#sb-eye-r');
    const sparkL = container.querySelector('#sb-spark-l');
    const sparkR = container.querySelector('#sb-spark-r');
    const blushL = container.querySelector('#sb-blush-l');
    const blushR = container.querySelector('#sb-blush-r');
    const armRight = container.querySelector('#sb-arm-right');
    const shadow = container.querySelector('#sociobot-shadow');
    const bubble = container.querySelector('#sociobot-bubble');
    const textEl = container.querySelector('#sociobot-text');
    const closeBtn = container.querySelector('#sociobot-close');
    const restoreBtn = container.querySelector('#sociobot-restore-btn');

    let isMinimized = false;
    let bubbleTimeout = null;
    let idleTimer = null;
    let faceTimer = null;
    let isSleeping = false;
    let lastMessage = -1;
    let pendingMove = null;

    // Mensajes con la voz de Mundo Social: útiles, sobrios, sin emojis
    const MESSAGES = [
      'Aquí encontrarás notas de coyuntura, apuntes y papers de economía.',
      '¿Buscas un curso? Prueba «Econometría» o «MIT» en el buscador.',
      'Cada ficha trae su cita en APA lista para copiar.',
      'Los apuntes y exámenes resueltos se descargan en PDF, sin registro.',
      '¿Escribiste algo? Envíalo desde «Enviar publicación», al pie de la página.',
      'El rigor técnico de la teoría al servicio del debate público.'
    ];

    function showBubble(text, durationMs = 5000, tone = 'info') {
      if (isMinimized) return;
      textEl.textContent = text;
      bubble.dataset.tone = tone;
      bubble.classList.add('visible');

      clearTimeout(bubbleTimeout);
      if (durationMs > 0) {
        bubbleTimeout = setTimeout(hideBubble, durationMs);
      }
    }

    function hideBubble() {
      clearTimeout(bubbleTimeout);
      bubble.classList.remove('visible');
    }

    function bounce() {
      if (reduceMotion.matches) return;
      bodyWrap.classList.remove('sociobot-floating', 'sociobot-jumping');
      void bodyWrap.offsetWidth; // reinicia la animación
      bodyWrap.classList.add('sociobot-jumping');
      shadow.classList.add('is-jumping');
      setTimeout(() => {
        bodyWrap.classList.remove('sociobot-jumping');
        bodyWrap.classList.add('sociobot-floating');
        shadow.classList.remove('is-jumping');
      }, 480);
    }

    function wave() {
      if (reduceMotion.matches) return;
      armRight.classList.remove('sociobot-arm-waving');
      void armRight.getBoundingClientRect(); // reinicia la animación
      armRight.classList.add('sociobot-arm-waving');
    }

    function setEyes(y, height) {
      eyeL.setAttribute('y', y);
      eyeL.setAttribute('height', height);
      eyeR.setAttribute('y', y);
      eyeR.setAttribute('height', height);
    }

    function resetFace() {
      isSleeping = false;
      eyeL.setAttribute('x', 48);
      eyeR.setAttribute('x', 79);
      setEyes(34, 15);
      sparkL.style.display = '';
      sparkR.style.display = '';
      blushL.setAttribute('opacity', '0.35');
      blushR.setAttribute('opacity', '0.35');
    }

    function happyFace() {
      setEyes(38, 6);
      sparkL.style.display = 'none';
      sparkR.style.display = 'none';
      blushL.setAttribute('opacity', '0.6');
      blushR.setAttribute('opacity', '0.6');
      clearTimeout(faceTimer);
      faceTimer = setTimeout(resetFace, 1200);
    }

    // Cara de preocupación para explicar un error: ojos entrecerrados y un leve "no"
    function worriedFace() {
      setEyes(37, 9);
      sparkL.style.display = 'none';
      sparkR.style.display = 'none';
      blushL.setAttribute('opacity', '0');
      blushR.setAttribute('opacity', '0');
      if (!reduceMotion.matches) {
        head.classList.remove('sociobot-shaking');
        void head.getBoundingClientRect(); // reinicia la animación
        head.classList.add('sociobot-shaking');
      }
      clearTimeout(faceTimer);
      faceTimer = setTimeout(resetFace, 2400);
    }

    function sleep() {
      isSleeping = true;
      setEyes(40, 3);
      sparkL.style.display = 'none';
      sparkR.style.display = 'none';
    }

    // Seguimiento ocular del cursor (solo con mouse; un cálculo por fotograma)
    function lookAt(clientX, clientY) {
      const stageRect = stage.getBoundingClientRect();
      const dx = clientX - (stageRect.left + stageRect.width / 2);
      const dy = clientY - (stageRect.top + 45);
      const angle = Math.atan2(dy, dx);
      const dist = Math.min(3.5, Math.hypot(dx, dy) / 25);
      const px = Math.cos(angle) * dist;
      const py = Math.sin(angle) * dist;

      eyeL.setAttribute('x', 48 + px);
      eyeL.setAttribute('y', 34 + py);
      sparkL.setAttribute('cx', 50 + px);
      sparkL.setAttribute('cy', 37 + py);
      eyeR.setAttribute('x', 79 + px);
      eyeR.setAttribute('y', 34 + py);
      sparkR.setAttribute('cx', 81 + px);
      sparkR.setAttribute('cy', 37 + py);

      const tilt = Math.max(-5, Math.min(5, dx / 40));
      head.style.transform = `rotate(${tilt}deg)`;
    }

    window.addEventListener('mousemove', (e) => {
      if (isMinimized || !finePointer.matches) return;
      if (isSleeping) resetFace();

      // Reposo tras 40 s sin mover el mouse
      clearTimeout(idleTimer);
      idleTimer = setTimeout(sleep, 40000);

      if (pendingMove) return;
      pendingMove = requestAnimationFrame(() => {
        pendingMove = null;
        lookAt(e.clientX, e.clientY);
      });
    }, { passive: true });

    // Clic o teclado sobre la mascota: salto, saludo y un consejo
    stage.addEventListener('click', () => {
      bounce();
      wave();
      happyFace();

      let next = Math.floor(Math.random() * MESSAGES.length);
      if (next === lastMessage) next = (next + 1) % MESSAGES.length;
      lastMessage = next;
      showBubble(MESSAGES[next], 5000, 'info');
    });

    function minimize() {
      isMinimized = true;
      hideBubble();
      container.classList.add('minimized');
      guardar(STORAGE_MINIMIZADA, '1');
    }

    function restore() {
      isMinimized = false;
      container.classList.remove('minimized');
      guardar(STORAGE_MINIMIZADA, '0');
      bounce();
      wave();
      stage.focus({ preventScroll: true });
    }

    closeBtn.addEventListener('click', () => {
      minimize();
      restoreBtn.focus({ preventScroll: true });
    });

    restoreBtn.addEventListener('click', restore);

    // API para que cada página hable a través de la mascota.
    // El globo es decorativo: la página debe mostrar el mismo mensaje de forma accesible.
    window.SocioBot = {
      say(text, { duration = 6000 } = {}) {
        showBubble(text, duration, 'info');
      },
      explainError(text, { duration = 9000 } = {}) {
        worriedFace();
        showBubble(text, duration, 'error');
      },
      celebrate(text, { duration = 7000 } = {}) {
        bounce();
        wave();
        happyFace();
        showBubble(text, duration, 'ok');
      },
      hide: hideBubble
    };

    // Escape cierra el globo de diálogo
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideBubble();
    });

    // Estado recordado entre páginas y visitas. En pantallas pequeñas, si el
    // lector no eligió nada, empieza compacta para no tapar el buscador.
    const preferencia = leer(STORAGE_MINIMIZADA);
    const pantallaChica = window.matchMedia('(max-width: 640px)').matches;
    if (preferencia === '1' || (preferencia === null && pantallaChica)) {
      isMinimized = true;
      container.classList.add('minimized');
      return;
    }

    // Saludo único: solo en la primera visita
    if (!leer(STORAGE_SALUDO)) {
      guardar(STORAGE_SALUDO, '1');
      setTimeout(() => {
        showBubble('Hola, soy SocioBot. Pulsa sobre mí cuando quieras un consejo para explorar Mundo Social.', 7000);
        wave();
      }, 1500);
    }
  }

  // Inicializar al cargar el documento
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSocioBot);
  } else {
    initSocioBot();
  }
})();
