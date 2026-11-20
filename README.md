# Electrobot USC · Sorteo de competencia

Web pública (React + Vite) con los enfrentamientos de **Sumo Colegios** y **Minisumo PRO** y el orden de salida de **Robot Laberinto**.

## Flujo del día

1. **Entrar como organizador.** En la web abre `#organizador` (enlace "Organizador" en el pie) e ingresa la contraseña.
2. **Checklist en la web.** Pulsa **Usar inscripciones del repositorio** (lee `web/public/inscripciones.xlsx`) o carga un Excel desde tu equipo. Marca *Presente*, *Revisado* y *Observaciones*. Si un equipo se inscribió en la categoría equivocada, marca o desmarca sus categorías en la misma fila. Todo se guarda en ese navegador y se conserva si vuelves a cargar el Excel. Usa **Exportar checklist (.xlsx)** para tener copia.
3. **Sortear.** Con "Sortear solo equipos presentes" pulsa **Sortear** y revisa la vista previa.
4. **Publicar.** Pulsa **Descargar sorteo.json** y súbelo al repo en `web/public/sorteo.json` (GitHub › Add file › Upload files › Commit). GitHub Actions vuelve a publicar en 1–2 min.

> `web/public/inscripciones.xlsx` es público: solo tiene ID, equipo, institución y categoría, tal cual vienen de Forms. **Nunca subas el export completo**: trae cédulas, celulares y correos. Para editar inscripciones, modifica ese archivo en GitHub (descárgalo, edítalo y súbelo con el mismo nombre).

### Cambiar la contraseña del organizador

```bash
cd web
npm run clave -- "NuevaClave"
```

Copia el hash que imprime en `ORG_HASH` de `web/src/App.jsx` y haz commit. La clave se verifica en el navegador (el sitio es estático): impide el acceso casual, no es seguridad fuerte. Por eso los datos personales nunca se publican.

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
