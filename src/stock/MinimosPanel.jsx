import { useState } from "react";
import { T, F } from "../theme";
import { RUBRO_ICONOS } from "../constants";
import { API } from "../api";
import { Btn, BtnSm, Card, Input, Label } from "../ui";
import { agruparPorRubro, fmtCantidad, productosSinMinimo } from "./datos";

// ══════════════════════════════════════════════════════════════════════════════
// PANEL ILEANA – STOCK MÍNIMOS
//
// Sólo aparecen los productos que tienen un mínimo definido. El catálogo tiene
// más de 80 y obligar a definirlos todos sería pedirle a Ileana que configure
// 80 números para usar la función. Un producto sin mínimo no alerta nunca, y
// quitarle el mínimo a un producto es la forma de apagar una alerta molesta.
//
// El estado vive en InventarioPanel: editar un mínimo acá tiene que repintar al
// instante el historial de controles de la otra solapa.
// ══════════════════════════════════════════════════════════════════════════════
export default function MinimosPanel({ minimos, setMinimos }) {
  const [borradores, setBorradores] = useState({});   // { producto: string }
  const [ocupado, setOcupado] = useState(null);       // producto en curso
  const [quitando, setQuitando] = useState(null);     // producto a confirmar
  const [error, setError] = useState(null);
  const [alta, setAlta] = useState(null);             // { producto, minimo }

  const grupos = agruparPorRubro(minimos);
  const disponibles = productosSinMinimo(minimos);
  const hayDisponibles = disponibles.length > 0;

  const reemplazar = (m) => setMinimos(prev => {
    const otros = prev.filter(x => x.producto !== m.producto);
    return [...otros, m].sort((a, b) => a.producto.localeCompare(b.producto, "es"));
  });

  const guardar = async (producto, valor) => {
    const minimo = Number(String(valor).replace(",", "."));
    if (!Number.isFinite(minimo) || minimo < 0) {
      setError(`Mínimo inválido para ${producto}`);
      return;
    }
    setOcupado(producto); setError(null);
    try {
      const m = await API.definirMinimo({ producto, minimo });
      if (m) reemplazar(m);
      setBorradores(b => { const n = { ...b }; delete n[producto]; return n; });
      setAlta(null);
    } catch (e) {
      setError(e.message || "No se pudo guardar el mínimo");
    } finally {
      setOcupado(null);
    }
  };

  const quitar = async (producto) => {
    setOcupado(producto); setError(null);
    try {
      await API.quitarMinimo(producto);
      setMinimos(prev => prev.filter(x => x.producto !== producto));
    } catch (e) {
      setError(e.message || "No se pudo quitar el mínimo");
    } finally {
      setOcupado(null); setQuitando(null);
    }
  };

  return (
    <>
      <Card>
        <div style={{ fontFamily:F.serif, fontSize:20, fontWeight:700, color:T.primaryDeep, marginBottom:4 }}>
          Stock mínimo por producto
        </div>
        <div style={{ fontSize:13, color:T.muted, lineHeight:1.5 }}>
          Un mínimo por producto, igual para las 7 sucursales. Cuando un control
          queda por debajo, aparece como alerta en el Dashboard hasta que el
          control siguiente lo muestre repuesto.
        </div>
      </Card>

      {error && (
        <Card style={{ background:T.errorBg, border:`1px solid ${T.error}` }}>
          <div style={{ fontSize:13, color:T.error, lineHeight:1.5 }}>⚠ {error}</div>
        </Card>
      )}

      {/* ─── ALTA ──────────────────────────────────────────────────────────── */}
      {alta ? (
        <Card>
          <Label>Producto</Label>
          <select
            value={alta.producto}
            onChange={e => setAlta(a => ({ ...a, producto: e.target.value }))}
            style={{
              width:"100%", padding:"11px 13px", borderRadius:12, border:`1.5px solid ${T.border}`,
              background:T.inputBg, fontSize:14, color:T.text, outline:"none",
              fontFamily:F.body, cursor:"pointer",
            }}
          >
            <option value="">— Elegí un producto —</option>
            {disponibles.map(g => (
              <optgroup key={g.rubro} label={`${RUBRO_ICONOS[g.rubro] || "📦"} ${g.rubro}`}>
                {g.productos.map(p => <option key={p} value={p}>{p}</option>)}
              </optgroup>
            ))}
          </select>

          <div style={{ marginTop:12 }}>
            <Label>Mínimo</Label>
            <Input
              type="number" min="0" step="0.5" placeholder="0"
              value={alta.minimo}
              onChange={e => setAlta(a => ({ ...a, minimo: e.target.value }))}
            />
          </div>

          <div style={{ display:"flex", gap:8, marginTop:14 }}>
            <Btn
              style={{ flex:2 }}
              disabled={!alta.producto || alta.minimo === "" || ocupado !== null}
              onClick={() => guardar(alta.producto, alta.minimo)}
            >
              {ocupado ? "Guardando…" : "Definir mínimo"}
            </Btn>
            <Btn variant="ghost" style={{ flex:1 }} onClick={() => { setAlta(null); setError(null); }}>
              Cancelar
            </Btn>
          </div>
        </Card>
      ) : (
        <Btn
          variant="ghost"
          disabled={!hayDisponibles}
          onClick={() => setAlta({ producto:"", minimo:"" })}
          style={{ marginBottom:12 }}
        >
          {hayDisponibles ? "+ Definir el mínimo de un producto" : "Todos los productos tienen mínimo"}
        </Btn>
      )}

      {minimos.length === 0 && (
        <Card style={{ textAlign:"center", padding:"32px 20px" }}>
          <div style={{ fontSize:34, marginBottom:10 }}>🎯</div>
          <div style={{ fontFamily:F.serif, fontSize:19, fontWeight:700, color:T.primaryDeep, marginBottom:6 }}>
            Todavía no hay mínimos definidos
          </div>
          <div style={{ fontSize:13, color:T.muted, lineHeight:1.5 }}>
            Sin mínimos no se genera ninguna alerta. Empezá por los productos que
            no pueden faltar.
          </div>
        </Card>
      )}

      {/* ─── DEFINIDOS ─────────────────────────────────────────────────────── */}
      {grupos.map(({ rubro, items }) => (
        <Card key={rubro || "otros"}>
          <div style={{ fontSize:12, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:10 }}>
            {rubro ? `${RUBRO_ICONOS[rubro] || "📦"} ${rubro}` : "📌 Fuera del catálogo"} · {items.length}
          </div>

          {items.map(m => {
            const borrador = borradores[m.producto];
            const cambiado = borrador !== undefined && borrador !== String(m.minimo);
            const confirmando = quitando === m.producto;

            return (
              <div key={m.producto} style={{ padding:"9px 0", borderTop:`1px solid ${T.divider}` }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ flex:1, fontSize:13, color:T.text, minWidth:0 }}>{m.producto}</span>
                  <Input
                    type="number" min="0" step="0.5"
                    value={borrador ?? String(m.minimo)}
                    onChange={e => setBorradores(b => ({ ...b, [m.producto]: e.target.value }))}
                    style={{
                      width:76, padding:"6px 8px", textAlign:"center", fontSize:14,
                      border:`1.5px solid ${cambiado ? T.primary : T.border}`,
                      background: cambiado ? T.activeSoft : T.inputBg,
                    }}
                  />
                </div>

                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, marginTop:6 }}>
                  <span style={{ fontSize:11, color:T.muted2 }}>
                    {cambiado ? `Antes: ${fmtCantidad(m.minimo)}` : `Mínimo ${fmtCantidad(m.minimo)}`}
                  </span>

                  <span style={{ display:"flex", gap:6, flexShrink:0 }}>
                    {cambiado ? (
                      <>
                        <BtnSm onClick={() => guardar(m.producto, borrador)}>
                          {ocupado === m.producto ? "…" : "Guardar"}
                        </BtnSm>
                        <BtnSm variant="ghost" onClick={() =>
                          setBorradores(b => { const n = { ...b }; delete n[m.producto]; return n; })
                        }>Cancelar</BtnSm>
                      </>
                    ) : confirmando ? (
                      <>
                        <BtnSm variant="danger" onClick={() => quitar(m.producto)}>
                          {ocupado === m.producto ? "…" : "Quitar mínimo"}
                        </BtnSm>
                        <BtnSm variant="ghost" onClick={() => setQuitando(null)}>No</BtnSm>
                      </>
                    ) : (
                      <BtnSm variant="ghost" onClick={() => setQuitando(m.producto)}>Quitar</BtnSm>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </Card>
      ))}
    </>
  );
}
