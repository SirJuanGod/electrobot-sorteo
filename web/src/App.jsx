import { useEffect, useMemo, useState } from 'react'

import { CATS, isCombat, drawAll, teamsFromChecklist, bracket, roundName } from './draw.js'
import * as fb from './firebase.js'
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

  // Sorteo y ganadores en vivo desde Firebase (si está configurado).
  const [live, setLive] = useState(null)
  useEffect(() => {
    if (!fb.enabled) return
    let off
    let gone = false
    fb.watch(setLive, () => setError('Sin conexión a los resultados en vivo. Recarga la página.')).then((u) => (gone ? u() : (off = u)))
    return () => {
      gone = true
      off?.()
    }
  }, [])
  const view = useMemo(() => data && merge(data, live), [data, live])

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
        {view && tab === 'organizador' && <Locked><Organizer data={view} live={live} /></Locked>}
        {view && tab === 'equipos' && <Teams data={view} />}
        {view && current?.cat && <Category cat={current.cat} info={view.categorias[current.cat]} fecha={view.fecha} />}
      </main>

      <footer>
        <span>Electrobot USC · Rama Estudiantil IEEE</span>
        <a href="#organizador">Organizador</a>
      </footer>
    </>
  )
}

// Los equipos inscritos salen de sorteo.json (se genera desde inscripciones.xlsx); el sorteo y los ganadores, de Firebase.
const merge = (base, live) =>
  !live
    ? base
    : {
        fecha: live.fecha,
        categorias: Object.fromEntries(
          CATS.map((c) => [c, { equipos: base.categorias[c]?.equipos ?? [], sorteo: live.categorias?.[c]?.sorteo ?? null, ganadores: live.categorias?.[c]?.ganadores ?? {} }]),
        ),
      }

function Category({ cat, info, fecha, onPick }) {
  const teams = info?.equipos ?? []
  const sorteo = info?.sorteo
  return (
    <section>
      <div className="section-head">
        <div>
          <p className="mono label">{isCombat(cat) ? 'Enfrentamientos' : 'Orden de salida'}</p>
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

      {sorteo && isCombat(cat) && <Bracket info={info} onPick={onPick} />}

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

function Bracket({ info, onPick }) {
  const rounds = bracket(info.sorteo, info.ganadores)
  const champ = rounds.at(-1)?.[0]?.w
  const slot = (m, side, r, i) => {
    const t = m[side]
    if (!t) return <p className="bye">Por definir</p>
    const win = m.w === t && m.b !== null // un BYE no es una victoria
    if (!onPick || !m.a || !m.b) return <Side t={t} win={win} />
    return (
      <button type="button" className={`pick ${win ? 'win' : ''}`} aria-pressed={win} onClick={() => onPick(r, i, win ? null : t.equipo)}>
        <Side t={t} win={win} />
      </button>
    )
  }
  return (
    <>
      {champ && (
        <p className="champion">
          🏆 Campeón: <strong>{champ.equipo}</strong> <span>{champ.institucion}</span>
        </p>
      )}
      {onPick && <p className="small">Toca al equipo ganador de cada combate; tócalo de nuevo para deshacer.</p>}
      {rounds.map((round, r) => (
        <div key={r} className="round">
          <h3 className="mono label">{roundName(r, rounds.length)}</h3>
          <ol className="grid matches">
            {round.map((m, i) => (
              <li key={i} className={`match ${m.w ? 'done' : ''}`}>
                <span className="mono label">Combate {String(i + 1).padStart(2, '0')}</span>
                {slot(m, 'a', r, i)}
                <span className="vs mono">{m.b === null ? 'BYE' : 'VS'}</span>
                {m.b === null ? <p className="bye">Pasa directo a la siguiente ronda</p> : slot(m, 'b', r, i)}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </>
  )
}

const Side = ({ t, win }) => (
  <div className="side">
    <strong>
      {t.equipo}
      {win && <span className="won"> ✔ Ganador</span>}
    </strong>
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

// Sin Firebase: la clave se comprueba en el navegador; solo impide el acceso casual. Cambiar con: npm run clave -- "nueva"
// Con Firebase la contraseña es la de la cuenta del organizador y la protegen las reglas de la base de datos.
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
  const [ok, setOk] = useState(() => !fb.enabled && safe(() => sessionStorage.getItem('org') === ORG_HASH, false))
  const [err, setErr] = useState('')
  useEffect(() => {
    if (!fb.enabled) return
    let off
    fb.onUser(setOk).then((u) => (off = u))
    return () => off?.()
  }, [])
  if (ok) return children
  async function submit(e) {
    e.preventDefault()
    const clave = new FormData(e.target).get('clave')
    if (fb.enabled)
      return fb.login(clave).catch((e) => {
        console.error(e)
        setErr(e.code === 'auth/network-request-failed' ? 'Sin conexión. Intenta de nuevo.' : 'Contraseña incorrecta.')
      })
    const h = await sha256(clave)
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

function Organizer({ data, live }) {
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

  async function publish() {
    if (live && !confirm('Ya hay un sorteo publicado. Si publicas este, se reemplaza y se borran los ganadores registrados. ¿Continuar?')) return
    try {
      await fb.save('', result)
      setResult(null)
      setMsg('')
    } catch {
      setMsg('No se pudo publicar. Revisa la conexión o vuelve a entrar como organizador.')
    }
  }

  const pick = (cat) => (r, i, equipo) =>
    fb.save(`categorias/${cat}/ganadores/${r}-${i}`, equipo).catch(() => setMsg('No se pudo guardar el ganador. Revisa la conexión.'))

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
          {fb.enabled ? (
            <>
              Revisa la vista previa y publica. El público ve los combates al instante.
              <button className="btn alt" disabled={!result} onClick={publish}>Publicar sorteo</button>
            </>
          ) : (
            <>
              Descarga <code>sorteo.json</code> y súbelo al repositorio en <code>web/public/sorteo.json</code> (GitHub › Add file › Upload files). La página se actualiza sola en 1–2 minutos.
              <button className="btn alt" disabled={!result} onClick={download}>Descargar sorteo.json</button>
            </>
          )}
        </li>
        <li>
          Marca los ganadores. La siguiente ronda se arma sola.
          {!fb.enabled && <p className="notice">Para registrar ganadores en vivo, configura Firebase (ver README).</p>}
          {fb.enabled && !live && <p className="small">Aún no hay sorteo publicado.</p>}
          {fb.enabled && live && (
            <div className="results">
              {CATS.filter(isCombat).map((c) => <Category key={c} cat={c} info={data.categorias[c]} fecha={data.fecha} onPick={pick(c)} />)}
            </div>
          )}
          {fb.enabled && <button className="btn ghost" onClick={() => fb.logout()}>Cerrar sesión</button>}
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
