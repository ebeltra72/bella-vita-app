import { SignOutButton } from "@clerk/react";
import { T, F } from "../theme";

// ══════════════════════════════════════════════════════════════════════════════
// SIN ACCESO
//
// La cuenta entró bien a Google pero no está en la lista. Sin redirección: se
// queda acá con el mail a la vista, que es el dato que hace falta para resolverlo
// —casi siempre es que entró con otra cuenta de Google, no que le falte permiso—
// y con el botón para salir y probar con la correcta.
// ══════════════════════════════════════════════════════════════════════════════
export default function SinAcceso({ email }) {
  return (
    <div style={{
      minHeight:"100vh", background:T.bgApp, display:"flex", alignItems:"center",
      justifyContent:"center", padding:"32px 16px",
    }}>
      <div style={{
        background:T.card, borderRadius:18, boxShadow:T.shadowCard, border:`1px solid ${T.border}`,
        padding:"34px 28px", maxWidth:420, width:"100%", textAlign:"center",
      }}>
        <div style={{
          width:62, height:62, borderRadius:"50%", background:T.errorBg, color:T.error,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:28, margin:"0 auto 16px",
        }}>🔒</div>

        <div style={{ fontFamily:F.serif, fontSize:23, fontWeight:700, color:T.text, marginBottom:8 }}>
          Sin acceso
        </div>

        <div style={{ fontSize:14, color:T.muted, lineHeight:1.6, marginBottom:16 }}>
          Esta cuenta no tiene permiso para entrar a la app de Bella Vita.
        </div>

        {email && (
          <div style={{
            background:T.cardSoft, border:`1px solid ${T.border}`, borderRadius:11,
            padding:"10px 13px", fontSize:13, color:T.text, marginBottom:18, wordBreak:"break-all",
          }}>
            Entraste como <strong>{email}</strong>
          </div>
        )}

        <div style={{ fontSize:12, color:T.muted2, lineHeight:1.55, marginBottom:20 }}>
          Si tenés más de una cuenta de Google, probá cerrar sesión y entrar con la
          que usás para Bella Vita. Si el mail es el correcto, pedile a Esteban que
          lo habilite.
        </div>

        <SignOutButton>
          <button style={{
            width:"100%", padding:"13px", borderRadius:13, border:"none", cursor:"pointer",
            fontFamily:F.body, fontSize:14, fontWeight:700,
            background:T.primary, color:T.white, boxShadow:T.shadowBtn,
          }}>
            Cerrar sesión
          </button>
        </SignOutButton>
      </div>
    </div>
  );
}
