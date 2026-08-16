import { T, F } from "../theme";
import { CATEGORIAS, SEMAFORO, opcion } from "../constants";
import { Badge, Btn, Card, Textarea } from "../ui";

// ══════════════════════════════════════════════════════════════════════════════
// CIERRE ESTRUCTURADO
//
// Última pantalla antes del check-out. Bloquea el cierre hasta que estén:
//   · el semáforo
//   · el principal hallazgo (texto)
//   · si tomó una acción, cuál
//   · si dejó pendientes, al menos uno creado
//
// Lo que NO bloquea es el detalle faltante de los hallazgos de la encuesta:
// eso se avisa pero se deja pasar.
// ══════════════════════════════════════════════════════════════════════════════

// ¿Quedó algún pendiente? Haber creado uno ES la respuesta, así que no se le
// vuelve a preguntar. Esta derivación la usan la validación, el render y
// armarVisita en VistaAdrian: vive acá sola para que no se puedan desalinear.
export function dejoPendientes(cierre, pendientesNuevos = []) {
  if (pendientesNuevos.length > 0) return true;
  return cierre.dejoPendientes;
}

// Qué falta para poder finalizar. Se exporta para que VistaAdrian valide igual.
export function faltantesCierre(cierre, pendientesNuevos = []) {
  const faltan = [];
  const dejo = dejoPendientes(cierre, pendientesNuevos);

  if (!cierre.semaforo) faltan.push("Elegí el estado general de la sucursal");
  if (!cierre.hallazgo?.trim()) faltan.push("Escribí el principal hallazgo");
  if (cierre.accionTomada == null) faltan.push("Indicá si tomaste alguna acción");
  if (cierre.accionTomada === true && !cierre.accionDetalle?.trim()) faltan.push("Contá qué acción tomaste");
  if (dejo == null) faltan.push("Indicá si quedó algún pendiente");
  if (dejo === true && pendientesNuevos.length === 0) {
    faltan.push("Creá al menos un pendiente antes de finalizar");
  }
  return faltan;
}

const SiNo = ({ valor, onChange }) => (
  <div style={{ display:"flex", gap:8 }}>
    {[["Sí", true], ["No", false]].map(([label, v]) => {
      const activa = valor === v;
      return (
        <button key={label} onClick={() => onChange(v)} style={{
          flex:1, padding:"11px 0", borderRadius:12,
          border:`2px solid ${activa ? T.primaryDeep : T.border}`,
          background:activa ? T.activeSoft : T.inputBg,
          color:activa ? T.primaryDeep : T.muted,
          fontWeight:700, cursor:"pointer", fontSize:14, fontFamily:F.body,
        }}>{label}</button>
      );
    })}
  </div>
);

const Titulo = ({ children }) => (
  <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:10, lineHeight:1.5 }}>
    {children}
  </div>
);

export default function CierreVisita({
  cierre, setCierre,
  resumen, hallazgos,
  pendientesNuevos, pendientesResueltos,
  onCrearPendiente, onQuitarPendiente,
  onVolver,
}) {
  const set = (k, v) => setCierre(c => ({ ...c, [k]: v }));
  const faltan = faltantesCierre(cierre, pendientesNuevos);

  // Si ya creó pendientes durante la visita, la respuesta es evidente
  const pendientesForzados = dejoPendientes(cierre, pendientesNuevos) === true && pendientesNuevos.length > 0;

  return (
    <div>
      {/* Resumen de la encuesta */}
      <Card>
        <div style={{ fontFamily:F.serif, fontSize:21, fontWeight:700, color:T.primaryDeep, marginBottom:12 }}>
          Resumen de la visita
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12 }}>
          {[
            ["Respondidas", `${resumen.respondidas}/${resumen.total}`, resumen.completa ? T.sage : T.amber],
            ["Hallazgos", resumen.negativas, resumen.negativas > 0 ? T.error : T.sage],
            ["Pendientes", pendientesNuevos.length, pendientesNuevos.length > 0 ? T.amber : T.sage],
          ].map(([l, v, color]) => (
            <div key={l} style={{ background:T.cardSoft, borderRadius:12, padding:"12px 6px", textAlign:"center" }}>
              <div style={{ fontFamily:F.serif, fontSize:24, fontWeight:700, color }}>{v}</div>
              <div style={{ fontSize:10, color:T.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.4px" }}>{l}</div>
            </div>
          ))}
        </div>

        {!resumen.completa && (
          <div style={{ background:T.amberBg, borderRadius:10, padding:"10px 12px", fontSize:12, color:T.amber, marginBottom:8 }}>
            Te quedaron {resumen.total - resumen.respondidas} preguntas sin responder.
            <button onClick={onVolver} style={{
              border:"none", background:"transparent", color:T.amber, textDecoration:"underline",
              cursor:"pointer", fontSize:12, fontFamily:F.body, fontWeight:700, padding:"0 0 0 4px",
            }}>Volver a la encuesta</button>
          </div>
        )}
        {resumen.incompletas.length > 0 && (
          <div style={{ background:T.errorBg, borderRadius:10, padding:"10px 12px", fontSize:12, color:T.error }}>
            ⚠ {resumen.incompletas.length} {resumen.incompletas.length === 1 ? "hallazgo no tiene" : "hallazgos no tienen"} el detalle cargado.
          </div>
        )}

        {pendientesResueltos > 0 && (
          <div style={{ background:T.sageBg, borderRadius:10, padding:"10px 12px", fontSize:12, color:T.sage, marginTop:8 }}>
            ✓ Vas a cerrar {pendientesResueltos} {pendientesResueltos === 1 ? "pendiente anterior" : "pendientes anteriores"}
          </div>
        )}
      </Card>

      {/* Semáforo */}
      <Card>
        <Titulo>¿Cómo encontraste la sucursal?</Titulo>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {SEMAFORO.map(s => {
            const activa = cierre.semaforo === s.id;
            const color = s.badge === "sage" ? T.sage : s.badge === "amber" ? T.amber : T.error;
            const fondo = s.badge === "sage" ? T.sageBg : s.badge === "amber" ? T.amberBg : T.errorBg;
            return (
              <button key={s.id} onClick={() => set("semaforo", s.id)} style={{
                display:"flex", alignItems:"center", gap:10, width:"100%",
                padding:"13px 14px", borderRadius:13, textAlign:"left",
                border:`2px solid ${activa ? color : T.border}`,
                background:activa ? fondo : T.inputBg,
                color:activa ? color : T.muted,
                fontWeight:700, cursor:"pointer", fontSize:14, fontFamily:F.body,
              }}>
                <span style={{ fontSize:18 }}>{s.icono}</span>
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Principal hallazgo */}
      <Card>
        <Titulo>Principal hallazgo de la visita *</Titulo>
        <Textarea
          rows={3}
          placeholder="Lo más importante que Ileana tiene que saber de esta visita…"
          value={cierre.hallazgo || ""}
          onChange={e => set("hallazgo", e.target.value)}
          style={cierre.hallazgo?.trim() ? { borderColor:T.primary } : undefined}
        />
        {hallazgos.length > 0 && (
          <div style={{ marginTop:10 }}>
            <div style={{ fontSize:11, color:T.muted, fontWeight:600, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.5px" }}>
              Detectados en la encuesta · tocá para usar
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {hallazgos.map(({ pregunta, respuesta }) => {
                const texto = String(respuesta?.observacion || respuesta?.productosFaltantes || respuesta?.maquina || pregunta.texto).trim();
                return (
                  <button key={pregunta.id} onClick={() => set("hallazgo", texto)} style={{
                    textAlign:"left", padding:"8px 11px", borderRadius:10,
                    border:`1px solid ${T.border}`, background:T.cardSoft, color:T.text,
                    cursor:"pointer", fontSize:12, fontFamily:F.body, lineHeight:1.4,
                  }}>
                    <span style={{ color:T.muted }}>{pregunta.icono} {pregunta.seccionTitulo} · </span>
                    {texto}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Acción tomada */}
      <Card>
        <Titulo>¿Tomaste alguna acción durante la visita?</Titulo>
        <SiNo valor={cierre.accionTomada ?? null} onChange={v => set("accionTomada", v)} />
        {cierre.accionTomada === true && (
          <div style={{ marginTop:10 }}>
            <Textarea
              rows={2}
              placeholder="¿Cuál?"
              value={cierre.accionDetalle || ""}
              onChange={e => set("accionDetalle", e.target.value)}
              style={cierre.accionDetalle?.trim() ? { borderColor:T.primary } : undefined}
            />
          </div>
        )}
      </Card>

      {/* Pendientes */}
      <Card>
        <Titulo>¿Quedó algún pendiente?</Titulo>
        {pendientesForzados ? (
          <div style={{ background:T.amberBg, borderRadius:11, padding:"11px 13px", fontSize:13, color:T.amber, fontWeight:600 }}>
            Sí — ya creaste {pendientesNuevos.length} en esta visita
          </div>
        ) : (
          <SiNo valor={cierre.dejoPendientes ?? null} onChange={v => set("dejoPendientes", v)} />
        )}

        {pendientesNuevos.map(p => {
          const cat = opcion(CATEGORIAS, p.categoria);
          return (
            <div key={p.id} style={{
              display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8,
              marginTop:10, padding:"11px 13px", borderRadius:11,
              background:T.cardSoft, border:`1px solid ${T.border}`,
            }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:T.muted, marginBottom:3 }}>
                  {cat?.icono} {cat?.label}
                </div>
                <div style={{ fontSize:13, color:T.text, lineHeight:1.4 }}>{p.descripcion}</div>
                {p.responsable && (
                  <div style={{ fontSize:11, color:T.muted, marginTop:3 }}>👤 {p.responsable}</div>
                )}
              </div>
              <button onClick={() => onQuitarPendiente(p.id)} style={{
                border:"none", background:"transparent", color:T.muted, cursor:"pointer", fontSize:14,
              }}>✕</button>
            </div>
          );
        })}

        {dejoPendientes(cierre, pendientesNuevos) === true && (
          <button onClick={onCrearPendiente} style={{
            width:"100%", marginTop:10, padding:"11px", borderRadius:12,
            border:`1.5px dashed ${T.amber}`, background:T.amberBg, color:T.amber,
            fontWeight:700, fontSize:13, fontFamily:F.body, cursor:"pointer",
          }}>
            + Crear pendiente
          </button>
        )}
      </Card>

      {/* Qué falta */}
      {faltan.length > 0 && (
        <Card style={{ background:T.errorBg, border:`1px solid ${T.error}33` }}>
          <div style={{ fontSize:12, fontWeight:700, color:T.error, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.5px" }}>
            Falta para poder finalizar
          </div>
          {faltan.map(f => (
            <div key={f} style={{ fontSize:13, color:T.error, marginBottom:4, lineHeight:1.5 }}>· {f}</div>
          ))}
        </Card>
      )}
    </div>
  );
}
