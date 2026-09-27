import json
import re

with open("data/articulos.json", "r", encoding="utf-8") as f:
    articulos = json.load(f)

print(f"Total publicaciones cargadas: {len(articulos)}")
print("=" * 70)

for item in articulos:
    i_id = item.get("id")
    title = item.get("title", "")
    authors = item.get("authors", [])
    cat = item.get("category", "")
    t_type = item.get("type", "")
    url = item.get("url_original", "")
    pdf = item.get("pdf", "")

    # Problemas en autores
    autores_raros = []
    for a in authors:
        a_low = a.lower()
        if any(bad in a_low for bad in ["telefonica", "telefónica", "reinfo", "sismo", "bcrp", "sector", "peru-a-2da", "noticias", "6750"]):
            autores_raros.append(a)
        elif "?" in a or "¿" in a or "&" in a:
            autores_raros.append(a)
        elif len(a) < 3 or len(a) > 35:
            autores_raros.append(a)

    # Problemas en títulos (páginas estáticas de WordPress)
    t_low = title.lower()
    es_pagina_estatica = any(p in t_low for p in ["nosotros", "nuestro equipo", "proyectos", "noticias-2", "6750-2", "área de educación", "area de educacion"])
    es_ejercicio = "ejercicio" in t_low or "solucionario" in t_low or "examen" in t_low

    if autores_raros or es_pagina_estatica or es_ejercicio:
        print(f"ID {i_id:02d} | [{cat} / {t_type}]")
        print(f"     Título: {title}")
        print(f"     Autores: {authors} {'<-- RAROS: ' + str(autores_raros) if autores_raros else ''}")
        print(f"     URL Original: {url}")
        print(f"     PDF: {pdf}")
        print("-" * 70)
