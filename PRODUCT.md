# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two primary audiences with equal weight:

- **Economics students** (UNMSM today, other universities as the project grows) looking for course notes, solved exams and study material, usually to download a PDF for a specific course.
- **Informed general readers** interested in the Peruvian economy (professionals, journalists, citizens) who come for short current-affairs notes and longer analysis.

Neither audience is secondary; the front page must serve both without burying one under the other.

## Product Purpose

Mundo Social publishes critical, accessible writing on economics and social thought in Peru, and keeps an open archive of academic material. Success means students find and download the material they need, and general readers trust the notes enough to read, share and cite them.

## Positioning

What Mundo Social offers together, and neighbours rarely do:

1. **Theory tied to current affairs.** Formal models (macroeconomics, econometrics) applied to what is happening in Peru, grounded in official data.
2. **Open material.** Free notes, exams and solutions as downloadable PDFs, catalogued by course.
3. **Citable rigour.** Every piece has named authors, a date and a suggested APA citation; it is meant to be cited, not skimmed as opinion.

## Operating Context

- Static site on GitHub Pages (`derek-martell/mundo-social`); custom domain `mundo-social.com` prepared but currently disabled (`CNAME.disabled`).
- Catalogue lives in `data/articulos.json` and `js/articulos-data.js`; `js/app.js` renders it with live search, category tabs and a reading modal (PDF preview, download, copy link, copy APA citation).
- Contributors submit work through `enviar.html`, which posts to a Google Apps Script Web App; nothing is published automatically.
- Readers arrive on both phones and desktops.

## Capabilities and Constraints

- Categories (exact strings, accents required for filtering): `Coyuntura`, `Docencia`, `Análisis`, `Investigación`. Types: `Nota Informativa`, `Apunte Académico`, `Artículo`, `Investigación`.
- Current catalogue (2026-09-27): 73 publications (33 Coyuntura, 28 Docencia, 7 Análisis, 5 Investigación), 72 with a document link (PDF or external resource such as a Tableau dashboard). Counts shown in the page must come from the data, not be hard-coded; the page currently shows stale figures (96 total, 76 PDFs).
- Catalogue data must not be altered or reduced during design work.
- All files UTF-8 without BOM; Spanish accents must survive every edit.
- `js/app.js` depends on `#articles-grid`, `#search-input`, `#category-tabs`, `.cat-tab`, `.nav-link`, `#article-modal`, `#total-count`.

## Brand Commitments

- Name: **Mundo Social**. Language: Spanish (Peru).
- Official logos in `imagenes/` (`logo-transparent.png`, `logo-dark-mode.png`, `logo-emblem.png`) with light and dark variants.
- **Institutional relationship:** the founders are from UNMSM, but Mundo Social is independent and **not endorsed by UNMSM or its Faculty of Economics**. It aims to grow beyond San Marcos. Copy must not imply official affiliation (the current masthead line "Facultad de Ciencias Económicas • Universidad Nacional Mayor de San Marcos" and "nacida en la Facultad" wording need review against this).
- Founder byline: Derek Martell — Fundador.
- Voice: rigorous, plural, independent; explains with data, avoids partisan opinion.

## Evidence on Hand

- 73 real publications with authors, dates, summaries and PDFs (`data/articulos.json`).
- Named contributors, e.g. Equipo Editorial Mundo Social, Erick Salgado, Anjaly Daniela Arcos Huamán, Sebastián Calle, Jorge Tume, Víctor Calle Ríos.
- Course material including MIT (Ricardo Caballero) macroeconomics exams and UNMSM course notes.
- No testimonials, readership numbers, press coverage or institutional endorsements exist; do not fabricate them.

## Product Principles

1. **Two front doors, one archive.** Students and general readers each reach what they came for within one screen.
2. **Citable by default.** Author, date, type and citation are always visible and copyable.
3. **Open means frictionless.** PDFs are one tap away, with no sign-up or detours.
4. **Truthful about who we are.** Independent, student-founded, not institutionally endorsed; numbers come from the real catalogue.
5. **Built to grow beyond San Marcos.** Structure and copy should welcome contributors and material from other universities.
