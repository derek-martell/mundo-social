import json

with open("data/articulos.json", "r", encoding="utf-8") as f:
    data = json.load(f)

for item in sorted(data, key=lambda x: x["id"]):
    i = item["id"]
    cat = item.get("category", "")
    title = item.get("title", "")
    authors = ", ".join(item.get("authors", []))
    has_pdf = "PDF" if item.get("pdf") else "SIN_PDF"
    print(f"ID {i:02d} | {cat:13s} | {has_pdf:7s} | {title[:48]:48s} | {authors}")
