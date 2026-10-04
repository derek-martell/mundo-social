/**
 * SocioBot: panel de chat.
 *
 * Nivel 1 (siempre): buscador conversacional local sobre ARTICULOS_DATA, sin red.
 * Nivel 2 (solo si MS_CONFIG.chatIaUrl tiene valor): respuesta redactada por IA
 * a través del Worker de Cloudflare (scripts/cloudflare_worker_chat.js), con
 * respaldo silencioso al nivel 1 ante cualquier fallo.
 *
 * Lo carga mascota.js. Expone window.SocioBotChat.crear({ container, stage }).
 */
(function () {
  'use strict';

  var MAX_PREGUNTA = 300;
  var MAX_TURNOS = 4;
  var TIMEOUT_IA_MS = 10000;
  var MAX_TARJETAS = 4;

  var SALUDO = 'Hola, soy SocioBot. Pregúntame por temas, autores o cursos de Mundo Social.';

  // ---------- Utilidades de texto ----------

  function norm(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  var STOP = new Set((
    'a al algo algun alguna algunas alguno algunos ante antes aqui asi aun aunque bajo bien cada casi como con contra ' +
    'cual cuales cuando cuanto de del desde donde dos e el ella ellas ello ellos en entre era eran es esa esas ese eso ' +
    'esos esta estaba estan estar este esto estos fue fueron ha hay hacia han hasta la las le les lo los mas me mi mis ' +
    'mucho muy nada ni no nos nosotros o os otra otras otro otros para pero poco por porque pues que quien quienes se ' +
    'sea segun ser si sin sobre solo son su sus tambien tan tanto te tiene tienen tengo todo todos tu tus un una unas ' +
    'uno unos usted va vamos van y ya yo hola quiero quisiera necesito busco buscar buscando dime muestrame mostrar ' +
    'ver dame tienes tienen existe existen favor puedes puedo podria publicaciones publicacion articulos articulo ' +
    'material sobre acerca tema temas informacion info'
  ).split(' '));

  function tokens(s) {
    var out = [];
    norm(s).split(' ').forEach(function (t) {
      if (t.length >= 2 && !STOP.has(t)) out.push(t);
    });
    return out;
  }

  function stem(t) {
    if (t.length > 5 && /es$/.test(t)) return t.slice(0, -2);
    if (t.length > 3 && /s$/.test(t)) return t.slice(0, -1);
    return t;
  }

  // Coincidencia de palabras: igualdad de raíz o prefijo común largo
  function coincide(a, b) {
    if (a === b) return true;
    var sa = stem(a), sb = stem(b);
    if (sa === sb) return true;
    if (sa.length >= 5 && sb.length >= 5 && (sa.indexOf(sb) === 0 || sb.indexOf(sa) === 0)) return true;
    return false;
  }

  function tieneToken(lista, t) {
    for (var i = 0; i < lista.length; i++) if (coincide(lista[i], t)) return true;
    return false;
  }

  // ---------- Datos ----------

  function obtenerDatos() {
    if (window.MS && Array.isArray(window.MS.datos) && window.MS.datos.length) return window.MS.datos;
    try {
      if (typeof ARTICULOS_DATA !== 'undefined' && Array.isArray(ARTICULOS_DATA)) return ARTICULOS_DATA;
    } catch (e) { /* sin catálogo */ }
    return [];
  }

  var indice = null;
  var indiceSobre = null;

  function construirIndice(datos) {
    if (indice && indiceSobre === datos) return indice;
    indiceSobre = datos;
    indice = datos.map(function (it) {
      var autores = (it.authors || []).join(' ');
      return {
        item: it,
        titulo: tokens(it.title),
        tags: tokens((it.tags || []).join(' ')),
        autores: tokens(autores),
        autoresNorm: norm(autores),
        cat: tokens((it.category || '') + ' ' + (it.type || '')),
        categoria: norm(it.category),
        resumen: tokens(it.resumen)
      };
    });
    return indice;
  }

  // Palabras que equivalen a una categoría del catálogo
  var SINONIMOS_CAT = {
    coyuntura: 'coyuntura', noticia: 'coyuntura', noticias: 'coyuntura', nota: 'coyuntura', notas: 'coyuntura',
    docencia: 'docencia', apunte: 'docencia', apuntes: 'docencia', examen: 'docencia', examenes: 'docencia',
    curso: 'docencia', cursos: 'docencia', clase: 'docencia', clases: 'docencia', guia: 'docencia', guias: 'docencia',
    analisis: 'analisis', columna: 'analisis', columnas: 'analisis', opinion: 'analisis', ensayo: 'analisis', ensayos: 'analisis',
    investigacion: 'investigacion', paper: 'investigacion', papers: 'investigacion', tesis: 'investigacion',
    investigaciones: 'investigacion'
  };

  var NOMBRE_CAT = {
    coyuntura: 'notas de coyuntura',
    docencia: 'material de docencia (apuntes, guías y exámenes)',
    analisis: 'análisis y columnas',
    investigacion: 'trabajos de investigación'
  };

  // ---------- Tolerancia a errores de escritura ----------

  var MAX_TOKENS_CONSULTA = 6;
  var F_PREFIJO = 0.8;     // peso relativo de una coincidencia por prefijo
  var F_CORREGIDO = 0.7;   // peso relativo de una palabra corregida

  // Palabras de intención (reciente, categorías, envío) que también se corrigen
  var EXTRA_VOCAB = (
    'reciente recientes ultimo ultimos ultima ultimas nuevo nuevos nueva nuevas novedad novedades actual actuales ' +
    'semana publicado publicados publicada publicadas enviar envio mandar subir publicar postular colaborar contribuir'
  ).split(' ');

  var vocab = null;
  var vocabSobre = null;

  // Vocabulario del catálogo: token -> { df: documentos, w: mayor peso de campo }
  function construirVocab(datos) {
    if (vocab && vocabSobre === datos) return vocab;
    var idx = construirIndice(datos);
    var mapa = Object.create(null);
    function sumar(t, w, doc) {
      if (t.length < 3 || STOP.has(t)) return;
      var v = mapa[t];
      if (!v) v = mapa[t] = { df: 0, w: 0, ult: -1 };
      if (v.ult !== doc) { v.df++; v.ult = doc; }
      if (w > v.w) v.w = w;
    }
    idx.forEach(function (e, i) {
      e.titulo.forEach(function (t) { sumar(t, 3, i); });
      e.autores.forEach(function (t) { sumar(t, 3, i); });
      e.tags.forEach(function (t) { sumar(t, 2.5, i); });
      e.cat.forEach(function (t) { sumar(t, 2, i); });
      e.resumen.forEach(function (t) { sumar(t, 1, i); });
    });
    var extra = EXTRA_VOCAB.concat(Object.keys(SINONIMOS_CAT));
    extra.forEach(function (t) {
      if (!mapa[t]) mapa[t] = { df: 0, w: 0.5, ult: -1 };
    });
    var claves = Object.keys(mapa);
    var stems = Object.create(null);
    claves.forEach(function (t) { stems[stem(t)] = true; });
    vocabSobre = datos;
    vocab = { mapa: mapa, claves: claves, stems: stems };
    return vocab;
  }

  // Distancia Damerau-Levenshtein (alineación óptima de cadenas, con transposiciones).
  // Devuelve max + 1 si la distancia supera max (salida anticipada).
  function distancia(a, b, max) {
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > max) return max + 1;
    var prev2 = null, prev = [], cur, i, j, min, minPrev = 0;
    for (j = 0; j <= lb; j++) prev[j] = j;
    for (i = 1; i <= la; i++) {
      cur = [i];
      min = i;
      for (j = 1; j <= lb; j++) {
        var c = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        var v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + c);
        if (i > 1 && j > 1 && a.charAt(i - 1) === b.charAt(j - 2) && a.charAt(i - 2) === b.charAt(j - 1)) {
          v = Math.min(v, prev2[j - 2] + 1);
        }
        cur[j] = v;
        if (v < min) min = v;
      }
      if (min > max && minPrev > max) return max + 1;
      minPrev = min;
      prev2 = prev;
      prev = cur;
    }
    return prev[lb];
  }

  function umbralTipografico(len) {
    if (len <= 4) return 0;
    return len <= 7 ? 1 : 2;
  }

  // Palabra del vocabulario más cercana: menor distancia, luego más documentos, luego mayor peso
  function cercano(v, t, max) {
    var mejor = null, dMejor = max + 1;
    for (var i = 0; i < v.claves.length; i++) {
      var c = v.claves[i];
      if (c === t || Math.abs(c.length - t.length) > max) continue;
      var d = distancia(t, c, max);
      if (d > max) continue;
      var m = v.mapa[c];
      if (!mejor || d < dMejor || (d === dMejor && (m.df > mejor.m.df || (m.df === mejor.m.df && m.w > mejor.m.w)))) {
        mejor = { t: c, m: m };
        dMejor = d;
      }
    }
    return mejor ? { t: mejor.t, d: dMejor } : null;
  }

  // Palabra del vocabulario que empieza por t (la de más documentos)
  function conPrefijo(v, t) {
    var mejor = null;
    for (var i = 0; i < v.claves.length; i++) {
      var c = v.claves[i];
      if (c.length <= t.length || c.indexOf(t) !== 0) continue;
      var m = v.mapa[c];
      if (!mejor || m.df > mejor.m.df || (m.df === mejor.m.df && m.w > mejor.m.w)) mejor = { t: c, m: m };
    }
    return mejor ? mejor.t : null;
  }

  // Analiza la pregunta: { tokens:[{t,f}], correcciones:[{de,a}], pendientes:[tokens desconocidos sin corregir] }
  function prepararConsulta(pregunta) {
    var crudos = tokens(pregunta).slice(0, MAX_TOKENS_CONSULTA);
    var r = { tokens: [], correcciones: [], pendientes: [] };
    var datos = obtenerDatos();
    if (!datos.length) {
      crudos.forEach(function (t) { r.tokens.push({ t: t, f: 1 }); });
      return r;
    }
    var v = construirVocab(datos);
    crudos.forEach(function (t) {
      if (/\d/.test(t) || v.mapa[t] || v.stems[stem(t)]) {
        r.tokens.push({ t: t, f: 1 });
        return;
      }
      if (t.length >= 4) {
        var pref = conPrefijo(v, t);
        if (pref) { r.tokens.push({ t: pref, f: F_PREFIJO }); return; }
      }
      var max = umbralTipografico(t.length);
      var c = max ? cercano(v, t, max) : null;
      if (c) {
        r.tokens.push({ t: c.t, f: F_CORREGIDO });
        r.correcciones.push({ de: t, a: c.t });
      } else {
        r.tokens.push({ t: t, f: 1 });
        r.pendientes.push(t);
      }
    });
    return r;
  }

  // "¿Quisiste decir…?": palabra cercana (hasta distancia 3) a la palabra desconocida más larga
  function sugerir(consulta, pregunta) {
    var datos = obtenerDatos();
    if (!datos.length || !consulta.pendientes.length) return null;
    var largo = consulta.pendientes.slice().sort(function (a, b) { return b.length - a.length; })[0];
    if (largo.length < 4) return null;
    var max = Math.min(3, Math.floor(largo.length / 2));
    var c = cercano(construirVocab(datos), largo, max);
    if (!c) return null;
    var nueva = norm(pregunta).split(' ').map(function (w) { return w === largo ? c.t : w; }).join(' ');
    return { palabra: c.t, consulta: nueva };
  }

  function puntuar(entrada, qTokens) {
    var s = 0;
    qTokens.forEach(function (q) {
      var t = q.t, f = q.f;
      if (tieneToken(entrada.titulo, t)) s += 3 * f;
      if (tieneToken(entrada.tags, t)) s += 2.5 * f;
      if (tieneToken(entrada.autores, t)) s += 3 * f;
      if (tieneToken(entrada.cat, t)) s += 2 * f;
      if (tieneToken(entrada.resumen, t)) s += 1 * f;
    });
    return s;
  }

  function buscar(datos, pregunta, limite) {
    return buscarTokens(datos, prepararConsulta(pregunta).tokens, limite);
  }

  function buscarTokens(datos, q, limite) {
    var idx = construirIndice(datos);
    if (!q.length) return [];
    var res = [];
    idx.forEach(function (e) {
      var p = puntuar(e, q);
      if (p > 0) res.push({ item: e.item, score: p });
    });
    res.sort(function (a, b) {
      return b.score - a.score || String(b.item.date).localeCompare(String(a.item.date));
    });
    // Descarta coincidencias muy débiles frente a la mejor (solo ruido en el resumen)
    if (res.length) {
      var tope = res[0].score;
      res = res.filter(function (r) { return r.score >= Math.max(0.5, tope * 0.3); });
    }
    return res.slice(0, limite).map(function (r) { return r.item; });
  }

  function masRecientes(datos, n, categoria) {
    var lista = datos.slice();
    if (categoria) {
      lista = lista.filter(function (it) { return norm(it.category) === categoria; });
    }
    lista.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    return lista.slice(0, n);
  }

  function fechaLegible(it) {
    try {
      if (window.MS && typeof window.MS.fecha === 'function') return window.MS.fecha(it);
    } catch (e) { /* usa el formato propio */ }
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(it.date || '');
    if (!m) return '';
    var meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return parseInt(m[3], 10) + ' ' + meses[parseInt(m[2], 10) - 1] + ' ' + m[1];
  }

  // ---------- Motor de respuesta local ----------

  // Devuelve { texto, items:[], enlaces:[{href,texto}], sugerencia? }
  // Si hubo palabras corregidas, antepone una nota breve al texto.
  function responderLocal(pregunta, previa) {
    var consulta = prepararConsulta(pregunta);
    var r = responderNucleo(pregunta, previa, consulta);
    if (consulta.correcciones.length && r.items && r.items.length) {
      var buscado = consulta.tokens.map(function (x) { return x.t; }).join(' ');
      var corregidas = consulta.correcciones.map(function (c) { return '«' + c.de + '»'; }).join(', ');
      r.texto = 'Busqué «' + buscado + '» (corregí ' + corregidas + '). ' + r.texto;
    }
    return r;
  }

  function responderNucleo(pregunta, previa, consulta) {
    var datos = obtenerDatos();
    var n = norm(pregunta);
    var q = consulta.tokens.map(function (x) { return x.t; });
    var enlaces = [];

    // Texto normalizado con las palabras corregidas, para detectar la intención
    var corr = Object.create(null);
    consulta.correcciones.forEach(function (c) { corr[c.de] = c.a; });
    n = n.split(' ').map(function (w) { return corr[w] || w; }).join(' ');

    if (/\b(enviar|envio|mandar|subir|publicar|postular|colaborar|contribuir|escribir para)\b/.test(n) &&
        /\b(publicacion|articulo|nota|trabajo|texto|escrito|paper|apunte|publicar|enviar|colaborar|contribuir|mandar|subir)\b/.test(n)) {
      return {
        texto: 'Puedes proponer una publicación desde el formulario de envío. Allí se indican los datos del autor y se adjunta el PDF.',
        items: [], enlaces: [{ href: 'enviar.html', texto: 'Ir a «Enviar publicación»' }]
      };
    }

    if (/\b(que es|quienes son|quien es|quienes somos|de que trata|sobre ustedes|acerca de)\b/.test(n) && /\b(mundo social|ustedes|sociobot|esta web|este sitio|la revista|el sitio)\b/.test(n)) {
      if (/\bsociobot\b/.test(n)) {
        return { texto: 'Soy SocioBot, la mascota de Mundo Social. Te ayudo a encontrar publicaciones del catálogo; no sustituyo la lectura de los textos.', items: [], enlaces: [] };
      }
      return {
        texto: 'Mundo Social es una iniciativa independiente, fundada por estudiantes de economía, que reúne notas de coyuntura, análisis, apuntes de docencia y trabajos de investigación en acceso abierto. No cuenta con respaldo institucional.',
        items: [], enlaces: []
      };
    }

    if (!datos.length) {
      return {
        texto: 'En esta página no tengo el catálogo a mano. Puedes buscar publicaciones en la página principal.',
        items: [], enlaces: [{ href: 'index.html', texto: 'Ir al catálogo' }]
      };
    }

    // Categoría pedida de forma explícita
    var cat = null;
    q.forEach(function (t) { if (!cat && SINONIMOS_CAT[t]) cat = SINONIMOS_CAT[t]; });

    var reciente = /\b(reciente|recientes|ultimo|ultimos|ultima|ultimas|nuevo|nuevos|nueva|nuevas|novedad|novedades|actual|actuales|hoy|esta semana|este mes)\b/.test(n);
    var sinTema = q.filter(function (t) {
      return !SINONIMOS_CAT[t] && !/^(reciente|recientes|ultimo|ultimos|ultima|ultimas|nuevo|nuevos|nueva|nuevas|novedad|novedades|actual|actuales|hoy|semana|mes|publicado|publicados|publicada|publicadas)$/.test(t);
    });

    if (reciente && !sinTema.length) {
      var rec = masRecientes(datos, MAX_TARJETAS, cat);
      return { texto: 'Lo más reciente' + (cat ? ' en ' + NOMBRE_CAT[cat] : '') + ':', items: rec, enlaces: [] };
    }

    if (cat && !sinTema.length) {
      var porCat = masRecientes(datos, MAX_TARJETAS, cat);
      return { texto: 'Esto es lo más reciente en ' + NOMBRE_CAT[cat] + ':', items: porCat, enlaces: [] };
    }

    var encontrados = buscarTokens(datos, consulta.tokens, 40);
    if (cat) {
      var filtrados = encontrados.filter(function (it) { return norm(it.category) === cat; });
      if (filtrados.length) encontrados = filtrados;
    }
    if (reciente) {
      encontrados = encontrados.slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    }

    // Pregunta de seguimiento muy corta: se apoya en la anterior, pero solo si
    // sus palabras existen en el catálogo (una palabra desconocida no hereda
    // los resultados de la pregunta previa)
    if (!encontrados.length && previa && q.length < 3 && !consulta.pendientes.length) {
      encontrados = buscar(datos, pregunta + ' ' + previa, 40);
    }

    if (!encontrados.length) {
      return {
        texto: 'No encontré publicaciones que coincidan con eso. Prueba con otra frase o una palabra clave (por ejemplo un tema o el apellido de un autor), o usa el buscador de la página.',
        items: [], enlaces: [], sugerencia: sugerir(consulta, pregunta)
      };
    }

    var top = encontrados.slice(0, MAX_TARJETAS);
    var texto;
    if (encontrados.length === 1) texto = 'Encontré una publicación que puede servirte:';
    else if (encontrados.length > MAX_TARJETAS) texto = 'Encontré ' + encontrados.length + ' publicaciones; estas son las más cercanas:';
    else texto = 'Encontré ' + encontrados.length + ' publicaciones relacionadas:';
    return { texto: texto, items: top, enlaces: [] };
  }

  // ---------- Modo IA (opcional) ----------

  function urlIa() {
    var c = window.MS_CONFIG;
    var u = c && typeof c.chatIaUrl === 'string' ? c.chatIaUrl.trim() : '';
    return /^https:\/\//i.test(u) ? u : '';
  }

  function contextoPara(items) {
    return items.map(function (it) {
      var r = String(it.resumen || '');
      if (r.length > 600) r = r.slice(0, 600) + '…';
      return {
        id: it.id, title: it.title, type: it.type, category: it.category, date: it.date,
        authors: it.authors || [], tags: it.tags || [], resumen: r
      };
    });
  }

  function preguntarIa(url, pregunta, datos) {
    var cand = buscar(datos, pregunta, 6);
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, TIMEOUT_IA_MS);
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ pregunta: pregunta, contexto: contextoPara(cand) }),
      signal: ctrl.signal,
      credentials: 'omit'
    }).then(function (r) {
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    }).then(function (j) {
      clearTimeout(timer);
      if (!j || typeof j.respuesta !== 'string' || !j.respuesta.trim()) throw new Error('vacía');
      var porId = {};
      datos.forEach(function (it) { porId[it.id] = it; });
      var items = [];
      (Array.isArray(j.ids) ? j.ids : []).forEach(function (id) {
        var it = porId[id];
        if (it && items.indexOf(it) === -1 && items.length < MAX_TARJETAS) items.push(it);
      });
      return { texto: j.respuesta.trim().slice(0, 1500), items: items, enlaces: [], ia: true };
    }).catch(function (e) {
      clearTimeout(timer);
      throw e;
    });
  }

  // ---------- Interfaz ----------

  var ICON_CERRAR = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>';
  var ICON_ENVIAR = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>';

  function crear(opts) {
    var container = opts.container;
    var stage = opts.stage;
    var alCerrar = opts.alCerrar || function () {};
    var modoIa = !!urlIa();
    var abierto = false;
    var ocupado = false;
    var historial = [];
    var iniciado = false;

    var panel = document.createElement('section');
    panel.id = 'sociobot-chat';
    panel.className = 'sociobot-chat';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Chat con SocioBot');
    panel.hidden = true;
    panel.innerHTML =
      '<header class="sb-chat-head">' +
        '<h2 class="sb-chat-title">SocioBot</h2>' +
        '<button type="button" class="sb-chat-cerrar" aria-label="Cerrar el chat">' + ICON_CERRAR + '</button>' +
      '</header>' +
      '<div class="sb-chat-log" role="log" aria-live="polite" aria-relevant="additions" tabindex="0" aria-label="Conversación"></div>' +
      '<div class="sb-chat-chips" aria-label="Preguntas sugeridas"></div>' +
      '<form class="sb-chat-form" autocomplete="off">' +
        '<label class="sb-chat-label" for="sb-chat-input">Tu pregunta</label>' +
        '<input id="sb-chat-input" class="sb-chat-input" type="text" maxlength="' + MAX_PREGUNTA + '" placeholder="Escribe tu pregunta" enterkeyhint="send">' +
        '<button type="submit" class="sb-chat-enviar" aria-label="Enviar pregunta">' + ICON_ENVIAR + '</button>' +
      '</form>' +
      '<p class="sb-chat-nota">' + (modoIa
        ? 'Respuestas generadas con IA solo a partir de las publicaciones de Mundo Social.'
        : 'Busca en el catálogo de Mundo Social; no genera texto con IA.') + '</p>';
    container.appendChild(panel);

    var log = panel.querySelector('.sb-chat-log');
    var chips = panel.querySelector('.sb-chat-chips');
    var form = panel.querySelector('.sb-chat-form');
    var input = panel.querySelector('.sb-chat-input');
    var btnEnviar = panel.querySelector('.sb-chat-enviar');
    var btnCerrar = panel.querySelector('.sb-chat-cerrar');

    function bajar() { log.scrollTop = log.scrollHeight; }

    function mensaje(rol, texto) {
      var p = document.createElement('div');
      p.className = 'sb-msg sb-msg-' + rol;
      var t = document.createElement('p');
      t.className = 'sb-msg-texto';
      t.textContent = texto;
      p.appendChild(t);
      log.appendChild(p);
      bajar();
      return p;
    }

    function abrirItem(it) {
      cerrar(false);
      if (window.MS && typeof window.MS.abrirFicha === 'function') {
        window.MS.abrirFicha(it.id);
      } else if (it.url_original || it.pdf) {
        window.open(it.url_original || it.pdf, '_blank', 'noopener');
      }
    }

    function tarjeta(it) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'sb-card';
      var t = document.createElement('span');
      t.className = 'sb-card-titulo';
      t.textContent = String(it.title || '').replace(/\s*›\s*$/, '');
      var m = document.createElement('span');
      m.className = 'sb-card-meta';
      m.textContent = [it.type, fechaLegible(it)].filter(Boolean).join(' · ');
      b.appendChild(t);
      b.appendChild(m);
      if (it.authors && it.authors.length) {
        var a = document.createElement('span');
        a.className = 'sb-card-autores';
        a.textContent = it.authors.join(', ');
        b.appendChild(a);
      }
      b.addEventListener('click', function () { abrirItem(it); });
      return b;
    }

    function mostrarRespuesta(r, nota) {
      var cont = mensaje('bot', r.texto);
      if (nota) {
        var n = document.createElement('p');
        n.className = 'sb-msg-nota';
        n.textContent = nota;
        cont.appendChild(n);
      }
      if (r.items && r.items.length) {
        var lista = document.createElement('div');
        lista.className = 'sb-cards';
        r.items.slice(0, MAX_TARJETAS).forEach(function (it) { lista.appendChild(tarjeta(it)); });
        cont.appendChild(lista);
      }
      (r.enlaces || []).forEach(function (l) {
        var a = document.createElement('a');
        a.className = 'sb-enlace';
        a.href = l.href;
        a.textContent = l.texto;
        cont.appendChild(a);
      });
      quitarSugerencia();
      if (r.sugerencia) {
        var chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'sb-chip sb-chip-sugerencia';
        chip.textContent = '¿Quisiste decir «' + r.sugerencia.palabra + '»?';
        chip.addEventListener('click', function () { preguntar(r.sugerencia.consulta); });
        chips.insertBefore(chip, chips.firstChild);
      }
      bajar();
    }

    function quitarSugerencia() {
      var viejo = chips.querySelector('.sb-chip-sugerencia');
      if (viejo) viejo.remove();
    }

    function fijarOcupado(v) {
      ocupado = v;
      btnEnviar.disabled = v;
      panel.setAttribute('aria-busy', v ? 'true' : 'false');
    }

    function preguntar(texto) {
      texto = String(texto || '').replace(/\s+/g, ' ').trim().slice(0, MAX_PREGUNTA);
      if (!texto || ocupado) return;
      mensaje('usuario', texto);
      quitarSugerencia();
      input.value = '';
      var previa = historial.length ? historial[historial.length - 1].q : '';
      var local = responderLocal(texto, previa);
      var datos = obtenerDatos();

      function registrar(r) {
        historial.push({ q: texto, a: r.texto });
        if (historial.length > MAX_TURNOS) historial.shift();
      }

      if (!modoIa || !datos.length || local.enlaces.length || /^(que es|quienes)/.test(norm(texto))) {
        mostrarRespuesta(local);
        registrar(local);
        return;
      }

      fijarOcupado(true);
      var esperando = mensaje('bot', 'Consultando las publicaciones…');
      esperando.classList.add('sb-msg-espera');
      preguntarIa(urlIa(), texto, datos).then(function (r) {
        esperando.remove();
        mostrarRespuesta(r);
        registrar(r);
      }).catch(function () {
        esperando.remove();
        mostrarRespuesta(local, 'Respuesta de la búsqueda local: el asistente con IA no está disponible ahora.');
        registrar(local);
      }).then(function () {
        fijarOcupado(false);
        if (abierto) input.focus({ preventScroll: true });
      });
    }

    function iniciar() {
      if (iniciado) return;
      iniciado = true;
      mensaje('bot', SALUDO);
      var hayDatos = obtenerDatos().length > 0;
      var sugerencias = hayDatos
        ? ['¿Qué hay sobre minería?', 'Apuntes de econometría', 'Lo más reciente']
        : ['¿Cómo envío una publicación?', '¿Qué es Mundo Social?', 'Ir al catálogo'];
      sugerencias.forEach(function (s) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'sb-chip';
        b.textContent = s;
        b.addEventListener('click', function () {
          if (s === 'Ir al catálogo') { window.location.href = 'index.html'; return; }
          preguntar(s);
        });
        chips.appendChild(b);
      });
    }

    function abrir() {
      if (abierto) return;
      iniciar();
      abierto = true;
      panel.hidden = false;
      stage.setAttribute('aria-expanded', 'true');
      container.classList.add('chat-abierto');
      input.focus({ preventScroll: true });
      bajar();
    }

    function cerrar(devolverFoco) {
      if (!abierto) return;
      abierto = false;
      panel.hidden = true;
      stage.setAttribute('aria-expanded', 'false');
      container.classList.remove('chat-abierto');
      alCerrar();
      if (devolverFoco !== false) stage.focus({ preventScroll: true });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      preguntar(input.value);
    });
    btnCerrar.addEventListener('click', function () { cerrar(true); });
    panel.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.stopPropagation(); cerrar(true); }
    });

    return {
      abrir: abrir,
      cerrar: cerrar,
      alternar: function () { if (abierto) cerrar(true); else abrir(); },
      abierto: function () { return abierto; },
      nota: function (texto) { iniciar(); mensaje('bot', texto); }
    };
  }

  window.SocioBotChat = {
    crear: crear,
    // Expuesto para pruebas
    _responderLocal: responderLocal
  };
})();
