// ==========================================================================
// MUNDO SOCIAL - Lógica de Interacción, Búsqueda y Filtros
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
  // Estado de la aplicación
  let currentCategory = "Todos";
  let currentTag = "";
  let searchQuery = "";
  let activeModalItem = null;
  let lastFocused = null;

  // Elementos del DOM
  const grid = document.getElementById("articles-grid");
  const emptyState = document.getElementById("empty-state");
  const searchInput = document.getElementById("search-input");
  const searchClear = document.getElementById("search-clear");
  const resultsCount = document.getElementById("results-count");
  const searchMatches = document.getElementById("search-matches");
  const categoryTabs = document.querySelectorAll(".cat-tab");
  const tagChipsContainer = document.querySelector(".tag-chips");
  const themeToggle = document.getElementById("theme-toggle");

  // Portada editorial
  const editorialLayout = document.getElementById("editorial-layout");
  const leadSlot = document.getElementById("lead-slot");
  const secondaryGrid = document.getElementById("secondary-grid");
  const gacetaList = document.getElementById("gaceta-list");
  const hubApuntes = document.getElementById("hub-apuntes");
  const hubGrid = document.getElementById("hub-grid");
  const archiveHeading = document.getElementById("archive-heading");

  // Modal
  const modalOverlay = document.getElementById("modal-overlay");
  const modalCard = modalOverlay?.querySelector(".modal-card");
  const modalClose = document.getElementById("modal-close");
  const modalTitle = document.getElementById("modal-title");
  const modalBadge = document.getElementById("modal-badge");
  const modalDate = document.getElementById("modal-date");
  const modalAuthors = document.getElementById("modal-authors");
  const modalResumen = document.getElementById("modal-resumen");
  const modalPdfBtn = document.getElementById("modal-pdf-btn");
  const modalPdfBtnLabel = document.getElementById("modal-pdf-btn-label");
  const modalPreviewBtn = document.getElementById("modal-preview-btn");
  const modalCiteBtn = document.getElementById("modal-cite-btn");
  const modalShareBtn = document.getElementById("modal-share-btn");
  const modalShareLabel = modalShareBtn?.querySelector(".modal-tool-btn-label");
  const modalCite = document.getElementById("modal-cite");
  const modalCiteText = document.getElementById("modal-cite-text");
  const modalCiteStatus = document.getElementById("modal-cite-status");
  const modalPdfViewer = document.getElementById("modal-pdf-viewer");
  const modalPdfFrame = document.getElementById("modal-pdf-frame");
  const modalPdfFallback = document.getElementById("modal-pdf-fallback");

  const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"];
  const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const INSTITUCIONES = { "UNMSM": "UNMSM", "MIT": "MIT" };
  const CURSOS = ["Macroeconomía", "Microeconomía", "Econometría", "Matemáticas", "Finanzas"];
  const ICON_PDF = `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>`;
  const ICON_LINK = `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;

  // Algunos "documentos" en realidad son enlaces a un recurso externo interactivo
  // (por ejemplo un tablero de Tableau Public) en vez de un PDF descargable.
  function isPdfUrl(url) {
    return /\.pdf(?:[?#]|$)/i.test(url || "");
  }

  // ==========================================================================
  // 1. TEMA CLARO / OSCURO (Sincronizado y persistente)
  // ==========================================================================
  const savedTheme = localStorage.getItem("mundo-social-theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);

  themeToggle?.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("mundo-social-theme", next);
  });

  // ==========================================================================
  // 2. RENDERIZADO
  // ==========================================================================
  // Normalización sin tildes para coincidencia perfecta de categorías
  function inCategory(item, catName) {
    const normCat = s => (s || "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
    const targetCat = normCat(catName);
    const itemCat = normCat(item.category);
    return targetCat === "todos" ||
      itemCat === targetCat ||
      (targetCat === "docencia" && (itemCat.includes("docencia") || itemCat.includes("apunte"))) ||
      (targetCat.includes("apunte") && (itemCat.includes("docencia") || itemCat.includes("apunte")));
  }

  // Contadores reales en pestañas y tira de métricas (derivados del catálogo)
  function renderCounts() {
    categoryTabs.forEach(tab => {
      const badge = tab.querySelector(".cat-badge-count");
      if (badge) badge.textContent = ARTICULOS_DATA.filter(item => inCategory(item, tab.dataset.category)).length;
    });
    document.querySelectorAll("[data-stat]").forEach(el => {
      const key = el.dataset.stat;
      if (key === "total") el.textContent = ARTICULOS_DATA.length;
      else if (key === "pdf") el.textContent = ARTICULOS_DATA.filter(item => item.pdf).length;
      else el.textContent = ARTICULOS_DATA.filter(item => inCategory(item, key)).length;
    });
  }

  // Fecha de la edición (generada en el cliente)
  const heroDate = document.getElementById("hero-date");
  if (heroDate) {
    const today = new Date();
    heroDate.dateTime = today.toISOString().slice(0, 10);
    heroDate.textContent = "Edición del " + new Intl.DateTimeFormat("es-PE", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    }).format(today);
  }

  function render() {
    if (!grid) return;

    const q = searchQuery.toLowerCase().trim();

    // Filtrar publicaciones
    const filtered = ARTICULOS_DATA.filter(item => {
      const matchesCategory = inCategory(item, currentCategory);

      // Filtro de Etiqueta Secundaria
      const matchesTag = !currentTag || (item.tags && item.tags.includes(currentTag));

      // Filtro de Búsqueda de Texto
      const matchesSearch = !q ||
        item.title.toLowerCase().includes(q) ||
        item.authors.some(a => a.toLowerCase().includes(q)) ||
        (item.tags && item.tags.some(t => t.toLowerCase().includes(q))) ||
        item.category.toLowerCase().includes(q);

      return matchesCategory && matchesTag && matchesSearch;
    });

    // Portada editorial solo en el estado "sin filtros"
    const editorialActive = (currentCategory === "Todos" || currentCategory === "") && !currentTag && !q;
    toggleEditorialView(editorialActive, filtered.length);

    let gridItems = filtered;
    if (editorialActive) {
      const shownIds = renderEditorialLayout(filtered);
      gridItems = filtered.filter(item => !shownIds.has(item.id));
    }

    // Actualizar contador
    if (resultsCount) {
      resultsCount.innerHTML = editorialActive
        ? `Archivo de <strong>${ARTICULOS_DATA.length}</strong> publicaciones &middot; portada, gaceta, fichero y archivo completo`
        : `Mostrando <strong>${filtered.length}</strong> de ${ARTICULOS_DATA.length} publicaciones en <em>${escapeHtml(currentCategory)}</em>`;
      resultsCount.classList.remove("is-updating");
      void resultsCount.offsetWidth; // reinicia la transición
      resultsCount.classList.add("is-updating");
    }
    if (searchMatches) {
      searchMatches.textContent = q
        ? `${filtered.length} ${filtered.length === 1 ? "coincidencia" : "coincidencias"}`
        : "";
    }

    // Manejar estado vacío
    if (filtered.length === 0) {
      grid.innerHTML = "";
      if (emptyState) emptyState.style.display = "block";
      return;
    } else {
      if (emptyState) emptyState.style.display = "none";
    }

    grid.innerHTML = gridItems.map(cardHtml).join("");
  }

  function toggleEditorialView(active, count) {
    if (editorialLayout) editorialLayout.style.display = active ? "" : "none";
    if (hubApuntes) hubApuntes.style.display = active ? "" : "none";
    if (archiveHeading) {
      archiveHeading.style.display = "";
      if (active) {
        archiveHeading.textContent = "Archivo completo de publicaciones";
      } else {
        const labels = {
          "Coyuntura": "Notas de Coyuntura Económica",
          "Docencia": "Hub de Apuntes y Exámenes UNMSM · MIT",
          "Investigación": "Investigaciones y Papers Académicos",
          "Análisis": "Artículos y Columnas de Opinión"
        };
        archiveHeading.textContent = (labels[currentCategory] || `Publicaciones: ${currentCategory}`) + ` (${count})`;
      }
    }
  }

  // Arma lead / secundarias / gaceta / hub y devuelve los ids ya mostrados
  function renderEditorialLayout(data) {
    const shown = new Set();

    // La portada siempre muestra la última publicación real, sin importar su
    // categoría (antes solo miraba Investigación/Análisis y podía dejar en
    // portada un artículo más viejo que notas de Coyuntura más recientes).
    const contenido = data.filter(item => item.type !== "Página Temática");
    const lead = sortByRecency(contenido)[0];
    if (lead) shown.add(lead.id);

    const pool = sortByRecency(contenido.filter(item =>
      (item.category === "Investigación" || item.category === "Análisis") &&
      !shown.has(item.id)
    ));

    const secondary = [
      ...pool.filter(item => item.category === "Investigación" && !shown.has(item.id)),
      ...pool.filter(item => item.category !== "Investigación" && !shown.has(item.id))
    ].slice(0, 2);
    secondary.forEach(item => shown.add(item.id));

    const gaceta = data.filter(item => item.category === "Coyuntura" && !shown.has(item.id)).slice(0, 7);
    gaceta.forEach(item => shown.add(item.id));

    if (leadSlot) leadSlot.innerHTML = lead ? leadHtml(lead) : "";
    if (secondaryGrid) secondaryGrid.innerHTML = secondary.map(secondaryHtml).join("");
    if (gacetaList) gacetaList.innerHTML = gaceta.map(briefHtml).join("");

    renderHubApuntes(data).forEach(id => shown.add(id));
    return shown;
  }

  function renderHubApuntes(data) {
    const apuntes = data.filter(item => item.category === "Docencia" || item.category === "Apuntes y Exámenes");
    if (hubGrid) hubGrid.innerHTML = apuntes.map(dossierHtml).join("");
    return apuntes.map(item => item.id);
  }

  // ==========================================================================
  // 3. PLANTILLAS DE TARJETA
  // ==========================================================================
  function badgeClassFor(type) {
    if (type === "Nota Informativa") return "badge-nota";
    if (type === "Apunte Académico") return "badge-apunte";
    if (type === "Investigación") return "badge-investigacion";
    if (type === "Columna de Opinión") return "badge-columna";
    return "badge-articulo";
  }

  function authorsOf(item) {
    return item.authors && item.authors.length > 0 ? item.authors.join(", ") : "Equipo Editorial";
  }

  function metaStrip(item, extra = []) {
    const institution = getInstitution(item.tags);
    const parts = [
      `N.º ${getFolio(item.id)}`,
      institution,
      ...extra,
      `${getReadingTime(item.resumen)} min de lectura`
    ].filter(Boolean);
    return `<div class="card-meta-strip">${parts.map(p => `<span>${escapeHtml(p)}</span>`).join("")}</div>`;
  }

  function pdfLink(item, label) {
    if (!item.pdf) return "";
    const esPdf = isPdfUrl(item.pdf);
    const texto = label || (esPdf ? "PDF" : "Ver recurso");
    const titulo = esPdf ? "Descargar o ver documento PDF" : "Abrir recurso externo en una pestaña nueva";
    const icono = esPdf ? ICON_PDF : ICON_LINK;
    return `<a href="${escapeHtml(item.pdf)}" target="_blank" rel="noopener noreferrer" class="btn-pdf" title="${titulo}">${icono}${texto}</a>`;
  }

  function openAttrs(item) {
    return `data-open-id="${item.id}" tabindex="0" aria-label="Ver ficha: ${escapeHtml(item.title)}"`;
  }

  // Tratamiento visual por género: apunte, coyuntura, investigación o columna
  function kindClassFor(item) {
    if (item.category === "Docencia" || item.category === "Apuntes y Exámenes" || item.type === "Apunte Académico") return "card--kind-apunte";
    if (item.category === "Coyuntura") return "card--kind-coyuntura";
    if (item.category === "Investigación" || item.type === "Investigación") return "card--kind-investigacion";
    return "card--kind-analisis";
  }

  function citeButton(item) {
    return `<button type="button" class="btn-cite-mini" data-cite-id="${item.id}" aria-label="Copiar cita APA: ${escapeHtml(item.title)}" title="Copiar cita bibliográfica (APA 7)">Citar</button>`;
  }

  function cardHtml(item) {
    const tagsHtml = (item.tags || []).slice(0, 3)
      .map(t => `<span class="mini-tag">${escapeHtml(t)}</span>`)
      .join("");
    const dateFormatted = formatDate(item.date);

    return `
      <article class="card ${kindClassFor(item)}${item.pdf ? " has-pdf" : ""}" ${openAttrs(item)}>
        <div>
          <div class="card-top">
            <span class="card-badge ${badgeClassFor(item.type)}">${escapeHtml(item.type)}</span>
            ${dateFormatted ? `<time class="card-date">${dateFormatted}</time>` : ""}
          </div>
          <h3 class="card-title">${escapeHtml(item.title)}</h3>
          <p class="card-authors">Por <strong>${escapeHtml(authorsOf(item))}</strong></p>
          ${metaStrip(item)}
          <div class="card-tags">${tagsHtml}</div>
        </div>
        <div class="card-footer">
          <span class="btn-read">Ver ficha <span aria-hidden="true">&rarr;</span></span>
          <span class="card-actions">${citeButton(item)}${pdfLink(item)}</span>
        </div>
      </article>
    `;
  }

  function leadHtml(item) {
    const institution = getInstitution(item.tags);
    const dateFormatted = formatDate(item.date);
    return `
      <article class="card--lead" ${openAttrs(item)}>
        <p class="kicker"><span class="card-badge ${badgeClassFor(item.type)}">${escapeHtml(item.type)}</span>${dateFormatted ? `<time>${dateFormatted}</time>` : ""}</p>
        <h3 class="lead-title">${escapeHtml(item.title)}</h3>
        <p class="lead-dek">${escapeHtml(item.resumen)}</p>
        <p class="byline">Por <strong>${escapeHtml(authorsOf(item))}</strong>${institution ? ` &mdash; ${escapeHtml(institution)}` : ""}</p>
        ${metaStrip(item)}
        <div class="lead-actions">
          <span class="btn-read">Leer ficha completa <span aria-hidden="true">&rarr;</span></span>
          ${pdfLink(item, isPdfUrl(item.pdf) ? "Documento PDF" : "Ver recurso")}
        </div>
      </article>
    `;
  }

  function secondaryHtml(item) {
    return `
      <article class="card--secondary" ${openAttrs(item)}>
        <span class="secondary-folio" aria-hidden="true">${getFolio(item.id)}</span>
        <div class="secondary-body">
          <p class="kicker"><span class="card-badge ${badgeClassFor(item.type)}">${escapeHtml(item.type)}</span></p>
          <h3 class="secondary-title">${escapeHtml(item.title)}</h3>
          <p class="secondary-dek">${escapeHtml(item.resumen)}</p>
          <p class="byline">Por <strong>${escapeHtml(authorsOf(item))}</strong></p>
          ${metaStrip(item)}
        </div>
      </article>
    `;
  }

  function briefHtml(item) {
    const dateFormatted = formatDate(item.date);
    return `
      <li class="card--brief" ${openAttrs(item)}>
        <span class="brief-folio">${getFolio(item.id)}</span>
        <div>
          <h3 class="brief-title">${escapeHtml(item.title)}</h3>
          <p class="brief-meta">${escapeHtml(authorsOf(item))}${dateFormatted ? ` &middot; <time>${dateFormatted}</time>` : ""}</p>
        </div>
      </li>
    `;
  }

  function dossierHtml(item) {
    const institution = getInstitution(item.tags);
    const course = getCourse(item.tags);
    const dateFormatted = formatDate(item.date);
    return `
      <article class="dossier-card" ${openAttrs(item)}>
        <header class="dossier-head">
          <span class="dossier-folio">Ficha N.º ${getFolio(item.id)}</span>
          ${institution ? `<span class="dossier-seal">${escapeHtml(institution)}</span>` : ""}
        </header>
        ${course ? `<p class="dossier-course">${escapeHtml(course)}</p>` : ""}
        <h3 class="dossier-title">${escapeHtml(item.title)}</h3>
        <p class="dossier-authors">${escapeHtml(authorsOf(item))}</p>
        <footer class="dossier-foot">
          <span>${dateFormatted ? `<time>${dateFormatted}</time> &middot; ` : ""}${getReadingTime(item.resumen)} min</span>
          <span class="card-actions">${citeButton(item)}${pdfLink(item)}</span>
        </footer>
      </article>
    `;
  }

  // Apertura de fichas por clic o teclado (delegado)
  document.addEventListener("click", async (e) => {
    const citeBtn = e.target.closest(".btn-cite-mini");
    if (citeBtn) {
      e.stopPropagation();
      const item = ARTICULOS_DATA.find(x => x.id === Number(citeBtn.dataset.citeId));
      if (!item) return;
      const ok = await copyText(formatAPA(item));
      citeBtn.textContent = ok ? "Copiada" : "Sin copiar";
      citeBtn.classList.toggle("is-done", ok);
      setTimeout(() => {
        citeBtn.textContent = "Citar";
        citeBtn.classList.remove("is-done");
      }, 1800);
      return;
    }
    if (e.target.closest("a, button")) return;
    const el = e.target.closest("[data-open-id]");
    if (el) window.openModal(Number(el.dataset.openId));
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const el = e.target.closest?.("[data-open-id]");
    if (el && e.target === el) {
      e.preventDefault();
      window.openModal(Number(el.dataset.openId));
    }
  });

  // ==========================================================================
  // 4. CONTROLADORES DE BÚSQUEDA Y FILTROS
  // ==========================================================================
  searchInput?.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    if (searchClear) {
      searchClear.style.display = searchQuery ? "block" : "none";
    }
    render();
  });

  searchClear?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    searchQuery = "";
    searchClear.style.display = "none";
    searchInput?.focus();
    render();
  });

  // Sincronización del menú superior (.nav-link)
  function updateNavActive(catName) {
    const norm = s => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const target = norm(catName);

    document.querySelectorAll(".nav-link").forEach(link => {
      const navCat = norm(link.dataset.category || link.textContent);
      if (navCat === target ||
          (target === "todos" && (navCat === "todos" || navCat.includes("publicacion"))) ||
          (target.includes("docencia") && navCat.includes("docencia")) ||
          (target.includes("apunte") && navCat.includes("docencia"))) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });
  }

  // Función global para seleccionar categoría desde cualquier parte (navbar, botones, enlaces)
  window.setCategory = function(catName, shouldScroll = true) {
    if (!catName) return;

    // Caso especial: "Nosotros"
    if (catName.toLowerCase().includes("nosotros")) {
      const nosotrosSection = document.getElementById("nosotros");
      if (nosotrosSection) {
        nosotrosSection.scrollIntoView({ behavior: "smooth" });
      }
      updateNavActive("Nosotros");
      return;
    }

    const norm = s => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const target = norm(catName);

    let foundTab = null;
    categoryTabs.forEach(t => {
      const c = norm(t.dataset.category || "");
      if (c === target ||
          (target.includes("docencia") && (c.includes("docencia") || c.includes("apunte"))) ||
          (target.includes("apunte") && (c.includes("docencia") || c.includes("apunte"))) ||
          (target.includes("coyuntura") && c.includes("coyuntura")) ||
          (target.includes("investig") && c.includes("investig"))) {
        foundTab = t;
      }
    });

    if (foundTab) {
      categoryTabs.forEach(t => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      foundTab.classList.add("active");
      foundTab.setAttribute("aria-selected", "true");
      currentCategory = foundTab.dataset.category || "Todos";
      updateNavActive(currentCategory);
      renderTagChips(currentCategory);
      render();

      if (shouldScroll) {
        const articulosEl = document.getElementById("articulos");
        if (articulosEl) {
          articulosEl.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
  };

  // Escuchar clics en los enlaces del menú superior
  document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", (e) => {
      const cat = link.dataset.category || link.getAttribute("href")?.replace("#", "");
      if (cat) {
        e.preventDefault();
        window.setCategory(cat, true);
      }
      closeNavMenu();
    });
  });

  // Menú hamburguesa para navegación en móvil
  const navToggle = document.querySelector(".nav-toggle");
  const navMenu = document.getElementById("nav-menu");

  function closeNavMenu() {
    if (!navToggle || !navMenu) return;
    navToggle.setAttribute("aria-expanded", "false");
    navMenu.classList.remove("is-open");
  }

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      const isOpen = navMenu.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    document.addEventListener("click", (e) => {
      if (navMenu.classList.contains("is-open") &&
          !navMenu.contains(e.target) &&
          !navToggle.contains(e.target)) {
        closeNavMenu();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeNavMenu();
    });
  }

  // Sistema Dinámico de Palabras Recomendadas / Filtros según Sección
  const TAGS_BY_CATEGORY = {
    "Todos": [
      { label: "Macroeconomía", tag: "Macroeconomía" },
      { label: "Microeconomía", tag: "Microeconomía" },
      { label: "Econometría", tag: "Econometría" },
      { label: "Finanzas y Mercados", tag: "Finanzas" },
      { label: "Matemáticas", tag: "Matemáticas" },
      { label: "Economía Peruana", tag: "Economía Peruana" },
      { label: "BCRP y Fed", tag: "Política Monetaria" },
      { label: "Minería y Exportaciones", tag: "Comercio & Minería" },
      { label: "FCE San Marcos", tag: "UNMSM" },
      { label: "Ricardo Caballero (MIT)", tag: "MIT" }
    ],
    "Coyuntura": [
      { label: "Economía Peruana", tag: "Economía Peruana" },
      { label: "Política Monetaria (BCRP/Fed)", tag: "Política Monetaria" },
      { label: "Minería y Exportaciones", tag: "Comercio & Minería" },
      { label: "Mercados y Finanzas", tag: "Mercados & Finanzas" },
      { label: "Macroeconomía", tag: "Macroeconomía" }
    ],
    "Docencia": [
      { label: "Macroeconomía", tag: "Macroeconomía" },
      { label: "Microeconomía", tag: "Microeconomía" },
      { label: "Econometría", tag: "Econometría" },
      { label: "Matemáticas para Economistas", tag: "Matemáticas" },
      { label: "Finanzas", tag: "Finanzas" },
      { label: "FCE San Marcos", tag: "UNMSM" },
      { label: "Ricardo Caballero (MIT)", tag: "MIT" }
    ],
    "Investigación": [
      { label: "Papers & Modelos", tag: "Papers & Modelos" },
      { label: "Tableros de Datos", tag: "Tablero de Datos" }
    ],
    "Análisis": [
      { label: "Análisis Económico", tag: "Análisis Económico" },
      { label: "Economía Peruana", tag: "Economía Peruana" },
      { label: "Opinión", tag: "Opinión" }
    ]
  };

  function renderTagChips(category = "Todos") {
    if (!tagChipsContainer) return;
    const catKey = TAGS_BY_CATEGORY[category] ? category : "Todos";
    const tagsList = TAGS_BY_CATEGORY[catKey] || TAGS_BY_CATEGORY["Todos"];

    if (currentTag && !tagsList.some(item => item.tag === currentTag)) {
      currentTag = "";
    }

    tagChipsContainer.innerHTML = "";
    tagsList.forEach(item => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `tag-chip ${currentTag === item.tag ? "active" : ""}`;
      btn.dataset.tag = item.tag;
      btn.setAttribute("aria-pressed", currentTag === item.tag ? "true" : "false");
      btn.textContent = item.label;

      btn.addEventListener("click", () => {
        if (currentTag === item.tag) {
          currentTag = "";
          btn.classList.remove("active");
          btn.setAttribute("aria-pressed", "false");
        } else {
          tagChipsContainer.querySelectorAll(".tag-chip").forEach(c => {
            c.classList.remove("active");
            c.setAttribute("aria-pressed", "false");
          });
          btn.classList.add("active");
          btn.setAttribute("aria-pressed", "true");
          currentTag = item.tag;
        }
        render();
      });

      tagChipsContainer.appendChild(btn);
    });
  }

  // Escuchar clics en las pestañas de categorías principales
  categoryTabs.forEach(tab => {
    tab.setAttribute("aria-selected", tab.classList.contains("active") ? "true" : "false");
    tab.addEventListener("click", () => {
      categoryTabs.forEach(t => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      currentCategory = tab.dataset.category || "Todos";
      updateNavActive(currentCategory);
      renderTagChips(currentCategory);
      render();
    });
  });

  // ==========================================================================
  // 5. MODAL DE LECTURA, CITA Y VISOR PDF
  // ==========================================================================
  window.openModal = function(id) {
    const item = ARTICULOS_DATA.find(x => x.id === id);
    if (!item || !modalOverlay) return;

    activeModalItem = item;
    lastFocused = document.activeElement;
    modalTitle.textContent = item.title;
    modalBadge.textContent = item.type;
    modalBadge.className = `card-badge ${badgeClassFor(item.type)}`;
    modalDate.textContent = formatDate(item.date);
    modalAuthors.innerHTML = `<strong>Autores:</strong> ${escapeHtml(item.authors.join(", "))}`;
    modalResumen.textContent = item.resumen;

    if (item.pdf) {
      const esPdf = isPdfUrl(item.pdf);
      modalPdfBtn.style.display = "inline-flex";
      modalPdfBtn.href = item.pdf;
      if (modalPdfBtnLabel) modalPdfBtnLabel.textContent = esPdf ? "Descargar PDF" : "Abrir recurso externo";
      // La vista previa embebida es solo para PDFs propios; un recurso externo
      // (ej. un tablero de Tableau) puede bloquear su inserción en iframe, así
      // que para esos casos ofrecemos directamente el enlace de salida.
      modalPreviewBtn.style.display = esPdf ? "inline-flex" : "none";
      modalPdfFallback.href = item.pdf;
    } else {
      modalPdfBtn.style.display = "none";
      modalPreviewBtn.style.display = "none";
    }
    hidePdfViewer();

    try {
      if (modalCiteText) modalCiteText.textContent = formatAPA(item);
    } catch (citeErr) {
      console.error("Error al generar cita APA:", citeErr);
      if (modalCiteText) modalCiteText.textContent = item.title || "";
    }
    if (modalCiteStatus) modalCiteStatus.textContent = "";
    if (modalCite) modalCite.hidden = true;
    modalCiteBtn?.setAttribute("aria-expanded", "false");

    modalOverlay.classList.add("active");
    if (modalCard) modalCard.scrollTop = 0;
    document.body.style.overflow = "hidden";
    modalClose?.focus();
  };

  function closeModal() {
    if (!modalOverlay) return;
    modalOverlay.classList.remove("active");
    document.body.style.overflow = "";
    hidePdfViewer();
    activeModalItem = null;
    if (/^#articulo-\d+$/.test(location.hash)) {
      history.replaceState(null, "", location.pathname + location.search);
    }
    lastFocused?.focus?.();
  }

  function hidePdfViewer() {
    if (!modalPdfViewer) return;
    modalPdfViewer.hidden = true;
    modalPdfFrame?.removeAttribute("src");
    modalPreviewBtn?.setAttribute("aria-expanded", "false");
    if (modalPreviewBtn) modalPreviewBtn.textContent = "Vista previa";
  }

  modalPreviewBtn?.addEventListener("click", () => {
    if (!activeModalItem?.pdf || !modalPdfViewer) return;
    if (modalPdfViewer.hidden) {
      modalPdfFrame.src = activeModalItem.pdf;
      modalPdfViewer.hidden = false;
      modalPreviewBtn.setAttribute("aria-expanded", "true");
      modalPreviewBtn.textContent = "Ocultar vista previa";
    } else {
      hidePdfViewer();
    }
  });

  modalCiteBtn?.addEventListener("click", async () => {
    if (!activeModalItem) return;
    const cite = formatAPA(activeModalItem);
    const ok = await copyText(cite);
    if (modalCite) modalCite.hidden = false;
    modalCiteBtn.setAttribute("aria-expanded", "true");
    if (modalCiteStatus) {
      modalCiteStatus.textContent = ok
        ? "Cita copiada al portapapeles."
        : "No pudimos copiar automáticamente. Selecciona la cita de arriba y cópiala.";
    }
    const original = modalCiteBtn.textContent;
    modalCiteBtn.textContent = ok ? "Copiada" : "Ver cita";
    setTimeout(() => { modalCiteBtn.textContent = original; }, 1800);
  });

  modalShareBtn?.addEventListener("click", async () => {
    if (!activeModalItem) return;
    const link = articleUrl(activeModalItem);
    const ok = await copyText(link);
    if (modalShareLabel) {
      const original = modalShareLabel.textContent;
      modalShareLabel.textContent = ok ? "¡Enlace copiado!" : "No se pudo copiar";
      setTimeout(() => { modalShareLabel.textContent = original; }, 1800);
    }
  });

  function articleUrl(item) {
    return `${location.origin}${location.pathname}#articulo-${item.id}`;
  }

  // Enlace directo: index.html#articulo-12 abre la ficha correspondiente
  function openFromHash() {
    const m = location.hash.match(/^#articulo-(\d+)$/);
    if (m) window.openModal(Number(m[1]));
  }
  window.addEventListener("hashchange", openFromHash);

  modalClose?.addEventListener("click", closeModal);
  modalOverlay?.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (!modalOverlay?.classList.contains("active")) return;
    if (e.key === "Escape") {
      closeModal();
    } else if (e.key === "Tab" && modalCard) {
      // Mantener el foco dentro del diálogo
      const focusables = [...modalCard.querySelectorAll("a[href], button, iframe, [tabindex]:not([tabindex='-1'])")]
        .filter(el => el.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch { /* se intenta el método alternativo */ }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // 6. HELPERS DE FORMATO Y DATOS DERIVADOS
  // ==========================================================================
  function formatDate(isoStr) {
    if (!isoStr) return "";
    try {
      const parts = isoStr.split("-");
      if (parts.length >= 3) {
        const mesIndex = parseInt(parts[1], 10) - 1;
        return `${parts[2]} ${MESES_CORTOS[mesIndex] || ""} ${parts[0]}`;
      }
      // Fechas textuales del catálogo ("marzo 9, 2…", "septiembre"): mes y día, sin inventar año
      const m = isoStr.trim().toLowerCase().match(/^([a-záéíóú]+)\s*(\d{1,2})?/);
      const mesIndex = m ? MESES_LARGOS.indexOf(m[1]) : -1;
      if (mesIndex >= 0) {
        return m[2] ? `${m[2]} ${MESES_CORTOS[mesIndex]}` : MESES_CORTOS[mesIndex];
      }
      return isoStr;
    } catch {
      return isoStr;
    }
  }

  function isoTime(dateStr) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || "")) return null;
    const t = Date.parse(dateStr);
    return Number.isNaN(t) ? null : t;
  }

  // Fechas ISO primero (más recientes arriba); el resto conserva el orden del catálogo
  function sortByRecency(items) {
    return items
      .map((item, index) => ({ item, index, t: isoTime(item.date) }))
      .sort((a, b) => {
        if (a.t !== null && b.t !== null) return b.t - a.t;
        if (a.t !== null) return -1;
        if (b.t !== null) return 1;
        return a.index - b.index;
      })
      .map(x => x.item);
  }

  function getReadingTime(resumen) {
    const words = (resumen || "").trim().split(/\s+/).filter(Boolean).length;
    return Math.max(2, Math.round(words / 45));
  }

  function getInstitution(tags) {
    const match = (tags || []).find(t => INSTITUCIONES[t]);
    return match ? INSTITUCIONES[match] : "";
  }

  function getCourse(tags) {
    return CURSOS.find(c => (tags || []).includes(c)) || "";
  }

  function getFolio(id) {
    return String(id).padStart(3, "0");
  }

  // Nombre de persona plausible: 2 a 4 palabras, sin signos de titular ni autoría colectiva
  function isPersonName(name) {
    const tokens = name.trim().split(/\s+/);
    return tokens.length <= 4 && !/[:¿?!,]/.test(name) && !/^equipo\b/i.test(name);
  }

  // Convención hispana: con 3+ palabras se asumen dos apellidos al final
  function apaAuthor(name) {
    const tokens = name.replace(/\(.*?\)/g, "").trim().split(/\s+/).filter(Boolean);
    if (tokens.length < 2) return tokens.join("");
    const surnameCount = tokens.length >= 3 ? 2 : 1;
    const surnames = tokens.slice(-surnameCount).join(" ");
    const initials = tokens.slice(0, -surnameCount).map(t => `${t.charAt(0).toUpperCase()}.`).join(" ");
    return `${surnames}, ${initials}`;
  }

  function formatAPA(item) {
    const names = (item.authors || []).filter(a => a && isPersonName(a)).map(apaAuthor);
    let authors = "Mundo Social";
    if (names.length === 1) authors = names[0];
    else if (names.length === 2) authors = `${names[0]}, & ${names[1]}`;
    else if (names.length > 2) authors = `${names.slice(0, -1).join(", ")}, & ${names[names.length - 1]}`;

    const t = isoTime(item.date);
    const year = t !== null ? item.date.slice(0, 4) : "s. f.";
    const rawTitle = (item.title || "").trim();
    const title = /[.?!]$/.test(rawTitle) ? rawTitle : `${rawTitle}.`;
    const url = item.pdf || `${window.location.origin}${window.location.pathname}#articulo-${item.id}`;
    const authorsPart = /\.$/.test(authors) ? authors : `${authors}.`;
    return `${authorsPart} (${year}). ${title} Mundo Social.${url ? ` ${url}` : ""}`;
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replaceAll('"', "&quot;")
              .replaceAll("'", "&#039;");
  }

  // Render inicial
  renderCounts();
  renderTagChips(currentCategory);
  render();
  openFromHash();
});
