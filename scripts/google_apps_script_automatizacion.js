/**
 * ============================================================================
 * MUNDO SOCIAL (UNMSM) - AUTOMATIZACIÓN DE PUBLICACIÓN DIRECTA CON APROBACIÓN
 * ============================================================================
 * 
 * Flujo:
 * 1. El colaborador envía su propuesta (desde enviar.html o Google Form).
 * 2. Recibes un correo de inmediato en Gmail con los datos y botones:
 *    [✓ APROBAR Y PUBLICAR AHORA]  |  [✕ RECHAZAR]
 * 3. Si estás ocupado o no respondes en 1 HORA, se auto-aprueba y se publica solo.
 * 4. La publicación se sube directamente a GitHub (articulos.json y articulos-data.js)
 *    sin depender de GitHub Actions ni requerir permisos especiales.
 * 5. GitHub Pages compila y muestra el nuevo artículo en la web en ~30 segundos.
 */

// ============================================================================
// CONFIGURACIÓN EDITABLE
// ============================================================================
const DEREK_EMAIL = "7073248@gmail.com";
const GITHUB_REPO = "derek-martell/mundo-social";
// Pega aquí tu token de GitHub (lo obtienes ejecutando 'gh auth token' en tu terminal):
const GITHUB_TOKEN = "PEGA_AQUI_TU_GITHUB_TOKEN"; 
const TIEMPO_ESPERA_MINUTOS = 60; // 1 hora antes de auto-publicar

// ============================================================================
// 1. RECEPTOR DESDE EL FORMULARIO WEB (enviar.html)
// ============================================================================
function doPost(e) {
  try {
    let payload = {};
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      payload = e.parameter;
    }

    const submissionId = "pub_" + new Date().getTime();
    payload.id_solicitud = submissionId;
    payload.timestamp = new Date().toISOString();

    const props = PropertiesService.getScriptProperties();
    props.setProperty(submissionId, JSON.stringify({
      status: "PENDIENTE",
      data: payload
    }));

    // Enviar correo a Derek
    enviarCorreoDecision(payload, submissionId);

    // Programar auto-aprobación en 1 hora
    ScriptApp.newTrigger("verificarAutoAprobacion")
      .timeBased()
      .after(TIEMPO_ESPERA_MINUTOS * 60 * 1000)
      .create();

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Propuesta recibida correctamente. En proceso de revisión editorial."
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
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

  const props = PropertiesService.getScriptProperties();
  props.setProperty(submissionId, JSON.stringify({
    status: "PENDIENTE",
    data: payload
  }));

  enviarCorreoDecision(payload, submissionId);

  ScriptApp.newTrigger("verificarAutoAprobacion")
    .timeBased()
    .after(TIEMPO_ESPERA_MINUTOS * 60 * 1000)
    .create();
}

// ============================================================================
// 3. ENVÍO DEL CORREO DE DECISIÓN A DEREK CON BOTONES
// ============================================================================
function enviarCorreoDecision(data, submissionId) {
  const webAppUrl = ScriptApp.getService().getUrl();
  const urlAprobar = `${webAppUrl}?action=aprobar&id=${submissionId}`;
  const urlRechazar = `${webAppUrl}?action=rechazar&id=${submissionId}`;

  const asunto = `[Mundo Social] Nueva propuesta: "${data.title}" por ${data.authors}`;
  
  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #fdfcf9; border: 1px solid #d3dbd5; border-top: 4px solid #0f4c3a; padding: 25px; color: #1c2622;">
      <h2 style="color: #0f4c3a; margin-top: 0; font-family: Georgia, serif; font-size: 24px; border-bottom: 1px solid #e1e7e3; padding-bottom: 10px;">Mundo Social &middot; Dirección Editorial</h2>
      <p style="font-size: 15px; line-height: 1.5;">Hola Derek, se ha recibido una nueva propuesta para el archivo de <strong>Mundo Social</strong>:</p>
      
      <div style="background: #ffffff; border: 1px solid #e1e7e3; padding: 18px; border-radius: 4px; margin: 20px 0;">
        <h3 style="margin-top: 0; font-size: 18px; color: #111;">${data.title}</h3>
        <p style="margin: 6px 0; font-size: 14px;"><strong>Categoría:</strong> <span style="color: #0f4c3a; font-weight: bold;">${data.category}</span></p>
        <p style="margin: 6px 0; font-size: 14px;"><strong>Autor(es):</strong> ${data.authors}</p>
        <p style="margin: 6px 0; font-size: 14px;"><strong>Área / Curso:</strong> ${data.tags}</p>
        ${data.pdf ? `<p style="margin: 6px 0; font-size: 14px;"><strong>Documento PDF:</strong> <a href="${data.pdf}" target="_blank" style="color: #0f4c3a; text-decoration: underline; font-weight: bold;">Ver archivo adjunto &rarr;</a></p>` : ''}
        <p style="margin: 12px 0 0 0; font-size: 14px; color: #444; line-height: 1.5;"><strong>Resumen:</strong><br>${data.resumen}</p>
      </div>

      <div style="background: #fbf7ee; border-left: 3px solid #c9a24a; padding: 12px; margin-bottom: 25px; font-size: 13px; color: #6d5b24;">
        ⏱️ <strong>Aprobación automática:</strong> Si estás conforme o no puedes responder, esta publicación <strong>se subirá automáticamente dentro de 1 hora</strong> a la web de Mundo Social.
      </div>

      <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
        <tr>
          <td style="padding-right: 15px;">
            <a href="${urlAprobar}" target="_blank" style="background-color: #0f4c3a; color: #ffffff; text-decoration: none; padding: 12px 24px; font-size: 14px; font-weight: bold; border-radius: 4px; display: inline-block;">
              ✓ APROBAR Y PUBLICAR AHORA
            </a>
          </td>
          <td>
            <a href="${urlRechazar}" target="_blank" style="background-color: #f7f9f8; color: #a12c25; border: 1px solid #d3dbd5; text-decoration: none; padding: 11px 20px; font-size: 14px; font-weight: bold; border-radius: 4px; display: inline-block;">
              ✕ RECHAZAR
            </a>
          </td>
        </tr>
      </table>

      <hr style="border: none; border-top: 1px solid #e1e7e3; margin: 25px 0;" />
      <p style="font-size: 12px; color: #66756f; margin: 0;">Mundo Social &middot; Sistema Editorial Automatizado &middot; UNMSM</p>
    </div>
  `;

  MailApp.sendEmail({
    to: DEREK_EMAIL,
    subject: asunto,
    htmlBody: htmlBody
  });
}

// ============================================================================
// 4. ACCIÓN AL HACER CLIC EN LOS BOTONES DEL CORREO
// ============================================================================
function doGet(e) {
  const action = e.parameter.action;
  const id = e.parameter.id;

  if (!id) {
    return HtmlService.createHtmlOutput("<h3 style='font-family:sans-serif;'>Petición inválida</h3>");
  }

  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty(id);

  if (!raw) {
    return HtmlService.createHtmlOutput("<h3 style='font-family:sans-serif;'>Esta solicitud ya expiró o fue procesada.</h3>");
  }

  const record = JSON.parse(raw);

  if (action === "rechazar") {
    props.setProperty(id, JSON.stringify({ status: "RECHAZADO", data: record.data }));
    return HtmlService.createHtmlOutput(`
      <div style="font-family: sans-serif; text-align: center; padding: 40px;">
        <h2 style="color: #a12c25;">✕ Propuesta Rechazada</h2>
        <p>El artículo "<strong>${record.data.title}</strong>" no será publicado.</p>
      </div>
    `);
  }

  if (action === "aprobar") {
    if (record.status === "PUBLICADO" || record.status === "AUTO_APROBADO") {
      return HtmlService.createHtmlOutput("<h3 style='font-family:sans-serif;color:#0f4c3a;'>Esta publicación ya fue publicada con éxito.</h3>");
    }

    const ok = publicarDirectamenteEnGitHub(record.data);
    if (ok) {
      props.setProperty(id, JSON.stringify({ status: "PUBLICADO", data: record.data }));
      return HtmlService.createHtmlOutput(`
        <div style="font-family: sans-serif; text-align: center; padding: 40px;">
          <h2 style="color: #0f4c3a;">✓ ¡Publicación Aprobada con Éxito!</h2>
          <p>El artículo "<strong>${record.data.title}</strong>" se ha subido directamente a GitHub.</p>
          <p style="color: #666; font-size: 14px;">Estará visible en la web en menos de un minuto.</p>
        </div>
      `);
    } else {
      return HtmlService.createHtmlOutput("<h3 style='font-family:sans-serif;color:#a12c25;'>Error al conectar con GitHub. Revisa la consola de Apps Script.</h3>");
    }
  }

  return HtmlService.createHtmlOutput("<h3>Acción desconocida</h3>");
}

// ============================================================================
// 5. TEMPORIZADOR DE AUTO-APROBACIÓN (1 HORA)
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
        const ok = publicarDirectamenteEnGitHub(record.data);
        if (ok) {
          props.setProperty(key, JSON.stringify({ status: "AUTO_APROBADO", data: record.data }));
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
// 6. MOTOR DE PUBLICACIÓN DIRECTO A GITHUB (SIN ACTIONS NI PERMISOS EXTRA)
// ============================================================================
function publicarDirectamenteEnGitHub(data) {
  const repo = GITHUB_REPO;
  const token = GITHUB_TOKEN;
  const headers = {
    "Authorization": "Bearer " + token,
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "MundoSocial-Bot"
  };

  try {
    // 1. Obtener data/articulos.json actual
    const urlJson = `https://api.github.com/repos/${repo}/contents/data/articulos.json`;
    const resJson = UrlFetchApp.fetch(urlJson, { headers: headers, muteHttpExceptions: true });
    if (resJson.getResponseCode() !== 200) {
      Logger.log("Error al leer articulos.json: " + resJson.getContentText());
      return false;
    }
    const fileJson = JSON.parse(resJson.getContentText());
    const jsonDecoded = Utilities.newBlob(Utilities.base64Decode(fileJson.content)).getDataAsString("UTF-8");
    const articulos = JSON.parse(jsonDecoded);

    // 2. Calcular nuevo ID secuencial
    let maxId = 0;
    for (let i = 0; i < articulos.length; i++) {
      if (articulos[i].id && articulos[i].id > maxId) {
        maxId = articulos[i].id;
      }
    }
    const nuevoId = maxId + 1;

    // 3. Formatear autores y tags
    let authorsList = [];
    if (typeof data.authors === "string") {
      authorsList = data.authors.split(",").map(function(s) { return s.trim(); }).filter(Boolean);
    } else if (Array.isArray(data.authors)) {
      authorsList = data.authors;
    }
    if (authorsList.length === 0) authorsList = ["Equipo Mundo Social"];

    let tagsList = [];
    if (typeof data.tags === "string") {
      tagsList = data.tags.split(",").map(function(s) { return s.trim(); }).filter(Boolean);
    } else if (Array.isArray(data.tags)) {
      tagsList = data.tags;
    }
    if (tagsList.length === 0) tagsList = ["Economía"];

    // 4. Fechas y Slugs
    const meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
    const now = new Date();
    const fechaStr = meses[now.getMonth()] + " " + now.getFullYear();

    function slugify(text) {
      return text.toString().toLowerCase()
        .replace(/[áäàâ]/g, 'a')
        .replace(/[éëèê]/g, 'e')
        .replace(/[íïìî]/g, 'i')
        .replace(/[óöòô]/g, 'o')
        .replace(/[úüùû]/g, 'u')
        .replace(/ñ/g, 'n')
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/[-\s]+/g, '-');
    }

    const nuevoArticulo = {
      id: nuevoId,
      slug: slugify(data.title),
      title: data.title,
      type: data.type || "Columna de Opinión",
      category: data.category || "Coyuntura",
      date: fechaStr,
      authors: authorsList,
      tags: tagsList,
      resumen: data.resumen || ("Publicación editorial sobre " + data.title.toLowerCase() + " elaborada para Mundo Social."),
      pdf: data.pdf || "",
      url_original: data.url_original || ""
    };

    // Insertar al inicio sin tocar los 96 existentes
    articulos.unshift(nuevoArticulo);

    // 5. Guardar data/articulos.json en GitHub
    const nuevoJsonStr = JSON.stringify(articulos, null, 2);
    const base64Json = Utilities.base64Encode(Utilities.newBlob(nuevoJsonStr).getBytes());

    const putJsonRes = UrlFetchApp.fetch(urlJson, {
      method: "put",
      headers: headers,
      contentType: "application/json",
      payload: JSON.stringify({
        message: `feat(publicacion): agregar "${data.title}" (ID ${nuevoId})`,
        content: base64Json,
        sha: fileJson.sha,
        branch: "main"
      }),
      muteHttpExceptions: true
    });

    if (putJsonRes.getResponseCode() !== 200 && putJsonRes.getResponseCode() !== 201) {
      Logger.log("Error al actualizar articulos.json: " + putJsonRes.getContentText());
      return false;
    }

    // 6. Actualizar js/articulos-data.js en GitHub
    const urlJs = `https://api.github.com/repos/${repo}/contents/js/articulos-data.js`;
    const resJs = UrlFetchApp.fetch(urlJs, { headers: headers, muteHttpExceptions: true });
    if (resJs.getResponseCode() === 200) {
      const fileJs = JSON.parse(resJs.getContentText());
      const nuevoJsContent = "// Catálogo oficial de publicaciones de Mundo Social (UNMSM)\n// Generado automáticamente - No editar manualmente\nconst ARTICULOS_DATA = " + nuevoJsonStr + ";\n";
      const base64Js = Utilities.base64Encode(Utilities.newBlob(nuevoJsContent).getBytes());

      UrlFetchApp.fetch(urlJs, {
        method: "put",
        headers: headers,
        contentType: "application/json",
        payload: JSON.stringify({
          message: `chore: actualizar catálogo js para "${data.title}"`,
          content: base64Js,
          sha: fileJs.sha,
          branch: "main"
        }),
        muteHttpExceptions: true
      });
    }

    Logger.log("[EXITO] Publicación completada con ID " + nuevoId);
    return true;

  } catch (err) {
    Logger.log("Excepción en publicarDirectamenteEnGitHub: " + err);
    return false;
  }
}
