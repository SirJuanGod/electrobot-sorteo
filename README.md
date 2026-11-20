# Electrobot USC · Sorteo de competencia

Web pública (React + Vite) con los enfrentamientos de **Sumo Colegios** y **Minisumo PRO** y el orden de salida de **Robot Laberinto**.

## Flujo del día

1. **Checklist (OneDrive).** Sube `Checklist_Electrobot.xlsx` a OneDrive. Un equipo por fila; si está en varias categorías aparece una sola vez con varias ✔. Filtra por categoría con el filtro de la columna (`Sumo Colegios`, `Minisumo PRO`, `Robot Laberinto`) y marca `Presente` / `Robot revisado` con la lista Sí/No.
2. **Sortear.** En la web abre `#organizador` (enlace "Organizador" en el pie). Descarga el checklist de OneDrive y cárgalo; con "Solo Presente = Sí" sortea solo a los que llegaron. Pulsa **Sortear** y revisa la vista previa.
3. **Publicar.** Pulsa **Descargar sorteo.json** y súbelo al repo en `web/public/sorteo.json` (GitHub › Add file › Upload files › Commit). GitHub Actions vuelve a publicar en 1–2 min.

## Regenerar el checklist desde un nuevo export de Forms

```bash
pip install openpyxl
python tools/checklist.py "ruta/al/export.xlsx"
```

Esto reescribe `Checklist_Electrobot.xlsx` y `web/public/sorteo.json` (solo nombre de equipo e institución, sin datos personales).

## Desarrollo

```bash
cd web
npm install
npm run dev
```

## Publicar por primera vez

1. Crea un repositorio en GitHub y sube esta carpeta (`git push`).
2. En el repo: **Settings › Pages › Source: GitHub Actions**.
3. La web queda en `https://<usuario>.github.io/<repo>/`.
