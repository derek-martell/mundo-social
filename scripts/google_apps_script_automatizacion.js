/**
 * ============================================================================
 * MUNDO SOCIAL (UNMSM) - AUTOMATIZACIÓN DE PUBLICACIÓN CON APROBACIÓN POR CORREO
 * ============================================================================
 * 
 * Instrucciones de instalación en Google Forms / Google Sheets:
 * 1. En Google Drive, crea tu formulario ("Envío de Publicaciones - Mundo Social")
 * 2. En la pestaña "Respuestas", haz clic en "Vincular con Hojas de cálculo".
 * 3. En la Hoja de cálculo de Google, ve a: Extensiones -> Apps Script.
 * 4. Pega todo este código reemplazando el contenido existente.
 * 5. Configura las constantes DEREK_EMAIL y GITHUB_TOKEN abajo.
 * 6. En el menú superior de Apps Script, selecciona la función "configurarDisparador" y dale a "Ejecutar".
 * 7. Ve a "Implementar" -> "Nueva implementación" -> Selecciona tipo "Aplicación web":
 *    - Ejecutar como: "Yo"
 *    - Quién tiene acceso: "Cualquier persona" (para que los botones del correo funcionen)
 * 8. Copia la URL de la aplicación web y pégala en WEB_APP_URL.
 */

// ============================================================================
// CONFIGURACIÓN (EDITA ESTOS VALORES)
// ============================================================================
const DEREK_EMAIL = "derekmartell99@gmail.com"; // Tu correo donde recibirás el aviso
const GITHUB_REPO = "derek-martell/mundo-social"; // Tu repositorio de GitHub
const GITHUB_TOKEN = "PEGA_AQUI_TU_GITHUB_PERSONAL_ACCESS_TOKEN"; // Token de GitHub con permiso 'repo'
const WEB_APP_URL = "PEGA_AQUI_LA_URL_DE_TU_APPS_SCRIPT_WEB_APP"; // Generada al implementar la Web App
const TIEMPO_ESPERA_MINUTOS = 60; // 1 hora de espera antes de auto-publicar

// ============================================================================
// 1. RECEPTOR DE RESPUESTAS DEL FORMULARIO
// ============================================================================
function onFormSubmit(e) {
  const respuestas = e.namedValues;
  
  // Mapear campos del formulario (ajusta los nombres si tu formulario usa otros títulos)
  const titulo = (respuestas["Título de la publicación"] || respuestas["Título"] || ["Sin título"])[0];
  const categoria = (respuestas["Categoría"] || ["Coyuntura"])[0];
  const autores = (respuestas["Autores"] || respuestas["Nombre del autor(es)"] || ["Equipo Mundo Social"])[0];
  const cursoTags = (respuestas["Curso o Área temática"] || respuestas["Etiquetas"] || ["Economía"])[0];
  const resumen = (respuestas["Resumen o Abstract"] || respuestas["Resumen"] || [""])[0];
  const pdfEnlace = (respuestas["Documento PDF (Enlace de Google Drive)"] || respuestas["PDF"] || [""])[0];
  const correoAutor = (respuestas["Dirección de correo electrónico"] || respuestas["Correo del autor"] || [""])[0];

  const submissionId = "pub_" + new Date().getTime();
  
  const payload = {
    id_solicitud: submissionId,
    title: titulo,
    category: categoria,
    authors: autores,
    tags: cursoTags,
    resumen: resumen,
    pdf: pdfEnlace,
    correo_autor: correoAutor,
    timestamp: new Date().toISOString()
  };

  // Guardar en el almacenamiento temporal de Apps Script
  const props = PropertiesService.getScriptProperties();
  props.setProperty(submissionId, JSON.stringify({
    status: "PENDIENTE",
    data: payload
  }));

  // Enviar correo a Derek con botones de decisión
  enviarCorreoDecision(payload, submissionId);

  // Programar auto-aprobación en 1 hora (60 minutos)
  ScriptApp.newTrigger("verificarAutoAprobacion")
    .timeBased()
    .after(TIEMPO_ESPERA_MINUTOS * 60 * 1000)
    .create();
}

// ============================================================================
// 2. ENVÍO DEL CORREO DE DECISIÓN A DEREK
// ============================================================================
function enviarCorreoDecision(data, submissionId) {
  const urlAprobar = `${WEB_APP_URL}?action=aprobar&id=${submissionId}`;
  const urlRechazar = `${WEB_APP_URL}?action=rechazar&id=${submissionId}`;

  const asunto = `[Mundo Social] Nueva propuesta: "${data.title}" por ${data.authors}`;
  
  const htmlBody = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #fdfcf9; border: 1px solid #d3dbd5; border-top: 4px solid #0f4c3a; padding: 25px; color: #1c2622;">
      <h2 style="color: #0f4c3a; margin-top: 0; font-family: Georgia, serif; font-size: 24px;">Mundo Social &middot; Dirección Editorial</h2>
      <p style="font-size: 15px; line-height: 1.5;">Hola Derek, se ha recibido una nueva propuesta para el archivo de <strong>Mundo Social</strong>:</p>
      
      <div style="background: #ffffff; border: 1px solid #e1e7e3; padding: 18px; border-radius: 4px; margin: 20px 0;">
        <h3 style="margin-top: 0; font-size: 18px; color: #111;">${data.title}</h3>
        <p style="margin: 6px 0; font-size: 14px;"><strong>Categoría:</strong> <span style="color: #0f4c3a; font-weight: bold;">${data.category}</span></p>
        <p style="margin: 6px 0; font-size: 14px;"><strong>Autor(es):</strong> ${data.authors}</p>
        <p style="margin: 6px 0; font-size: 14px;"><strong>Área / Etiquetas:</strong> ${data.tags}</p>
        ${data.pdf ? `<p style="margin: 6px 0; font-size: 14px;"><strong>Documento PDF:</strong> <a href="${data.pdf}" target="_blank" style="color: #0f4c3a; text-decoration: underline;">Ver archivo adjunto</a></p>` : ''}
        <p style="margin: 12px 0 0 0; font-size: 14px; color: #444; line-height: 1.5;"><strong>Resumen:</strong><br>${data.resumen}</p>
      </div>

      <div style="background: #fbf7ee; border-left: 3px solid #c9a24a; padding: 12px; margin-bottom: 25px; font-size: 13px; color: #6d5b24;">
        ⏱️ <strong>Aprobación automática:</strong> Si estás de acuerdo o no puedes responder, esta publicación <strong>se subirá automáticamente dentro de 1 hora</strong> a la web de Mundo Social.
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${urlAprobar}" style="background-color: #0f4c3a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 14px; display: inline-block; margin-right: 12px;">
          ✓ APROBAR Y PUBLICAR AHORA
        </a>
        <a href="${urlRechazar}" style="background-color: #ffffff; color: #a12c25; border: 1px solid #a12c25; padding: 11px 22px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 14px; display: inline-block;">
          ✕ RECHAZAR
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #e1e7e3; margin-top: 30px;">
      <p style="font-size: 11px; color: #888; text-align: center;">Mundo Social &middot; FCE UNMSM &middot; Sistema Editorial Automatizado</p>
    </div>
  `;

  MailApp.sendEmail({
    to: DEREK_EMAIL,
    subject: asunto,
    htmlBody: htmlBody
  });
}

// ============================================================================
// 3. RESPUESTA A CLICS DESDE EL CORREO (WEB APP)
// ============================================================================
function doGet(e) {
  const action = e.parameter.action;
  const id = e.parameter.id;

  if (!id) {
    return HtmlService.createHtmlOutput("<h3>Solicitud inválida</h3>");
  }

  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty(id);
  if (!raw) {
    return HtmlService.createHtmlOutput("<h3 style='font-family:sans-serif;color:#a12c25;'>Esta propuesta ya fue procesada o expiró.</h3>");
  }

  const record = JSON.parse(raw);

  if (action === "rechazar") {
    props.setProperty(id, JSON.stringify({ status: "RECHAZADO", data: record.data }));
    return HtmlService.createHtmlOutput(`
      <div style="font-family: sans-serif; text-align: center; padding: 40px;">
        <h2 style="color: #a12c25;">✕ Propuesta Rechazada</h2>
        <p>El artículo "<strong>${record.data.title}</strong>" no se publicará en Mundo Social.</p>
      </div>
    `);
  }

  if (action === "aprobar") {
    if (record.status === "PUBLICADO") {
      return HtmlService.createHtmlOutput("<h3 style='font-family:sans-serif;color:#0f4c3a;'>Esta publicación ya fue enviada a la web con éxito.</h3>");
    }

    const ok = dispararPublicacionGitHub(record.data);
    if (ok) {
      props.setProperty(id, JSON.stringify({ status: "PUBLICADO", data: record.data }));
      return HtmlService.createHtmlOutput(`
        <div style="font-family: sans-serif; text-align: center; padding: 40px;">
          <h2 style="color: #0f4c3a;">✓ ¡Publicación Aprobada con Éxito!</h2>
          <p>El artículo "<strong>${record.data.title}</strong>" se está desplegando en GitHub Pages.</p>
          <p style="color: #666; font-size: 14px;">Estará visible en la web en menos de un minuto.</p>
        </div>
      `);
    } else {
      return HtmlService.createHtmlOutput("<h3 style='font-family:sans-serif;color:#a12c25;'>Error al conectar con GitHub. Revisa el token de acceso.</h3>");
    }
  }

  return HtmlService.createHtmlOutput("<h3>Acción desconocida</h3>");
}

// ============================================================================
// 4. TEMPORIZADOR DE AUTO-APROBACIÓN (1 HORA)
// ============================================================================
function verificarAutoAprobacion() {
  const props = PropertiesService.getScriptProperties();
  const allProps = props.getProperties();

  for (let key in allProps) {
    if (!key.startsWith("pub_")) continue;
    try {
      const record = JSON.parse(allProps[key]);
      if (record.status === "PENDIENTE") {
        Logger.log("Auto-aprobando publicación: " + record.data.title);
        const ok = dispararPublicacionGitHub(record.data);
        if (ok) {
          props.setProperty(key, JSON.stringify({ status: "AUTO_APROBADO", data: record.data }));
          // Notificar por correo que se auto-aprobó
          MailApp.sendEmail({
            to: DEREK_EMAIL,
            subject: `[Mundo Social] Auto-publicado: "${record.data.title}"`,
            htmlBody: `<p>Hola Derek, ha transcurrido 1 hora y se ha publicado automáticamente en la web el artículo: <strong>${record.data.title}</strong>.</p>`
          });
        }
      }
    } catch (err) {
      Logger.log("Error en autoAprobacion: " + err);
    }
  }
}

// ============================================================================
// 5. LLAMADA A LA API DE GITHUB (REPOSITORY DISPATCH)
// ============================================================================
function dispararPublicacionGitHub(payloadData) {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/dispatches`;

  const options = {
    method: "post",
    headers: {
      "Authorization": "Bearer " + GITHUB_TOKEN,
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "MundoSocial-Bot"
    },
    contentType: "application/json",
    payload: JSON.stringify({
      event_type: "publicar_articulo",
      client_payload: payloadData
    }),
    muteHttpExceptions: true
  };

  try {
    const res = UrlFetchApp.fetch(url, options);
    const code = res.getResponseCode();
    Logger.log("GitHub Dispatch code: " + code);
    return code === 204 || code === 200;
  } catch (e) {
    Logger.log("Error llamando a GitHub: " + e);
    return false;
  }
}

// ============================================================================
// 6. ASISTENTE PARA CONFIGURAR DISPARADOR DE FORMULARIO
// ============================================================================
function configurarDisparador() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "onFormSubmit") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger("onFormSubmit")
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onFormSubmit()
    .create();
  Logger.log("Disparador onFormSubmit configurado con éxito.");
}
