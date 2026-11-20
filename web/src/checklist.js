import { CATS } from './draw.js'

// Mismo criterio que tools/checklist.py: normaliza para comparar nombres.
export const key = (s) =>
  String(s ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace('universiad', 'universidad')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

export const clean = (s) =>
  String(s ?? '')
    .split('\t')[0] // algunas celdas traen cédula/celular pegados con tabs
    .replace(/[\u202a\u202c]/g, '') // marcas bidi pegadas desde WhatsApp
    .replace(/\s+/g, ' ')
    .replace(/^[\s-]+|[\s-]+$/g, '')

const INST = {
  'autonoma de occidente': 'Universidad Autónoma de Occidente',
  'pedro antonio molina': 'IE Técnico Industrial Pedro Antonio Molina',
  'luis fernando caicedo': 'IE Luis Fernando Caicedo & DaTIC - LID Comuna 1',
  'rafael navia': 'IETI Rafael Navia Varón',
  'santiago de cali': 'Universidad Santiago de Cali',
  'del quindio': 'Universidad del Quindío',
  'del cauca': 'Universidad del Cauca',
  'san buenaventura': 'Universidad San Buenaventura',
  comfandi: 'Colegio Comfandi El Prado',
  'los andes': 'Los Andes',
}
const institution = (raw) => Object.entries(INST).find(([f]) => key(raw).includes(f))?.[1] ?? clean(raw)
const yes = (v) => ['si', 'x', '✔', 'true', '1'].includes(key(v) || String(v).trim())

// Acepta el export de Microsoft Forms (una fila por inscripción) o el checklist (una fila por equipo).
// Devuelve un equipo por fila: { k, equipo, institucion, cats, integrantes, presente, revisado, obs }.
export function parseRows(rawRows) {
  const rows = rawRows.map((r) => Object.fromEntries(Object.entries(r).map(([h, v]) => [clean(h), v])))
  const forms = rows.length && 'Nombre del Equipo o Robot:' in rows[0]
  if (!forms && !(rows.length && 'Equipo' in rows[0]))
    throw new Error('No encuentro la columna "Nombre del Equipo o Robot:" (Forms) ni "Equipo" (checklist).')
  const teams = new Map()
  for (const r of rows) {
    const equipo = clean(forms ? r['Nombre del Equipo o Robot:'] : r['Equipo'])
    if (!equipo) continue
    const k = key(equipo)
    if (!teams.has(k))
      teams.set(k, {
        k,
        equipo,
        institucion: forms ? institution(r['Institución educativa al cual representa:']) : clean(r['Institución']),
        cats: [],
        integrantes: [],
        presente: !forms && yes(r['Presente']),
        revisado: !forms && yes(r['Robot revisado']),
        obs: forms ? '' : clean(r['Observaciones']),
      })
    const t = teams.get(k)
    const cats = forms ? CATS.filter((c) => key(r['Categoría a Participar:']).includes(key(c))) : CATS.filter((c) => clean(r[c]))
    for (const c of cats) if (!t.cats.includes(c)) t.cats.push(c)
    const names = forms
      ? [1, 2, 3].map((n) => r[`Nombres y Apellidos - Integrante ${n}`])
      : String(r['Integrantes'] ?? '').split('\n')
    for (const m of names.map(clean)) if (m.length > 1 && !t.integrantes.some((x) => key(x) === key(m))) t.integrantes.push(m)
  }
  return [...teams.values()].sort((a, b) => a.k.localeCompare(b.k))
}

// Al volver a cargar un archivo modificado se conservan las marcas ya hechas en la web.
export const mergeStatus = (fresh, old = []) => {
  const prev = new Map(old.map((t) => [t.k, t]))
  return fresh.map((t) => (prev.has(t.k) ? { ...t, presente: prev.get(t.k).presente, revisado: prev.get(t.k).revisado, obs: prev.get(t.k).obs } : t))
}

export const toSheetRows = (teams) =>
  teams.map((t, i) => ({
    'N°': i + 1,
    Equipo: t.equipo,
    'Institución': t.institucion,
    ...Object.fromEntries(CATS.map((c) => [c, t.cats.includes(c) ? '✔' : ''])),
    Integrantes: t.integrantes.join('\n'),
    Presente: t.presente ? 'Sí' : 'No',
    'Robot revisado': t.revisado ? 'Sí' : 'No',
    Observaciones: t.obs,
  }))

export async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
