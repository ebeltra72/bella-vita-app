import { SignIn } from "@clerk/react";
import { LOGO_SRC, T, F } from "../theme";

// ══════════════════════════════════════════════════════════════════════════════
// LOGIN
//
// El <SignIn/> de Clerk muestra los métodos que estén habilitados en el
// Dashboard, no los que diga el código: para que salga sólo "Continuar con
// Google" hay que dejar Google como única SSO connection y apagar el resto en
// User & authentication. Si acá aparece un campo de contraseña, el que está mal
// configurado es el Dashboard.
// ══════════════════════════════════════════════════════════════════════════════
export default function Login() {
  return (
    <div style={{
      minHeight:"100vh", background:T.bgApp, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", padding:"32px 16px", gap:26,
    }}>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
        <img
          src={LOGO_SRC}
          alt="Bella Vita"
          style={{ width:64, height:64, borderRadius:18, objectFit:"cover", boxShadow:T.shadowCard }}
        />
        <div style={{ textAlign:"center" }}>
          <div style={{ fontFamily:F.logo, fontSize:28, fontWeight:700, color:T.coralLogo, lineHeight:1.1 }}>
            Bella Vita
          </div>
          <div style={{ fontSize:11, fontWeight:600, color:T.muted2, textTransform:"uppercase", letterSpacing:"2px", marginTop:4 }}>
            Gestión Operativa
          </div>
        </div>
      </div>

      <SignIn/>
    </div>
  );
}
