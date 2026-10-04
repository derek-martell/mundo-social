/**
 * Interacciones de la ficha: Me gusta, comentarios y "Escribir al autor".
 * Solo se activa si MS_CONFIG.interaccionesUrl tiene valor.
 * Backend: scripts/apps_script_interacciones.js
 */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var URL_API = (window.MS_CONFIG && window.MS_CONFIG.interaccionesUrl || "").trim();
    var cont = document.getElementById("modal-interacciones");
    if (!URL_API || !cont) return;

    var KEY_CLIENTE = "ms-cliente-id";
    var KEY_LIKES = "ms-likes";
    var actual = null; // { item, token }
    var contador = 0;

    function leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function guardar(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } }

    var memCliente = "";
    function clienteId() {
      var id = leer(KEY_CLIENTE) || memCliente;
      if (!/^[A-Za-z0-9_-]{8,64}$/.test(id || "")) {
        var a = new Uint8Array(16);
        (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach(function (_, i) { a[i] = Math.floor(Math.random() * 256); });
        id = Array.prototype.map.call(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
        guardar(KEY_CLIENTE, id);
        memCliente = id;
      }
      return id;
    }
    function likesGuardados() {
      try { return JSON.parse(leer(KEY_LIKES) || "[]"); } catch (e) { return []; }
    }
    function yaLeGusto(id) { return likesGuardados().indexOf(String(id)) !== -1; }
    function marcarLike(id) {
      var l = likesGuardados();
      if (l.indexOf(String(id)) === -1) l.push(String(id));
      guardar(KEY_LIKES, JSON.stringify(l.slice(-500)));
    }

    function esc(s) {
      return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    }
    function fechaCorta(iso) {
      // "AAAA-MM-DD" sin hora se interpreta como fecha local (no UTC),
      // para que en Lima no aparezca el día anterior
      var soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
      var d = soloFecha ? new Date(+soloFecha[1], +soloFecha[2] - 1, +soloFecha[3]) : new Date(iso);
      if (isNaN(d)) return "";
      return d.toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" });
    }

    function api(metodo, cuerpo, query) {
      var opts = metodo === "POST"
        ? { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(cuerpo) }
        : { method: "GET" };
      var url = URL_API + (query ? (URL_API.indexOf("?") === -1 ? "?" : "&") + query : "");
      return fetch(url, opts).then(function (r) {
        if (!r.ok) throw new Error("http");
        return r.json();
      });
    }

    var ICONO_LIKE = '<svg class="int-ico" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"><path d="M12 20.5 4.2 12.8a4.6 4.6 0 0 1 6.5-6.5L12 7.6l1.3-1.3a4.6 4.6 0 0 1 6.5 6.5Z"/></svg>';
    var ICONO_CARTA = '<svg class="int-ico" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"><rect x="3.5" y="5.5" width="17" height="13"/><path d="m3.5 7 8.5 6.5L20.5 7"/></svg>';

    function avisoBot(tipo, texto) {
      try {
        if (window.SocioBot) {
          if (tipo === "error" && SocioBot.explainError) SocioBot.explainError(texto);
          if (tipo === "ok" && SocioBot.celebrate) SocioBot.celebrate(texto);
        }
      } catch (e) { /* extra visual */ }
    }

    function estructura(item) {
      var id = contador;
      var p = "int" + id + "-";
      cont.innerHTML =
        '<section class="int" aria-labelledby="' + p + 'tit">' +
        '<h3 class="int-titulo" id="' + p + 'tit">Participa</h3>' +
        '<div class="int-barra">' +
          '<button type="button" class="int-btn int-like" aria-pressed="false">' + ICONO_LIKE +
            '<span class="int-like-texto">Me gusta</span><span class="int-like-n" aria-hidden="true"></span></button>' +
          '<button type="button" class="int-btn int-autor-btn" aria-expanded="false" aria-controls="' + p + 'autor">' +
            ICONO_CARTA + '<span>Escribir al autor</span></button>' +
        '</div>' +
        '<p class="int-estado-like" role="status" aria-live="polite"></p>' +

        '<form class="int-form int-autor" id="' + p + 'autor" hidden novalidate>' +
          '<p class="int-nota">Tu mensaje llega al equipo editorial, que lo hará llegar al autor.</p>' +
          '<div class="int-campo"><label for="' + p + 'an">Tu nombre</label><input id="' + p + 'an" name="nombre" type="text" maxlength="80" autocomplete="name" required></div>' +
          '<div class="int-campo"><label for="' + p + 'ac">Tu correo</label><input id="' + p + 'ac" name="correo" type="email" maxlength="120" autocomplete="email" required aria-describedby="' + p + 'acd"><span class="int-ayuda" id="' + p + 'acd">Solo para que puedan responderte.</span></div>' +
          '<div class="int-campo"><label for="' + p + 'am">Mensaje</label><textarea id="' + p + 'am" name="mensaje" rows="4" maxlength="3000" required></textarea><span class="int-cuenta" aria-hidden="true">0 / 3000</span></div>' +
          '<div class="int-trampa" aria-hidden="true"><label>No completar<input type="text" name="sitio" tabindex="-1" autocomplete="off"></label></div>' +
          '<div class="int-fila"><button type="submit" class="int-btn int-btn-primario">Enviar mensaje</button></div>' +
          '<p class="int-msg" role="status" aria-live="polite"></p>' +
        '</form>' +

        '<div class="int-comentarios">' +
          '<h4 class="int-sub" id="' + p + 'ct">Comentarios</h4>' +
          '<div class="int-lista" aria-live="polite" aria-busy="true"></div>' +
        '</div>' +

        '<form class="int-form int-comentar" novalidate>' +
          '<h4 class="int-sub">Deja un comentario</h4>' +
          '<div class="int-campo"><label for="' + p + 'cn">Nombre <span class="int-opc">(opcional)</span></label><input id="' + p + 'cn" name="nombre" type="text" maxlength="60" autocomplete="name"></div>' +
          '<div class="int-campo"><label for="' + p + 'ct2">Comentario</label><textarea id="' + p + 'ct2" name="texto" rows="4" maxlength="1500" required aria-describedby="' + p + 'cnota"></textarea><span class="int-cuenta" aria-hidden="true">0 / 1500</span></div>' +
          '<div class="int-trampa" aria-hidden="true"><label>No completar<input type="text" name="sitio" tabindex="-1" autocomplete="off"></label></div>' +
          '<p class="int-nota" id="' + p + 'cnota">Los comentarios se publican después de una revisión editorial.</p>' +
          '<div class="int-fila"><button type="submit" class="int-btn int-btn-primario">Enviar comentario</button></div>' +
          '<p class="int-msg" role="status" aria-live="polite"></p>' +
        '</form>' +
        '</section>';
    }

    function render(item) {
      contador++;
      var token = contador;
      actual = { item: item, token: token, abierto: Date.now(), likes: 0, cargado: false };
      estructura(item);
      var raiz = cont.querySelector(".int");
      var btnLike = raiz.querySelector(".int-like");
      var estadoLike = raiz.querySelector(".int-estado-like");
      var lista = raiz.querySelector(".int-lista");
      var fComentar = raiz.querySelector(".int-comentar");
      var fAutor = raiz.querySelector(".int-autor");
      var btnAutor = raiz.querySelector(".int-autor-btn");
      var tAutor = Date.now(), tComentar = Date.now();
      var idArt = String(item.id);

      function vigente() { return actual && actual.token === token; }

      function pintarLike() {
        var gusta = yaLeGusto(idArt);
        btnLike.classList.toggle("es-activo", gusta);
        btnLike.setAttribute("aria-pressed", gusta ? "true" : "false");
        btnLike.disabled = gusta;
        btnLike.querySelector(".int-like-texto").textContent = gusta ? "Te gusta" : "Me gusta";
        var n = btnLike.querySelector(".int-like-n");
        n.textContent = actual.cargado || gusta ? String(actual.likes) : "";
        btnLike.setAttribute("aria-label", (gusta ? "Te gusta" : "Me gusta") + (actual.cargado ? ". " + actual.likes + (actual.likes === 1 ? " persona" : " personas") : ""));
      }

      function pintarComentarios(arr) {
        lista.setAttribute("aria-busy", "false");
        if (!arr.length) {
          lista.innerHTML = '<p class="int-vacio">Aún no hay comentarios. Sé el primero en comentar.</p>';
          return;
        }
        lista.innerHTML = '<ul class="int-ul">' + arr.map(function (c) {
          return '<li class="int-coment"><div class="int-coment-cab"><strong>' + esc(c.nombre || "Lector") + '</strong>' +
            (c.fecha ? ' <span class="int-fecha">' + esc(fechaCorta(c.fecha)) + '</span>' : '') + '</div>' +
            '<p>' + esc(c.texto) + '</p></li>';
        }).join("") + '</ul>';
      }

      function cargar() {
        var timer = setTimeout(function () {
          if (vigente() && !actual.cargado) {
            lista.innerHTML = '<div class="int-skel" aria-hidden="true"><span></span><span></span></div><span class="int-sr">Cargando…</span><p class="int-cargando">Cargando…</p>';
          }
        }, 300);
        api("GET", null, "action=resumen&id=" + encodeURIComponent(idArt))
          .then(function (r) {
            clearTimeout(timer);
            if (!vigente()) return;
            if (!r || r.ok === false) throw new Error("resp");
            actual.cargado = true;
            actual.likes = Number(r.likes) || 0;
            pintarLike();
            pintarComentarios(Array.isArray(r.comentarios) ? r.comentarios : []);
          })
          .catch(function () {
            clearTimeout(timer);
            if (!vigente()) return;
            lista.setAttribute("aria-busy", "false");
            lista.innerHTML = '<div class="int-error" role="alert"><p>No pudimos cargar los comentarios. Revisa tu conexión e inténtalo de nuevo.</p>' +
              '<button type="button" class="int-btn int-reintentar">Reintentar</button></div>';
            avisoBot("error", "No pude cargar los comentarios de este artículo.");
          });
      }
      lista.addEventListener("click", function (e) {
        if (e.target.closest(".int-reintentar")) {
          lista.setAttribute("aria-busy", "true");
          lista.innerHTML = "";
          cargar();
        }
      });

      // Me gusta (optimista)
      btnLike.addEventListener("click", function () {
        if (yaLeGusto(idArt)) return;
        actual.likes += 1;
        marcarLike(idArt);
        estadoLike.textContent = "";
        pintarLike();
        api("POST", { accion: "like", id: idArt, clienteId: clienteId() })
          .then(function (r) {
            if (!r || r.ok === false) throw new Error("resp");
            if (vigente() && typeof r.likes === "number") { actual.likes = r.likes; pintarLike(); }
          })
          .catch(function () {
            // Revertir: el servidor no lo registró
            try {
              var l = likesGuardados().filter(function (x) { return x !== idArt; });
              guardar(KEY_LIKES, JSON.stringify(l));
            } catch (e) { /* nada */ }
            if (!vigente()) return;
            actual.likes = Math.max(0, actual.likes - 1);
            pintarLike();
            estadoLike.textContent = "No pudimos registrar tu me gusta. Inténtalo de nuevo.";
            avisoBot("error", "No pude registrar tu me gusta.");
          });
      });

      // Contadores de caracteres
      raiz.querySelectorAll("textarea").forEach(function (ta) {
        var c = ta.parentNode.querySelector(".int-cuenta");
        var max = ta.getAttribute("maxlength");
        ta.addEventListener("input", function () { c.textContent = ta.value.length + " / " + max; });
      });

      // Mostrar / ocultar formulario del autor
      btnAutor.addEventListener("click", function () {
        var abrir = fAutor.hidden;
        fAutor.hidden = !abrir;
        btnAutor.setAttribute("aria-expanded", abrir ? "true" : "false");
        if (abrir) { tAutor = Date.now(); fAutor.querySelector("input[name=nombre]").focus(); }
      });

      function enviar(form, cuerpo, tiempo, exito, valida) {
        var msg = form.querySelector(".int-msg");
        var btn = form.querySelector("button[type=submit]");
        form.addEventListener("submit", function (ev) {
          ev.preventDefault();
          msg.className = "int-msg";
          var problema = valida(form);
          if (problema) {
            msg.textContent = problema.texto;
            msg.classList.add("es-error");
            problema.campo.focus();
            return;
          }
          btn.disabled = true;
          var textoBtn = btn.textContent;
          btn.textContent = "Enviando…";
          var datos = cuerpo(form);
          datos.t = Date.now() - tiempo();
          datos.clienteId = clienteId();
          datos.id = idArt;
          datos.sitio = form.elements.sitio.value;
          api("POST", datos).then(function (r) {
            if (!r || r.ok === false) { var e = new Error("srv"); e.mensaje = r && r.error; throw e; }
            msg.textContent = exito;
            msg.classList.add("es-ok");
            form.querySelectorAll("input[type=text],input[type=email],textarea").forEach(function (c) { if (c.name !== "sitio") c.value = ""; });
            form.querySelectorAll(".int-cuenta").forEach(function (c) { c.textContent = "0 / " + c.parentNode.querySelector("textarea").getAttribute("maxlength"); });
            avisoBot("ok", exito);
          }).catch(function (e) {
            msg.textContent = (e && e.mensaje) || "No pudimos enviarlo. Revisa tu conexión y vuelve a intentarlo; lo que escribiste sigue aquí.";
            msg.classList.add("es-error");
            avisoBot("error", msg.textContent);
          }).then(function () {
            btn.disabled = false;
            btn.textContent = textoBtn;
          });
        });
      }

      enviar(fComentar, function (f) {
        return { accion: "comentario", nombre: f.elements.nombre.value.trim(), texto: f.elements.texto.value.trim() };
      }, function () { return tComentar; },
      "Gracias. Tu comentario aparecerá cuando sea aprobado.",
      function (f) {
        if (f.elements.texto.value.trim().length < 5) return { texto: "Escribe un comentario de al menos 5 caracteres.", campo: f.elements.texto };
        return null;
      });

      enviar(fAutor, function (f) {
        return {
          accion: "mensaje-autor",
          nombre: f.elements.nombre.value.trim(),
          correo: f.elements.correo.value.trim(),
          mensaje: f.elements.mensaje.value.trim(),
          titulo: String(item.title || ""),
          autores: (item.authors || []).join(", ")
        };
      }, function () { return tAutor; },
      "Mensaje enviado. El equipo editorial lo hará llegar al autor.",
      function (f) {
        if (!f.elements.nombre.value.trim()) return { texto: "Escribe tu nombre.", campo: f.elements.nombre };
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.elements.correo.value.trim())) return { texto: "Revisa tu correo: parece que no es una dirección válida.", campo: f.elements.correo };
        if (f.elements.mensaje.value.trim().length < 10) return { texto: "Escribe un mensaje de al menos 10 caracteres.", campo: f.elements.mensaje };
        return null;
      });

      pintarLike();
      cargar();
    }

    document.addEventListener("ms:ficha-abierta", function (e) {
      var item = e.detail && e.detail.item;
      if (item) render(item);
    });
    document.addEventListener("ms:ficha-cerrada", function () {
      actual = null;
      cont.innerHTML = "";
    });
  });
})();
