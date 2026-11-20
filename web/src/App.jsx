import { useEffect, useMemo, useState } from 'react'

import { CATS, isCombat, drawAll, teamsFromChecklist } from './draw.js'
import { parseRows, mergeStatus, toSheetRows, sha256, key as key2 } from './checklist.js'

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
        {data && tab === 'organizador' && <Locked><Organizer data={data} /></Locked>}
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

// shortcut: la clave se comprueba en el navegador (sitio estático); solo impide el acceso casual.
// Sirve porque los datos personales nunca se suben: el archivo se lee localmente. Cambiar con: npm run clave -- "nueva"
const ORG_HASH = '6d540fd11bb3b23dd3e094a1e4b1c50a364738ab0f5f3f315051fa89ba6de1ff'
const STORE = 'electrobot-checklist'
const safe = (fn, fallback) => {
  try {
    return fn()
  } catch {
    return fallback
  }
}

function Locked({ children }) {
  const [ok, setOk] = useState(() => safe(() => sessionStorage.getItem('org') === ORG_HASH, false))
  const [err, setErr] = useState('')
  if (ok) return children
  async function submit(e) {
    e.preventDefault()
    const h = await sha256(new FormData(e.target).get('clave'))
    if (h !== ORG_HASH) return setErr('Contraseña incorrecta.')
    safe(() => sessionStorage.setItem('org', h))
    setOk(true)
  }
  return (
    <section>
      <div className="section-head">
        <div>
          <p className="mono label">Acceso restringido</p>
          <h2>Modo organizador</h2>
        </div>
      </div>
      <form className="filters" onSubmit={submit}>
        <label>
          Contraseña
          <input name="clave" type="password" autoComplete="current-password" required autoFocus />
        </label>
        <button className="btn">Entrar</button>
      </form>
      {err && <p className="notice error" role="alert">{err}</p>}
    </section>
  )
}

function Organizer({ data }) {
  const [list, setList] = useState(() => safe(() => JSON.parse(localStorage.getItem(STORE)), null)) // { name, teams }
  const [onlyPresent, setOnlyPresent] = useState(true)
  const [cat, setCat] = useState('Todas')
  const [q, setQ] = useState('')
  const [result, setResult] = useState(null)
  const [msg, setMsg] = useState('')

  // Guarda cada marca en este navegador para no perderla si se recarga la página.
  useEffect(() => safe(() => (list ? localStorage.setItem(STORE, JSON.stringify(list)) : localStorage.removeItem(STORE))), [list])

  async function load(buffer, name) {
    try {
      const XLSX = await import('xlsx') // solo el organizador lo necesita
      const wb = XLSX.read(buffer)
      const ws = wb.Sheets['Checklist'] ?? wb.Sheets[wb.SheetNames[0]]
      const teams = parseRows(XLSX.utils.sheet_to_json(ws, { defval: '' }))
      if (!teams.length) throw new Error('No hay equipos en el archivo.')
      setList({ name, teams: mergeStatus(teams, list?.teams) })
      setResult(null)
      setMsg('')
    } catch (err) {
      setMsg(`No se pudo leer el archivo: ${err.message}`)
    }
  }

  async function onFile(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (file) load(await file.arrayBuffer(), file.name)
  }

  async function fromRepo() {
    const r = await fetch(`./inscripciones.xlsx?t=${Date.now()}`).catch(() => null)
    if (!r?.ok) return setMsg('No se pudo descargar inscripciones.xlsx del repositorio.')
    load(await r.arrayBuffer(), 'inscripciones.xlsx (repositorio)')
  }

  const update = (k, fn) => setList((l) => ({ ...l, teams: l.teams.map((t) => (t.k === k ? fn(t) : t)) }))
  const set = (k, field, value) => update(k, (t) => ({ ...t, [field]: value }))
  // Para equipos que se inscribieron en la categoría equivocada.
  const toggleCat = (k, c) =>
    update(k, (t) => ({ ...t, catsEditadas: true, cats: CATS.filter((x) => (x === c ? !t.cats.includes(c) : t.cats.includes(x))) }))

  async function exportXlsx() {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toSheetRows(list.teams)), 'Checklist')
    XLSX.writeFile(wb, 'Checklist_Electrobot.xlsx')
  }

  function download() {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'sorteo.json' })
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function reset() {
    if (confirm('¿Borrar el checklist de este navegador? Las marcas de Presente y Revisado se pierden si no exportaste el Excel.')) setList(null)
  }

  const teams = list?.teams ?? []
  const categorias = list ? teamsFromChecklist(teams, onlyPresent) : data.categorias
  const total = CATS.map((c) => `${c}: ${categorias[c].equipos.length}`).join(' · ')
  const shown = teams.filter(
    (t) => (cat === 'Todas' || t.cats.includes(cat)) && key2(`${t.equipo} ${t.institucion} ${t.integrantes.join(' ')}`).includes(key2(q)),
  )
  const inCat = cat === 'Todas' ? teams : teams.filter((t) => t.cats.includes(cat))

  return (
    <section>
      <div className="section-head">
        <div>
          <p className="mono label">Panel del organizador</p>
          <h2>Checklist y sorteo</h2>
        </div>
      </div>
      <ol className="steps">
        <li>
          Usa el Excel de inscripciones del repositorio (<code>web/public/inscripciones.xlsx</code>) o carga uno desde tu equipo (export de Forms o checklist exportado).
          {list && <p className="mono small">✔ {list.name}</p>}
          <div className="chips">
            <button className="btn" onClick={fromRepo}>Usar inscripciones del repositorio</button>
            <label className="file ghost">
              <input type="file" accept=".xlsx,.xls" onChange={onFile} />
              Cargar Excel (.xlsx)
            </label>
          </div>
          {list && <p className="small">Si cargas una versión modificada, se conservan las marcas que ya hiciste.</p>}
          {msg && <p className="notice error" role="alert">{msg}</p>}
        </li>
        {list && (
          <li>
            Marca la llegada y la revisión de cada robot. Se guarda solo en este navegador.
            <div className="chips">
              <span className="chip">{inCat.length} equipos</span>
              <span className="chip ok">{inCat.filter((t) => t.presente).length} presentes</span>
              <span className="chip ok">{inCat.filter((t) => t.revisado).length} revisados</span>
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
                <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Equipo, institución o integrante" />
              </label>
            </div>
            <div className="table-wrap">
              <table className="checklist">
                <thead>
                  <tr>
                    <th>Equipo</th>
                    <th>Presente</th>
                    <th>Revisado</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((t) => (
                    <tr key={t.k} className={t.presente ? 'here' : ''}>
                      <td>
                        <Side t={t} />
                        <fieldset className="cats">
                          <legend className="small">Categorías{t.catsEditadas && ' (corregidas)'}</legend>
                          {CATS.map((c) => (
                            <label key={c} className={`tag ${t.cats.includes(c) ? '' : 'off'}`}>
                              <input type="checkbox" checked={t.cats.includes(c)} onChange={() => toggleCat(t.k, c)} /> {c}
                            </label>
                          ))}
                        </fieldset>
                        {t.integrantes.length > 0 && <p className="small members">{t.integrantes.join(' · ')}</p>}
                      </td>
                      <td>
                        <input type="checkbox" checked={t.presente} onChange={(e) => set(t.k, 'presente', e.target.checked)} aria-label={`${t.equipo} presente`} />
                      </td>
                      <td>
                        <input type="checkbox" checked={t.revisado} onChange={(e) => set(t.k, 'revisado', e.target.checked)} aria-label={`${t.equipo} robot revisado`} />
                      </td>
                      <td>
                        <input type="text" value={t.obs} onChange={(e) => set(t.k, 'obs', e.target.value)} aria-label={`Observaciones de ${t.equipo}`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!shown.length && <p className="notice">Ningún equipo coincide con la búsqueda.</p>}
            </div>
            <div className="chips">
              <button className="btn" onClick={exportXlsx}>Exportar checklist (.xlsx)</button>
              <button className="btn ghost" onClick={reset}>Borrar checklist</button>
            </div>
          </li>
        )}
        <li>
          {!list && <p className="small">Sin archivo se usan todos los equipos inscritos publicados.</p>}
          {list && (
            <label className="check">
              <input type="checkbox" checked={onlyPresent} onChange={(e) => setOnlyPresent(e.target.checked)} /> Sortear solo equipos presentes
            </label>
          )}
          <p className="mono small">{total}</p>
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
