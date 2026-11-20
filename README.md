# Electrobot USC · Sorteo de competencia

Web pública (React + Vite) con los enfrentamientos de **Sumo Colegios** y **Minisumo PRO** y el orden de salida de **Robot Laberinto**.

## Flujo del día

1. **Entrar como organizador.** En la web abre `#organizador` (enlace "Organizador" en el pie) e ingresa la contraseña.
2. **Checklist en la web.** Carga el Excel de inscripciones (el export de Forms, aunque lo hayas editado) o un checklist exportado antes. Marca *Presente*, *Revisado* y *Observaciones*. Las marcas se guardan en ese navegador; si cargas una versión nueva del Excel se conservan. Usa **Exportar checklist (.xlsx)** para tener copia.
3. **Sortear.** Con "Sortear solo equipos presentes" pulsa **Sortear** y revisa la vista previa.
4. **Publicar.** Pulsa **Descargar sorteo.json** y súbelo al repo en `web/public/sorteo.json` (GitHub › Add file › Upload files › Commit). GitHub Actions vuelve a publicar en 1–2 min.

> El Excel **no se sube al repositorio**: es público y el export trae cédulas, celulares y correos. La web lo lee solo en tu navegador.

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
