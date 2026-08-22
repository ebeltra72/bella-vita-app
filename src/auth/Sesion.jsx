import { useUser } from "@clerk/react";
import { T, F } from "../theme";
import { rolDe } from "./roles";
import Login from "./Login";
import SinAcceso from "./SinAcceso";
import App from "../App";

// El string del mail no está en un lugar fijo: primaryEmailAddress puede venir
// en null si la cuenta todavía no lo marcó como principal, y el nombre del campo
// dentro del recurso cambió entre versiones del SDK. Se prueban las dos formas
// en vez de apostar a una: equivocarse acá deja afuera a alguien que sí tiene
// permiso, y el síntoma —"Sin acceso" sin mail— no dice por qué.
export function emailDe(user) {
  const recurso = user?.primaryEmailAddress || user?.emailAddresses?.[0] || null;
  return recurso?.emailAddress || recurso?.email || null;
}

// ══════════════════════════════════════════════════════════════════════════════
// SESIÓN
//
// El portón de la app. Cuatro estados y nada más:
//
//   cargando      Clerk todavía no resolvió si hay sesión
//   sin sesión    → Login
//   sin permiso   → Sin acceso
//   con permiso   → App, con el rol adentro
//
// ⚠ Esto decide qué pantallas se ven, no a qué datos se llega: las functions de
// api/ siguen respondiendo a cualquiera que sepa las URLs.
// ══════════════════════════════════════════════════════════════════════════════
export default function Sesion() {
  const { isLoaded, isSignedIn, user } = useUser();

  // Sin esto parpadea el login por un instante en cada carga, incluso para quien
  // ya tiene sesión: isSignedIn arranca en undefined hasta que Clerk resuelve.
  if (!isLoaded) return (
    <div style={{
      minHeight:"100vh", background:T.bgApp, display:"flex", alignItems:"center",
      justifyContent:"center", color:T.muted, fontFamily:F.body, fontSize:15,
    }}>
      Cargando…
    </div>
  );

  if (!isSignedIn) return <Login/>;

  const email = emailDe(user);
  const rol = rolDe(email);

  if (!rol) return <SinAcceso email={email}/>;

  return <App rol={rol}/>;
}
