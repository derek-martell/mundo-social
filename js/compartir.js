/* Compartir: enlaces a redes, copiar enlace, menú nativo e imagen para historias */
document.addEventListener("DOMContentLoaded", () => {
  const cont = document.getElementById("modal-compartir");
  if (!cont || !window.MS) return;

  // Iconos en línea (trazo único, currentColor)
  const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${d}</svg>`;
  const ICONOS = {
    nativo: svg('<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>'),
    linkedin: svg('<rect x="3.5" y="3.5" width="17" height="17" rx="1.5"/><path d="M8 10.5V16M8 7.8v.1M12 16v-5.5M12 13c0-1.6 1-2.5 2.3-2.5S16.5 11.4 16.5 13V16"/>'),
    whatsapp: svg('<path d="M4 20l1.2-4.1A8 8 0 1 1 8.2 18.8L4 20z"/><path d="M9 8.5c0 3 2.5 5.5 5.5 5.5l1-1.3-1.8-.9-.8.7c-.9-.4-1.6-1.1-2-2l.7-.8-.9-1.8L9 8.5z"/>'),
    x: svg('<path d="M4 4l16 16M20 4L4 20"/>'),
    facebook: svg('<path d="M14 21v-8h2.7l.5-3H14V8.3c0-.9.4-1.5 1.6-1.5h1.7V4.2C17 4.1 16.100 4 15.100 4 12.800 4 11 5.400 11 7.900V10H8.300v3H11v8"/>'),
    telegram: svg('<path d="M21 4L3 11l5.500 2L10 19l3-3.500L17.500 19 21 4z"/><path d="M8.500 13L21 4"/>'),
    correo: svg('<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3.5 6.5L12 13l8.5-6.5"/>'),
    copiar: svg('<rect x="9" y="9" width="11" height="11" rx="1.5"/><path d="M15 9V5.5A1.5 1.5 0 0 0 13.5 4h-8A1.5 1.5 0 0 0 4 5.5v8A1.5 1.5 0 0 0 5.5 15H9"/>'),
    imagen: svg('<rect x="3.5" y="3.5" width="17" height="17" rx="1.5"/><circle cx="9" cy="9" r="1.5"/><path d="M4 17l5-5 4 4 3-3 4 4"/>')
  };

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const enc = encodeURIComponent;
  let temporizador = null;

  // Genera el bloque para una ficha
  function render(item) {
    const url = window.MS.urlPagina(item);
    const texto = `${item.title} — Mundo Social`;
    const redes = [
      ["LinkedIn", "linkedin", `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`],
      ["WhatsApp", "whatsapp", `https://wa.me/?text=${enc(texto)}%20${enc(url)}`],
      ["X", "x", `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(texto)}`],
      ["Facebook", "facebook", `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`],
      ["Telegram", "telegram", `https://t.me/share/url?url=${enc(url)}&text=${enc(texto)}`],
      ["Correo", "correo", `mailto:?subject=${enc(texto)}&body=${enc(item.title + "\n" + url)}`]
    ];
    const enlaces = redes.map(([n, ic, href]) => {
      const externo = href.startsWith("http");
      const etiqueta = n === "Correo" ? "Compartir por correo" : `Compartir en ${n}`;
      return `<a class="compartir-btn" href="${esc(href)}"${externo ? ' target="_blank" rel="noopener noreferrer"' : ""} aria-label="${etiqueta}" title="${etiqueta}" data-red="${n}">${ICONOS[ic]}<span>${n}</span></a>`;
    }).join("");
    const nativo = navigator.share
      ? `<button type="button" class="compartir-btn compartir-principal" data-accion="nativo">${ICONOS.nativo}<span>Compartir…</span></button>`
      : "";

    cont.innerHTML =
      `<span class="compartir-label" id="compartir-titulo">Compartir</span>` +
      `<div class="compartir-fila" role="group" aria-labelledby="compartir-titulo">${nativo}${enlaces}` +
      `<button type="button" class="compartir-btn" data-accion="copiar">${ICONOS.copiar}<span>Copiar enlace</span></button></div>` +
      `<div class="compartir-historia"><button type="button" class="compartir-btn" data-accion="historia">${ICONOS.imagen}<span>Imagen para historias</span></button></div>` +
      `<p class="compartir-estado" role="status" aria-live="polite"></p>`;

    cont._item = item;
  }

  function estado(msg, ms) {
    const el = cont.querySelector(".compartir-estado");
    if (!el) return;
    el.textContent = msg;
    clearTimeout(temporizador);
    if (ms) temporizador = setTimeout(() => { el.textContent = ""; }, ms);
  }

  // Copia al portapapeles con respaldo execCommand
  async function copiar(texto) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(texto);
        return true;
      }
    } catch (e) { /* se usa el respaldo */ }
    const ta = document.createElement("textarea");
    ta.value = texto;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  }

  // Divide el texto en líneas que caben en maxAncho
  function envolver(ctx, texto, maxAncho) {
    const lineas = [];
    let actual = "";
    String(texto).split(/\s+/).forEach((p) => {
      const prueba = actual ? actual + " " + p : p;
      if (actual && ctx.measureText(prueba).width > maxAncho) { lineas.push(actual); actual = p; }
      else actual = prueba;
    });
    if (actual) lineas.push(actual);
    return lineas;
  }

  // Dibuja la imagen 1080x1920 y devuelve un Blob PNG
  async function crearImagen(item) {
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) { /* ignorar */ } }
    const W = 1080, H = 1920, M = 90, ancho = W - 2 * M;
    const SERIF = '"Literata", Georgia, serif';
    const SANS = '"Schibsted Grotesk", Arial, sans-serif';
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d");
    const espaciado = (px) => { if ("letterSpacing" in ctx) ctx.letterSpacing = px + "px"; };

    ctx.fillStyle = "#0f4c3a";
    ctx.fillRect(0, 0, W, H);

    // Marca
    ctx.fillStyle = "#fbf9f4";
    ctx.font = `700 34px ${SANS}`;
    espaciado(8);
    ctx.fillText("MUNDO SOCIAL", M, 150);
    ctx.fillStyle = "#e0b85a";
    ctx.fillRect(M, 190, 120, 4);

    // Tipo y fecha en latón
    const fecha = window.MS.fecha ? window.MS.fecha(item) : (item.date || "");
    ctx.font = `600 32px ${SANS}`;
    espaciado(5);
    ctx.fillText([item.type, fecha].filter(Boolean).join("  ·  ").toUpperCase(), M, 300);
    espaciado(0);

    // Título: reduce la fuente hasta que quepa en 8 líneas
    ctx.fillStyle = "#fbf9f4";
    let tam = 96, lineas = [];
    for (; tam >= 44; tam -= 4) {
      ctx.font = `600 ${tam}px ${SERIF}`;
      lineas = envolver(ctx, item.title, ancho);
      if (lineas.length <= 8 && lineas.length * tam * 1.2 <= 900) break;
    }
    if (lineas.length > 8) {
      lineas = lineas.slice(0, 8);
      lineas[7] = lineas[7].replace(/[\s.,;:]*$/, "") + "…";
    }
    let y = 440 + tam;
    lineas.forEach((l) => { ctx.fillText(l, M, y); y += tam * 1.2; });

    // Autores
    const autores = (item.authors || []).join(", ");
    if (autores) {
      ctx.fillStyle = "#e0b85a";
      ctx.font = `500 40px ${SERIF}`;
      envolver(ctx, autores, ancho).slice(0, 2).forEach((l, i) => ctx.fillText(l, M, y + 40 + i * 54));
    }

    // Pie
    ctx.fillStyle = "#e0b85a";
    ctx.fillRect(M, H - 330, ancho, 2);
    ctx.fillStyle = "#fbf9f4";
    ctx.font = `500 34px ${SANS}`;
    ctx.fillText("Lee el artículo completo en mundo-social", M, H - 250);
    ctx.fillStyle = "#e0b85a";
    ctx.font = `600 32px ${SANS}`;
    const corta = window.MS.urlPagina(item).replace(/^https?:\/\//, "");
    envolver(ctx, corta, ancho).slice(0, 2).forEach((l, i) => ctx.fillText(l, M, H - 190 + i * 44));

    return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("canvas"))), "image/png"));
  }

  // Comparte el archivo si el navegador puede; si no, lo descarga
  async function historia(item, btn) {
    btn.disabled = true;
    estado("Creando imagen…");
    try {
      const blob = await crearImagen(item);
      const nombre = `mundo-social-${item.id}.png`;
      const archivo = new File([blob], nombre, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
        try {
          await navigator.share({ files: [archivo], title: item.title });
          estado("Imagen lista para compartir.", 3000);
          return;
        } catch (e) {
          if (e && e.name === "AbortError") { estado(""); return; }
          /* si falla por otra causa, se descarga */
        }
      }
      const a = document.createElement("a");
      const u = URL.createObjectURL(blob);
      a.href = u;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(u), 4000);
      estado("Imagen descargada. Súbela a tus historias.", 4000);
    } catch (e) {
      estado("No se pudo crear la imagen. Inténtalo de nuevo.", 4000);
    } finally {
      btn.disabled = false;
    }
  }

  cont.addEventListener("click", async (ev) => {
    const btn = ev.target.closest("button[data-accion]");
    const item = cont._item;
    if (!btn || !item) return;
    const acc = btn.dataset.accion;
    if (acc === "nativo") {
      try {
        await navigator.share({ title: item.title, text: `${item.title} — Mundo Social`, url: window.MS.urlPagina(item) });
      } catch (e) {
        if (!e || e.name !== "AbortError") estado("No se pudo abrir el menú de compartir.", 3000);
      }
    } else if (acc === "copiar") {
      const ok = await copiar(window.MS.urlPagina(item));
      estado(ok ? "Enlace copiado" : "No se pudo copiar. Cópialo manualmente.", ok ? 1800 : 3000);
    } else if (acc === "historia") {
      historia(item, btn);
    }
  });

  document.addEventListener("ms:ficha-abierta", (e) => { if (e.detail && e.detail.item) render(e.detail.item); });
  document.addEventListener("ms:ficha-cerrada", () => { cont.innerHTML = ""; cont._item = null; });
});
