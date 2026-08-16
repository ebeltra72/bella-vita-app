import { useState } from "react";
import { T, F } from "../theme";
import { FRANJAS, opcion } from "../constants";
import { API } from "../api";
import { fmtFecha } from "../utils";
import { Badge, Btn, BtnSm, Card, Input, Label, Select } from "../ui";
import { cobertura, nombreMes, ordenFranja } from "./datos";

// ══════════════════════════════════════════════════════════════════════════════
// ARMAR PLAN
//
// Editor compartido: lo abren tanto Adrián como Ileana. Trabaja en modo
// "agregar al mes": muestra lo que ya está cargado y deja sumar recorridas
// nuevas. Guardar sólo crea las nuevas.
//
// La cobertura avisa qué sucursales quedan sin ninguna recorrida, pero nunca
// bloquea el guardado: un plan incompleto es mejor que ninguno.
// ══════════════════════════════════════════════════════════════════════════════
export default function ArmarPlan({ mes, sucursales = [], existentes = [], onListo, onCancelar }) {
  const [nuevas, setNuevas] = useState([]);
  const [fila, setFila] = useState({ fechaPlan: "", sucursalId: "", franja: "apertura" });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  // La cobertura se calcula sobre lo ya cargado más lo que se está agregando
  const todas = [...existentes.filter(r => r.estado !== "cancelada"), ...nuevas];
  const cob = cobertura(sucursales, todas);

  // Acota el date picker al mes: mejor prevenir la fecha inválida que avisarla
  const ultimoDia = new Date(Number(mes.slice(0,4)), Number(mes.slice(5,7)), 0).getDate();
  const limites = { min: `${mes}-01`, max: `${mes}-${String(ultimoDia).padStart(2,'0')}` };
  const dentroDelMes = fila.fechaPlan.startsWith(mes);
  const duplicada = todas.some(r =>
    r.fechaPlan === fila.fechaPlan &&
    String(r.sucursalId) === String(fila.sucursalId) &&
    r.franja === fila.franja
  );
  const puedeAgregar = fila.fechaPlan && fila.sucursalId && dentroDelMes && !duplicada;

  const agregar = () => {
    if (!puedeAgregar) return;
    const suc = sucursales.find(s => String(s.id) === String(fila.sucursalId));
    setNuevas(n => [...n, {
      id: Date.now() + n.length,
      mes,
      sucursalId: suc.id,
      sucursalNombre: suc.nombre,
      fechaPlan: fila.fechaPlan,
      franja: fila.franja,
      estado: "planificada",
    }]);
    // Se conserva la fecha: cargar varias sucursales del mismo día es lo común
    setFila(f => ({ ...f, sucursalId: "" }));
  };

  const quitar = (id) => setNuevas(n => n.filter(r => r.id !== id));

  const guardar = async () => {
    if (nuevas.length === 0) return;
    setGuardando(true); setError(null);
    try {
      const res = await API.crearRecorridas(nuevas);
      onListo?.(res);
    } catch (e) {
      setError(e.message || "No se pudo guardar el plan");
      setGuardando(false);
    }
  };

  const ordenadas = [...nuevas].sort((a, b) =>
    a.fechaPlan.localeCompare(b.fechaPlan) || ordenFranja(a.franja) - ordenFranja(b.franja)
  );

  return (
    <div>
      <Card>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
          <div>
            <div style={{ fontFamily:F.serif, fontSize:21, fontWeight:700, color:T.primaryDeep }}>
              Armar plan de {nombreMes(mes)}
            </div>
            <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>
              {existentes.length > 0
                ? `Ya hay ${existentes.length} ${existentes.length === 1 ? "recorrida cargada" : "recorridas cargadas"}`
                : "Todavía no hay recorridas cargadas"}
            </div>
          </div>
          <BtnSm variant="ghost" onClick={onCancelar}>Cerrar</BtnSm>
        </div>
      </Card>

      {/* Cobertura */}
      <Card style={{ background: cob.completa ? T.sageBg : T.amberBg, border:`1px solid ${cob.completa ? T.sage : T.amber}33` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: cob.completa ? 0 : 9 }}>
          <span style={{ fontSize:13, fontWeight:700, color: cob.completa ? T.sage : T.amber }}>
            {cob.completa
              ? `✓ Las ${cob.total} sucursales tienen recorrida`
              : `Cobertura ${cob.cubiertas}/${cob.total} sucursales`}
          </span>
        </div>
        {!cob.completa && (
          <>
            <div style={{ fontSize:12, color:T.text, marginBottom:8, lineHeight:1.5 }}>
              Sin recorrida en el mes. Podés guardar igual y completarlo después.
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {cob.faltantes.map(s => (
                <button key={s.id} onClick={() => setFila(f => ({ ...f, sucursalId: String(s.id) }))} style={{
                  background:T.white, border:`1px solid ${T.amber}55`, borderRadius:20,
                  padding:"4px 11px", fontSize:12, color:T.text, fontWeight:600,
                  cursor:"pointer", fontFamily:F.body,
                }}>{s.nombre}</button>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Alta */}
      <Card>
        <div style={{ marginBottom:12 }}>
          <Label>Fecha</Label>
          <Input
            type="date"
            min={limites.min} max={limites.max}
            value={fila.fechaPlan}
            onChange={e => setFila(f => ({ ...f, fechaPlan: e.target.value }))}
            style={fila.fechaPlan && !dentroDelMes ? { border:`1.5px solid ${T.error}` } : undefined}
          />
          {fila.fechaPlan && !dentroDelMes && (
            <div style={{ fontSize:11, color:T.error, marginTop:5 }}>
              La fecha tiene que caer dentro de {nombreMes(mes)}
            </div>
          )}
        </div>

        <div style={{ marginBottom:12 }}>
          <Label>Sucursal</Label>
          <Select value={fila.sucursalId} onChange={e => setFila(f => ({ ...f, sucursalId: e.target.value }))}>
            <option value="">— Elegí una sucursal —</option>
            {sucursales.map(s => (
              <option key={s.id} value={String(s.id)}>
                {s.nombre}{cob.faltantes.some(x => x.id === s.id) ? " · sin recorrida" : ""}
              </option>
            ))}
          </Select>
        </div>

        <div style={{ marginBottom:14 }}>
          <Label>Franja</Label>
          <div style={{ display:"flex", gap:6 }}>
            {FRANJAS.map(fr => {
              const activa = fila.franja === fr.id;
              return (
                <button key={fr.id} onClick={() => setFila(f => ({ ...f, franja: fr.id }))} style={{
                  flex:1, padding:"10px 2px", borderRadius:12,
                  border:`2px solid ${activa ? T.primaryDeep : T.border}`,
                  background:activa ? T.activeSoft : T.inputBg,
                  color:activa ? T.primaryDeep : T.muted,
                  fontWeight:700, cursor:"pointer", fontSize:12, fontFamily:F.body,
                }}>{fr.icono} {fr.label}</button>
              );
            })}
          </div>
        </div>

        {duplicada && (
          <div style={{ background:T.errorBg, color:T.error, borderRadius:10, padding:"9px 12px", fontSize:12, marginBottom:12 }}>
            Esa sucursal ya tiene esa franja ese día.
          </div>
        )}

        <Btn disabled={!puedeAgregar} onClick={agregar}>+ Agregar recorrida</Btn>
      </Card>

      {/* Nuevas por guardar */}
      {ordenadas.length > 0 && (
        <Card>
          <Label>Por guardar ({ordenadas.length})</Label>
          {ordenadas.map(r => {
            const fr = opcion(FRANJAS, r.franja);
            return (
              <div key={r.id} style={{
                display:"flex", justifyContent:"space-between", alignItems:"center", gap:8,
                padding:"9px 0", borderBottom:`1px solid ${T.divider}`,
              }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{r.sucursalNombre}</div>
                  <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>
                    {fmtFecha(`${r.fechaPlan}T00:00:00`)} · {fr?.icono} {fr?.label}
                  </div>
                </div>
                <button onClick={() => quitar(r.id)} style={{
                  border:"none", background:"transparent", color:T.muted, cursor:"pointer", fontSize:14,
                }}>✕</button>
              </div>
            );
          })}
        </Card>
      )}

      {error && (
        <div style={{ background:T.errorBg, color:T.error, borderRadius:12, padding:"12px 14px", fontSize:13, marginBottom:12 }}>
          ⚠ {error}
        </div>
      )}

      <Btn disabled={nuevas.length === 0 || guardando} onClick={guardar}>
        {guardando ? "Guardando…"
          : nuevas.length === 0 ? "Agregá al menos una recorrida"
          : `Guardar ${nuevas.length} ${nuevas.length === 1 ? "recorrida" : "recorridas"}`}
      </Btn>
      <Btn variant="ghost" onClick={onCancelar} style={{ marginTop:8 }}>Cancelar</Btn>
    </div>
  );
}
