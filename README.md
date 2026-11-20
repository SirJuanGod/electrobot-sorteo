# Electrobot USC · Sorteo de competencia

Web pública (React + Vite) con los enfrentamientos de **Sumo Colegios** y **Minisumo PRO** y el orden de salida de **Robot Laberinto**.

## Flujo del día

1. **Entrar como organizador.** En la web abre `#organizador` (enlace "Organizador" en el pie) e ingresa la contraseña.
2. **Checklist.** Pulsa **Usar inscripciones del repositorio** (lee `web/public/inscripciones.xlsx`) o carga un Excel desde tu equipo. Marca *Presente*, *Revisado* y *Observaciones*. Si un equipo se inscribió en la categoría equivocada, corrígela en su fila. Todo se guarda en ese navegador. **Exportar checklist (.xlsx)** te da una copia.
3. **Sortear.** Con "Sortear solo equipos presentes" pulsa **Sortear**, revisa la vista previa y pulsa **Publicar sorteo**. El público ve sus combates al instante.
4. **Ganadores.** En el mismo panel toca al ganador de cada combate (tócalo otra vez para deshacer). La siguiente ronda se arma sola hasta la final; los BYE avanzan solos. El público lo ve en vivo sin recargar.

Laberinto solo tiene orden de salida.

## Inscripciones (`web/public/inscripciones.xlsx`)

Para cambiar equipos, edita ese Excel en GitHub (descárgalo, modifícalo y súbelo con el mismo nombre). Al hacer commit en `main`, GitHub Actions vuelve a generar la lista pública de equipos y publica en 1–2 minutos. No hay que correr ningún script.

> El archivo es público: solo tiene ID, equipo, institución y categoría. **Nunca subas el export completo de Forms**: trae cédulas, celulares y correos.

## Configurar Firebase (una sola vez, gratis)

Sin esto la web funciona, pero no hay sorteo ni ganadores en vivo (se usa `sorteo.json` y la contraseña local).

1. En [console.firebase.google.com](https://console.firebase.google.com) crea un proyecto (puedes desactivar Analytics).
2. **Compilación › Realtime Database › Crear base de datos** (ubicación cualquiera, modo bloqueado). En la pestaña **Reglas** pega el contenido de `database.rules.json` y publica.
3. **Compilación › Authentication › Comenzar › Correo electrónico/contraseña: habilitar**. En **Usuarios › Agregar usuario** crea `organizador@electrobot-usc.com` con la contraseña que usarán los organizadores. No hace falta que el correo exista.
4. **Configuración del proyecto › Tus apps › Web (`</>`)**: registra la app y copia el objeto `firebaseConfig`.
5. En GitHub edita `web/src/firebase.js` y reemplaza `const CONFIG = null` por `const CONFIG = { ...lo que copiaste... }`. Haz commit en `main`.

La configuración no es secreta. Lo que protege los datos son las reglas: todos pueden leer, y solo la cuenta del organizador puede escribir. Si cambias el correo del organizador, cámbialo también en `database.rules.json` (y en Firebase) y en `ORG_EMAIL` de `web/src/firebase.js`.

### Sin Firebase: contraseña local

La contraseña local se verifica en el navegador; solo impide el acceso casual. Para cambiarla: `cd web && npm run clave -- "NuevaClave"` y copia el hash en `ORG_HASH` de `web/src/App.jsx`.

## Desarrollo

```bash
cd web
npm install
npm run dev
```

## Publicar por primera vez

1. Crea un repositorio en GitHub y sube esta carpeta (`git push`).
2. En el repo: **Settings › Pages › Source: GitHub Actions**.
3. La web queda en `https://<usuario>.github.io/<repo>/`.
