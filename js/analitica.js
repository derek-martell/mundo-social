/**
 * Analítica respetuosa con la privacidad (Umami Cloud).
 * Sin cookies ni datos personales. El panel vive en Umami; el sitio no muestra nada.
 *
 * Se activa solo si MS_CONFIG.umamiWebsiteId tiene valor.
 * Para excluirte como administrador: abre el sitio con ?no-analitica=1 una vez
 * (guarda la marca en este navegador). Con ?no-analitica=0 se quita.
 */
(function () {
  "use strict";

  var cfg = window.MS_CONFIG || {};
  var CLAVE = "ms-no-analitica";

  function leer() { try { return localStorage.getItem(CLAVE); } catch (e) { return null; } }
  function guardar(v) { try { if (v === null) localStorage.removeItem(CLAVE); else localStorage.setItem(CLAVE, v); } catch (e) {} }

  document.addEventListener("DOMContentLoaded", function () {
    // Interruptor de exclusión por URL
    try {
      var u = new URL(location.href);
      var p = u.searchParams.get("no-analitica");
      if (p === "1") guardar("1");
      else if (p === "0") guardar(null);
    } catch (e) {}

    if (!cfg.umamiWebsiteId) return;
    if (leer() === "1") return;

    var MIN_SEG = 3, MAX_SEG = 1800;
    var cola = [];

    function enviar(nombre, datos) {
      if (window.umami && typeof window.umami.track === "function") {
        try { window.umami.track(nombre, datos); } catch (e) {}
      } else {
        if (cola.length < 100) cola.push([nombre, datos]);
      }
    }
    function vaciarCola() {
      if (!(window.umami && typeof window.umami.track === "function")) return false;
      while (cola.length) { var e = cola.shift(); enviar(e[0], e[1]); }
      return true;
    }

    // Inyectar el script de Umami (auto-track de páginas vistas activo)
    var s = document.createElement("script");
    s.defer = true;
    s.src = cfg.umamiScript || "https://cloud.umami.is/script.js";
    s.setAttribute("data-website-id", cfg.umamiWebsiteId);
    s.onload = function () {
      if (vaciarCola()) return;
      var n = 0, t = setInterval(function () {
        if (vaciarCola() || ++n > 40) clearInterval(t);
      }, 250);
    };
    document.head.appendChild(s);

    var visible = function () { return document.visibilityState !== "hidden"; };
    var ahora = function () { return Date.now(); };

    // Temporizador de tiempo visible
    function Cronometro(meta) { this.meta = meta; this.acum = 0; this.desde = visible() ? ahora() : 0; }
    Cronometro.prototype.pausar = function () { if (this.desde) { this.acum += ahora() - this.desde; this.desde = 0; } };
    Cronometro.prototype.reanudar = function () { if (!this.desde) this.desde = ahora(); };
    Cronometro.prototype.segundos = function () {
      this.pausar();
      return Math.min(MAX_SEG, Math.round(this.acum / 1000));
    };

    var texto = function (v, n) { return String(v == null ? "" : v).slice(0, n || 120); };

    // Artículo abierto
    var art = null;
    function cerrarArticulo() {
      if (!art) return;
      var a = art; art = null;
      var seg = a.cron.segundos();
      if (seg >= MIN_SEG) {
        enviar("tiempo-articulo", { id: a.item.id, titulo: texto(a.item.title), categoria: a.item.category, segundos: seg });
      }
    }

    // Sección activa
    var sec = null;
    function cerrarSeccion(reiniciar) {
      if (!sec) return;
      var seg = sec.cron.segundos();
      if (seg >= MIN_SEG) enviar("tiempo-seccion", { categoria: sec.categoria, segundos: seg });
      if (reiniciar) sec.cron = new Cronometro();
      else sec = null;
    }
    sec = { categoria: "Todos", cron: new Cronometro() };

    document.addEventListener("ms:seccion", function (e) {
      var d = (e && e.detail) || {};
      var cat = d.categoria || "Todos";
      enviar("seccion", { categoria: cat, etiqueta: d.etiqueta || "" });
      if (!sec || sec.categoria !== cat) {
        cerrarSeccion(false);
        sec = { categoria: cat, cron: new Cronometro() };
      }
    });

    document.addEventListener("ms:ficha-abierta", function (e) {
      var item = e && e.detail && e.detail.item;
      if (!item) return;
      cerrarArticulo();
      art = { item: item, cron: new Cronometro() };
      enviar("abrir-articulo", { id: item.id, titulo: texto(item.title), categoria: item.category, tipo: item.type });
    });
    document.addEventListener("ms:ficha-cerrada", cerrarArticulo);

    // Visibilidad: la pestaña oculta o se cierra la página
    function alOcultar() {
      cerrarArticulo();          // el tiempo de un artículo se envía una sola vez
      cerrarSeccion(true);       // la sección continúa con un cronómetro nuevo
      if (sec) sec.cron.pausar();
    }
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") alOcultar();
      else if (sec) sec.cron.reanudar();
    });
    window.addEventListener("pagehide", alOcultar);

    // Clics en PDF / recursos
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a.btn-pdf, #modal-pdf-btn");
      if (!a) return;
      var item = null;
      var cont = a.closest("[data-open-id]");
      if (cont && window.MS && window.MS.datos) {
        var id = cont.getAttribute("data-open-id");
        for (var i = 0; i < window.MS.datos.length; i++) {
          if (String(window.MS.datos[i].id) === String(id)) { item = window.MS.datos[i]; break; }
        }
      }
      if (!item && art) item = art.item;
      enviar("abrir-pdf", { id: item ? item.id : "", titulo: item ? texto(item.title) : texto(a.getAttribute("title")) });
    });

    // Búsqueda (con retardo de 1,5 s)
    var caja = document.getElementById("search-input");
    if (caja) {
      var temp = null, ultimo = "";
      caja.addEventListener("input", function () {
        clearTimeout(temp);
        temp = setTimeout(function () {
          var t = caja.value.toLowerCase().trim().slice(0, 60);
          if (t.length >= 3 && t !== ultimo) { ultimo = t; enviar("busqueda", { termino: t }); }
        }, 1500);
      });
    }
  });
})();
