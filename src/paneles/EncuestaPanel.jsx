import { useState } from "react";
import { T, F } from "../theme";
import { Badge, Btn, BtnSm, Card, Input, Label } from "../ui";

// ══════════════════════════════════════════════════════════════════════════════
// PANEL ILEANA – ENCUESTA
// ══════════════════════════════════════════════════════════════════════════════
export default function EncuestaPanel({ preguntas, setPreguntas }) {
  const [nueva, setNueva] = useState(""); const [tipo, setTipo] = useState("bool");
  const [editandoId, setEditandoId] = useState(null); const [editTexto, setEditTexto] = useState("");
  return (
    <div style={{ padding:"18px 16px" }}>
      <Card>
        <div style={{ fontFamily:F.serif, fontSize:18, fontWeight:700, color:T.primaryDeep, marginBottom:14 }}>Nueva pregunta</div>
        <div style={{ marginBottom:12 }}><Label>Texto</Label><Input placeholder="¿Ej: Verificó apertura de caja?" value={nueva} onChange={e=>setNueva(e.target.value)}/></div>
        <div style={{ marginBottom:14 }}>
          <Label>Tipo de respuesta</Label>
          <div style={{ display:"flex", gap:8 }}>
            {[["bool","Sí / No"],["texto","Texto libre"],["foto","📷 Foto"]].map(([v,l])=>(
              <button key={v} onClick={()=>setTipo(v)} style={{ flex:1, padding:"9px 0", borderRadius:12, border:`2px solid ${tipo===v?T.primaryDeep:T.border}`, background:tipo===v?T.activeSoft:T.inputBg, color:tipo===v?T.primaryDeep:T.muted, fontWeight:700, cursor:"pointer", fontSize:12, fontFamily:F.body }}>{l}</button>
            ))}
          </div>
        </div>
        <Btn onClick={()=>{ if(!nueva.trim())return; setPreguntas(p=>[...p,{id:Date.now(),texto:nueva.trim(),tipo}]); setNueva(""); }}>+ Agregar pregunta</Btn>
      </Card>
      <Label>Preguntas actuales ({preguntas.length})</Label>
      {preguntas.map((p,i)=>(
        <div key={p.id} style={{ background:T.card, borderRadius:14, padding:"12px 14px", boxShadow:T.shadowList, marginBottom:8 }}>
          {editandoId===p.id ? (
            <div>
              <Input value={editTexto} onChange={e=>setEditTexto(e.target.value)} style={{ marginBottom:10 }}/>
              <div style={{ display:"flex", gap:8 }}>
                <BtnSm onClick={()=>{ setPreguntas(pp=>pp.map(x=>x.id===p.id?{...x,texto:editTexto}:x)); setEditandoId(null); }}>Guardar</BtnSm>
                <BtnSm variant="ghost" onClick={()=>setEditandoId(null)}>Cancelar</BtnSm>
              </div>
            </div>
          ) : (
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
              <div style={{ flex:1 }}><span style={{ fontSize:11, color:T.muted2, marginRight:5 }}>{i+1}.</span><span style={{ fontSize:14, color:T.text }}>{p.texto}</span><span style={{ marginLeft:8 }}><Badge color={p.tipo==="bool"?"sage":p.tipo==="foto"?"terr":"amber"}>{p.tipo==="bool"?"Sí/No":p.tipo==="foto"?"📷 Foto":"Texto"}</Badge></span></div>
              <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                <BtnSm variant="ghost" onClick={()=>{ setEditandoId(p.id); setEditTexto(p.texto); }}>✏</BtnSm>
                <BtnSm variant="danger" onClick={()=>setPreguntas(pp=>pp.filter(x=>x.id!==p.id))}>✕</BtnSm>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
