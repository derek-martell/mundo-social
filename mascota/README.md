# SocioBot — mascota de Mundo Social

Robotito que acompaña la lectura desde la esquina inferior derecha. Usa la paleta del sitio (verde bosque `#0f4c3a`, latón `#c9a24a`, marfil `#fbf9f4`) con colores planos, sin degradados, resplandores ni emojis.

## Archivos

- `mascota.js`: script autónomo. Inyecta la mascota, carga `mascota.css` y gestiona ojos, saludo, globo de diálogo y botón de ocultar.
- `mascota.css`: estilos, animaciones, modo claro/oscuro, móvil y movimiento reducido.
- `chat.js`: panel de chat (motor de búsqueda local y modo IA opcional). Lo carga `mascota.js`.
- `demo.html`: página de prueba.

Fuera de esta carpeta: `scripts/cloudflare_worker_chat.js` (proxy a Gemini) y `docs/CHAT_IA.md` (activación paso a paso).

## Uso

Antes de cerrar `</body>`:

```html
<script src="mascota/mascota.js" defer></script>
```

Ya está incluido en `index.html`.

## Comportamiento

- **Ojos que siguen el cursor**, solo con mouse (en táctil se quedan quietos). Tras 40 s sin mover el mouse, entra en reposo.
- **Pulsar la mascota** (clic, Enter o Espacio) abre el chat: un panel `role="dialog"` sobre la mascota (hoja inferior en pantallas ≤640px). El foco pasa al campo de texto; `Escape` o el botón de cierre lo cierran y devuelven el foco a la mascota. Si `chat.js` no carga, vuelve el consejo aleatorio de siempre.
- **Chat local (nivel 1)**: sin red. Busca en `ARTICULOS_DATA` por título, etiquetas, autores, categoría y resumen; entiende «lo más reciente», categorías (coyuntura, apuntes/exámenes, análisis, investigación), «cómo enviar» y «qué es Mundo Social». Responde con hasta 4 fichas que abren el lector (`MS.abrirFicha`). En `enviar.html`, donde no hay catálogo, solo orienta y enlaza a `index.html`.
- **Chat con IA (nivel 2)**: solo si `MS_CONFIG.chatIaUrl` tiene una URL `https://`. Envía la pregunta (máx. 300 caracteres) y hasta 6 publicaciones candidatas al Worker; ante cualquier fallo o 10 s sin respuesta, usa la respuesta local con una nota. Ver `docs/CHAT_IA.md`.
- **Saludo único**: solo en la primera visita del navegador.
- **Ocultar**: el botón aparece al pasar el mouse o con el teclado, y siempre en pantallas táctiles. La elección se recuerda entre páginas y visitas.
- **Por debajo del lector de fichas**: `z-index: 90`, bajo el modal (`1000`).
- **Movimiento reducido**: sin flotación, saltos ni saludo con el brazo.
- **Accesibilidad**: la mascota es un botón con nombre accesible; el globo es decorativo y no se anuncia; el registro del chat usa `aria-live="polite"`. API pública intacta: `SocioBot.say/explainError/celebrate/hide` (con el chat abierto, `say` escribe en la conversación).

## Preferencias guardadas (localStorage)

- `mundo-social-mascota-minimizada`: `"1"` si el lector la ocultó.
- `mundo-social-mascota-saludo`: marca que ya se mostró el saludo inicial.
