#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genera las páginas estáticas de cada artículo (a/<id>/index.html) para vistas
previas en redes y SEO, además de sitemap.xml, robots.txt y feed.xml.

Uso:
    python scripts/generar_paginas.py
    python scripts/generar_paginas.py --base https://mundo-social.com/
    python scripts/generar_paginas.py --og-image     # regenera imagenes/og-default.png

La URL base también puede darse con la variable de entorno MS_BASE_URL.
"""

import os
import re
import json
import shutil
import argparse
from html import escape
from datetime import datetime, timezone
from email.utils import format_datetime

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSON_PATH = os.path.join(ROOT_DIR, "data", "articulos.json")
A_DIR = os.path.join(ROOT_DIR, "a")
OG_PATH = os.path.join(ROOT_DIR, "imagenes", "og-default.png")

BASE_URL = "https://derek-martell.github.io/mundo-social/"
SITE_NAME = "Mundo Social"
SITE_DESC = "Portal de divulgación económica, análisis de coyuntura y apuntes académicos de economía."
OG_ALT = "Mundo Social: economía, investigación y docencia"

ISO_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def limpiar_titulo(t):
    return re.sub(r"\s*›\s*$", "", str(t or "")).strip()


def recortar(texto, limite=160):
    texto = re.sub(r"\s+", " ", str(texto or "")).strip()
    if len(texto) <= limite:
        return texto
    corte = texto[:limite].rsplit(" ", 1)[0].rstrip(" ,;:.-")
    return corte + "…"


def fecha_iso(item):
    d = str(item.get("date", "")).strip()
    if ISO_RE.match(d):
        try:
            datetime.strptime(d, "%Y-%m-%d")
            return d
        except ValueError:
            return None
    return None


def esc(s):
    return escape(str(s), quote=True)


def pagina(item, base):
    aid = item["id"]
    titulo = limpiar_titulo(item.get("title"))
    resumen = str(item.get("resumen", "")).strip()
    desc = recortar(resumen)
    autores = [str(a) for a in item.get("authors", []) if str(a).strip()]
    iso = fecha_iso(item)
    fecha_txt = iso or str(item.get("date", "")).strip()
    url = f"{base}a/{aid}/"
    img = f"{base}imagenes/og-default.png"
    spa = f"../../index.html#articulo-{aid}"
    pdf = str(item.get("pdf", "")).strip()
    tit_full = f"{titulo} | {SITE_NAME}"

    metas = [
        f'<meta name="description" content="{esc(desc)}">',
        f'<link rel="canonical" href="{esc(url)}">',
        '<meta property="og:type" content="article">',
        f'<meta property="og:site_name" content="{SITE_NAME}">',
        '<meta property="og:locale" content="es_PE">',
        f'<meta property="og:title" content="{esc(titulo)}">',
        f'<meta property="og:description" content="{esc(desc)}">',
        f'<meta property="og:url" content="{esc(url)}">',
        f'<meta property="og:image" content="{esc(img)}">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        f'<meta property="og:image:alt" content="{esc(OG_ALT)}">',
        '<meta name="twitter:card" content="summary_large_image">',
        f'<meta name="twitter:title" content="{esc(titulo)}">',
        f'<meta name="twitter:description" content="{esc(desc)}">',
        f'<meta name="twitter:image" content="{esc(img)}">',
    ]
    if iso:
        metas.append(f'<meta property="article:published_time" content="{iso}">')
    for a in autores:
        metas.append(f'<meta property="article:author" content="{esc(a)}">')
    metas_txt = "\n".join("  " + m for m in metas)

    byline = ""
    if autores:
        byline += esc(", ".join(autores))
    if fecha_txt:
        byline += (" · " if byline else "") + esc(fecha_txt)
    pdf_link = ""
    if pdf and re.match(r"^https?://\S+$", pdf):
        pdf_link = f'\n    <a href="{esc(pdf)}">Descargar PDF</a>'

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{esc(tit_full)}</title>
{metas_txt}
  <meta name="theme-color" content="#0f4c3a">
  <meta http-equiv="refresh" content="0; url={esc(spa)}">
  <link rel="icon" type="image/png" sizes="192x192" href="../../imagenes/favicon-192x192.png">
  <style>
    body{{margin:0;background:#fbf9f4;color:#1b2420;font-family:Georgia,"Literata",serif;line-height:1.6}}
    main{{max-width:640px;margin:0 auto;padding:48px 20px}}
    .marca{{font-family:system-ui,sans-serif;font-size:.8rem;letter-spacing:.12em;text-transform:uppercase;color:#0f4c3a;font-weight:600}}
    h1{{font-size:1.9rem;line-height:1.25;margin:.4em 0 .3em;color:#0f4c3a}}
    .meta{{font-family:system-ui,sans-serif;font-size:.9rem;color:#5a645e;margin:0 0 1.2em}}
    p{{font-size:1.05rem}}
    nav{{margin-top:1.8em;font-family:system-ui,sans-serif;font-size:.95rem}}
    nav a{{color:#0f4c3a;font-weight:600;margin-right:1.2em}}
  </style>
</head>
<body>
  <main>
    <div class="marca">{SITE_NAME}</div>
    <h1>{esc(titulo)}</h1>
    <p class="meta">{byline}</p>
    <p>{esc(resumen)}</p>
    <nav>
    <a href="{esc(spa)}">Leer en Mundo Social</a>{pdf_link}
    </nav>
  </main>
  <script>location.replace({json.dumps(spa)})</script>
</body>
</html>
"""


def escribir(path, contenido):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(contenido)


def generar_sitemap(items, base):
    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
           f"  <url><loc>{esc(base)}</loc></url>"]
    for it in sorted(items, key=lambda x: x["id"]):
        iso = fecha_iso(it)
        lm = f"<lastmod>{iso}</lastmod>" if iso else ""
        out.append(f"  <url><loc>{esc(base)}a/{it['id']}/</loc>{lm}</url>")
    out.append("</urlset>")
    return "\n".join(out) + "\n"


def generar_robots(base):
    return f"User-agent: *\nAllow: /\n\nSitemap: {base}sitemap.xml\n"


def generar_feed(items, base):
    con_fecha = [i for i in items if fecha_iso(i)]
    con_fecha.sort(key=lambda x: (fecha_iso(x), x["id"]), reverse=True)
    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
           "<channel>",
           f"  <title>{SITE_NAME}</title>",
           f"  <link>{esc(base)}</link>",
           f"  <description>{esc(SITE_DESC)}</description>",
           "  <language>es</language>",
           f'  <atom:link href="{esc(base)}feed.xml" rel="self" type="application/rss+xml"/>']
    if con_fecha:
        d = datetime.strptime(fecha_iso(con_fecha[0]), "%Y-%m-%d").replace(tzinfo=timezone.utc)
        out.append(f"  <lastBuildDate>{format_datetime(d, usegmt=True)}</lastBuildDate>")
    for it in con_fecha[:30]:
        d = datetime.strptime(fecha_iso(it), "%Y-%m-%d").replace(hour=12, tzinfo=timezone.utc)
        url = f"{base}a/{it['id']}/"
        out.append("  <item>")
        out.append(f"    <title>{esc(limpiar_titulo(it.get('title')))}</title>")
        out.append(f"    <link>{esc(url)}</link>")
        out.append(f'    <guid isPermaLink="true">{esc(url)}</guid>')
        out.append(f"    <pubDate>{format_datetime(d, usegmt=True)}</pubDate>")
        if it.get("category"):
            out.append(f"    <category>{esc(it['category'])}</category>")
        out.append(f"    <description>{esc(it.get('resumen', ''))}</description>")
        out.append("  </item>")
    out.append("</channel>")
    out.append("</rss>")
    return "\n".join(out) + "\n"


def generar_og_image():
    from PIL import Image, ImageDraw, ImageFont
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), "#0f4c3a")
    d = ImageDraw.Draw(img)

    def fuente(nombres, tam):
        for n in nombres:
            try:
                return ImageFont.truetype(n, tam)
            except OSError:
                continue
        return ImageFont.load_default()

    bold = fuente([r"C:\Windows\Fonts\georgiab.ttf", "georgiab.ttf", "DejaVuSerif-Bold.ttf"], 96)
    reg = fuente([r"C:\Windows\Fonts\georgiai.ttf", "georgiai.ttf", "DejaVuSerif.ttf"], 38)

    # Isotipo blanco a la izquierda (se usa su alfa como máscara, recoloreado a crema)
    iso = Image.open(os.path.join(ROOT_DIR, "imagenes", "isotipoblanco.png")).convert("LA")
    alpha = iso.getchannel("A")
    mask = alpha if alpha.getextrema()[0] < 255 else iso.getchannel("L")
    bbox = mask.getbbox()
    if bbox:
        mask = mask.crop(bbox)
    mask.thumbnail((220, 220), Image.LANCZOS)
    ix, iy = 120, (H - mask.height) // 2
    img.paste(Image.new("RGB", mask.size, "#fbf9f4"), (ix, iy), mask)

    tx = ix + mask.width + 70
    d.text((tx, 215), "Mundo Social", font=bold, fill="#fbf9f4")
    d.line([(tx + 4, 340), (tx + 140, 340)], fill="#c9a24a", width=4)
    d.text((tx + 2, 366), "Economía, investigación y docencia", font=reg, fill="#e0b85a")
    img.save(OG_PATH, optimize=True)
    print(f"[OK] {os.path.relpath(OG_PATH, ROOT_DIR)} generado")


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--base", default=os.environ.get("MS_BASE_URL", BASE_URL))
    ap.add_argument("--og-image", action="store_true", help="regenera imagenes/og-default.png")
    args = ap.parse_args(argv)
    base = args.base.rstrip("/") + "/"

    if args.og_image:
        generar_og_image()

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        items = [i for i in json.load(f) if isinstance(i.get("id"), int)]

    ids = set()
    for it in sorted(items, key=lambda x: x["id"]):
        ids.add(str(it["id"]))
        escribir(os.path.join(A_DIR, str(it["id"]), "index.html"), pagina(it, base))

    borradas = 0
    if os.path.isdir(A_DIR):
        for nombre in sorted(os.listdir(A_DIR)):
            ruta = os.path.join(A_DIR, nombre)
            if os.path.isdir(ruta) and nombre not in ids:
                shutil.rmtree(ruta)
                borradas += 1

    escribir(os.path.join(ROOT_DIR, "sitemap.xml"), generar_sitemap(items, base))
    escribir(os.path.join(ROOT_DIR, "robots.txt"), generar_robots(base))
    escribir(os.path.join(ROOT_DIR, "feed.xml"), generar_feed(items, base))

    n_feed = min(30, len([i for i in items if fecha_iso(i)]))
    print(f"[OK] {len(items)} páginas en a/ ({borradas} obsoletas eliminadas)")
    print(f"[OK] sitemap.xml ({len(items) + 1} URLs), robots.txt, feed.xml ({n_feed} ítems)")
    print(f"     Base: {base}")


if __name__ == "__main__":
    main()
