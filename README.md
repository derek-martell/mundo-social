# Mundo Social — Portal Editorial & Repositorio Académico

Sitio web oficial moderno y ligero de **Mundo Social**, optimizado para velocidad instantánea, tipografía académica de alta legibilidad, modo oscuro y repositorio abierto de 96 publicaciones (notas informativas, apuntes de la UNMSM y el MIT, e investigaciones aplicadas).

---

## 📁 Estructura del Proyecto en `C:\mundo-social`

```text
C:\mundo-social\
├── index.html               # Portada principal con buscador en vivo y catálogo dinámico
├── CNAME                    # Configuración del dominio personalizado (mundo-social.com)
├── css\
│   └── styles.css           # Estilos modernos (Literata + Schibsted Grotesk, modo oscuro)
├── js\
│   ├── articulos-data.js    # Base de datos de las 96 publicaciones, autores y PDFs
│   └── app.js               # Lógica de búsqueda en vivo, filtros y modal de lectura
├── data\
│   └── articulos.json       # Respaldo JSON completo del catálogo
├── admin\
│   ├── index.html           # Panel visual Decap CMS para redactores
│   └── config.yml           # Configuración del CMS conectado a GitHub
├── documentos\              # Carpeta para almacenar nuevos PDFs
└── imagenes\                # Recursos visuales y logos
```

---

## 🚀 Cómo probar la web en tu computadora ahora mismo

### Opción 1: Servidor local rápido (Recomendado)
Abre PowerShell en esta carpeta y ejecuta:
```powershell
python -m http.server 8000
```
Luego abre tu navegador en: **`http://localhost:8000`**

### Opción 2: Doble clic directo
Simplemente haz doble clic en `index.html` en el Explorador de Windows. La web funcionará sin necesidad de servidores gracias al cargador de datos `articulos-data.js`.

---

## 🌐 Cómo publicarlo en GitHub Pages y conectar tu dominio

1. **Crear el repositorio en GitHub:**
   - Entra a [github.com/new](https://github.com/new) y crea un repositorio llamado `mundo-social` (público).

2. **Subir los archivos:**
   Desde la carpeta `C:\mundo-social` en tu terminal:
   ```bash
   git init
   git add .
   git commit -m "Lanzamiento nueva web de Mundo Social"
   git branch -M main
   git remote add origin https://github.com/derek-martell/mundo-social.git
   git push -u origin main
   ```

3. **Activar GitHub Pages:**
   - En tu repositorio de GitHub, ve a **Settings** > **Pages**.
   - En **Source**, selecciona `Deploy from a branch` y elige `main` / `/ (root)`.
   - En **Custom domain**, confirma que aparezca `mundo-social.com`.
   - Marca la casilla **Enforce HTTPS**.

4. **Configurar los DNS en tu proveedor de dominio:**
   En el panel donde compraste `mundo-social.com` (GoDaddy, Namecheap, DonWeb, etc.), ve a la **Zona DNS** y agrega:
   - **4 Registros tipo A:**
     * Nombre: `@` | Valor: `185.199.108.153`
     * Nombre: `@` | Valor: `185.199.109.153`
     * Nombre: `@` | Valor: `185.199.110.153`
     * Nombre: `@` | Valor: `185.199.111.153`
   - **1 Registro tipo CNAME:**
     * Nombre: `www` | Valor: `derek-martell.github.io` (o el usuario de GitHub correspondiente).

---

## ✍️ Cómo publicar nuevos artículos desde cualquier computadora

1. Entra a `https://mundo-social.com/admin` desde cualquier navegador.
2. Inicia sesión con tu cuenta autorizada de GitHub.
3. Haz clic en **Nueva Nota** o **Nuevo Apunte**, sube el PDF, redacta el texto y dale a **Publicar**.
4. ¡El sitio se actualizará automáticamente en todo el mundo en 30 segundos!
