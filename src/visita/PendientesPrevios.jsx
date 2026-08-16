import { T, F } from "../theme";
import { CATEGORIAS, PRIORIDADES, opcion } from "../constants";
import { estaVencido, fmtFecha, textoVencimiento } from "../utils";
import { Badge, Btn, Card, Textarea } from "../ui";

// ══════════════════════════════════════════════════════════════════════════════
// PENDIENTES PREVIOS
//
// Primera pantalla después del check-in: qué quedó abierto de visitas
// anteriores en esta sucursal. Adrián puede marcar avances acá mismo.
//
// Las resoluciones NO se mandan al toque: se acumulan y viajan con el
// check-out, igual que los pendientes nuevos. Así la visita es atómica.
// ══════════════════════════════════════════════════════════════════════════════

const ACCIONES = [
  { id: null,           label: "Sigue abierto" },
  { id: "en_progreso",  label: "En progreso"   },
  { id: "resuelto",     label: "Resuelto"      },
];

export default function PendientesPrevios({
  pendientes, cargando, resoluciones, setResoluciones, onContinuar,
}) {
  const marcar = (id, estado) => {
    setResoluciones(r => {
      const next = { ...r };
      if (estado === null) delete next[id];
      else next[id] = { ...(next[id] || {}), estado };
      return next;
    });
  };

  const comentar = (id, comentarioCierre) => {
    setResoluciones(r => ({ ...r, [id]: { ...(r[id] || {}), comentarioCierre } }));
  };

  const resueltos = Object.values(resoluciones).filter(r => r.estado === "resuelto").length;

  if (cargando) return (
    <Card style={{ textAlign:"center", padding:"36px 20px", color:T.muted }}>
      Buscando pendientes de visitas anteriores…
    </Card>
  );

  if (pendientes.length === 0) return (
    <>
      <Card style={{ textAlign:"center", padding:"32px 20px" }}>
        <div style={{ fontSize:34, marginBottom:10 }}>✨</div>
        <div style={{ fontFamily:F.serif, fontSize:20, fontWeight:700, color:T.sage, marginBottom:6 }}>
          Sin pendientes abiertos
        </div>
        <div style={{ fontSize:13, color:T.muted }}>
          Esta sucursal no arrastra nada de visitas anteriores.
        </div>
      </Card>
      <Btn onClick={onContinuar}>Comenzar la encuesta →</Btn>
    </>
  );

  return (
    <>
      <Card style={{ background:T.amberBg, border:`1px solid ${T.amber}44` }}>
        <div style={{ fontFamily:F.serif, fontSize:20, fontWeight:700, color:T.amber, marginBottom:4 }}>
          ⚠ {pendientes.length} {pendientes.length === 1 ? "pendiente abierto" : "pendientes abiertos"}
        </div>
        <div style={{ fontSize:13, color:T.text, lineHeight:1.5 }}>
          Quedaron de visitas anteriores a esta sucursal. Revisalos y marcá lo que
          hayas podido avanzar.
        </div>
      </Card>

      {pendientes.map(p => {
        const cat = opcion(CATEGORIAS, p.categoria);
        const pri = opcion(PRIORIDADES, p.prioridad);
        const vencido = estaVencido(p);
        const resolucion = resoluciones[p.id];
        const elegido = resolucion?.estado ?? null;
        const venceTxt = textoVencimiento(p.fechaLimite);

        return (
          <Card key={p.id} style={vencido ? { borderLeft:`4px solid ${T.error}` } : undefined}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:8 }}>
              <span style={{ fontSize:12, color:T.muted, fontWeight:600 }}>
                {cat?.icono} {cat?.label || p.categoria}
              </span>
              <div style={{ display:"flex", gap:5, flexShrink:0 }}>
                {pri && <Badge color={pri.badge}>{pri.label}</Badge>}
                {vencido && <Badge color="error">Vencido</Badge>}
              </div>
            </div>

            <div style={{ fontSize:14, color:T.text, lineHeight:1.5, marginBottom:8 }}>
              {p.descripcion}
            </div>

            {p.accionCorrectiva && (
              <div style={{ fontSize:12, color:T.muted, marginBottom:8, lineHeight:1.5 }}>
                <strong style={{ color:T.text }}>Acción propuesta:</strong> {p.accionCorrectiva}
              </div>
            )}

            <div style={{ display:"flex", flexWrap:"wrap", gap:10, fontSize:11, color:T.muted, marginBottom:12 }}>
              {p.responsable && <span>👤 {p.responsable}</span>}
              {p.fechaLimite && (
                <span style={{ color: vencido ? T.error : T.muted }}>
                  📅 {fmtFecha(p.fechaLimite)}{venceTxt ? ` · ${venceTxt}` : ""}
                </span>
              )}
              {p.evidenciaUrl && (
                <a href={p.evidenciaUrl} target="_blank" rel="noreferrer" style={{ color:T.primary, fontWeight:600 }}>
                  Ver foto 📷
                </a>
              )}
            </div>

            <div style={{ display:"flex", gap:6 }}>
              {ACCIONES.map(a => {
                const activa = elegido === a.id;
                const esResuelto = a.id === "resuelto";
                return (
                  <button key={a.label} onClick={() => marcar(p.id, a.id)} style={{
                    flex:1, padding:"9px 2px", borderRadius:11,
                    border:`2px solid ${activa ? (esResuelto ? T.sage : T.primaryDeep) : T.border}`,
                    background:activa ? (esResuelto ? T.sageBg : T.activeSoft) : T.inputBg,
                    color:activa ? (esResuelto ? T.sage : T.primaryDeep) : T.muted,
                    fontWeight:700, cursor:"pointer", fontSize:12, fontFamily:F.body,
                  }}>{a.label}</button>
                );
              })}
            </div>

            {elegido === "resuelto" && (
              <div style={{ marginTop:10 }}>
                <span style={{ display:"block", fontSize:11, fontWeight:600, color:T.muted, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.5px" }}>
                  ¿Cómo se resolvió? (opcional)
                </span>
                <Textarea
                  rows={2}
                  placeholder="Comentario de cierre…"
                  value={resolucion?.comentarioCierre || ""}
                  onChange={e => comentar(p.id, e.target.value)}
                />
              </div>
            )}
          </Card>
        );
      })}

      {resueltos > 0 && (
        <div style={{
          background:T.sageBg, borderRadius:12, padding:"11px 14px",
          fontSize:13, color:T.sage, fontWeight:600, marginBottom:12,
        }}>
          ✓ Vas a cerrar {resueltos} {resueltos === 1 ? "pendiente" : "pendientes"} al terminar la visita
        </div>
      )}

      <Btn onClick={onContinuar}>Comenzar la encuesta →</Btn>
    </>
  );
}
