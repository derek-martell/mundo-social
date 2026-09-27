# Guía de Automatización: Formulario con Aprobación por Correo y Auto-Publicación en 1 Hora

Este sistema permite que cualquier persona (docente, investigador, estudiante) envíe una propuesta de publicación sin tener acceso a tu repositorio de GitHub, manteniendo tu control editorial mediante **correo electrónico con límite de 1 hora**.

---

## 🔄 ¿Cómo funciona el flujo completo?

```
[ Colaborador llena Formulario ]
             │
             ▼
[ Google Apps Script / Formulario Web ]
             │
             ├─────────────────────────────────────────────────┐
             │                                                 │
             ▼                                                 ▼
[ Envía correo inmediato a Derek ]             [ Programa reloj de 1 hora ]
    "¿Deseas publicar esto?"                                   │
             │                                                 │
    ┌────────┴────────┐                                        │
    │                 │                                        │
[ Clic APROBAR ]  [ Clic RECHAZAR ]                            │
    │                 │ (Se cancela)                           ▼
    │                 └───────────────────────────────> [ Si pasan 60 min sin respuesta ]
    │                                                   (Se aprueba automáticamente)
    └─────────────────────────────┬────────────────────────────────────┘
                                  ▼
             [ Apps Script llama a GitHub Actions vía Webhook ]
                                  │
                                  ▼
             [ Script Python en GitHub añade el artículo a: ]
               - data/articulos.json (asigna nuevo ID)
               - js/articulos-data.js
               - Sube el PDF a documentos/
                                  │
                                  ▼
             [ GitHub Pages compila y publica en 30 segundos ]
```

---

## 🚀 Paso a Paso para Activar la Automatización

### 1. Crear tu Personal Access Token (PAT) en GitHub
Para que Google Apps Script pueda avisarle a GitHub que publique el artículo:
1. Ve a GitHub: [https://github.com/settings/tokens](https://github.com/settings/tokens) (o en tu perfil -> **Settings** -> **Developer Settings** -> **Personal Access Tokens** -> **Tokens (classic)**).
2. Haz clic en **Generate new token (classic)**.
3. Nombre: `Mundo Social Form Bot`.
4. Expiración: `No expiration` (o 1 año).
5. Marca la casilla: **`repo`** (acceso completo a repositorios).
6. Haz clic en **Generate token** y copia el código que empieza con `ghp_...`.

---

### 2. Configurar el Formulario y Google Apps Script
Puedes usar un **Google Form** o la página [`enviar.html`](file:///C:/mundo-social/enviar.html):

#### Si usas Google Forms:
1. En Google Drive, crea un formulario con estas preguntas:
   - **Título de la publicación** (Texto corto, Obligatorio)
   - **Categoría** (Varias opciones: *Coyuntura*, *Docencia*, *Investigación*, *Análisis*)
   - **Autores** (Texto corto: ej. *Juan Pérez, Derek Martell*)
   - **Curso o Área temática** (Texto corto: ej. *Macroeconomía, BCRP*)
   - **Documento PDF (Enlace de Google Drive)** (Texto corto, Obligatorio)
   - **Resumen o Abstract** (Párrafo, Obligatorio)
   - **Correo de contacto** (Texto corto)
2. En la pestaña **Respuestas**, haz clic en el ícono verde **"Vincular con Hojas de cálculo"**.
3. En la Hoja de cálculo que se abre, ve al menú: **Extensiones** -> **Apps Script**.
4. Borra todo el código que aparezca y pega el contenido completo de [`scripts/google_apps_script_automatizacion.js`](file:///C:/mundo-social/scripts/google_apps_script_automatizacion.js).
5. En las primeras líneas del código, reemplaza:
   - `DEREK_EMAIL`: Tu correo de Gmail (`derekmartell99@gmail.com`).
   - `GITHUB_TOKEN`: El token `ghp_...` que creaste en el paso 1.
6. En la barra superior de Apps Script, selecciona la función **`configurarDisparador`** y haz clic en **Ejecutar** (te pedirá autorizar permisos la primera vez).
7. Haz clic en el botón azul superior **Implementar** -> **Nueva implementación**:
   - Tipo: **Aplicación web**.
   - Ejecutar como: **Yo**.
   - Quién tiene acceso: **Cualquier persona**.
   - Haz clic en **Implementar** y copia la URL generada.
8. Pega esa URL en la variable `WEB_APP_URL` de tu Apps Script y dale a Guardar.

---

## 📬 ¿Cómo se verá en tu correo?

Cada vez que alguien envíe una propuesta, recibirás un correo con el formato editorial:
- **Título**, **Autores**, **Categoría**, **Resumen** y el **PDF adjunto**.
- Dos botones grandes:
  - 🟢 **[✓ APROBAR Y PUBLICAR AHORA]**
  - 🔴 **[✕ RECHAZAR]**
- Si no haces nada porque estás ocupado o en clase, **al cabo de 1 hora exacta**, el sistema lo publicará automáticamente por ti.

---

## 🛡️ Seguridad y Respaldo
- Los 96 artículos actuales están protegidos: el script calcula el nuevo ID secuencial (97, 98, etc.) e inserta la nueva publicación sin alterar los existentes.
- Cada publicación queda registrada en el historial de commits de Git con autor `Mundo Social Bot`, por lo que siempre puedes revertir cualquier cambio en caso necesario.
