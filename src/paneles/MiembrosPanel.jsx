import { useState } from "react";
import { T, F } from "../theme";
import { Badge, Btn, BtnSm, Card, Input, Label } from "../ui";

// ══════════════════════════════════════════════════════════════════════════════
// PANEL ILEANA – MIEMBROS DEL EQUIPO
// ══════════════════════════════════════════════════════════════════════════════
export default function MiembrosPanel({ equipo, setEquipo }) {
  const [nuevo, setNuevo] = useState({ nombre:"", rol:"Gestión comercial", enRanking:true });

  const agregar = () => {
    if (!nuevo.nombre.trim()) return;
    const id = nuevo.nombre.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now();
    setEquipo(e => [...e, { id, ...nuevo, nombre:nuevo.nombre.trim() }]);
    setNuevo({ nombre:"", rol:"Gestión comercial", enRanking:true });
  };

  const toggleRanking = (id) => {
    setEquipo(e => e.map(m => m.id===id ? {...m, enRanking:!m.enRanking} : m));
  };

  const eliminar = (id) => {
    setEquipo(e => e.filter(m => m.id!==id));
  };

  return (
    <div style={{ padding:"18px 16px" }}>
      <Card>
        <div style={{ fontFamily:F.serif, fontSize:18, fontWeight:700, color:T.primaryDeep, marginBottom:14 }}>Agregar miembro</div>
        <div style={{ marginBottom:12 }}>
          <Label>Nombre</Label>
          <Input placeholder="Ej: Laura" value={nuevo.nombre} onChange={e=>setNuevo(n=>({...n,nombre:e.target.value}))}/>
        </div>
        <div style={{ marginBottom:14 }}>
          <Label>Rol</Label>
          <Input placeholder="Gestión comercial" value={nuevo.rol} onChange={e=>setNuevo(n=>({...n,rol:e.target.value}))}/>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
          <button onClick={()=>setNuevo(n=>({...n,enRanking:!n.enRanking}))} style={{
            width:44, height:24, borderRadius:12, border:"none", cursor:"pointer",
            background:nuevo.enRanking?T.gold:T.border, transition:"background .2s", position:"relative",
          }}>
            <div style={{ width:18, height:18, borderRadius:"50%", background:T.white, position:"absolute", top:3, transition:"left .2s", left:nuevo.enRanking?22:3 }}/>
          </button>
          <span style={{ fontSize:13, color:T.text }}>Incluir en el ranking</span>
        </div>
        <Btn onClick={agregar} disabled={!nuevo.nombre.trim()}>+ Agregar miembro</Btn>
      </Card>

      <Label>Miembros actuales ({equipo.length})</Label>
      {equipo.map(m => (
        <div key={m.id} style={{ background:T.card, borderRadius:14, padding:"13px 16px", boxShadow:T.shadowList, marginBottom:10 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontWeight:700, fontSize:14, color:T.text }}>{m.nombre}</div>
              <div style={{ fontSize:12, color:T.muted }}>{m.rol}</div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <button onClick={()=>toggleRanking(m.id)} style={{
                width:44, height:24, borderRadius:12, border:"none", cursor:"pointer",
                background:m.enRanking?T.gold:T.border, transition:"background .2s", position:"relative",
              }}>
                <div style={{ width:18, height:18, borderRadius:"50%", background:T.white, position:"absolute", top:3, transition:"left .2s", left:m.enRanking?22:3 }}/>
              </button>
              <BtnSm variant="danger" onClick={()=>eliminar(m.id)}>✕</BtnSm>
            </div>
          </div>
          {m.enRanking && <div style={{ marginTop:8 }}><Badge color="gold">🏆 En ranking</Badge></div>}
        </div>
      ))}
    </div>
  );
}
