import { useState } from "react";
import { T, F } from "./theme";
import { API } from "./api";
import { hoy } from "./utils";
import { Btn, Card, Input, Label } from "./ui";
import RankingEquipo from "./paneles/RankingEquipo";

// ══════════════════════════════════════════════════════════════════════════════
// VISTA EQUIPO
// ══════════════════════════════════════════════════════════════════════════════
export default function VistaEquipo({ equipo, registros, setRegistros, meta }) {
  const [tab, setTab] = useState("carga"); // carga | ranking
  const [persona, setPersona] = useState("");
  const [form, setForm] = useState({ mensajes:"", turnos:"", senias:"", nota:"" });
  const [guardado, setGuardado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const miembro = equipo.find(x => x.id===persona);
  const fechaHoy = hoy();
  const yaCargoHoy = persona && registros.some(r => r.personaId===persona && r.fecha===fechaHoy);
  const registroHoy = registros.find(r => r.personaId===persona && r.fecha===fechaHoy);

  const guardar = async () => {
    if (!persona||!form.mensajes||!form.turnos||!form.senias) return;
    const nuevo = { id:yaCargoHoy?registroHoy.id:Date.now(), personaId:persona, personaNombre:miembro.nombre, fecha:fechaHoy, mensajes:Number(form.mensajes), turnos:Number(form.turnos), senias:Number(form.senias), nota:form.nota, editado:yaCargoHoy?new Date().toISOString():null };
    setGuardando(true);
    try { await API.saveRegistro(nuevo); } catch {}
    setRegistros(prev => { const sin=prev.filter(r=>!(r.personaId===persona&&r.fecha===fechaHoy)); return [nuevo,...sin]; });
    setGuardando(false); setGuardado(true);
  };

  if (guardado) return (
    <div style={{ padding:"18px 16px" }}>
      <Card className="bvpop" style={{ textAlign:"center", padding:"44px 20px" }}>
        <div style={{ width:74, height:74, borderRadius:"50%", background:T.goldSoft, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, margin:"0 auto 16px" }}>🎯</div>
        <div style={{ fontFamily:F.serif, fontSize:24, fontWeight:700, color:T.gold, marginBottom:6 }}>¡Números guardados!</div>
        <div style={{ color:T.muted, fontSize:14, marginBottom:20 }}>{miembro?.nombre} · {new Date().toLocaleDateString("es-AR",{day:"2-digit",month:"long"})}</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:24 }}>
          {[["💬","Mensajes",form.mensajes],["📅","Turnos",form.turnos],["🤝","Señas",form.senias]].map(([e,l,v]) => (
            <div key={l} style={{ background:T.goldSoft, borderRadius:12, padding:"12px 8px" }}>
              <div style={{ fontSize:20 }}>{e}</div>
              <div style={{ fontFamily:F.serif, fontSize:22, fontWeight:700, color:T.gold }}>{v}</div>
              <div style={{ fontSize:11, color:T.muted }}>{l}</div>
            </div>
          ))}
        </div>
        <Btn variant="ghost" onClick={() => { setPersona(""); setForm({mensajes:"",turnos:"",senias:"",nota:""}); setGuardado(false); }}>Volver al inicio</Btn>
      </Card>
    </div>
  );

  return (
    <div style={{ padding:"18px 16px" }}>
      {/* Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        {[["carga","📝 Mis números"],["ranking","🏆 Ranking"]].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{
            flex:1, padding:"10px 0", borderRadius:12, border:"none", cursor:"pointer",
            fontFamily:F.body, fontSize:13, fontWeight:700,
            background:tab===t?T.gold:T.goldSoft,
            color:tab===t?T.white:T.gold,
            boxShadow:tab===t?T.shadowBtn:"none",
            transition:"all .15s",
          }}>{l}</button>
        ))}
      </div>

      {tab==="ranking" && <RankingEquipo equipo={equipo} registros={registros} meta={meta}/>}

      {tab==="carga" && <>
      <div style={{ fontFamily:F.serif, fontSize:26, fontWeight:700, color:T.gold, marginBottom:4 }}>Equipo comercial 💼</div>
      <div style={{ color:T.muted, fontSize:14, marginBottom:18 }}>Cargá tus números del día.</div>

      <Card>
        <Label>¿Quién sos?</Label>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {equipo.map(m => (
            <button key={m.id} onClick={() => { setPersona(m.id); setGuardado(false); setForm({mensajes:"",turnos:"",senias:"",nota:""}); }} style={{
              padding:"9px 18px", borderRadius:22, border:"2px solid "+(persona===m.id?T.gold:T.border),
              background:persona===m.id?T.goldSoft:T.inputBg, color:persona===m.id?T.gold:T.muted,
              fontWeight:700, cursor:"pointer", fontSize:13, fontFamily:F.body, transition:"all .1s",
            }}>{m.nombre}</button>
          ))}
        </div>
      </Card>

      {persona && yaCargoHoy && !guardado && (
        <Card style={{ background:T.goldSoft, border:`1px solid ${T.gold}` }}>
          <div style={{ color:T.gold, fontWeight:700, fontSize:13, marginBottom:10 }}>✓ Ya cargaste tus números hoy</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:14 }}>
            {[["💬","Mensajes",registroHoy.mensajes],["📅","Turnos",registroHoy.turnos],["🤝","Señas",registroHoy.senias]].map(([e,l,v]) => (
              <div key={l} style={{ background:T.white, borderRadius:10, padding:"10px 6px", textAlign:"center" }}>
                <div style={{ fontSize:18 }}>{e}</div>
                <div style={{ fontFamily:F.serif, fontSize:20, fontWeight:700, color:T.gold }}>{v}</div>
                <div style={{ fontSize:11, color:T.muted }}>{l}</div>
              </div>
            ))}
          </div>
          <Btn variant="ghost" onClick={() => { setForm({mensajes:String(registroHoy.mensajes),turnos:String(registroHoy.turnos),senias:String(registroHoy.senias),nota:registroHoy.nota||""}); setGuardado(false); }}>✏ Corregir números</Btn>
        </Card>
      )}

      {persona && !yaCargoHoy && (
        <Card>
          <div style={{ fontFamily:F.serif, fontSize:18, fontWeight:700, color:T.gold, marginBottom:16 }}>
            {new Date().toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"})}
          </div>
          {[["mensajes","💬 Mensajes enviados"],["turnos","📅 Turnos gestionados"],["senias","🤝 Señas confirmadas"]].map(([k,l]) => (
            <div key={k} style={{ marginBottom:14 }}>
              <Label>{l}</Label>
              <Input type="number" placeholder="0" value={form[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))}/>
            </div>
          ))}
          <div style={{ marginBottom:16 }}>
            <Label>Nota (opcional)</Label>
            <textarea rows={2} placeholder="Comentarios del día..." value={form.nota} onChange={e => setForm(f => ({...f,nota:e.target.value}))}
              style={{ width:"100%", padding:"11px 13px", borderRadius:12, border:`1.5px solid ${T.border}`, background:T.inputBg, fontSize:14, color:T.text, outline:"none", fontFamily:F.body, resize:"vertical" }}/>
          </div>
          <Btn variant="gold" disabled={!form.mensajes||!form.turnos||!form.senias||guardando} onClick={guardar}>
            {guardando?"Guardando…":"Guardar números"}
          </Btn>
        </Card>
      )}
      </>}
    </div>
  );
}
