# Configuración de servicios — paso a paso

Todo el código ya está en el sitio. Cada servicio se activa pegando **un dato** en `js/config.js`. Mientras un valor esté vacío, ese servicio no aparece y el sitio funciona igual que antes.

Orden recomendado (de más fácil a más largo): 1 → 2 → 3 → 4.

---

## 1. Analítica (Umami) — 10 minutos

1. Entra a <https://cloud.umami.is> y crea una cuenta gratuita (plan *Hobby*).
2. Pulsa **Add website** (Agregar sitio):
   - Name: `Mundo Social`
   - Domain: `derek-martell.github.io`
3. Abre el sitio recién creado → **Edit** → copia el **Website ID** (algo como `1a2b3c4d-...`).
4. **Pásame ese Website ID** (o pégalo tú en `js/config.js`, en `umamiWebsiteId`).
5. Para que tus propias visitas no cuenten: abre una vez el sitio con `?no-analitica=1` al final de la dirección, en cada navegador que uses. (Para volver a contarte: `?no-analitica=0`.)

Qué verás en Umami: visitas, secciones más filtradas (`seccion`, `tiempo-seccion`), artículos más abiertos (`abrir-articulo`), tiempo por artículo (`tiempo-articulo`, en segundos), descargas de PDF (`abrir-pdf`) y búsquedas (`busqueda`). Están en **Events**.

---

## 2. Suscripción por correo (Buttondown) — 10 minutos

1. Entra a <https://buttondown.com> y crea una cuenta gratuita (hasta 100 suscriptores).
2. Elige tu **nombre de usuario** (aparece en tu enlace, por ejemplo `buttondown.com/mundosocial`).
3. En **Settings**, confirma que la **doble confirmación** (*double opt-in*) esté activada.
4. **Pásame tu nombre de usuario** (o pégalo en `buttondownUsuario` de `js/config.js`).
5. Cada vez que publiquen un artículo: en Buttondown → **New email** → título y enlace al artículo (usa la dirección `.../mundo-social/a/<número>/`, que muestra vista previa) → **Send**.

Cuando superen 100 suscriptores, me avisan y lo pasamos a Brevo (también gratis).

---

## 3. Me gusta, comentarios y "Escribir al autor" (Google Apps Script) — 20 minutos

Guía detallada: [`docs/INTERACCIONES.md`](INTERACCIONES.md). Resumen:

1. Crea una **Google Sheet** nueva (por ejemplo "Mundo Social — Interacciones") con tu cuenta de Gmail.
2. En la hoja: **Extensiones → Apps Script**. Borra lo que haya y pega todo el contenido de `scripts/apps_script_interacciones.js`. Guarda.
3. Arriba, elige la función **`setup`** y pulsa **Ejecutar**. Acepta los permisos (Google avisará que la app no está verificada: *Configuración avanzada → Ir a … (no seguro)*; es tu propio script).
4. **Implementar → Nueva implementación → Aplicación web**:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier persona**
5. Copia la URL que termina en **`/exec`** y **pásamela** (va en `interaccionesUrl`).
6. Moderación: cada comentario nuevo te llega por correo con botones **Aprobar / Rechazar** (abren una página de confirmación). Los mensajes para autores te llegan con "Responder a" el lector, para que los reenvíes al autor.

---

## 4. SocioBot con IA (Gemini + Cloudflare) — 30 minutos

Sin este paso, SocioBot ya funciona como buscador conversacional (sin IA). Guía detallada: [`docs/CHAT_IA.md`](CHAT_IA.md). Resumen:

1. Crea una clave gratuita en **Google AI Studio** (<https://aistudio.google.com/apikey>). Nota: en el plan gratuito, Google puede usar las preguntas para mejorar sus productos.
2. Crea una cuenta gratuita en **Cloudflare** (<https://dash.cloudflare.com>).
3. **Workers & Pages → Create → Create Worker**, ponle nombre (`sociobot`), **Deploy**, luego **Edit code**: pega todo `scripts/cloudflare_worker_chat.js` y **Deploy**.
4. En el Worker → **Settings → Variables and Secrets**:
   - Secreto `GEMINI_API_KEY` = tu clave de AI Studio.
   - `ALLOWED_ORIGINS` = `https://derek-martell.github.io,http://localhost:8000`
   - `CATALOG_URL` = `https://derek-martell.github.io/mundo-social/data/articulos.json`
   - `DAILY_CAP` = `300`
5. Copia la dirección del Worker (`https://sociobot.<tu-usuario>.workers.dev`) y **pásamela** (va en `chatIaUrl`).

La IA solo recibe las publicaciones del sitio como contexto, rechaza preguntas ajenas a Mundo Social y tiene límites por persona y por día.

---

## Qué necesito de ti (lista corta)

| Servicio | Dato que me pasas |
|---|---|
| Analítica | Website ID de Umami |
| Suscripción | Usuario de Buttondown |
| Interacciones | URL `/exec` del Apps Script |
| Chat con IA | URL `workers.dev` del Worker |

Ninguno de estos datos es secreto (son públicos al usarse en la web). **Nunca me pases ni pegues en el sitio la clave de Gemini**: esa va solo en Cloudflare.
