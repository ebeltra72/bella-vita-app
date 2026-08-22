// ══════════════════════════════════════════════════════════════════════════════
// ROLES
//
// Quién ve qué, derivado del mail con el que entró por Google. Sin JSX y sin
// dependencias, para poder probarlo aparte.
//
// El allowlist vive en el código y no en env vars: son tres direcciones, no son
// secretas, y una VITE_* tampoco las escondería —todo lo que empieza con VITE_
// se hornea en el bundle y se lee con devtools—. Ponerlas acá al menos deja
// claro que son públicas.
//
// ⚠ Esto es control de interfaz, no de acceso a los datos. Las functions de
// api/ no piden autenticación: decide qué pantallas ve cada uno, no qué puede
// leer o escribir quien sepa las URLs.
// ══════════════════════════════════════════════════════════════════════════════

export const ROLES = {
  adrian: "adrian",
  ileana: "ileana",
  admin:  "admin",
};

// Un mail por persona. Si alguien entra con otra cuenta de Google —aunque sea
// un alias del mismo buzón— cae en "Sin acceso": Clerk devuelve el mail de la
// cuenta, no el del alias.
const POR_EMAIL = {
  "adriancornejo320@gmail.com": ROLES.adrian,
  "ileana.ismael@gmail.com":    ROLES.ileana,
  "esteban@rtm.com.ar":         ROLES.admin,
};

// Normalizado: Google puede devolver mayúsculas, y un allowlist estricto
// rebotaría a la persona correcta por una diferencia que no significa nada.
export const rolDe = (email) => {
  const clave = String(email || "").trim().toLowerCase();
  return POR_EMAIL[clave] || null;
};

// ─── Qué habilita cada rol ───────────────────────────────────────────────────
// Las claves son los ids de VISTAS en App.jsx. El admin ve todo, que es lo mismo
// que ve hoy cualquiera: este cambio no le saca nada.
const VISTAS_POR_ROL = {
  [ROLES.adrian]: ["adrian"],
  [ROLES.ileana]: ["ileana"],
  [ROLES.admin]:  ["adrian", "equipo", "ileana"],
};

export const vistasDe = (rol) => VISTAS_POR_ROL[rol] || [];

export const puedeVer = (rol, vista) => vistasDe(rol).includes(vista);

// Con qué pantalla arranca cada uno. Ileana y el admin caen en el tablero, que
// es el resumen; Adrián en la suya, que es donde trabaja.
export const vistaInicial = (rol) => (rol === ROLES.adrian ? "adrian" : "ileana");
