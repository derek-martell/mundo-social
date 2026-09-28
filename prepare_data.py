import json, html, re

with open(r'C:\Users\Derek Martell\.gemini\antigravity\scratch\mundo_social_catalog.json', 'r', encoding='utf-8') as f:
    raw_items = json.load(f)

def clean_text(s):
    if not s:
        return ""
    # Unescape HTML entities
    s = html.unescape(s)
    # Fix common moji-bake or weird characters
    s = s.replace('\xa0', ' ')
    s = s.replace('&#8211;', '–').replace('&#8216;', "'").replace('&#8217;', "'").replace('&#8220;', '"').replace('&#8221;', '"')
    # Remove weird chars if any
    s = re.sub(r'\s+', ' ', s).strip()
    return s


# Slugs de paginas de WordPress (menus, secciones, categorias, "Nosotros", etc.)
# que el scraper capturo como si fueran articulos. Ver scripts/auditar_articulos.py.
PAGINAS_NO_ARTICULO = {
    'noticias-2', 'nosotros', 'educacion', 'nuestro-equipo', 'investigacion',
    'macroeconomia', 'area-de-educacion', 'ejercicios-para-microeconomia',
    'econometria', 'ejercicios-de-econometria', 'ejercicios-de-macroeconomia',
    'microeconomia', 'matematicas', 'ejercicios-de-matematicas-para-economistas',
    'finanzas', 'ejercicios-de-finanzas', 'crecimiento-economico',
    'historia-economica', 'estadistica', 'columna-de-opinion', 'noticias',
    'proyectos', 'peru-a-2da-vuelta',
}

def es_pagina_no_articulo(url, title, date):
    """Heuristica para descartar paginas de WordPress (menu/categoria/institucional)
    que no son publicaciones reales, aunque el scraper las haya capturado."""
    slug = url.strip('/').split('/')[-1]
    if slug in PAGINAS_NO_ARTICULO:
        return True
    tiene_ruta_de_contenido = any(
        seg in url for seg in ('/nota/', '/columna/', '/apuntes/', '/investigacion/')
    )
    if tiene_ruta_de_contenido:
        return False
    sin_fecha_real = not date or not re.match(r'^\d{4}-\d{2}-\d{2}$', str(date))
    titulo_tipo_seccion = (
        len(title.split()) <= 3
        and not any(c in title for c in ':¿?«»–—')
    )
    return sin_fecha_real and titulo_tipo_seccion

cleaned_items = []

for it in raw_items:
    # Skip homepages or empty
    if it['url'] in ['https://mundo-social.com/', 'https://mundo-social.com/home-2/']:
        continue

    title = clean_text(it.get('title', ''))
    if not title or len(title) < 3:
        continue

    if es_pagina_no_articulo(it['url'], title, it.get('date')):
        continue

    doc_type = it.get('type', 'Artículo')
    date = it.get('date', '2025-06-01')
    pdfs = it.get('pdfs', [])
    authors = [clean_text(a) for a in it.get('authors', []) if clean_text(a)]

    # If authors empty, assign sensible default
    if not authors:
        if 'Caballero' in title:
            authors = ['Prof. Ricardo Caballero (MIT)', 'Área de Educación']
        elif 'Hugo Sánchez' in title:
            authors = ['Prof. Hugo Sánchez', 'Área de Educación']
        elif 'Marvin Padilla' in title:
            authors = ['Prof. Marvin Padilla', 'Área de Educación']
        elif 'Factor Risco' in title:
            authors = ['Prof. Factor Risco', 'Área de Educación']
        elif 'Franco Olivares' in title or 'deuda' in title.lower():
            authors = ['Franco Olivares']
        elif 'Franco' in title or 'Keiko' in title:
            authors = ['Equipo Editorial Mundo Social']
        elif 'Niño' in title:
            authors = ['Erick Salgado', 'Nicole Grandez']
        else:
            authors = ['Equipo Mundo Social']

    # Tags / categories
    t_lower = title.lower()
    tags = []
    category = "General"
    
    if doc_type == 'Apunte Académico' or any(k in t_lower for k in ['test', 'examen', 'soluci', 'parcial', 'guía didáctica', 'modelo renta', 'solow', 'mundell']):
        doc_type = 'Apunte Académico'
        category = 'Apuntes y Exámenes'
        if any(k in t_lower for k in ['macro', 'mundell', 'solow', 'renta']):
            tags.append('Macroeconomía')
        if any(k in t_lower for k in ['micro', 'dumping', 'consumo', 'pareto']):
            tags.append('Microeconomía')
        if any(k in t_lower for k in ['econometr', 'regresi', 'supuestos']):
            tags.append('Econometría')
        if any(k in t_lower for k in ['finanz', 'bonos', 'amortiza', 'anualidades']):
            tags.append('Finanzas')
        if any(k in t_lower for k in ['mateco', 'matemática']):
            tags.append('Matemáticas')
        if any(k in t_lower for k in ['mit', 'caballero']):
            tags.append('MIT')
        if any(k in t_lower for k in ['unmsm', 'san marcos']):
            tags.append('UNMSM')
    elif doc_type == 'Investigación' or any(k in t_lower for k in ['bangladesh', 'sinadef', 'cge', 'equilibrio general', 'experimental']):
        doc_type = 'Investigación'
        category = 'Investigación'
        tags.append('Papers & Modelos')
        if 'sinadef' in t_lower: tags.append('Tablero de Datos')
        if 'cge' in t_lower: tags.append('Modelos CGE')
    elif doc_type == 'Nota Informativa' or any(k in t_lower for k in ['wall street', 'fed', 'arancel', 'cobre', 'dólar', 'bcrp', 'hipotecario']):
        doc_type = 'Nota Informativa'
        category = 'Coyuntura'
        if any(k in t_lower for k in ['fed', 'bcrp', 'inflaci', 'dólar', 'liquidez']):
            tags.append('Política Monetaria')
        if any(k in t_lower for k in ['cobre', 'oro', 'miner', 'exportaci', 'arancel']):
            tags.append('Comercio & Minería')
        if any(k in t_lower for k in ['wall street', 'santander', 'banco', 'tech']):
            tags.append('Mercados & Finanzas')
        if any(k in t_lower for k in ['niño', 'pbi', 'crecimiento', 'empleo', 'feriados']):
            tags.append('Economía Peruana')
    else:
        category = 'Análisis'
        tags.append('Análisis Económico')

    if not tags:
        tags.append('Economía')

    # Excerpt
    resumen = ""
    if doc_type == 'Apunte Académico':
        resumen = f"Material de estudio y resolución académica elaborado por {', '.join(authors)} para estudiantes y docentes de economía."
    elif doc_type == 'Investigación':
        resumen = f"Estudio técnico y cuantitativo sobre {title.lower()} con evidencia empírica."
    else:
        resumen = f"Análisis de coyuntura económica sobre {title.lower()} y sus implicancias en el mercado peruano e internacional."

    cleaned_items.append({
        'id': len(cleaned_items) + 1,
        'slug': it['url'].strip('/').split('/')[-1],
        'title': title,
        'type': doc_type,
        'category': category,
        'date': date,
        'authors': authors,
        'tags': tags,
        'resumen': resumen,
        'pdf': pdfs[0] if pdfs else '',
        'url_original': it['url']
    })

# Sort by date descending
cleaned_items.sort(key=lambda x: x['date'], reverse=True)

# Write to C:\mundo-social\data\articulos.json
with open(r'C:\mundo-social\data\articulos.json', 'w', encoding='utf-8') as f:
    json.dump(cleaned_items, f, ensure_ascii=False, indent=2)

# Also write to C:\mundo-social\js\articulos-data.js so it works locally even without a server (file:/// protocol)
js_content = f"// Catálogo oficial de publicaciones de Mundo Social\nconst ARTICULOS_DATA = {json.dumps(cleaned_items, ensure_ascii=False, indent=2)};\n"
with open(r'C:\mundo-social\js\articulos-data.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print(f"Data prepared successfully! Total items: {len(cleaned_items)}")
