# Tarea: Rediseño Editorial Premium de Mundo Social (Tri-Agente)

## 🎯 Objetivo
Elevar el diseño visual y la experiencia de usuario de Mundo Social (`C:\mundo-social`) al nivel de un portal editorial académico de referencia internacional (estilo *The Economist*, *Foreign Affairs*, *The Atlantic*, *derek-martell.github.io*), erradicando cualquier aspecto genérico de plantilla ("aspecto IA").

---

## 🛡️ REGLAS CRÍTICAS Y LÍNEAS ROJAS (NO ROMPER)

1. **PROHIBIDO MODIFICAR LOS DATOS:**
   - NO toques ni reduzcas `data/articulos.json` ni `js/articulos-data.js`. Los 96 artículos y apuntes académicos con sus enlaces a PDF deben permanecer intactos.

2. **ESTRICTA CODIFICACIÓN UTF-8 (SIN BOM):**
   - Todos los archivos (`.html`, `.css`, `.js`) deben guardarse estrictamente en UTF-8.
   - PROHIBIDO corromper tildes o caracteres en español (`Investigación`, `Apuntes y Exámenes`, `Coyuntura`, `Análisis`). Si un botón no coincide exactamente con la categoría o se rompe la tilde, el filtro falla.

3. **CONSERVAR IDENTIDAD Y LOGOTIPOS:**
   - La paleta oficial es: Verde bosque editorial (`#0f4c3a`), Marfil/Papel de fondo (`#fbf9f4`), Acento Latón/Dorado (`#c9a24a`), y Neutros de tinta (`#1a2421`).
   - Conservar los logotipos oficiales en `imagenes/` (`logo-transparent.png`, `logo-dark-mode.png`, `logo-emblem.png`) y su soporte para modo claro/oscuro.
   - Mantener el CNAME (`mundo-social.com`) y la carpeta `admin/` (Decap CMS).

4. **INTEGRIDAD DE JAVASCRIPT Y SELECTORES:**
   - NO alteres los IDs y clases clave de los que depende `js/app.js`: `#articles-grid`, `#search-input`, `#category-tabs`, `.cat-tab`, `.nav-link`, `#article-modal`, `#total-count`.
   - Todas las pestañas y filtros (`Todos`, `Docencia`, `Coyuntura`, `Investigación`, `Análisis`) deben seguir filtrando de forma reactiva e instantánea.

---

## 🎨 GUÍA DE ESTILO EDITORIAL (ANTIDISEÑO IA)
- **Tipografía:** Jerarquía tipográfica rigurosa usando la combinación actual (`Literata` para títulos y serif editorial; `Schibsted Grotesk` para UI, metadatos y navegación).
- **Tratamiento del Espacio:** Rejilla editorial asimétrica con pesos visuales diferenciados (artículo destacado tipo portada, artículos secundarios en dos columnas, notas y apuntes en lista compacta de alta densidad).
- **Micro-interacciones:** Transiciones sobrias y elegantes (150-250ms), líneas divisorias finas (hairlines de 1px con opacidad sutil), badges discretos y micro-relieves sin sombras exageradas de tipo "neumorfismo" o gradientes morados/azules genéricos.

---

## 📋 REQUERIMIENTOS ESPECÍFICOS DE MEJORA

1. **Cabecera y Hero Editorial:**
   - Convertir el hero en un auténtico "front-page masthead" con fecha del día / edición actual, ticker o micro-destacado editorial sobrio.
   - Barra de búsqueda con un diseño más refinado e integrado (icono SVG minimalista, indicador sutil de resultados encontrados en tiempo real).

2. **Tarjetas de Publicación (`.card`):**
   - Diferenciar visualmente los tipos de publicación (un apunte de examen universitario luce distinto a un artículo de coyuntura o una investigación).
   - Añadir botón rápido de un clic "Copiar cita APA" o "Compartir" en cada tarjeta.
   - Indicador visual elegante para los documentos que cuentan con PDF descargable.

3. **Filtros y Pestañas de Categoría:**
   - Mostrar contadores reales por categoría en las pestañas (ejemplo: *Docencia (28)*, *Coyuntura (33)*, *Investigación (4)*).
   - Scroll horizontal táctil fluido en pantallas móviles con gradiente de desvanecimiento en los bordes.

4. **Lector Modal / Visor de PDF:**
   - Pulir el diseño del visor emergente con barra de herramientas superior: botón de descarga directa, copiar enlace permanente y previsualización incrustada limpia.

5. **Sección "Nosotros / Manifiesto":**
   - Diseñar una sección o modal editorial elegante explicando la misión de Mundo Social: difusión crítica de la economía política y el pensamiento social en el Perú.
