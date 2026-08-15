import { useState, useEffect } from "react";
import { LOGO_SRC, T, F } from "./theme";
import { SUCURSALES_INIT, PREGUNTAS_INIT, EQUIPO_INIT, META_INIT } from "./constants";
import { API } from "./api";
import { useLocalStorage } from "./utils";

import VistaAdrian from "./visita/VistaAdrian";
import VistaEquipo from "./VistaEquipo";

import HistorialPanel from "./paneles/HistorialPanel";
import GestionComercialPanel from "./paneles/GestionComercialPanel";
import EncuestaPanel from "./paneles/EncuestaPanel";
import SucursalesPanel from "./paneles/SucursalesPanel";
import KmPanel from "./paneles/KmPanel";
import InventarioPanel from "./paneles/InventarioPanel";
import MiembrosPanel from "./paneles/MiembrosPanel";

// ══════════════════════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [vista, setVista] = useState("adrian");
  const [tabIleana, setTabIleana] = useState("historial");
  const [preguntas,  setPreguntas]  = useLocalStorage("bv_preguntas",  PREGUNTAS_INIT);
  const [sucursales, setSucursales] = useLocalStorage("bv_sucursales", SUCURSALES_INIT);
  const [equipo, setEquipo]         = useLocalStorage("bv_equipo",     EQUIPO_INIT);
  const [meta,       setMeta]       = useLocalStorage("bv_meta",       META_INIT);
  const [visitas,    setVisitas]    = useState([]);
  const [registros,  setRegistros]  = useState([]);
  const [cargando,   setCargando]   = useState(true);

  useEffect(() => {
    Promise.all([API.getVisitas(), API.getRegistros()])
      .then(([v,r]) => { setVisitas(v); setRegistros(r); })
      .catch(()=>{})
      .finally(()=>setCargando(false));
  }, []);

  const VISTAS = [["adrian","🗺 Adrián"],["equipo","💼 Equipo"],["ileana","👩‍💼 Ileana"]];
  const TABS   = [["historial","📋 Visitas"],["gestion","💜 Comercial"],["inventario","📦 Stock"],["encuesta","📝 Encuesta"],["sucursales","📍 Sucursales"],["km","🚗 Km"],["miembros","👥 Equipo"]];

  return (
    <div style={{ minHeight:"100vh", background:T.bgApp, fontFamily:F.body, color:T.text, WebkitFontSmoothing:"antialiased" }}>
      {/* HEADER */}
      <div style={{ background:T.white, borderBottom:`1px solid ${T.border}`, padding:"10px 16px", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <img src={LOGO_SRC} alt="Bella Vita" style={{ width:38, height:38, borderRadius:11, objectFit:"cover", boxShadow:"0 2px 8px rgba(180,130,100,0.18)" }}/>
            <div>
              <div style={{ fontFamily:F.logo, fontSize:23, fontWeight:600, color:T.coralLogo, lineHeight:1 }}>Bella Vita</div>
              <div style={{ fontSize:10, fontWeight:600, color:T.muted2, textTransform:"uppercase", letterSpacing:"2px" }}>Gestión Comercial</div>
            </div>
          </div>
        </div>
        {/* Main tabs */}
        <div style={{ display:"flex", gap:6 }}>
          {VISTAS.map(([v,l])=>(
            <button key={v} onClick={()=>setVista(v)} style={{
              flex:1, padding:"8px 0", borderRadius:22, border:"none", cursor:"pointer",
              fontFamily:F.body, fontSize:12, fontWeight:600,
              background:vista===v?T.primary:T.activeSoft,
              color:vista===v?T.white:T.primaryDeep,
              boxShadow:vista===v?T.shadowBtn:"none",
              transition:"all .15s",
            }}>{l}</button>
          ))}
        </div>
      </div>

      {cargando && (
        <div style={{ textAlign:"center", padding:48, color:T.muted }}>
          <div style={{ fontFamily:F.serif, fontSize:20, marginBottom:8 }}>Cargando…</div>
        </div>
      )}

      {!cargando && vista==="adrian" && <VistaAdrian sucursales={sucursales} preguntas={preguntas} visitas={visitas} setVisitas={setVisitas}/>}
      {!cargando && vista==="equipo" && <VistaEquipo equipo={equipo} registros={registros} setRegistros={setRegistros} meta={meta}/>}
      {!cargando && vista==="ileana" && (
        <>
          <div style={{ background:T.white, borderBottom:`1px solid ${T.divider}`, padding:"0 14px", display:"flex", gap:2, overflowX:"auto", position:"sticky", top:84, zIndex:99 }}>
            {TABS.map(([t,l])=>(
              <button key={t} onClick={()=>setTabIleana(t)} style={{
                padding:"12px 10px 10px", border:"none", background:"none", cursor:"pointer",
                fontFamily:F.body, fontSize:12, fontWeight:600, whiteSpace:"nowrap",
                color:tabIleana===t?T.primaryDeep:T.muted2,
                borderBottom:tabIleana===t?`2px solid ${T.primaryDeep}`:"2px solid transparent",
                transition:"all .15s",
              }}>{l}</button>
            ))}
          </div>
          {tabIleana==="historial"  && <HistorialPanel visitas={visitas} preguntas={preguntas}/>}
          {tabIleana==="gestion"    && <GestionComercialPanel registros={registros} equipo={equipo} meta={meta} setMeta={setMeta}/>}
          {tabIleana==="encuesta"   && <EncuestaPanel preguntas={preguntas} setPreguntas={setPreguntas}/>}
          {tabIleana==="sucursales" && <SucursalesPanel sucursales={sucursales} setSucursales={setSucursales}/>}
          {tabIleana==="km"         && <KmPanel visitas={visitas}/>}
          {tabIleana==="inventario"  && <InventarioPanel/>}
          {tabIleana==="miembros"    && <MiembrosPanel equipo={equipo} setEquipo={setEquipo}/>}
        </>
      )}
    </div>
  );
}
