import json
import re

with open("data/articulos.json", "r", encoding="utf-8") as f:
    articulos = json.load(f)

modificados = 0

for item in articulos:
    i_id = item["id"]
    title = item.get("title", "").strip()
    authors = item.get("authors", [])
    cat = item.get("category", "")
    t_type = item.get("type", "")

    original_authors = list(authors)
    original_cat = cat

    # 1. Normalizar autores que eran títulos o subtítulos
    new_authors = []
    for a in authors:
        a_clean = a.strip()
        # Si el autor es igual o contiene partes del título, o es una pregunta, o es el titular de una noticia
        if any(bad in a_clean.lower() for bad in [
            "telefonica", "telefónica", "reinfo", "sismo", "bcrp:", "santander consumer",
            "primera administración de trump", "desempeño, perspectivas", "desaceleración actual",
            "riesgo fiscal para el perú", "exportaciones peruanas", "controlan la economía",
            "sector de telecomunicaciones", "cómo te afecta", "segmento de consumo",
            "potencial por aprovechar", "primer cuatrimestre 2025"
        ]) or a_clean.startswith("¿") or a_clean.startswith("Políticas económicas") or "desempeño" in a_clean.lower():
            continue
        
        # Corrección de nombres mal cortados
        if a_clean == "Anjal" or a_clean == "Arcos Huaman" or a_clean == "Daniela" or a_clean == "Daniela Arcos Huaman":
            a_clean = "Anjaly Daniela Arcos Huamán"
        elif a_clean == "Anjal, Daniela Arcos Huaman" or "anjali" in a_clean.lower():
            a_clean = a_clean.replace("Anjali", "Anjaly")
        elif a_clean == "Mendoza Cruz Kat":
            a_clean = "Katia Mendoza Cruz"
        elif a_clean == "a Isabel" or a_clean == "a Isabel &":
            a_clean = "María Isabel"
        elif a_clean == "a Leiva":
            a_clean = "María Leiva"
        elif a_clean == "Fabbiana Marcala":
            a_clean = "Fabbiana Marcela"
        elif a_clean == "Arelis Gara":
            a_clean = "Arelis Garay"
        elif a_clean == "Anibal Cajachagua Pereda Y":
            a_clean = "Aníbal Cajachagua Pereda"
        elif a_clean == "Joseph Irvin Jherem" or a_clean == "es Falla":
            a_clean = "Joseph Irvin Jheremes Falla"
        elif a_clean == "Huamani":
            a_clean = "James Huamaní"
        elif a_clean == "Victor Calle Rios":
            a_clean = "Víctor Calle Ríos"
        elif a_clean == "Victor Sebastian Smith Calle Rios":
            a_clean = "Víctor Sebastián Smith Calle Ríos"
        elif a_clean == "Sebastian Calle" or a_clean == "Sebastián Calle":
            a_clean = "Sebastián Calle"
        elif a_clean == "Alfredo Ramírez" or a_clean == "Alfredo Ramrez":
            a_clean = "Alfredo Ramírez"
        elif a_clean == "Aldo Huamán" or a_clean == "Aldo Huamn":
            a_clean = "Aldo Huamán"
        elif a_clean == "Margoth Aguirre Lopez" or a_clean == "Margoth Aguirre Lpez":
            a_clean = "Margoth Aguirre López"
        elif a_clean == "Álvaro Paul Gálvez Matos" or a_clean == "lvaro Paul Glvez Matos":
            a_clean = "Álvaro Paul Gálvez Matos"
        elif a_clean == "Rosa Angela":
            a_clean = "Rosa Ángela"

        if a_clean and a_clean not in new_authors:
            new_authors.append(a_clean)

    # Si el artículo pertenece a los scrapings donde el autor era el título completo:
    if i_id in [59, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96]:
        new_authors = ["Equipo Editorial Mundo Social"]
    elif not new_authors:
        new_authors = ["Equipo Editorial Mundo Social"]

    item["authors"] = new_authors

    # 2. Corrección de Categorías mal asignadas
    t_lower = title.lower()
    if i_id == 90: # REINFO es análisis minero
        item["category"] = "Análisis"
        item["type"] = "Artículo"
    elif i_id in [16, 18, 19, 22]: # Ejercicios de Micro, Macro, Econometría, Matemáticas
        item["category"] = "Docencia"
        item["type"] = "Apunte Académico"
        if i_id == 16: item["tags"] = ["Microeconomía", "UNMSM"]
        elif i_id == 18: item["tags"] = ["Econometría", "UNMSM"]
        elif i_id == 19: item["tags"] = ["Macroeconomía", "UNMSM"]
        elif i_id == 22: item["tags"] = ["Matemáticas", "UNMSM"]

    # 3. Limpieza de caracteres residuales en títulos
    title_clean = re.sub(r'[\s\uFFFD\u200B\uFEFF\u200E\u200F\u00A0]+$', '', title)
    title_clean = title_clean.rstrip(" \t\n\r-")
    item["title"] = title_clean

    if original_authors != item["authors"] or original_cat != item["category"] or title != title_clean:
        modificados += 1

print(f"Total registros afinados: {modificados}")

with open("data/articulos.json", "w", encoding="utf-8") as f:
    json.dump(articulos, f, ensure_ascii=False, indent=2)

# Actualizar js/articulos-data.js
js_content = (
    "// Catálogo oficial de publicaciones de Mundo Social (UNMSM)\n"
    "// Generado automáticamente - No editar manualmente\n"
    f"const ARTICULOS_DATA = {json.dumps(articulos, ensure_ascii=False, indent=2)};\n"
)
with open("js/articulos-data.js", "w", encoding="utf-8") as f:
    f.write(js_content)

print("[OK] articulos.json y articulos-data.js actualizados correctamente.")
