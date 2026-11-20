import { test } from 'node:test'
import assert from 'node:assert/strict'
import { drawCategory, teamsFromChecklist } from './draw.js'
import { parseRows, mergeStatus, toSheetRows } from './checklist.js'

const teams = ['A', 'B', 'C', 'D', 'E'].map((equipo) => ({ equipo, institucion: 'X' }))

test('sumo: parejas sin repetir y un bye si es impar', () => {
  const pairs = drawCategory('Minisumo PRO', teams)
  assert.equal(pairs.length, 3)
  assert.equal(pairs.filter((p) => p[1] === null).length, 1)
  assert.deepEqual(pairs.flat().filter(Boolean).map((t) => t.equipo).sort(), ['A', 'B', 'C', 'D', 'E'])
})

test('laberinto: orden con todos los equipos', () => {
  const order = drawCategory('Robot Laberinto', teams)
  assert.deepEqual(order.map((t) => t.equipo).sort(), ['A', 'B', 'C', 'D', 'E'])
})

test('checklist: agrupa por categoría y filtra presentes', () => {
  const rows = [
    { Equipo: 'HAKUO', 'Institución': 'IE', 'Sumo Colegios': '✔', 'Minisumo PRO': '✔', Presente: 'Sí' },
    { Equipo: 'BUZZ', 'Institución': 'IE', 'Robot Laberinto': '✔', Presente: 'No' },
  ]
  const t = parseRows(rows)
  const all = teamsFromChecklist(t, false)
  assert.equal(all['Sumo Colegios'].equipos.length, 1)
  assert.equal(all['Minisumo PRO'].equipos.length, 1)
  assert.equal(all['Robot Laberinto'].equipos.length, 1)
  assert.equal(teamsFromChecklist(t, true)['Robot Laberinto'].equipos.length, 0)
  // ida y vuelta: el checklist exportado se vuelve a leer igual
  assert.deepEqual(parseRows(toSheetRows(t)), t)
})

test('forms: une inscripciones del mismo equipo y limpia nombres', () => {
  const f = (equipo, cat, m1) => ({
    'Nombre del Equipo o Robot:': equipo,
    'Institución educativa al cual representa:': 'IINSTITUCION EDUCATIVA TECNICO INDUSTRIAL PEDRO ANTONIO MOLINA',
    'Categoría a Participar:': `${cat}    https://lc.cx/x;`,
    'Nombres y Apellidos - Integrante 1': m1,
  })
  const t = parseRows([f('NARUTO ', 'Sumo Colegios', 'Ana\t123'), f('naruto', 'Minisumo PRO', 'ana')])
  assert.equal(t.length, 1)
  assert.deepEqual(t[0].cats, ['Sumo Colegios', 'Minisumo PRO'])
  assert.deepEqual(t[0].integrantes, ['Ana'])
  assert.equal(t[0].institucion, 'IE Técnico Industrial Pedro Antonio Molina')
  assert.equal(t[0].presente, false)
  const merged = mergeStatus(t, [{ ...t[0], presente: true, obs: 'ok' }])
  assert.equal(merged[0].presente, true)
  assert.equal(merged[0].obs, 'ok')
})
