# -*- coding: utf-8 -*-
import json, re, html

with open(r'C:\Users\Derek Martell\.gemini\antigravity\scratch\mundo_social_catalog.json', 'r', encoding='utf-8', errors='ignore') as f:
    raw = json.load(f)

def clean(text):
    if not text:
        return ""
    text = html.unescape(text)
    # Fix corrupted chars
    text = text.replace('\ufffd', '')
    text = text.replace('&#8211;', '–').replace('&#8216;', "'").replace('&#8217;', "'").replace('&#8220;', '"').replace('&#8221;', '"')
    return re.sub(r'\s+', ' ', text).strip()

items = []
for it in raw:
    title = clean(it.get('title', ''))
    if not title:
        continue
    
    url = it.get('url', '')
    doc_type = it.get('type', 'Artículo')
    date = it.get('date', '2025-06-01')
    pdfs = it.get('pdfs', [])
    authors = [clean(a) for a in it.get('authors', []) if clean(a) and len(clean(a)) > 2]
    
    # Authors fallback
    if not authors:
        t_low = title.lower()
        if 'caballero' in t_low:
            authors = ['Prof. Ricardo Caballero (MIT)', 'Área de Educación']
        elif 'hugo sánchez' in t_low:
            authors = ['Prof. Hugo Sánchez', 'Área de Educación']
        elif 'marvin padilla' in t_low:
            authors = ['Prof. Marvin Padilla', 'Área de Educación']
        elif 'factor risco' in t_low:
            authors = ['Prof. Factor Risco', 'Área de Educación']
        elif 'franco olivares' in t_low or 'deuda' in t_low:
            authors = ['Franco Olivares']
        elif 'niño' in t_low:
            authors = ['Erick Salgado', 'Nicole Grandez']
        else:
            authors = ['Equipo Editorial Mundo Social']

    # Normalize category: Coyuntura, Docencia, Investigación, Análisis
    t_low = title.lower()
    tags = []
    
    if '/apuntes/' in url or doc_type == 'Apunte Académico' or any(k in t_low for k in ['test', 'examen', 'soluci', 'parcial', 'guía didáctica', 'modelo renta', 'solow', 'mundell', 'anualidades']):
        doc_type = 'Apunte Académico'
        category = 'Docencia'
        if any(k in t_low for k in ['macro', 'solow', 'mundell', 'renta']): tags.append('Macroeconomía')
        if any(k in t_low for k in ['micro', 'dumping', 'consumo', 'pareto']): tags.append('Microeconomía')
        if any(k in t_low for k in ['econometr', 'regresi', 'supuestos']): tags.append('Econometría')
        if any(k in t_low for k in ['finanz', 'bonos', 'amortiza', 'anualidades']): tags.append('Finanzas')
        if any(k in t_low for k in ['mateco', 'matemática', 'matematica']): tags.append('Matemáticas')
        if any(k in t_low for k in ['mit', 'caballero']): tags.append('MIT')
        if any(k in t_low for k in ['unmsm', 'san marcos', 'prof', 'fce']): tags.append('UNMSM')
    elif '/investigacion/' in url or doc_type == 'Investigación' or any(k in t_low for k in ['bangladesh', 'sinadef', 'cge', 'equilibrio general', 'experimental']):
        doc_type = 'Investigación'
        category = 'Investigación'
        tags.append('Papers & Modelos')
        if 'sinadef' in t_low: tags.append('Tablero de Datos')
        if 'cge' in t_low: tags.append('Modelos CGE')
    elif '/nota/' in url or doc_type == 'Nota Informativa' or any(k in t_low for k in ['wall street', 'fed', 'arancel', 'cobre', 'dólar', 'bcrp', 'hipotecario', 'niño', 'pbi', 'bolivia']):
        doc_type = 'Nota Informativa'
        category = 'Coyuntura'
        if any(k in t_low for k in ['fed', 'bcrp', 'inflaci', 'dólar', 'liquidez']): tags.append('Política Monetaria')
        if any(k in t_low for k in ['cobre', 'oro', 'miner', 'exportaci', 'arancel']): tags.append('Comercio & Minería')
        if any(k in t_low for k in ['wall street', 'santander', 'banco', 'tech']): tags.append('Mercados & Finanzas')
        if any(k in t_low for k in ['niño', 'pbi', 'crecimiento', 'empleo', 'feriados']): tags.append('Economía Peruana')
    else:
        category = 'Análisis'
        doc_type = 'Artículo'
        tags.append('Análisis Económico')

    if not tags:
        tags.append('Economía')

    # Resumen
    if doc_type == 'Apunte Académico':
        resumen = f"Material de estudio y resolución académica elaborado por {', '.join(authors)} para estudiantes y docentes de economía."
    elif doc_type == 'Investigación':
        resumen = f"Estudio técnico y cuantitativo sobre {title.lower()} con evidencia empírica."
    else:
        resumen = f"Análisis de coyuntura económica sobre {title.lower()} y sus implicancias en el mercado peruano e internacional."

    items.append({
        'id': len(items) + 1,
        'slug': url.strip('/').split('/')[-1],
        'title': title,
        'type': doc_type,
        'category': category,
        'date': date,
        'authors': authors,
        'tags': tags,
        'resumen': resumen,
        'pdf': pdfs[0] if pdfs else '',
        'url_original': url
    })

items.sort(key=lambda x: x['date'], reverse=True)

with open(r'C:\mundo-social\data\articulos.json', 'w', encoding='utf-8') as f:
    json.dump(items, f, ensure_ascii=False, indent=2)

js_content = f"// Catálogo oficial de publicaciones de Mundo Social\nconst ARTICULOS_DATA = {json.dumps(items, ensure_ascii=False, indent=2)};\n"
with open(r'C:\mundo-social\js\articulos-data.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print(f"Data regenerated successfully! Total items: {len(items)}")
from collections import Counter
print('Category breakdown:', Counter(x['category'] for x in items))
