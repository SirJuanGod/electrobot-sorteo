// Pega aquí la configuración de tu app web de Firebase (Consola › Configuración del proyecto › Tus apps).
// No es secreta: lo que protege los datos son las reglas de la base de datos (ver README).
// Mientras sea null, la web funciona sin resultados en vivo (sorteo.json + contraseña local).
const CONFIG = null

// Cuenta del organizador creada en Firebase Authentication (correo/contraseña). En la web solo se pide la contraseña.
export const ORG_EMAIL = 'organizador@electrobot-usc.com'

export const enabled = Boolean(CONFIG || import.meta.env.VITE_FB_EMULATOR)

let ctx
// Firebase se descarga solo si está configurado, para no pesar en la web pública.
function fb() {
  ctx ??= (async () => {
    const [{ initializeApp }, db, auth] = await Promise.all([import('firebase/app'), import('firebase/database'), import('firebase/auth')])
    const emu = import.meta.env.VITE_FB_EMULATOR // solo para pruebas locales
    const app = initializeApp(CONFIG ?? { apiKey: 'demo', projectId: 'demo-electrobot', databaseURL: `http://${emu}:9000?ns=demo-electrobot-default-rtdb` })
    const f = { ...db, ...auth, db: db.getDatabase(app), auth: auth.getAuth(app) }
    if (emu && !CONFIG) {
      db.connectDatabaseEmulator(f.db, emu, 9000)
      auth.connectAuthEmulator(f.auth, `http://${emu}:9099`, { disableWarnings: true })
    }
    return f
  })()
  return ctx
}

// Escucha /torneo en vivo. Devuelve la función para dejar de escuchar.
export async function watch(cb, onError) {
  const f = await fb()
  return f.onValue(f.ref(f.db, 'torneo'), (s) => cb(s.val()), onError)
}

// Escribe en /torneo/<path> ('' = todo el torneo); value null borra.
export async function save(path, value) {
  const f = await fb()
  await f.set(f.ref(f.db, path ? `torneo/${path}` : 'torneo'), value)
}

export async function login(password) {
  const f = await fb()
  await f.signInWithEmailAndPassword(f.auth, ORG_EMAIL, password)
}

export async function logout() {
  const f = await fb()
  await f.signOut(f.auth)
}

export async function onUser(cb) {
  const f = await fb()
  return f.onAuthStateChanged(f.auth, (u) => cb(u?.email === ORG_EMAIL))
}
