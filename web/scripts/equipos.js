// Regenera la lista de equipos de public/sorteo.json desde public/inscripciones.xlsx.
// Corre solo antes de `npm run dev` y `npm run build` (también en GitHub Actions), así que basta con editar el Excel.
// Conserva el sorteo y la fecha que ya tenga sorteo.json.
import { readFileSync, writeFileSync } from 'node:fs'
import * as XLSX from 'xlsx'
import { CATS } from '../src/draw.js'
import { parseRows } from '../src/checklist.js'
import { teamsFromChecklist } from '../src/draw.js'

const dir = new URL('../public/', import.meta.url)
const wb = XLSX.read(readFileSync(new URL('inscripciones.xlsx', dir)))
const teams = parseRows(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' }))
if (!teams.length) throw new Error('inscripciones.xlsx no tiene equipos')

const file = new URL('sorteo.json', dir)
const old = JSON.parse(readFileSync(file, 'utf8'))
const nuevos = teamsFromChecklist(teams, false)
const data = {
  ...old,
  categorias: Object.fromEntries(CATS.map((c) => [c, { ...old.categorias?.[c], equipos: nuevos[c].equipos, sorteo: old.categorias?.[c]?.sorteo ?? null }])),
}
writeFileSync(file, JSON.stringify(data, null, 2) + '\n')
console.log(`equipos: ${teams.length} · ${CATS.map((c) => `${c}: ${nuevos[c].equipos.length}`).join(' · ')}`)
