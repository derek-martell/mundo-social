# SocioBot — mascota de Mundo Social

Robotito que acompaña la lectura desde la esquina inferior derecha. Usa la paleta del sitio (verde bosque `#0f4c3a`, latón `#c9a24a`, marfil `#fbf9f4`) con colores planos, sin degradados, resplandores ni emojis.

## Archivos

- `mascota.js`: script autónomo. Inyecta la mascota, carga `mascota.css` y gestiona ojos, saludo, globo de diálogo y botón de ocultar.
- `mascota.css`: estilos, animaciones, modo claro/oscuro, móvil y movimiento reducido.
- `demo.html`: página de prueba.

## Uso

Antes de cerrar `</body>`:

```html
<script src="mascota/mascota.js" defer></script>
```

Ya está incluido en `index.html`.

## Comportamiento

- **Ojos que siguen el cursor**, solo con mouse (en táctil se quedan quietos). Tras 40 s sin mover el mouse, entra en reposo.
- **Pulsar la mascota** (clic, Enter o Espacio) muestra un consejo sobre el sitio, con un saltito y ojos felices.
- **Saludo único**: solo en la primera visita del navegador.
- **Ocultar**: el botón aparece al pasar el mouse o con el teclado, y siempre en pantallas táctiles. La elección se recuerda entre páginas y visitas.
- **Por debajo del lector de fichas**: `z-index: 90`, bajo el modal (`1000`).
- **Movimiento reducido**: sin flotación, saltos ni saludo con el brazo.
- **Accesibilidad**: la mascota es un botón con nombre accesible; el globo es decorativo y no se anuncia en lectores de pantalla. `Escape` lo cierra.

## Preferencias guardadas (localStorage)

- `mundo-social-mascota-minimizada`: `"1"` si el lector la ocultó.
- `mundo-social-mascota-saludo`: marca que ya se mostró el saludo inicial.
