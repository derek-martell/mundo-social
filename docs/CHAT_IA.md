# Chat con IA de SocioBot: paso a paso

SocioBot ya responde sin configurar nada: busca en el catálogo del sitio, en el navegador, sin enviar datos a nadie. Esta guía activa el **nivel 2**: respuestas redactadas por IA (Google Gemini) a través de un servidor intermedio gratuito en Cloudflare. La clave de Gemini nunca va en el sitio.

Cómo funciona: el navegador envía la pregunta al Worker; el Worker descarga el catálogo público, elige las publicaciones relevantes, se las pasa a Gemini con reglas estrictas (solo temas de Mundo Social) y devuelve texto más los id de las publicaciones citadas. Si algo falla, el sitio muestra la respuesta de la búsqueda local.

## 1. Obtener la clave de Gemini

1. Entra a <https://aistudio.google.com> con una cuenta de Google.
2. Pulsa **Get API key** y luego **Create API key**.
3. Copia la clave y guárdala (no la pegues en el repositorio ni en el chat).
4. Plan gratuito: los límites de uso (peticiones por minuto y por día) se ven en AI Studio y pueden cambiar. Importante: en el plan gratuito Google puede usar lo que se envíe para mejorar sus productos. Por eso el Worker solo envía la pregunta y fragmentos de publicaciones ya públicas.

## 2. Crear la cuenta de Cloudflare

1. Regístrate gratis en <https://dash.cloudflare.com/sign-up>.
2. No hace falta añadir dominio ni tarjeta para usar Workers en el plan gratuito.

## 3. Crear el Worker

1. En el panel: **Workers & Pages** > **Create** > **Create Worker**.
2. Nombre sugerido: `mundo-social-chat`. Pulsa **Deploy** (con el código de ejemplo).
3. Pulsa **Edit code**, borra todo y pega el contenido de `scripts/cloudflare_worker_chat.js`.
4. Pulsa **Deploy**.

## 4. Configurar secreto y variables

En el Worker: **Settings** > **Variables and Secrets** > **Add**.

| Nombre | Tipo | Valor |
| --- | --- | --- |
| `GEMINI_API_KEY` | **Secret** | la clave del paso 1 |
| `ALLOWED_ORIGINS` | Text | `https://derek-martell.github.io,http://localhost:8000` (sin barra final; añade tu dominio propio si lo usas) |
| `CATALOG_URL` | Text | `https://derek-martell.github.io/mundo-social/data/articulos.json` |
| `DAILY_CAP` | Text (opcional) | `300` (tope global de preguntas por día) |

Opcional, para que los límites se compartan entre instancias: **Storage & Databases** > **KV** > crear un namespace (por ejemplo `ms-chat-rate`), y en el Worker **Settings** > **Bindings** > **Add** > **KV namespace** con el nombre de variable `RATE_KV`. Sin KV los límites funcionan igual, pero por instancia.

Pulsa **Deploy** de nuevo para aplicar los cambios.

## 5. Conectar el sitio

1. Copia la URL del Worker (algo como `https://mundo-social-chat.TU-USUARIO.workers.dev`).
2. En `js/config.js`, pon esa URL en `chatIaUrl`:

   ```js
   chatIaUrl: "https://mundo-social-chat.TU-USUARIO.workers.dev"
   ```

3. Publica el cambio en GitHub Pages como siempre.

## 6. Probar

1. Abre el sitio, pulsa a SocioBot: debe verse el aviso «Respuestas generadas con IA solo a partir de las publicaciones de Mundo Social.»
2. Pregunta algo del catálogo, por ejemplo «¿Qué dicen las publicaciones sobre política monetaria?». Debe responder en unas 100 palabras y mostrar tarjetas de las fichas citadas.
3. Pregunta algo ajeno («dame una receta de ceviche»): debe responder «Solo puedo ayudarte con preguntas sobre las publicaciones de Mundo Social.»
4. Prueba desde otro origen (por ejemplo `curl -H "Origin: https://ejemplo.com" -X POST URL_DEL_WORKER`): debe devolver 403.
5. Si hay errores, en Cloudflare: Worker > **Logs** (Observability) muestra las peticiones fallidas. Un 502 suele indicar clave de Gemini incorrecta o `CATALOG_URL` inaccesible.

## 7. Apagarlo

Deja `chatIaUrl: ""` en `js/config.js` y publica. SocioBot vuelve a la búsqueda local. Para un corte inmediato, en Cloudflare borra o desactiva el Worker, o revoca la clave en AI Studio.

## 8. Costos y límites

- Cloudflare Workers (plan gratuito): hasta 100 000 peticiones por día; sobra para este uso.
- Gemini (plan gratuito): sin costo, con límites de cuota; si se agotan, el chat cae a la búsqueda local. No actives facturación en AI Studio salvo que lo decidas a propósito.
- El Worker limita cada IP a 20 preguntas cada 10 minutos, 300 caracteres por pregunta y 300 preguntas diarias en total (`DAILY_CAP`).
- Mejora futura: añadir Cloudflare Turnstile para frenar bots.
