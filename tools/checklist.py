"""Genera Checklist_Electrobot.xlsx (un equipo por fila) y web/public/sorteo.json desde el export de Microsoft Forms.

Uso: python tools/checklist.py "<ruta al export de Forms>.xlsx"
"""
import json, re, sys, unicodedata
from pathlib import Path
import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.formatting.rule import FormulaRule
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.table import Table, TableStyleInfo

ROOT = Path(__file__).resolve().parent.parent
CATS = ["Sumo Colegios", "Minisumo PRO", "Robot Laberinto"]
# Nombre canónico por fragmento de institución (el formulario es texto libre).
INST = {
    "autonoma de occidente": "Universidad Autónoma de Occidente",
    "pedro antonio molina": "IE Técnico Industrial Pedro Antonio Molina",
    "luis fernando caicedo": "IE Luis Fernando Caicedo & DaTIC - LID Comuna 1",
    "rafael navia": "IETI Rafael Navia Varón",
    "santiago de cali": "Universidad Santiago de Cali",
    "del quindio": "Universidad del Quindío",
    "del cauca": "Universidad del Cauca",
    "san buenaventura": "Universidad San Buenaventura",
    "comfandi": "Colegio Comfandi El Prado",
    "los andes": "Los Andes",
}


def key(s):
    s = unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", s.replace("universiad", "universidad")).strip()


def clean(s):
    s = str(s or "").split("\t")[0]  # algunas celdas traen cédula/celular pegados con tabs
    s = s.replace(chr(0x202A), "").replace(chr(0x202C), "")  # marcas bidi pegadas desde WhatsApp
    s = re.sub(r"\s+", " ", s).strip(" -")
    return s


def category(raw):
    k = key(raw)
    return next(c for c in CATS if key(c) in k)


def institution(raw):
    k = key(raw)
    return next((v for frag, v in INST.items() if frag in k), clean(raw))


def load(path):
    ws = openpyxl.load_workbook(path).active
    head = [clean(h) for h in next(ws.iter_rows(max_row=1, values_only=True))]
    col = {h: i for i, h in enumerate(head)}
    name_cols = [col[f"Nombres y Apellidos - Integrante {n}"] for n in (1, 2, 3)]
    teams = {}
    for r in ws.iter_rows(min_row=2, values_only=True):
        name = clean(r[col["Nombre del Equipo o Robot:"]])
        if not name:
            continue
        t = teams.setdefault(key(name), {"equipo": name, "institucion": institution(r[col["Institución educativa al cual representa:"]]), "cats": set(), "integrantes": []})
        t["cats"].add(category(r[col["Categoría a Participar:"]]))
        for c in name_cols:
            m = clean(r[c])
            if len(m) > 1 and key(m) not in map(key, t["integrantes"]):
                t["integrantes"].append(m)
    return sorted(teams.values(), key=lambda t: key(t["equipo"]))


def write_xlsx(teams, out):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Checklist"
    head = ["N°", "Equipo", "Institución", *CATS, "Categorías", "Integrantes", "Presente", "Robot revisado", "Observaciones"]
    ws.append(head)
    for i, t in enumerate(teams, 1):
        cats = [c for c in CATS if c in t["cats"]]
        ws.append([i, t["equipo"], t["institucion"], *["✔" if c in t["cats"] else "" for c in CATS], ", ".join(cats), "\n".join(t["integrantes"]), "Pendiente", "Pendiente", ""])
    n = len(teams) + 1
    ref = f"A1:{openpyxl.utils.get_column_letter(len(head))}{n}"
    tab = Table(displayName="Checklist", ref=ref)
    tab.tableStyleInfo = TableStyleInfo(name="TableStyleMedium2", showRowStripes=True)
    ws.add_table(tab)
    dv = DataValidation(type="list", formula1='"Sí,No,Pendiente"', allow_blank=True)
    ws.add_data_validation(dv)
    dv.add(f"I2:J{n}")
    green, red = PatternFill("solid", fgColor="C6EFCE"), PatternFill("solid", fgColor="FFC7CE")
    for c in "IJ":
        ws.conditional_formatting.add(f"{c}2:{c}{n}", FormulaRule(formula=[f'{c}2="Sí"'], fill=green))
        ws.conditional_formatting.add(f"{c}2:{c}{n}", FormulaRule(formula=[f'{c}2="No"'], fill=red))
    for c, w in zip("ABCDEFGHIJK", [5, 24, 40, 14, 14, 16, 30, 38, 12, 15, 30]):
        ws.column_dimensions[c].width = w
    for row in ws.iter_rows(min_row=2):
        for cell in row:
            cell.alignment = Alignment(vertical="top", wrap_text=True, horizontal="center" if cell.column in (1, 4, 5, 6, 9, 10) else "left")
    for cell in ws[1]:
        cell.font = Font(bold=True, color="FFFFFF")
    ws.freeze_panes = "C2"
    wb.save(out)


def write_json(teams, out):
    # Solo nombre de equipo e institución: la web es pública, sin datos personales.
    data = {"publicado": False, "fecha": None, "categorias": {c: {"equipos": [{"equipo": t["equipo"], "institucion": t["institucion"]} for t in teams if c in t["cats"]], "sorteo": None} for c in CATS}}
    out.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    teams = load(sys.argv[1])
    assert len({key(t["equipo"]) for t in teams}) == len(teams)
    assert all(t["cats"] for t in teams)
    write_xlsx(teams, ROOT / "Checklist_Electrobot.xlsx")
    write_json(teams, ROOT / "web" / "public" / "sorteo.json")
    for c in CATS:
        print(c, sum(c in t["cats"] for t in teams))
    print("equipos:", len(teams))
