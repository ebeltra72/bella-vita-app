import { useState } from "react";
import { T, F } from "../theme";
import { Btn, BtnSm, Card, Input, Label } from "../ui";

// ══════════════════════════════════════════════════════════════════════════════
// PANEL ILEANA – SUCURSALES
// ══════════════════════════════════════════════════════════════════════════════
export default function SucursalesPanel({ sucursales, setSucursales }) {
  const [nueva, setNueva] = useState({nombre:"",lat:"",lng:""});
  const [editandoId, setEditandoId] = useState(null); const [editDatos, setEditDatos] = useState({});
  return (
    <div style={{ padding:"18px 16px" }}>
      <Card>
        <div style={{ fontFamily:F.serif, fontSize:18, fontWeight:700, color:T.primaryDeep, marginBottom:14 }}>Nueva sucursal</div>
        {[["nombre","Nombre","text","Ej: Villa Crespo"],["lat","Latitud","number","-34.6037"],["lng","Longitud","number","-58.3816"]].map(([k,l,t,ph])=>(
          <div key={k} style={{ marginBottom:12 }}><Label>{l}</Label><Input type={t} placeholder={ph} value={nueva[k]} onChange={e=>setNueva(n=>({...n,[k]:e.target.value}))}/></div>
        ))}
        <Btn onClick={()=>{ if(!nueva.nombre.trim()||!nueva.lat||!nueva.lng)return; setSucursales(ss=>[...ss,{id:Date.now(),nombre:nueva.nombre.trim(),lat:parseFloat(nueva.lat),lng:parseFloat(nueva.lng)}]); setNueva({nombre:"",lat:"",lng:""}); }}>+ Agregar sucursal</Btn>
      </Card>
      {sucursales.map(suc=>(
        <div key={suc.id} style={{ background:T.card, borderRadius:14, padding:"12px 14px", boxShadow:T.shadowList, marginBottom:8 }}>
          {editandoId===suc.id ? (
            <div>
              {[["nombre","Nombre","text"],["lat","Latitud","number"],["lng","Longitud","number"]].map(([k,l,t])=>(
                <div key={k} style={{ marginBottom:10 }}><Label>{l}</Label><Input type={t} value={editDatos[k]} onChange={e=>setEditDatos(d=>({...d,[k]:e.target.value}))}/></div>
              ))}
              <div style={{ display:"flex", gap:8 }}>
                <BtnSm onClick={()=>{ setSucursales(ss=>ss.map(x=>x.id===suc.id?{...x,...editDatos,lat:parseFloat(editDatos.lat),lng:parseFloat(editDatos.lng)}:x)); setEditandoId(null); }}>Guardar</BtnSm>
                <BtnSm variant="ghost" onClick={()=>setEditandoId(null)}>Cancelar</BtnSm>
              </div>
            </div>
          ) : (
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div><div style={{ fontWeight:600, fontSize:14, color:T.text }}>{suc.nombre}</div><div style={{ fontSize:11, color:T.muted }}>{suc.lat}, {suc.lng}</div></div>
              <div style={{ display:"flex", gap:6 }}>
                <BtnSm variant="ghost" onClick={()=>{ setEditandoId(suc.id); setEditDatos({nombre:suc.nombre,lat:suc.lat,lng:suc.lng}); }}>✏</BtnSm>
                <BtnSm variant="danger" onClick={()=>setSucursales(ss=>ss.filter(x=>x.id!==suc.id))}>✕</BtnSm>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
