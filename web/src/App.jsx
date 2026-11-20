import { useEffect, useMemo, useState } from 'react'

import { CATS, isCombat, drawAll, teamsFromChecklist } from './draw.js'

const TABS = [
  { id: 'sumo', label: 'Sumo Colegios', cat: 'Sumo Colegios' },
  { id: 'minisumo', label: 'Minisumo PRO', cat: 'Minisumo PRO' },
  { id: 'laberinto', label: 'Laberinto', cat: 'Robot Laberinto' },
  { id: 'equipos', label: 'Equipos' },
]

const useHash = () => {
  const [hash, setHash] = useState(() => location.hash.slice(1) || 'sumo')
  useEffect(() => {
    const on = () => setHash(location.hash.slice(1) || 'sumo')
    addEventListener('hashchange', on)
    return () => removeEventListener('hashchange', on)
  }, [])
  return hash
}

export default function App() {
  const tab = useHash()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`./sorteo.json?t=${Date.now()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setData)
      .catch(() => setError('No se pudo cargar el sorteo. Recarga la página.'))
  }, [])

  const current = TABS.find((t) => t.id === tab)

  return (
    <>
      <header className="hero">
        <div className="hero-text">
          <p className="kicker mono">IEEE RAS · USC Student Branch</p>
          <h1>
            <span>X Concurso</span>
            <span className="orange">Internacional de Robótica</span>
            <span className="big">Electrobot USC</span>
          </h1>
          <p className="meta">Universidad Santiago de Cali · Laboratorio de competencia</p>
        </div>
      </header>

      <nav className="tabs" aria-label="Categorías">
        {TABS.map((t) => (
          <a key={t.id} href={`#${t.id}`} className={t.id === tab ? 'active' : ''} aria-current={t.id === tab ? 'page' : undefined}>
            {t.label}
          </a>
        ))}
      </nav>

      <main>
        {error && <p className="notice">{error}</p>}
        {!data && !error && <p className="notice mono">Cargando…</p>}
        {data && tab === 'organizador' && <Organizer data={data} />}
        {data && tab === 'equipos' && <Teams data={data} />}
        {data && current?.cat && <Category cat={current.cat} info={data.categorias[current.cat]} fecha={data.fecha} />}
      </main>

      <footer>
        <span>Electrobot USC · Rama Estudiantil IEEE</span>
        <a href="#organizador">Organizador</a>
      </footer>
    </>
  )
}

function Category({ cat, info, fecha }) {
  const teams = info?.equipos ?? []
  const sorteo = info?.sorteo
  return (
    <section>
      <div className="section-head">
        <div>
          <p className="mono label">{isCombat(cat) ? 'Ronda 1 · Enfrentamientos' : 'Orden de salida'}</p>
          <h2>{cat}</h2>
        </div>
        <div className="chips">
          <span className="chip">{teams.length} equipos</span>
          <span className={`chip ${sorteo ? 'ok' : 'wait'}`}>{sorteo ? 'Sorteo publicado' : 'Sorteo pendiente'}</span>
        </div>
      </div>
      {fecha && sorteo && <p className="mono small">Sorteo: {new Date(fecha).toLocaleString('es-CO')}</p>}

      {!sorteo && (
        <>
          <p className="notice">El sorteo se publicará aquí antes de la competencia. Equipos inscritos:</p>
          <ul className="grid">
            {teams.map((t) => <TeamCard key={t.equipo} t={t} />)}
          </ul>
        </>
      )}

      {sorteo && isCombat(cat) && (
        <ol className="grid matches">
          {sorteo.map(([a, b], i) => (
            <li key={i} className="match">
              <span className="mono label">Combate {String(i + 1).padStart(2, '0')}</span>
              <Side t={a} />
              <span className="vs mono">{b ? 'VS' : 'BYE'}</span>
              {b ? <Side t={b} /> : <p className="bye">Pasa directo a la siguiente ronda</p>}
            </li>
          ))}
        </ol>
      )}

      {sorteo && !isCombat(cat) && (
        <ol className="order">
          {sorteo.map((t, i) => (
            <li key={t.equipo}>
              <span className="turn mono">{String(i + 1).padStart(2, '0')}</span>
              <Side t={t} />
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

const Side = ({ t }) => (
  <div className="side">
    <strong>{t.equipo}</strong>
    <span>{t.institucion}</span>
  </div>
)

const TeamCard = ({ t, cats }) => (
  <li className="team">
    <Side t={t} />
    {cats && <div className="tags">{cats.map((c) => <span key={c} className="tag">{c}</span>)}</div>}
  </li>
)

function Teams({ data }) {
  const [cat, setCat] = useState('Todas')
  const [q, setQ] = useState('')
  // Un equipo inscrito en varias categorías aparece una sola vez, con todas sus categorías.
  const teams = useMemo(() => {
    const map = new Map()
    for (const c of CATS)
      for (const t of data.categorias[c]?.equipos ?? []) {
        const k = t.equipo.toLowerCase()
        if (!map.has(k)) map.set(k, { ...t, cats: [] })
        map.get(k).cats.push(c)
      }
    return [...map.values()].sort((a, b) => a.equipo.localeCompare(b.equipo, 'es'))
  }, [data])
  const shown = teams.filter(
    (t) => (cat === 'Todas' || t.cats.includes(cat)) && `${t.equipo} ${t.institucion}`.toLowerCase().includes(q.toLowerCase()),
  )
  return (
    <section>
      <div className="section-head">
        <div>
          <p className="mono label">Inscritos</p>
          <h2>Equipos</h2>
        </div>
        <span className="chip">{shown.length} de {teams.length}</span>
      </div>
      <div className="filters">
        <label>
          Categoría
          <select value={cat} onChange={(e) => setCat(e.target.value)}>
            {['Todas', ...CATS].map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label>
          Buscar
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Equipo o institución" />
        </label>
      </div>
      <ul className="grid">
        {shown.map((t) => <TeamCard key={t.equipo} t={t} cats={t.cats} />)}
      </ul>
    </section>
  )
}

function Organizer({ data }) {
  const [source, setSource] = useState(null) // { name, rows }
  const [onlyPresent, setOnlyPresent] = useState(true)
  const [result, setResult] = useState(null)
  const [msg, setMsg] = useState('')

  async function onFile(e) {
    const file = e.target.files[0]
    if (!file) return
    try {
      const XLSX = await import('xlsx') // solo el organizador lo necesita
      const wb = XLSX.read(await file.arrayBuffer())
      const ws = wb.Sheets['Checklist'] ?? wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
      if (!rows.length || !('Equipo' in rows[0])) throw new Error('El archivo no tiene la columna "Equipo".')
      setSource({ name: file.name, rows })
      setResult(null)
      setMsg('')
    } catch (err) {
      setMsg(`No se pudo leer el checklist: ${err.message}`)
    }
  }

  const categorias = source ? teamsFromChecklist(source.rows, onlyPresent) : data.categorias
  const total = CATS.map((c) => `${c}: ${categorias[c].equipos.length}`).join(' · ')

  function download() {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'sorteo.json' })
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <section>
      <div className="section-head">
        <div>
          <p className="mono label">Panel del organizador</p>
          <h2>Sorteo</h2>
        </div>
      </div>
      <ol className="steps">
        <li>
          Descarga el checklist desde OneDrive (<em>Archivo › Crear una copia › Descargar</em>) con la columna <b>Presente</b> actualizada.
          <label className="file">
            <input type="file" accept=".xlsx,.xls" onChange={onFile} />
            {source ? `✔ ${source.name}` : 'Cargar checklist (.xlsx)'}
          </label>
          {!source && <p className="small">Sin archivo se usan todos los equipos inscritos publicados.</p>}
          {source && (
            <label className="check">
              <input type="checkbox" checked={onlyPresent} onChange={(e) => setOnlyPresent(e.target.checked)} /> Solo equipos con Presente = Sí
            </label>
          )}
          <p className="mono small">{total}</p>
          {msg && <p className="notice error">{msg}</p>}
        </li>
        <li>
          <button className="btn" onClick={() => setResult(drawAll(categorias))}>{result ? 'Volver a sortear' : 'Sortear'}</button>
        </li>
        <li>
          Descarga <code>sorteo.json</code> y súbelo al repositorio en <code>web/public/sorteo.json</code> (GitHub › Add file › Upload files). La página se actualiza sola en 1–2 minutos.
          <button className="btn alt" disabled={!result} onClick={download}>Descargar sorteo.json</button>
        </li>
      </ol>
      {result && (
        <div className="preview">
          <p className="mono label">Vista previa (aún no es pública)</p>
          {CATS.map((c) => <Category key={c} cat={c} info={result.categorias[c]} fecha={result.fecha} />)}
        </div>
      )}
    </section>
  )
}
