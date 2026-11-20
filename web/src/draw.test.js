import { test } from 'node:test'
import assert from 'node:assert/strict'
import { drawCategory, teamsFromChecklist } from './draw.js'

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
  const all = teamsFromChecklist(rows, false)
  assert.equal(all['Sumo Colegios'].equipos.length, 1)
  assert.equal(all['Minisumo PRO'].equipos.length, 1)
  assert.equal(all['Robot Laberinto'].equipos.length, 1)
  assert.equal(teamsFromChecklist(rows, true)['Robot Laberinto'].equipos.length, 0)
})
