import { useState } from "react";
import { T, F } from "../theme";
import { CATEGORIAS, PRIORIDADES } from "../constants";
import { Btn, FotoUploader, Input, Label, Select, Textarea } from "../ui";

// ══════════════════════════════════════════════════════════════════════════════
// FORMULARIO DE PENDIENTE
//
// Se usa en tres lugares:
//   · desde la encuesta  → prellenado con la categoría y el texto de la pregunta
//   · desde el cierre    → prellenado sólo con la categoría, o vacío
//   · desde el panel     → vacío, categoría 'otro'
//
// No persiste nada: arma el objeto y lo entrega por onGuardar. Durante una visita
// los pendientes se acumulan en memoria y se mandan todos juntos en el check-out;
// en el panel de Ileana el caller los guarda al toque.
// ══════════════════════════════════════════════════════════════════════════════
export default function PendienteForm({
  inicial = {},
  equipo = [],
  sucursal,
  visitaId,
  titulo = "Nuevo pendiente",
  onGuardar,
  onCancelar,
}) {
  const [form, setForm] = useState({
    categoria: inicial.categoria || "otro",
    descripcion: inicial.descripcion || "",
    accionCorrectiva: inicial.accionCorrectiva || "",
    responsable: inicial.responsable || "",
    fechaLimite: inicial.fechaLimite || "",
    prioridad: inicial.prioridad || "media",
    evidenciaUrl: inicial.evidenciaUrl || null,
  });

  // El responsable sale del equipo, con escape a texto libre
  const nombresEquipo = equipo.map(m => m.nombre);
  const [responsableOtro, setResponsableOtro] = useState(
    !!form.responsable && !nombresEquipo.includes(form.responsable)
  );

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const descripcionOk = form.descripcion.trim().length > 0;

  const guardar = () => {
    if (!descripcionOk) return;
    onGuardar({
      id: Date.now(),
      visitaId: visitaId ?? null,
      sucursalId: sucursal?.id ?? null,
      sucursalNombre: sucursal?.nombre ?? "",
      categoria: form.categoria,
      descripcion: form.descripcion.trim(),
      accionCorrectiva: form.accionCorrectiva.trim() || null,
      responsable: form.responsable.trim() || null,
      fechaLimite: form.fechaLimite || null,
      prioridad: form.prioridad,
      estado: "abierto",
      evidenciaUrl: form.evidenciaUrl || null,
      preguntaId: inicial.preguntaId || null,
      seguimiento: [],
    });
  };

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:200, background:"rgba(59,46,41,0.45)",
      display:"flex", alignItems:"flex-end", justifyContent:"center",
    }} onClick={onCancelar}>
      <div className="bvpop" onClick={e => e.stopPropagation()} style={{
        background:T.card, width:"100%", maxWidth:520, maxHeight:"92vh", overflowY:"auto",
        borderTopLeftRadius:22, borderTopRightRadius:22, padding:"20px 18px 24px",
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ fontFamily:F.serif, fontSize:21, fontWeight:700, color:T.primaryDeep }}>
            ⚠ {titulo}
          </div>
          <button onClick={onCancelar} style={{
            border:"none", background:T.cardSoft, color:T.muted, cursor:"pointer",
            borderRadius:20, width:32, height:32, fontSize:15,
          }}>✕</button>
        </div>

        <div style={{ marginBottom:14 }}>
          <Label>Categoría</Label>
          <Select value={form.categoria} onChange={e => set("categoria", e.target.value)}>
            {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.icono} {c.label}</option>)}
          </Select>
        </div>

        <div style={{ marginBottom:14 }}>
          <Label>¿Qué hay que resolver? *</Label>
          <Textarea
            rows={3}
            placeholder="Describí el pendiente…"
            value={form.descripcion}
            onChange={e => set("descripcion", e.target.value)}
            style={!descripcionOk ? { borderColor:T.border } : { borderColor:T.primary }}
          />
        </div>

        <div style={{ marginBottom:14 }}>
          <Label>Acción correctiva propuesta</Label>
          <Textarea
            rows={2}
            placeholder="Qué habría que hacer (opcional)"
            value={form.accionCorrectiva}
            onChange={e => set("accionCorrectiva", e.target.value)}
          />
        </div>

        <div style={{ marginBottom:14 }}>
          <Label>Responsable</Label>
          {!responsableOtro ? (
            <Select
              value={form.responsable}
              onChange={e => {
                if (e.target.value === "__otro__") { setResponsableOtro(true); set("responsable", ""); }
                else set("responsable", e.target.value);
              }}
            >
              <option value="">— Sin asignar —</option>
              {equipo.map(m => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
              <option value="__otro__">Otro (escribir)…</option>
            </Select>
          ) : (
            <div style={{ display:"flex", gap:8 }}>
              <Input
                placeholder="Nombre del responsable"
                value={form.responsable}
                onChange={e => set("responsable", e.target.value)}
              />
              <button onClick={() => { setResponsableOtro(false); set("responsable", ""); }} style={{
                border:`1.5px solid ${T.border}`, background:T.inputBg, color:T.muted,
                borderRadius:12, padding:"0 14px", cursor:"pointer", fontSize:12,
                fontFamily:F.body, whiteSpace:"nowrap",
              }}>Lista</button>
            </div>
          )}
        </div>

        <div style={{ marginBottom:14 }}>
          <Label>Fecha límite</Label>
          <Input type="date" value={form.fechaLimite} onChange={e => set("fechaLimite", e.target.value)} />
        </div>

        <div style={{ marginBottom:14 }}>
          <Label>Prioridad</Label>
          <div style={{ display:"flex", gap:6 }}>
            {PRIORIDADES.map(p => {
              const activa = form.prioridad === p.id;
              return (
                <button key={p.id} onClick={() => set("prioridad", p.id)} style={{
                  flex:1, padding:"10px 2px", borderRadius:12,
                  border:`2px solid ${activa ? T.primaryDeep : T.border}`,
                  background:activa ? T.activeSoft : T.inputBg,
                  color:activa ? T.primaryDeep : T.muted,
                  fontWeight:700, cursor:"pointer", fontSize:12, fontFamily:F.body,
                }}>{p.label}</button>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom:18 }}>
          <Label>Evidencia</Label>
          <FotoUploader
            visitaId={visitaId}
            sucursal={sucursal?.nombre}
            tipo="pendiente"
            value={form.evidenciaUrl}
            onChange={url => set("evidenciaUrl", url)}
          />
        </div>

        <Btn disabled={!descripcionOk} onClick={guardar}>
          {descripcionOk ? "Guardar pendiente" : "Escribí qué hay que resolver"}
        </Btn>
        <Btn variant="ghost" onClick={onCancelar} style={{ marginTop:8 }}>Cancelar</Btn>
      </div>
    </div>
  );
}
