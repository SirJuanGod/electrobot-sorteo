export const CATS = ['Sumo Colegios', 'Minisumo PRO', 'Robot Laberinto']
export const isCombat = (cat) => cat !== 'Robot Laberinto'

// Fisher–Yates con crypto para que el sorteo no sea predecible
export function shuffle(list, rand = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Sumo/Minisumo: parejas [a, b]; si el número es impar el último pasa directo [a, null].
// Laberinto: orden de salida.
export function drawCategory(cat, teams, rand) {
  const s = shuffle(teams, rand)
  if (!isCombat(cat)) return s
  const pairs = []
  for (let i = 0; i < s.length; i += 2) pairs.push([s[i], s[i + 1] ?? null])
  return pairs
}

export function drawAll(categorias, rand) {
  const out = {}
  for (const cat of CATS) {
    const equipos = categorias[cat]?.equipos ?? []
    out[cat] = { equipos, sorteo: drawCategory(cat, equipos, rand) }
  }
  return { publicado: true, fecha: new Date().toISOString(), categorias: out }
}

// Arma los equipos por categoría desde el checklist (parseRows), opcionalmente solo los presentes.
export function teamsFromChecklist(teams, onlyPresent) {
  return Object.fromEntries(
    CATS.map((c) => [
      c,
      { equipos: teams.filter((t) => t.cats.includes(c) && (!onlyPresent || t.presente)).map((t) => ({ equipo: t.equipo, institucion: t.institucion })) },
    ]),
  )
}

// Eliminación directa a partir de la ronda 1 ([a, b|null]) y los ganadores { 'ronda-combate': nombre del equipo }.
// En cada combate: a/b = equipo, null = BYE, undefined = por definir; w = ganador.
// Se guarda el nombre (no "a"/"b"): si cambia un resultado anterior, los posteriores que ya no aplican se ignoran solos.
export function bracket(first = [], ganadores = {}) {
  if (!first.length) return []
  const rounds = []
  let cur = first.map(([a, b]) => ({ a, b: b ?? null }))
  for (let r = 0; ; r++) {
    cur.forEach((m, i) => {
      const g = ganadores[`${r}-${i}`]
      m.w = m.a && m.b === null ? m.a : [m.a, m.b].find((t) => t && t.equipo === g)
    })
    rounds.push(cur)
    if (cur.length === 1) return rounds
    const next = []
    for (let i = 0; i < cur.length; i += 2) next.push({ a: cur[i].w, b: i + 1 < cur.length ? cur[i + 1].w : null })
    cur = next
  }
}

export const roundName = (r, total) => (r === total - 1 ? 'Final' : r === total - 2 ? 'Semifinal' : `Ronda ${r + 1}`)

// Laberinto: "1:23.45", "83.45" o "83,45" → segundos; "NT" = no terminó; vacío → null; inválido → NaN.
export function parseTime(s) {
  const v = String(s ?? '').trim().replace(',', '.').toUpperCase()
  if (!v) return null
  if (v === 'NT') return 'NT'
  const m = v.match(/^(?:(\d+):)?(\d+(?:\.\d+)?)$/)
  if (!m || (m[1] && Number(m[2]) >= 60)) return NaN
  return Math.round(((Number(m[1] ?? 0) * 60) + Number(m[2])) * 100) / 100
}

export const fmtTime = (t) =>
  t === 'NT' ? 'NT' : typeof t !== 'number' ? '' : `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`

// Clasificación por tiempo (más rápido primero; NT al final; sin tiempo, fuera). Ganador cuando todos tienen resultado.
export function ranking(order = [], tiempos = {}) {
  const rows = order.map((t, i) => ({ t, time: tiempos[i] })).filter((r) => r.time != null)
  rows.sort((a, b) => (a.time === 'NT') - (b.time === 'NT') || (a.time === 'NT' ? 0 : a.time - b.time))
  const done = order.length > 0 && rows.length === order.length
  return { rows, winner: done && rows[0]?.time !== 'NT' ? rows[0].t : null }
}
