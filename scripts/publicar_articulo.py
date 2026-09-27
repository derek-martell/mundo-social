#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de Publicación Automatizada para Mundo Social.
Inserta nuevas publicaciones enviadas mediante Google Forms o Formulario Web,
asigna el ID correlativo, actualiza articulos.json y js/articulos-data.js.
"""

import sys
import os
import json
import re
import unicodedata
from datetime import datetime

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSON_PATH = os.path.join(ROOT_DIR, "data", "articulos.json")
JS_DATA_PATH = os.path.join(ROOT_DIR, "js", "articulos-data.js")
DOCS_DIR = os.path.join(ROOT_DIR, "documentos")

MESES_ESPANOL = {
    1: "enero", 2: "febrero", 3: "marzo", 4: "abril",
    5: "mayo", 6: "junio", 7: "julio", 8: "agosto",
    9: "septiembre", 10: "octubre", 11: "noviembre", 12: "diciembre"
}

def slugify(text):
    text = unicodedata.normalize('NFD', text).encode('ascii', 'ignore').decode('utf-8')
    text = re.sub(r'[^\w\s-]', '', text).strip().lower()
    return re.sub(r'[-\s]+', '-', text)

def infer_type(category, title):
    t_lower = title.lower()
    cat_lower = category.lower()
    if "docencia" in cat_lower or "apunte" in cat_lower or any(k in t_lower for k in ["examen", "solucionario", "apunte", "guia", "practica"]):
        return "Apunte Académico"
    if "investig" in cat_lower or any(k in t_lower for k in ["paper", "cge", "modelo", "estimacion"]):
        return "Investigación"
    if "coyuntura" in cat_lower or any(k in t_lower for k in ["inflacion", "dolar", "bcrp", "tasa"]):
        return "Nota Informativa"
    return "Columna de Opinión"

def publicar(payload):
    if not os.path.exists(JSON_PATH):
        raise FileNotFoundError(f"No se encontró {JSON_PATH}")

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        articulos = json.load(f)

    # Validar campos obligatorios
    title = str(payload.get("title", "")).strip()
    if not title:
        raise ValueError("El título de la publicación es obligatorio")

    # Autores
    raw_authors = payload.get("authors", [])
    if isinstance(raw_authors, str):
        authors = [a.strip() for a in raw_authors.split(",") if a.strip()]
    elif isinstance(raw_authors, list):
        authors = [str(a).strip() for a in raw_authors if str(a).strip()]
    else:
        authors = []
    if not authors:
        authors = ["Equipo Mundo Social"]

    # Categoría
    category = str(payload.get("category", "Coyuntura")).strip()
    valid_categories = {"Coyuntura", "Docencia", "Investigación", "Análisis"}
    matched_cat = next((c for c in valid_categories if c.lower() == category.lower()), None)
    if not matched_cat:
        matched_cat = "Coyuntura"

    doc_type = payload.get("type") or infer_type(matched_cat, title)

    # Etiquetas (Tags)
    raw_tags = payload.get("tags", [])
    if isinstance(raw_tags, str):
        tags = [t.strip() for t in raw_tags.split(",") if t.strip()]
    elif isinstance(raw_tags, list):
        tags = [str(t).strip() for t in raw_tags if str(t).strip()]
    else:
        tags = []
    if not tags:
        if matched_cat == "Docencia":
            tags = ["Macroeconomía"]
        elif matched_cat == "Coyuntura":
            tags = ["Economía Peruana"]
        else:
            tags = ["Análisis Económico"]

    # Resumen
    resumen = str(payload.get("resumen", "")).strip()
    if not resumen:
        resumen = f"Publicación editorial sobre {title.lower()} elaborada por {', '.join(authors)} para Mundo Social."

    # Fecha
    now = datetime.now()
    fecha_iso = now.strftime("%Y-%m-%d")
    fecha_mes = f"{MESES_ESPANOL[now.month]} {now.year}"
    date_val = payload.get("date") or fecha_mes

    # Slug y nuevo ID correlativo
    slug = payload.get("slug") or slugify(title)
    max_id = max((item.get("id", 0) for item in articulos), default=0)
    nuevo_id = max_id + 1

    pdf_url = str(payload.get("pdf", "")).strip()
    if pdf_url and not re.match(r'^https?://\S+$', pdf_url):
        raise ValueError(
            f"El enlace del PDF debe empezar con http:// o https:// (recibido: {pdf_url!r}). "
            "Se rechaza para evitar esquemas como 'javascript:' u otros."
        )
    url_orig = str(payload.get("url_original", "")).strip()
    if url_orig and not re.match(r'^https?://\S+$', url_orig):
        raise ValueError(
            f"La URL original debe empezar con http:// o https:// (recibido: {url_orig!r})."
        )

    nuevo_articulo = {
        "id": nuevo_id,
        "slug": slug,
        "title": title,
        "type": doc_type,
        "category": matched_cat,
        "date": date_val,
        "authors": authors,
        "tags": tags,
        "resumen": resumen,
        "pdf": pdf_url,
        "url_original": url_orig
    }

    # Insertar al inicio de la lista
    articulos.insert(0, nuevo_articulo)

    # Guardar data/articulos.json
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(articulos, f, ensure_ascii=False, indent=2)

    # Regenerar js/articulos-data.js
    js_content = (
        "// Catálogo oficial de publicaciones de Mundo Social (UNMSM)\n"
        "// Generado automáticamente - No editar manualmente\n"
        f"const ARTICULOS_DATA = {json.dumps(articulos, ensure_ascii=False, indent=2)};\n"
    )
    with open(JS_DATA_PATH, "w", encoding="utf-8") as f:
        f.write(js_content)

    print(f"[OK] Publicación agregada exitosamente!")
    print(f"     ID: {nuevo_id}")
    print(f"     Título: {title}")
    print(f"     Categoría: {matched_cat} ({doc_type})")
    print(f"     Autores: {', '.join(authors)}")
    print(f"     Total publicaciones actuales: {len(articulos)}")
    return nuevo_articulo

def main():
    if len(sys.argv) > 1:
        arg = sys.argv[1]
        if os.path.isfile(arg):
            with open(arg, "r", encoding="utf-8") as f:
                payload = json.load(f)
        else:
            payload = json.loads(arg)
    elif "PAYLOAD_JSON" in os.environ:
        payload = json.loads(os.environ["PAYLOAD_JSON"])
    elif not sys.stdin.isatty():
        payload = json.load(sys.stdin)
    else:
        print("Uso: python publicar_articulo.py '<json_string>' o python publicar_articulo.py datos.json")
        sys.exit(1)

    publicar(payload)

if __name__ == "__main__":
    main()
