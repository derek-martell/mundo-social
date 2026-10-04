/**
 * Configuración de servicios externos de Mundo Social.
 *
 * Cada módulo opcional (analítica, suscripción, interacciones, chat con IA)
 * se activa solo cuando su valor está completo aquí. Si un valor queda vacío,
 * ese módulo no se muestra y el sitio funciona igual que antes.
 *
 * Nada de lo que va aquí es secreto: todo es público por naturaleza
 * (identificadores y direcciones). Las claves privadas (por ejemplo la de la
 * IA) nunca van en este archivo: viven en el servidor intermedio.
 */
window.MS_CONFIG = {
  // Analítica (Umami Cloud). Ver "Paso a paso" en docs/CONFIGURACION.md
  umamiWebsiteId: "",
  umamiScript: "https://cloud.umami.is/script.js",

  // Suscripción por correo (Buttondown): nombre de usuario de la cuenta
  buttondownUsuario: "",

  // Me gusta, comentarios y "escribir al autor": URL /exec del Apps Script
  // de interacciones (scripts/apps_script_interacciones.js)
  interaccionesUrl: "",

  // Chat con IA de SocioBot: URL del Worker de Cloudflare
  // (scripts/cloudflare_worker_chat.js). Vacío = solo búsqueda local.
  chatIaUrl: ""
};
