/**
 * ============================================================================
 * MUNDO SOCIAL (UNMSM) - GESTOR DE PROPUESTAS CON REVISIÓN HUMANA
 * ============================================================================
 *
 * Flujo:
 * 1. El colaborador envía su propuesta (desde enviar.html o Google Form).
 * 2. Derek recibe un correo con los datos y dos enlaces:
 *    [ABRIR PARA APROBAR]  |  [ABRIR PARA RECHAZAR]
 *    Esos enlaces solo MUESTRAN una página de confirmación; la decisión
 *    real se toma con un botón dentro de esa página (evita que un
 *    antivirus o escáner de correo la dispare solo al abrir el email).
 * 3. NADA se publica en la web automáticamente. No hay token de GitHub
 *    ni publicación directa: al aprobar, se envía un correo con toda la
 *    información lista para que Derek o el equipo la suban ellos mismos
 *    (a mano, o con scripts/publicar_articulo.py).
 * 4. Si Derek no responde, el sistema NO descarta la propuesta ni la
 *    publica sola: sigue recordándosela cada ~24 horas (hasta un máximo
 *    de recordatorios) hasta que él decida.
 * 5. Al colaborador que envió la propuesta se le avisa, 1 hora después de
 *    enviarla, que sigue en revisión y aún no se ha subido, con datos de
 *    contacto para casos urgentes.
 */

// ============================================================================
// CONFIGURACIÓN EDITABLE
// ============================================================================
const DEREK_EMAILS = ["7073248@gmail.com", "derekmartellm@gmail.com"];
const CONTACTO_WHATSAPP = "+51 912 168 973";
const RECORDATORIO_CADA_HORAS = 24;   // cada cuánto se le insiste a Derek
const MAX_RECORDATORIOS = 5;          // tras esto, deja de insistir (pero sigue pendiente)
const AVISO_REMITENTE_TRAS_HORAS = 1; // cuándo avisarle al remitente que aún está en revisión
const NOMBRE_TRIGGER_TICK = "procesarPendientes";

// ============================================================================
// 1. RECEPTOR DESDE EL FORMULARIO WEB (enviar.html) Y DESDE CONFIRMACIONES
// ============================================================================
function doPost(e) {
  try {
    let payload = {};
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      payload = e.parameter;
    }

    // ¿Es la confirmación de un Aprobar/Rechazar (viene desde la página
    // de confirmación, con un clic real de Derek) en vez de una propuesta nueva?
    if (payload.confirm === "1" || payload.confirm === true) {
      return procesarDecision(payload.action, payload.id);
    }

    return recibirPropuesta(payload);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function recibirPropuesta(payload) {
  const title = String(payload.title || "").trim();
  if (!title) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "El título es obligatorio."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Validación de seguridad: el enlace al documento debe ser http(s) real.
  // Esto evita enlaces "javascript:..." u otros esquemas que podrían
  // ejecutar código en el navegador de quien luego abra la publicación.
  const pdf = String(payload.pdf || "").trim();
  if (pdf && !esUrlHttpValida(pdf)) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "El enlace al documento debe ser una URL http:// o https:// válida (Google Drive, OneDrive, Dropbox, etc.)."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  const submissionId = "pub_" + new Date().getTime() + "_" + Utilities.getUuid().slice(0, 8);
  const correoRemitente = String(payload.email || payload.correo_autor || "").trim();

  const registro = {
    status: "PENDIENTE",
    creado: new Date().toISOString(),
    reminderCount: 0,
    ultimoRecordatorio: new Date().toISOString(),
    avisoRemitenteEnviado: false,
    data: {
      title: title,
      category: String(payload.category || "Coyuntura").trim(),
      tags: payload.tags || "",
      authors: payload.authors || "",
      email: correoRemitente,
      pdf: pdf,
      resumen: String(payload.resumen || "").trim(),
      url_original: payload.url_original || "",
      timestamp: new Date().toISOString()
    }
  };

  PropertiesService.getScriptProperties().setProperty(submissionId, JSON.stringify(registro));

  enviarCorreoDecision(registro.data, submissionId);
  asegurarTriggerRecurrente();

  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    message: "Propuesta recibida correctamente. En proceso de revisión editorial."
  })).setMimeType(ContentService.MimeType.JSON);
}

// ============================================================================
// 2. RECEPTOR ALTERNATIVO SI USAS GOOGLE FORMS
// ============================================================================
function onFormSubmit(e) {
  const respuestas = e.namedValues;
  const titulo = (respuestas["Título de la publicación"] || respuestas["Título"] || ["Sin título"])[0];
  const categoria = (respuestas["Categoría"] || ["Coyuntura"])[0];
  const autores = (respuestas["Autores"] || respuestas["Nombre del autor(es)"] || ["Equipo Mundo Social"])[0];
  const cursoTags = (respuestas["Curso o Área temática"] || respuestas["Etiquetas"] || ["Economía"])[0];
  const resumen = (respuestas["Resumen o Abstract"] || respuestas["Resumen"] || [""])[0];
  const pdfEnlace = (respuestas["Documento PDF (Enlace de Google Drive)"] || respuestas["PDF"] || [""])[0];
  const correoAutor = (respuestas["Dirección de correo electrónico"] || respuestas["Correo del autor"] || [""])[0];

  recibirPropuesta({
    title: titulo,
    category: categoria,
    authors: autores,
    tags: cursoTags,
    resumen: resumen,
    pdf: pdfEnlace,
    correo_autor: correoAutor
  });
}

// ============================================================================
// 3. VALIDACIÓN DE ENLACES (defensa contra "javascript:" y esquemas raros)
// ============================================================================
function esUrlHttpValida(url) {
  return /^https?:\/\/[^\s<>"']+$/i.test(String(url || "").trim());
}

function escapeHtmlSeguro(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ============================================================================
// 4. CORREO DE DECISIÓN A DEREK (enlaces que abren una CONFIRMACIÓN, no que actúan solos)
// ============================================================================
function enviarCorreoDecision(data, submissionId) {
  const webAppUrl = ScriptApp.getService().getUrl();
  const urlAprobar = `${webAppUrl}?action=aprobar&id=${encodeURIComponent(submissionId)}`;
  const urlRechazar = `${webAppUrl}?action=rechazar&id=${encodeURIComponent(submissionId)}`;

  const t = escapeHtmlSeguro(data.title);
  const asunto = `[Mundo Social] Nueva propuesta: "${data.title}" por ${data.authors}`;

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #fdfcf9; border: 1px solid #d3dbd5; border-top: 4px solid #0f4c3a; padding: 25px; color: #1c2622;">
      <h2 style="color: #0f4c3a; margin-top: 0; font-family: Georgia, serif; font-size: 24px; border-bottom: 1px solid #e1e7e3; padding-bottom: 10px;">Mundo Social &middot; Dirección Editorial</h2>
      <p style="font-size: 15px; line-height: 1.5;">Hola Derek, se ha recibido una nueva propuesta para el archivo de <strong>Mundo Social</strong>:</p>

      <div style="background: #ffffff; border: 1px solid #e1e7e3; padding: 18px; border-radius: 4px; margin: 20px 0;">
        <h3 style="margin-top: 0; font-size: 18px; color: #111;">${t}</h3>
        <p style="margin: 6px 0; font-size: 14px;"><strong>Categoría:</strong> <span style="color: #0f4c3a; font-weight: bold;">${escapeHtmlSeguro(data.category)}</span></p>
        <p style="margin: 6px 0; font-size: 14px;"><strong>Autor(es):</strong> ${escapeHtmlSeguro(data.authors)}</p>
        <p style="margin: 6px 0; font-size: 14px;"><strong>Área / Curso:</strong> ${escapeHtmlSeguro(data.tags)}</p>
        <p style="margin: 6px 0; font-size: 14px;"><strong>Correo del remitente:</strong> ${escapeHtmlSeguro(data.email || "(no proporcionado)")}</p>
        ${data.pdf ? `<p style="margin: 6px 0; font-size: 14px;"><strong>Documento:</strong> <a href="${escapeHtmlSeguro(data.pdf)}" target="_blank" rel="noopener noreferrer" style="color: #0f4c3a; text-decoration: underline; font-weight: bold;">Ver archivo &rarr;</a></p>` : ''}
        <p style="margin: 12px 0 0 0; font-size: 14px; color: #444; line-height: 1.5;"><strong>Resumen:</strong><br>${escapeHtmlSeguro(data.resumen)}</p>
      </div>

      <div style="background: #fbf7ee; border-left: 3px solid #c9a24a; padding: 12px; margin-bottom: 25px; font-size: 13px; color: #6d5b24;">
        Esta propuesta NO se publicará sola. Si no respondes, te seguiré recordando este pendiente aproximadamente cada ${RECORDATORIO_CADA_HORAS} horas, sin borrarla ni publicarla por ti.
      </div>

      <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
        <tr>
          <td style="padding-right: 15px;">
            <a href="${urlAprobar}" target="_blank" style="background-color: #0f4c3a; color: #ffffff; text-decoration: none; padding: 12px 24px; font-size: 14px; font-weight: bold; border-radius: 4px; display: inline-block;">
              ABRIR PARA APROBAR
            </a>
          </td>
          <td>
            <a href="${urlRechazar}" target="_blank" style="background-color: #f7f9f8; color: #a12c25; border: 1px solid #d3dbd5; text-decoration: none; padding: 11px 20px; font-size: 14px; font-weight: bold; border-radius: 4px; display: inline-block;">
              ABRIR PARA RECHAZAR
            </a>
          </td>
        </tr>
      </table>
      <p style="font-size: 12px; color: #66756f;">Cada enlace abre una página de confirmación; la decisión solo se aplica cuando das clic en el botón de esa página.</p>

      <hr style="border: none; border-top: 1px solid #e1e7e3; margin: 25px 0;" />
      <p style="font-size: 12px; color: #66756f; margin: 0;">Mundo Social &middot; Sistema Editorial &middot; UNMSM</p>
    </div>
  `;

  DEREK_EMAILS.forEach(function (correo) {
    MailApp.sendEmail({ to: correo, subject: asunto, htmlBody: htmlBody });
  });
}

// ============================================================================
// 5. ENLACES DEL CORREO: SOLO MUESTRAN UNA PÁGINA DE CONFIRMACIÓN (doGet)
//    La acción real ocurre en doPost (procesarDecision), disparada por un
//    clic humano en el botón de esa página. Así un antivirus o previsualizador
//    de correo que abra el enlace no puede aprobar/rechazar nada por sí solo.
// ============================================================================
function doGet(e) {
  const action = e.parameter.action;
  const id = e.parameter.id;

  if (!id || (action !== "aprobar" && action !== "rechazar")) {
    return HtmlService.createHtmlOutput("<h3 style='font-family:sans-serif;'>Petición inválida</h3>");
  }

  const raw = PropertiesService.getScriptProperties().getProperty(id);
  if (!raw) {
    return HtmlService.createHtmlOutput("<h3 style='font-family:sans-serif;'>Esta solicitud ya expiró o fue procesada.</h3>");
  }

  const record = JSON.parse(raw);
  if (record.status !== "PENDIENTE") {
    return HtmlService.createHtmlOutput(`<h3 style='font-family:sans-serif;'>Esta propuesta ya fue procesada (estado actual: ${escapeHtmlSeguro(record.status)}).</h3>`);
  }

  const webAppUrl = ScriptApp.getService().getUrl();
  const verbo = action === "aprobar" ? "APROBAR" : "RECHAZAR";
  const color = action === "aprobar" ? "#0f4c3a" : "#a12c25";

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 60px auto; text-align: center; padding: 0 20px;">
      <h2 style="color: ${color};">Confirmar: ${verbo}</h2>
      <p>Propuesta: <strong>${escapeHtmlSeguro(record.data.title)}</strong></p>
      <p style="color:#555; font-size: 14px;">Este es el único paso que ejecuta la decisión. Nada se aplica hasta que presiones el botón.</p>
      <form method="POST" action="${webAppUrl}">
        <input type="hidden" name="confirm" value="1">
        <input type="hidden" name="action" value="${action}">
        <input type="hidden" name="id" value="${escapeHtmlSeguro(id)}">
        <button type="submit" style="background-color: ${color}; color: #fff; border: none; padding: 14px 28px; font-size: 15px; font-weight: bold; border-radius: 4px; cursor: pointer;">
          Sí, confirmar ${verbo}
        </button>
      </form>
    </div>
  `;
  return HtmlService.createHtmlOutput(html);
}

// ============================================================================
// 6. APLICA LA DECISIÓN (llamado solo por el clic real en la confirmación)
// ============================================================================
function procesarDecision(action, id) {
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty(id);
  if (!raw) {
    return ContentService.createTextOutput("Esta solicitud ya expiró o fue procesada.").setMimeType(ContentService.MimeType.TEXT);
  }

  const record = JSON.parse(raw);
  if (record.status !== "PENDIENTE") {
    return ContentService.createTextOutput("Esta propuesta ya había sido procesada.").setMimeType(ContentService.MimeType.TEXT);
  }

  if (action === "rechazar") {
    props.setProperty(id, JSON.stringify(Object.assign({}, record, { status: "RECHAZADO" })));
    notificarRemitenteRechazo(record.data);
    return ContentService.createTextOutput("Propuesta rechazada. Se avisó al remitente.").setMimeType(ContentService.MimeType.TEXT);
  }

  if (action === "aprobar") {
    props.setProperty(id, JSON.stringify(Object.assign({}, record, { status: "APROBADO_PENDIENTE_DE_SUBIR" })));
    enviarPaqueteParaSubirManualmente(record.data);
    notificarRemitenteAprobacion(record.data);
    return ContentService.createTextOutput("Aprobado. Se envió el paquete de publicación para subirlo directamente, y se avisó al remitente.").setMimeType(ContentService.MimeType.TEXT);
  }

  return ContentService.createTextOutput("Acción desconocida.").setMimeType(ContentService.MimeType.TEXT);
}

// ============================================================================
// 7. AL APROBAR: correo con TODO listo para que Derek / el equipo lo suba
//    directamente (a mano, o con scripts/publicar_articulo.py). No se toca
//    GitHub desde aquí — ninguna credencial de GitHub vive en este script.
// ============================================================================
function enviarPaqueteParaSubirManualmente(data) {
  const payloadJson = JSON.stringify({
    title: data.title,
    category: data.category,
    tags: data.tags,
    authors: data.authors,
    resumen: data.resumen,
    pdf: data.pdf,
    url_original: data.url_original || ""
  }, null, 2);

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; color: #1c2622;">
      <h2 style="color:#0f4c3a;">✓ Propuesta aprobada — lista para subir</h2>
      <p>La siguiente propuesta fue aprobada y <strong>debe subirse directamente</strong> (a mano, o corriendo <code>scripts/publicar_articulo.py</code> con este JSON):</p>
      <pre style="background:#f4f4f0; border:1px solid #ddd; padding:14px; border-radius:4px; font-size:12.5px; overflow-x:auto; white-space:pre-wrap;">${escapeHtmlSeguro(payloadJson)}</pre>
      <p style="font-size:13px; color:#555;">Reenvía este correo a quien vaya a subirlo si no lo haces tú mismo.</p>
    </div>
  `;

  DEREK_EMAILS.forEach(function (correo) {
    MailApp.sendEmail({
      to: correo,
      subject: `[Mundo Social] Listo para subir: "${data.title}"`,
      htmlBody: htmlBody
    });
  });
}

// ============================================================================
// 8. AVISOS AL REMITENTE (no se le deja sin respuesta)
// ============================================================================
function notificarRemitenteEnRevision(data) {
  if (!data.email) return;
  MailApp.sendEmail({
    to: data.email,
    subject: `[Mundo Social] Tu propuesta "${data.title}" sigue en revisión`,
    htmlBody: `
      <div style="font-family: sans-serif; max-width: 560px; margin:0 auto; color:#1c2622;">
        <p>Hola,</p>
        <p>Tu propuesta "<strong>${escapeHtmlSeguro(data.title)}</strong>" fue recibida y está en revisión editorial. Aún <strong>no ha sido subida</strong> a la web.</p>
        <p>Si es urgente, puedes comunicarte directamente:</p>
        <ul>
          <li>Correo: derekmartellm@gmail.com</li>
          <li>Correo: 7073248@gmail.com</li>
          <li>WhatsApp: ${CONTACTO_WHATSAPP}</li>
        </ul>
        <p>Gracias por tu paciencia.<br>Mundo Social &middot; UNMSM</p>
      </div>
    `
  });
}

function notificarRemitenteAprobacion(data) {
  if (!data.email) return;
  MailApp.sendEmail({
    to: data.email,
    subject: `[Mundo Social] ¡Tu propuesta "${data.title}" fue aprobada!`,
    htmlBody: `
      <div style="font-family: sans-serif; max-width: 560px; margin:0 auto; color:#1c2622;">
        <p>Hola,</p>
        <p>Tu propuesta "<strong>${escapeHtmlSeguro(data.title)}</strong>" fue aprobada. Se publicará en la web en los próximos días.</p>
        <p>Gracias por tu aporte.<br>Mundo Social &middot; UNMSM</p>
      </div>
    `
  });
}

function notificarRemitenteRechazo(data) {
  if (!data.email) return;
  MailApp.sendEmail({
    to: data.email,
    subject: `[Mundo Social] Sobre tu propuesta "${data.title}"`,
    htmlBody: `
      <div style="font-family: sans-serif; max-width: 560px; margin:0 auto; color:#1c2622;">
        <p>Hola,</p>
        <p>Gracias por enviar "<strong>${escapeHtmlSeguro(data.title)}</strong>" a Mundo Social. Tras revisarla, no la publicaremos por ahora.</p>
        <p>Si quieres más detalle o deseas volver a proponerla más adelante, escríbenos:</p>
        <ul>
          <li>Correo: derekmartellm@gmail.com</li>
          <li>Correo: 7073248@gmail.com</li>
          <li>WhatsApp: ${CONTACTO_WHATSAPP}</li>
        </ul>
        <p>Mundo Social &middot; UNMSM</p>
      </div>
    `
  });
}

// ============================================================================
// 9. RECORDATORIOS PERIÓDICOS (nunca auto-publica ni auto-descarta nada)
// ============================================================================
function asegurarTriggerRecurrente() {
  const yaExiste = ScriptApp.getProjectTriggers().some(function (t) {
    return t.getHandlerFunction() === NOMBRE_TRIGGER_TICK;
  });
  if (!yaExiste) {
    ScriptApp.newTrigger(NOMBRE_TRIGGER_TICK).timeBased().everyHours(1).create();
  }
}

function procesarPendientes() {
  const props = PropertiesService.getScriptProperties();
  const allProps = props.getProperties();
  const ahora = new Date().getTime();

  for (const key in allProps) {
    if (!key.startsWith("pub_")) continue;
    let record;
    try {
      record = JSON.parse(allProps[key]);
    } catch (err) {
      continue;
    }
    if (record.status !== "PENDIENTE") continue;

    const creado = new Date(record.creado).getTime();
    const horasDesdeCreado = (ahora - creado) / 3600000;

    // Aviso único al remitente, tras 1 hora, de que sigue en revisión.
    if (!record.avisoRemitenteEnviado && horasDesdeCreado >= AVISO_REMITENTE_TRAS_HORAS) {
      try { notificarRemitenteEnRevision(record.data); } catch (err) { Logger.log(err); }
      record.avisoRemitenteEnviado = true;
      props.setProperty(key, JSON.stringify(record));
    }

    // Recordatorios a Derek cada RECORDATORIO_CADA_HORAS, hasta un máximo.
    const ultimoRecordatorio = new Date(record.ultimoRecordatorio || record.creado).getTime();
    const horasDesdeUltimoRecordatorio = (ahora - ultimoRecordatorio) / 3600000;
    if ((record.reminderCount || 0) < MAX_RECORDATORIOS && horasDesdeUltimoRecordatorio >= RECORDATORIO_CADA_HORAS) {
      try {
        enviarRecordatorioDerek(record.data, key, record.reminderCount + 1);
      } catch (err) {
        Logger.log(err);
      }
      record.reminderCount = (record.reminderCount || 0) + 1;
      record.ultimoRecordatorio = new Date().toISOString();
      props.setProperty(key, JSON.stringify(record));
    }
  }
}

function enviarRecordatorioDerek(data, submissionId, numero) {
  const webAppUrl = ScriptApp.getService().getUrl();
  const urlAprobar = `${webAppUrl}?action=aprobar&id=${encodeURIComponent(submissionId)}`;
  const urlRechazar = `${webAppUrl}?action=rechazar&id=${encodeURIComponent(submissionId)}`;

  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 560px; margin:0 auto; color:#1c2622;">
      <p>Recordatorio ${numero}/${MAX_RECORDATORIOS}: sigue pendiente de tu decisión la propuesta:</p>
      <p><strong>${escapeHtmlSeguro(data.title)}</strong> — ${escapeHtmlSeguro(data.authors)}</p>
      <p>
        <a href="${urlAprobar}" style="color:#0f4c3a; font-weight:bold;">Abrir para aprobar</a> &nbsp;|&nbsp;
        <a href="${urlRechazar}" style="color:#a12c25; font-weight:bold;">Abrir para rechazar</a>
      </p>
      <p style="font-size:12px; color:#888;">No se publicará ni se descartará sola: seguirá esperando tu decisión.</p>
    </div>
  `;

  DEREK_EMAILS.forEach(function (correo) {
    MailApp.sendEmail({
      to: correo,
      subject: `[Mundo Social] Recordatorio (${numero}/${MAX_RECORDATORIOS}): "${data.title}" sigue pendiente`,
      htmlBody: htmlBody
    });
  });
}
