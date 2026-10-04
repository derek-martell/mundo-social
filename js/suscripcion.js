/**
 * Suscripción por correo (Buttondown). Se muestra solo si
 * MS_CONFIG.buttondownUsuario tiene valor.
 */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var cfg = window.MS_CONFIG || {};
    var usuario = String(cfg.buttondownUsuario || "").trim();
    var sec = document.getElementById("suscripcion");
    if (!sec || !usuario) return;

    var accion = "https://buttondown.com/api/emails/embed-subscribe/" + encodeURIComponent(usuario);
    var icono = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="1"/><path d="m3 7 9 6 9-6"/></svg>';

    sec.innerHTML =
      '<div class="wrap suscripcion-inner">' +
        '<h2 id="suscripcion-titulo" class="suscripcion-titulo">Recibe cada nueva publicación</h2>' +
        '<p class="suscripcion-dek">Te escribimos solo cuando publicamos algo nuevo. Sin spam; te das de baja con un clic.</p>' +
        '<form class="suscripcion-form" method="post" action="' + accion + '" target="suscripcion-destino" novalidate>' +
          '<label class="suscripcion-label" for="suscripcion-correo">Correo electrónico</label>' +
          '<div class="suscripcion-fila">' +
            '<input id="suscripcion-correo" class="suscripcion-input" type="email" name="email" autocomplete="email" inputmode="email" required aria-describedby="suscripcion-nota suscripcion-estado">' +
            '<input type="hidden" name="embed" value="1">' +
            '<button type="submit" class="btn-primary-action suscripcion-boton">' + icono + '<span>Suscribirme</span></button>' +
          '</div>' +
          '<p id="suscripcion-estado" class="suscripcion-estado" role="status" aria-live="polite"></p>' +
          '<p id="suscripcion-nota" class="suscripcion-nota">Usaremos tu correo solo para avisarte de nuevas publicaciones de Mundo Social (Ley N.º 29733). Te llegará un correo para confirmar.</p>' +
        '</form>' +
        '<p class="suscripcion-rss">¿Prefieres RSS? <a href="feed.xml">Suscríbete al feed</a></p>' +
        '<iframe name="suscripcion-destino" title="Respuesta del servicio de suscripción" class="suscripcion-destino" tabindex="-1" aria-hidden="true"></iframe>' +
      '</div>';
    sec.hidden = false;

    var form = sec.querySelector("form");
    var campo = sec.querySelector("#suscripcion-correo");
    var boton = sec.querySelector("button");
    var etiquetaBoton = boton.querySelector("span");
    var estado = sec.querySelector("#suscripcion-estado");

    function mostrar(msg, error) {
      estado.textContent = msg;
      estado.classList.toggle("is-error", !!error);
      estado.classList.toggle("is-ok", !error && !!msg);
      campo.setAttribute("aria-invalid", error ? "true" : "false");
    }

    campo.addEventListener("input", function () {
      if (estado.classList.contains("is-error")) mostrar("", false);
    });

    form.addEventListener("submit", function (e) {
      var valor = campo.value.trim();
      if (!valor || !campo.checkValidity()) {
        e.preventDefault();
        var msg = valor
          ? "Ese correo no parece completo. Revisa que tenga la forma nombre@dominio.com."
          : "Escribe tu correo para suscribirte.";
        mostrar(msg, true);
        if (window.SocioBot && typeof window.SocioBot.explainError === "function") {
          try { window.SocioBot.explainError(msg); } catch (err) {}
        }
        campo.focus();
        return;
      }
      // El envío continúa hacia el iframe oculto (sin salir de la página)
      boton.disabled = true;
      etiquetaBoton.textContent = "Enviando…";
      mostrar("", false);
      setTimeout(function () {
        form.hidden = true;
        var ok = document.createElement("p");
        ok.className = "suscripcion-estado is-ok suscripcion-exito";
        ok.setAttribute("role", "status");
        ok.textContent = "Listo. Revisa tu correo para confirmar la suscripción.";
        form.parentNode.insertBefore(ok, form);
        if (window.SocioBot && typeof window.SocioBot.celebrate === "function") {
          try { window.SocioBot.celebrate("¡Gracias por suscribirte! Revisa tu correo para confirmar."); } catch (err) {}
        }
      }, 900);
    });
  });
})();
