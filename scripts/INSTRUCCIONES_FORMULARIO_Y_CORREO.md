# Automatización Editorial de Mundo Social (Guía Simplificada)

Ya dejé **todo preconfigurado y programado** para ti:
- Tu token de GitHub ya está enlazado.
- Ya no necesitas configurar GitHub Actions ni permisos complejos.
- El formulario web ya está creado y en línea en [`enviar.html`](file:///C:/mundo-social/enviar.html).
- Tus 96 artículos actuales están blindados y protegidos.

---

## ⚡ El único paso que falta (Toma 2 minutos):

Por motivos de privacidad y seguridad, **Google no permite que ninguna IA acceda a tu cuenta personal de Google sin tu autorización**. 

Por eso, el único paso que requiere tu cuenta es activar el script en Google:

1. Entra a: [**https://script.google.com/home/start**](https://script.google.com/home/start) (con tu cuenta `derekmartell99@gmail.com`).
2. Haz clic en el botón superior izquierdo: **"Nuevo proyecto"** (puedes ponerle de nombre `Mundo Social Bot`).
3. Borra el código vacío que aparece en pantalla y **pega todo el contenido de este archivo**:
   👉 [`scripts/google_apps_script_automatizacion.js`](file:///C:/mundo-social/scripts/google_apps_script_automatizacion.js)
4. Haz clic en el botón azul superior **Implementar** (Deploy) ➔ **Nueva implementación**:
   - En el engranaje tipo, selecciona: **Aplicación web**.
   - Ejecutar como: **Yo (derekmartell99@gmail.com)**.
   - Quién tiene acceso: **Cualquier persona** *(esto permite que el formulario de la web y los botones del correo funcionen)*.
   - Haz clic en **Implementar** y dale "Autorizar acceso" (Google te pedirá confirmar que eres tú).
5. Copia la **URL de la aplicación web** que te entrega (empieza con `https://script.google.com/macros/s/...`).
6. Pega esa URL en [`enviar.html`](file:///C:/mundo-social/enviar.html) en la variable `APPS_SCRIPT_URL` (o avísame y yo la pego por ti).

---

## 📬 ¿Cómo funciona en el día a día?

1. Un profesor o alumno entra a `https://derek-martell.github.io/mundo-social/enviar.html` y llena los campos.
2. A los 2 segundos te llega un correo a `derekmartell99@gmail.com` con:
   - Título, autores, resumen y enlace al PDF.
   - Botón verde: **[✓ APROBAR Y PUBLICAR AHORA]**
   - Botón rojo: **[✕ RECHAZAR]**
3. **Regla de 1 hora:**
   - Si le das clic a **Aprobar**, se publica al instante.
   - Si no respondes o estás ocupado, **al pasar 60 minutos se publica automáticamente solo**.
   - Si le das clic a **Rechazar**, se cancela y no se sube.
4. Cuando se aprueba, el script escribe directamente en GitHub y GitHub Pages actualiza la web sin que tú tengas que tocar una sola línea de código.
