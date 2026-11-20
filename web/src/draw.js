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
