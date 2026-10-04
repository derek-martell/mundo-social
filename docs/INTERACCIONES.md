# Me gusta, comentarios y "Escribir al autor"

Este módulo guarda todo en una hoja de cálculo de Google y usa un Apps Script gratuito como servidor. Mientras `interaccionesUrl` esté vacío en `js/config.js`, el sitio no muestra nada de esto.

## Paso a paso

1. Entra a <https://sheets.google.com> con la cuenta editorial y crea una hoja en blanco. Ponle el nombre "Mundo Social - Interacciones".
2. En la hoja, abre **Extensiones > Apps Script**.
3. Borra el código de ejemplo y pega todo el contenido de `scripts/apps_script_interacciones.js`. Si quieres que los avisos lleguen a otro correo, edita `EDITORES` al inicio.
4. Guarda (icono del disquete). En la barra superior elige la función **setup** y pulsa **Ejecutar**.
5. Google pedirá permisos (hojas de cálculo, enviar correos, servicio externo). Pulsa **Revisar permisos**, elige tu cuenta, **Configuración avanzada > Ir a (proyecto) (no seguro)** y **Permitir**. Es normal: el script es tuyo.
6. Al terminar, la hoja tendrá las pestañas `likes`, `comentarios` y `mensajes`.
7. Pulsa **Implementar > Nueva implementación**. Tipo: **Aplicación web**. Ejecutar como: **Yo**. Quién tiene acceso: **Cualquier persona**. Pulsa **Implementar**.
8. Copia la **URL de la aplicación web** (termina en `/exec`).
9. Pégala en `js/config.js`: `interaccionesUrl: "https://script.google.com/macros/s/.../exec"`. Sube el cambio al repositorio.
10. Abre una ficha en el sitio: deberías ver "Participa" con el botón Me gusta y el formulario de comentarios.

**Importante:** cada vez que cambies el código del Apps Script debes ir a **Implementar > Administrar implementaciones > editar > Nueva versión > Implementar**. La URL no cambia.

## Cómo moderar comentarios

Cada comentario nuevo queda como `pendiente` y te llega un correo con el texto y dos enlaces:

- **Aprobar** o **Rechazar**: el enlace abre una página de confirmación con el texto del comentario; la decisión solo se aplica cuando pulsas el botón de esa página (así los escáneres de correo no moderan solos). Los enlaces están firmados con un secreto guardado en las propiedades del script.
- O bien abre la hoja `comentarios` y cambia la columna `estado` a `aprobado` o `rechazado`.

Los comentarios aprobados aparecen en la ficha en menos de un minuto (caché de 60 s). Para quitar uno ya publicado, cámbialo a `rechazado`.

Opcional: para que un cambio manual en la hoja se vea al instante, en Apps Script abre **Activadores > Añadir activador**, función `alEditar`, evento "Desde la hoja de cálculo > Al editar".

## Mensajes al autor

Llegan a `EDITORES` con el título, los autores y el ID del artículo. El campo "Responder a" es el correo del lector: responde o reenvía el correo al autor. También quedan registrados en la hoja `mensajes`.

## Límites (cuenta Gmail gratuita)

- 100 destinatarios de correo por día: cada comentario o mensaje usa 1 por editor. Con un solo editor son unos 100 envíos al día; el sistema limita a 3 envíos por hora por navegador.
- 30 ejecuciones simultáneas: sobra para este tráfico. Los me gusta se serializan con un bloqueo.
- Los me gusta se deduplican por navegador durante 24 horas; no se guarda nada personal (solo un hash corto del identificador anónimo en los comentarios, para detectar abuso).
- Si se llega al límite de correos, los comentarios igual se guardan en la hoja; solo falta el aviso.
