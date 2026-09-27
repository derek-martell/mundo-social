// ==========================================================================
// MUNDO SOCIAL - Lógica de Interacción, Búsqueda y Filtros
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
  // Estado de la aplicación
  let currentCategory = "Todos";
  let currentTag = "";
  let searchQuery = "";
  let activeModalItem = null;

  // Elementos del DOM
  const grid = document.getElementById("articles-grid");
  const emptyState = document.getElementById("empty-state");
  const searchInput = document.getElementById("search-input");
  const searchClear = document.getElementById("search-clear");
  const resultsCount = document.getElementById("results-count");
  const categoryTabs = document.querySelectorAll(".cat-tab");
  const tagChips = document.querySelectorAll(".tag-chip");
  const themeToggle = document.getElementById("theme-toggle");
  
  // Modal
  const modalOverlay = document.getElementById("modal-overlay");
  const modalClose = document.getElementById("modal-close");
  const modalTitle = document.getElementById("modal-title");
  const modalBadge = document.getElementById("modal-badge");
  const modalDate = document.getElementById("modal-date");
  const modalAuthors = document.getElementById("modal-authors");
  const modalResumen = document.getElementById("modal-resumen");
  const modalPdfBtn = document.getElementById("modal-pdf-btn");
  const modalOriginalBtn = document.getElementById("modal-original-btn");

  // ==========================================================================
  // 1. TEMA CLARO / OSCURO (Sincronizado y persistente)
  // ==========================================================================
  const savedTheme = localStorage.getItem("mundo-social-theme") || 
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", savedTheme);

  themeToggle?.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("mundo-social-theme", next);
  });

  // ==========================================================================
  // 2. RENDERIZADO DE TARJETAS
  // ==========================================================================
  function render() {
    if (!grid) return;

    // Filtrar publicaciones
    const filtered = ARTICULOS_DATA.filter(item => {
      // Filtro de Categoría
      const matchesCategory = currentCategory === "Todos" || item.category === currentCategory;

      // Filtro de Etiqueta Secundaria
      const matchesTag = !currentTag || (item.tags && item.tags.includes(currentTag));

      // Filtro de Búsqueda de Texto
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        item.title.toLowerCase().includes(q) ||
        item.authors.some(a => a.toLowerCase().includes(q)) ||
        (item.tags && item.tags.some(t => t.toLowerCase().includes(q))) ||
        item.category.toLowerCase().includes(q);

      return matchesCategory && matchesTag && matchesSearch;
    });

    // Actualizar contador
    if (resultsCount) {
      resultsCount.innerHTML = `Mostrando <strong>${filtered.length}</strong> de ${ARTICULOS_DATA.length} publicaciones`;
    }

    // Manejar estado vacío
    if (filtered.length === 0) {
      grid.innerHTML = "";
      if (emptyState) emptyState.style.display = "block";
      return;
    } else {
      if (emptyState) emptyState.style.display = "none";
    }

    // Generar HTML de las tarjetas
    grid.innerHTML = filtered.map(item => {
      // Clase según tipo
      let badgeClass = "badge-articulo";
      if (item.type === "Nota Informativa") badgeClass = "badge-nota";
      else if (item.type === "Apunte Académico") badgeClass = "badge-apunte";
      else if (item.type === "Investigación") badgeClass = "badge-investigacion";
      else if (item.type === "Columna de Opinión") badgeClass = "badge-columna";

      // Formato fecha
      const dateFormatted = formatDate(item.date);

      // Autores
      const authorsStr = item.authors && item.authors.length > 0 
        ? item.authors.join(", ") 
        : "Equipo Editorial";

      // Tags
      const tagsHtml = (item.tags || []).slice(0, 3)
        .map(t => `<span class="mini-tag">${escapeHtml(t)}</span>`)
        .join("");

      // Botón PDF
      const pdfBtnHtml = item.pdf 
        ? `<a href="${item.pdf}" target="_blank" rel="noopener noreferrer" class="btn-pdf" title="Descargar o ver documento PDF" onclick="event.stopPropagation()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
            PDF
           </a>`
        : "";

      return `
        <article class="card" onclick="openModal(${item.id})">
          <div>
            <div class="card-top">
              <span class="card-badge ${badgeClass}">${escapeHtml(item.type)}</span>
              <time class="card-date">${dateFormatted}</time>
            </div>
            <h3 class="card-title">${escapeHtml(item.title)}</h3>
            <div class="card-authors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span>${escapeHtml(authorsStr)}</span>
            </div>
            <div class="card-tags">
              ${tagsHtml}
            </div>
          </div>
          <div class="card-footer">
            <span class="btn-read">
              Ver detalle 
              <span aria-hidden="true">&rarr;</span>
            </span>
            ${pdfBtnHtml}
          </div>
        </article>
      `;
    }).join("");
  }

  // ==========================================================================
  // 3. CONTROLADORES DE BÚSQUEDA Y FILTROS
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

  categoryTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      categoryTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentCategory = tab.dataset.category || "Todos";
      render();
    });
  });

  tagChips.forEach(chip => {
    chip.addEventListener("click", () => {
      const tagVal = chip.dataset.tag || "";
      if (currentTag === tagVal) {
        currentTag = "";
        chip.classList.remove("active");
      } else {
        tagChips.forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        currentTag = tagVal;
      }
      render();
    });
  });

  // ==========================================================================
  // 4. MODAL DE LECTURA Y DESCARGA
  // ==========================================================================
  window.openModal = function(id) {
    const item = ARTICULOS_DATA.find(x => x.id === id);
    if (!item || !modalOverlay) return;

    activeModalItem = item;
    modalTitle.textContent = item.title;
    modalBadge.textContent = item.type;
    modalDate.textContent = formatDate(item.date);
    modalAuthors.innerHTML = `<strong>Autores:</strong> ${escapeHtml(item.authors.join(", "))}`;
    modalResumen.textContent = item.resumen;

    if (item.pdf) {
      modalPdfBtn.style.display = "inline-flex";
      modalPdfBtn.href = item.pdf;
    } else {
      modalPdfBtn.style.display = "none";
    }

    if (item.url_original) {
      modalOriginalBtn.style.display = "inline-flex";
      modalOriginalBtn.href = item.url_original;
    } else {
      modalOriginalBtn.style.display = "none";
    }

    modalOverlay.classList.add("active");
    document.body.style.overflow = "hidden";
  };

  function closeModal() {
    if (!modalOverlay) return;
    modalOverlay.classList.remove("active");
    document.body.style.overflow = "";
    activeModalItem = null;
  }

  modalClose?.addEventListener("click", closeModal);
  modalOverlay?.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalOverlay?.classList.contains("active")) {
      closeModal();
    }
  });

  // ==========================================================================
  // 5. HELPERS DE FORMATO
  // ==========================================================================
  function formatDate(isoStr) {
    if (!isoStr) return "";
    try {
      const parts = isoStr.split("-");
      if (parts.length >= 3) {
        const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"];
        const mesIndex = parseInt(parts[1], 10) - 1;
        return `${parts[2]} ${meses[mesIndex] || ""} ${parts[0]}`;
      }
      return isoStr;
    } catch {
      return isoStr;
    }
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
  }

  // Render inicial
  render();
});
