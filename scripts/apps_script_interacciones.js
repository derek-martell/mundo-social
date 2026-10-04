/**
 * ============================================================================
 * MUNDO SOCIAL - INTERACCIONES (Me gusta, comentarios, escribir al autor)
 * ============================================================================
 * Proyecto de Apps Script INDEPENDIENTE del gestor de propuestas.
 * Va enlazado a una hoja de cálculo de Google (Extensiones > Apps Script).
 * Guía completa: docs/INTERACCIONES.md
 *
 * Hojas (se crean solas al ejecutar setup()):
 *   likes       articuloId | total
 *   comentarios id | articuloId | fecha | nombre | texto | estado | hashCliente
 *   mensajes    id | articuloId | fecha | nombre | correo | mensaje | estado
 *
 * Moderación: cambia "estado" a aprobado en la hoja, o usa los enlaces
 * Aprobar / Rechazar del correo (firmados con un secreto privado).
 * ============================================================================
 */

// ============================================================================
// CONFIGURACIÓN EDITABLE
// ============================================================================
const EDITORES = ["7073248@gmail.com"];        // reciben avisos y mensajes
const NOMBRE_REMITENTE = "Mundo Social - Interacciones";
const MAX_COMENTARIOS_VISIBLES = 50;
const CACHE_RESUMEN_SEG = 60;
const LIMITE_ENVIOS_POR_HORA = 3;              // por clienteId (comentarios y mensajes)
const MIN_MS_FORMULARIO = 3000;                // tiempo mínimo antes de enviar
const HOJA_LIKES = "likes";
const HOJA_COMENTARIOS = "comentarios";
const HOJA_MENSAJES = "mensajes";
const ENCABEZADOS = {
  likes: ["articuloId", "total"],
  comentarios: ["id", "articuloId", "fecha", "nombre", "texto", "estado", "hashCliente"],
  mensajes: ["id", "articuloId", "fecha", "nombre", "correo", "mensaje", "estado"]
};

// ============================================================================
// PREPARACIÓN (ejecutar una vez a mano)
// ============================================================================
function setup() {
  Object.keys(ENCABEZADOS).forEach(function (n) { hoja_(n); });
  secreto_();
  Logger.log("Listo: hojas creadas y secreto de moderación generado.");
}

function hoja_(nombre) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let h = ss.getSheetByName(nombre);
  if (!h) {
    h = ss.insertSheet(nombre);
    const enc = ENCABEZADOS[nombre];
    h.getRange(1, 1, 1, enc.length).setValues([enc]).setFontWeight("bold");
    h.setFrozenRows(1);
  }
  return h;
}

function secreto_() {
  const p = PropertiesService.getScriptProperties();
  let s = p.getProperty("HMAC_SECRET");
  if (!s) {
    s = Utilities.getUuid() + Utilities.getUuid();
    p.setProperty("HMAC_SECRET", s);
  }
  return s;
}

// ============================================================================
// RESPUESTAS
// ============================================================================
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
function fallo_(msg) { return json_({ ok: false, error: msg }); }

function pagina_(titulo, texto) {
  return HtmlService.createHtmlOutput(
    "<!doctype html><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>" +
    "<body style='font-family:Georgia,serif;max-width:32rem;margin:3rem auto;padding:0 1rem;color:#1b2420'>" +
    "<h1 style='font-size:1.4rem'>" + esc_(titulo) + "</h1><p>" + esc_(texto) + "</p></body>"
  ).setTitle("Mundo Social");
}

// ============================================================================
// LECTURA
// ============================================================================
function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    if (p.action === "resumen") return json_(resumen_(limpiarId_(p.id)));
    if (p.action === "moderar") return moderar_(p);
    return fallo_("Acción no reconocida.");
  } catch (err) {
    return fallo_("No pudimos procesar la solicitud. Inténtalo de nuevo.");
  }
}

function resumen_(id) {
  if (!id) return { ok: false, error: "Artículo no válido." };
  const cache = CacheService.getScriptCache();
  const clave = "res_" + id;
  const guardado = cache.get(clave);
  if (guardado) return JSON.parse(guardado);

  let likes = 0;
  const dl = hoja_(HOJA_LIKES).getDataRange().getValues();
  for (let i = 1; i < dl.length; i++) {
    if (String(dl[i][0]) === id) { likes = Number(dl[i][1]) || 0; break; }
  }
  const dc = hoja_(HOJA_COMENTARIOS).getDataRange().getValues();
  const lista = [];
  for (let i = dc.length - 1; i >= 1 && lista.length < MAX_COMENTARIOS_VISIBLES; i--) {
    const f = dc[i];
    if (String(f[1]) === id && f[5] === "aprobado") {
      lista.push({
        nombre: String(f[3] || "Lector"),
        fecha: f[2] instanceof Date ? f[2].toISOString() : String(f[2]),
        texto: String(f[4])
      });
    }
  }
  const res = { ok: true, likes: likes, comentarios: lista };
  cache.put(clave, JSON.stringify(res), CACHE_RESUMEN_SEG);
  return res;
}

// ============================================================================
// ESCRITURA
// ============================================================================
function doPost(e) {
  try {
    if (e && e.parameter && e.parameter.accion === "moderar") return decidir_(e.parameter);
    let d;
    try { d = JSON.parse((e.postData && e.postData.contents) || "{}"); }
    catch (x) { return fallo_("Solicitud no válida."); }
    if (!d || typeof d !== "object") return fallo_("Solicitud no válida.");
    switch (d.accion) {
      case "like": return like_(d);
      case "comentario": return comentario_(d);
      case "mensaje-autor": return mensaje_(d);
      default: return fallo_("Acción no reconocida.");
    }
  } catch (err) {
    return fallo_("No pudimos procesar tu solicitud. Inténtalo de nuevo en unos minutos.");
  }
}

function limpiarId_(v) {
  const s = String(v == null ? "" : v).trim();
  return /^[A-Za-z0-9_-]{1,80}$/.test(s) ? s : "";
}
function limpiarTexto_(v, max) {
  return String(v == null ? "" : v)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .slice(0, max);
}
function esc_(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function hex_(bytes) {
  return bytes.map(function (x) { return ("0" + (x & 255).toString(16)).slice(-2); }).join("");
}
function hash_(clienteId) {
  return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, "ms|" + clienteId).slice(0, 6));
}
function limpiarCliente_(v) {
  const s = String(v == null ? "" : v).trim();
  return /^[A-Za-z0-9_-]{8,64}$/.test(s) ? s : "";
}
/** Evita que Sheets interprete como fórmula un texto que empieza con = + - @ */
function neutral_(s) { return /^[=+\-@]/.test(s) ? "'" + s : s; }

/** Devuelve true si el cliente aún puede enviar; si sí, cuenta el intento. */
function dentroDeLimite_(clienteId, tipo) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const cache = CacheService.getScriptCache();
    const k = "rl_" + tipo + "_" + hash_(clienteId);
    const n = Number(cache.get(k) || 0);
    if (n >= LIMITE_ENVIOS_POR_HORA) return false;
    cache.put(k, String(n + 1), 3600);
    return true;
  } finally { lock.releaseLock(); }
}

function antiBot_(d) {
  if (d.sitio && String(d.sitio).length) return "Solicitud rechazada.";
  const t = Number(d.t);
  if (!isFinite(t) || t < MIN_MS_FORMULARIO) return "Espera unos segundos antes de enviar e inténtalo otra vez.";
  return "";
}

function like_(d) {
  const id = limpiarId_(d.id), cli = limpiarCliente_(d.clienteId);
  if (!id || !cli) return fallo_("No pudimos registrar tu me gusta.");
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const cache = CacheService.getScriptCache();
    const kd = "lk_" + hash_(cli) + "_" + id;
    const h = hoja_(HOJA_LIKES);
    const datos = h.getDataRange().getValues();
    let fila = -1, total = 0;
    for (let i = 1; i < datos.length; i++) {
      if (String(datos[i][0]) === id) { fila = i + 1; total = Number(datos[i][1]) || 0; break; }
    }
    if (cache.get(kd)) return json_({ ok: true, likes: total });
    total += 1;
    if (fila > 0) h.getRange(fila, 2).setValue(total);
    else h.appendRow([id, total]);
    cache.put(kd, "1", 86400);
    cache.remove("res_" + id);
    return json_({ ok: true, likes: total });
  } finally { lock.releaseLock(); }
}

function comentario_(d) {
  const id = limpiarId_(d.id), cli = limpiarCliente_(d.clienteId);
  if (!id || !cli) return fallo_("No pudimos enviar tu comentario. Recarga la página e inténtalo de nuevo.");
  const bot = antiBot_(d);
  if (bot) return fallo_(bot);
  const nombre = limpiarTexto_(d.nombre, 60).replace(/\n/g, " ") || "Lector";
  const texto = limpiarTexto_(d.texto, 1500);
  if (texto.length < 5) return fallo_("Escribe un comentario de al menos 5 caracteres.");
  if (String(d.texto || "").length > 1900) return fallo_("El comentario es demasiado largo (máximo 1500 caracteres).");
  if (!dentroDeLimite_(cli, "c")) return fallo_("Enviaste varios comentarios seguidos. Vuelve a intentarlo en una hora.");

  const cid = Utilities.getUuid();
  hoja_(HOJA_COMENTARIOS).appendRow([cid, id, new Date(), neutral_(nombre), neutral_(texto), "pendiente", hash_(cli)]);
  try { avisarComentario_(cid, id, nombre, texto); } catch (x) { /* el comentario ya quedó guardado */ }
  return json_({ ok: true, pendiente: true });
}

function mensaje_(d) {
  const id = limpiarId_(d.id), cli = limpiarCliente_(d.clienteId);
  if (!id || !cli) return fallo_("No pudimos enviar tu mensaje. Recarga la página e inténtalo de nuevo.");
  const bot = antiBot_(d);
  if (bot) return fallo_(bot);
  const nombre = limpiarTexto_(d.nombre, 80).replace(/\n/g, " ");
  const correo = limpiarTexto_(d.correo, 120);
  const mensaje = limpiarTexto_(d.mensaje, 3000);
  if (!nombre) return fallo_("Escribe tu nombre.");
  if (!/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]{2,}$/.test(correo)) return fallo_("Revisa tu correo: parece que no es una dirección válida.");
  if (mensaje.length < 10) return fallo_("Escribe un mensaje de al menos 10 caracteres.");
  if (!dentroDeLimite_(cli, "m")) return fallo_("Enviaste varios mensajes seguidos. Vuelve a intentarlo en una hora.");

  const titulo = limpiarTexto_(d.titulo, 250).replace(/\n/g, " ");
  const autores = limpiarTexto_(d.autores, 250).replace(/\n/g, " ");
  hoja_(HOJA_MENSAJES).appendRow([Utilities.getUuid(), id, new Date(), neutral_(nombre), neutral_(correo), neutral_(mensaje), "enviado"]);
  try {
    MailApp.sendEmail({
      to: EDITORES.join(","),
      replyTo: correo,
      name: NOMBRE_REMITENTE,
      subject: "[Mundo Social] Mensaje para el autor: " + (titulo || "artículo " + id),
      body:
        "Un lector quiere escribir al autor. Responde a este correo (le llegará al lector) " +
        "o reenvíaselo al autor.\n\n" +
        "Artículo: " + (titulo || "(sin título)") + "\n" +
        "Autor(es): " + (autores || "(sin dato)") + "\n" +
        "ID del artículo: " + id + "\n\n" +
        "De: " + nombre + " <" + correo + ">\n\n" +
        "Mensaje:\n" + mensaje + "\n\n" +
        "(Título y autores vienen del navegador del lector; el ID es el dato fiable.)"
    });
  } catch (x) {
    return fallo_("Guardamos tu mensaje, pero el aviso al equipo falló. Escríbenos por otro medio si es urgente.");
  }
  return json_({ ok: true });
}

// ============================================================================
// MODERACIÓN
// ============================================================================
function firma_(cid, accion) {
  return hex_(Utilities.computeHmacSha256Signature(cid + "|" + accion, secreto_()));
}

function avisarComentario_(cid, id, nombre, texto) {
  const base = ScriptApp.getService().getUrl();
  const enlace = function (a) {
    return base + "?action=moderar&cid=" + encodeURIComponent(cid) + "&a=" + a + "&token=" + firma_(cid, a);
  };
  MailApp.sendEmail({
    to: EDITORES.join(","),
    name: NOMBRE_REMITENTE,
    subject: "[Mundo Social] Comentario nuevo por moderar (artículo " + id + ")",
    body:
      "Hay un comentario pendiente.\n\n" +
      "Artículo (ID): " + id + "\n" +
      "Nombre: " + nombre + "\n\n" + texto + "\n\n" +
      "Aprobar: " + enlace("aprobado") + "\n" +
      "Rechazar: " + enlace("rechazado") + "\n\n" +
      "También puedes cambiar la columna 'estado' a 'aprobado' en la hoja 'comentarios'."
  });
}

function buscarComentario_(cid) {
  const h = hoja_(HOJA_COMENTARIOS);
  const datos = h.getDataRange().getValues();
  for (let i = 1; i < datos.length; i++) {
    if (String(datos[i][0]) === cid) return { hoja: h, fila: i + 1, datos: datos[i] };
  }
  return null;
}

/** GET: solo valida la firma y muestra una confirmación. NO cambia nada. */
function moderar_(p) {
  const cid = String(p.cid || ""), a = String(p.a || ""), token = String(p.token || "");
  if (a !== "aprobado" && a !== "rechazado") return pagina_("Enlace no válido", "La acción no es reconocida.");
  if (!token || token !== firma_(cid, a)) return pagina_("Enlace no válido", "La firma no coincide. Modera desde la hoja de cálculo.");
  const c = buscarComentario_(cid);
  if (!c) return pagina_("No encontrado", "Ese comentario ya no está en la hoja.");
  const verbo = a === "aprobado" ? "Aprobar" : "Rechazar";
  const html =
    "<!doctype html><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>" +
    "<body style='font-family:Georgia,serif;max-width:36rem;margin:3rem auto;padding:0 1rem;color:#1b2420'>" +
    "<h1 style='font-size:1.4rem'>" + verbo + " este comentario</h1>" +
    "<p>Artículo (ID): " + esc_(c.datos[1]) + "<br>Estado actual: <strong>" + esc_(c.datos[5]) + "</strong></p>" +
    "<p><strong>" + esc_(c.datos[3]) + "</strong></p>" +
    "<blockquote style='margin:0;padding:0 0 0 1rem;border-left:3px solid #c9a24a;white-space:pre-wrap'>" + esc_(c.datos[4]) + "</blockquote>" +
    "<form method='POST' action='" + esc_(ScriptApp.getService().getUrl()) + "' target='_top' style='margin-top:1.5rem'>" +
    "<input type='hidden' name='accion' value='moderar'>" +
    "<input type='hidden' name='cid' value='" + esc_(cid) + "'>" +
    "<input type='hidden' name='decision' value='" + esc_(a) + "'>" +
    "<input type='hidden' name='token' value='" + esc_(token) + "'>" +
    "<button type='submit' style='font-size:1rem;padding:.7rem 1.2rem;cursor:pointer'>Sí, " + verbo.toLowerCase() + "</button></form>" +
    "<p style='font-size:.85rem;color:#5a6660'>Nada cambia hasta que pulses el botón.</p></body>";
  return HtmlService.createHtmlOutput(html).setTitle("Mundo Social");
}

/** POST (formulario de confirmación): verifica la firma otra vez y aplica. Idempotente. */
function decidir_(p) {
  const cid = String(p.cid || ""), a = String(p.decision || ""), token = String(p.token || "");
  if (a !== "aprobado" && a !== "rechazado") return pagina_("Enlace no válido", "La acción no es reconocida.");
  if (!token || token !== firma_(cid, a)) return pagina_("Enlace no válido", "La firma no coincide. Modera desde la hoja de cálculo.");
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const c = buscarComentario_(cid);
    if (!c) return pagina_("No encontrado", "Ese comentario ya no está en la hoja.");
    const actual = String(c.datos[5]);
    if (actual === "aprobado" || actual === "rechazado") {
      return pagina_("Ya estaba decidido", "El comentario ya figura como " + actual + ". No se hizo ningún cambio.");
    }
    c.hoja.getRange(c.fila, 6).setValue(a);
    CacheService.getScriptCache().remove("res_" + String(c.datos[1]));
    return pagina_("Listo", "El comentario quedó como " + a + ".");
  } finally { lock.releaseLock(); }
}

/**
 * Opcional: al editar a mano la columna "estado", limpia la caché para que el
 * cambio se vea sin esperar. Activador: alEditar > De la hoja de cálculo > Al editar.
 */
function alEditar(e) {
  try {
    const h = e.range.getSheet();
    if (h.getName() !== HOJA_COMENTARIOS) return;
    const id = String(h.getRange(e.range.getRow(), 2).getValue());
    CacheService.getScriptCache().remove("res_" + id);
  } catch (x) { /* sin efecto */ }
}
