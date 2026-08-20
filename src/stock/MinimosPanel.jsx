import { useState } from "react";
import { T, F } from "../theme";
import { CATALOGO, RUBRO_ICONOS } from "../constants";
import { API } from "../api";
import { Btn, BtnSm, Card } from "../ui";
import { indexarMinimos, rubroDe } from "./datos";

const RUBROS = Object.keys(CATALOGO);

// ══════════════════════════════════════════════════════════════════════════════
// PANEL ILEANA – STOCK MÍNIMOS
//
// Se elige un rubro y se cargan todos sus productos de una sentada, como el
// control de inventario de Adrián: mismo gesto, misma lista, un solo guardado al
// final. Producto por producto era demasiado tedioso para 80 productos.
//
// Un campo vacío significa "sin mínimo", y sin mínimo el producto no alerta
// nunca. Vaciar un campo que tenía valor es la forma de apagar una alerta.
//
// El estado vive en InventarioPanel: guardar acá repinta al instante el
// historial de controles de la otra solapa.
// ══════════════════════════════════════════════════════════════════════════════
export default function MinimosPanel({ minimos, setMinimos }) {
  const [rubro, setRubro] = useState(null);
  // Los borradores se guardan por producto y NO se limpian al cambiar de rubro:
  // ir a mirar otro rubro y volver no puede hacerte perder lo que tipeaste.
  const [borradores, setBorradores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [quitando, setQuitando] = useState(null);

  const porProducto = indexarMinimos(minimos);
  const productos = rubro ? (CATALOGO[rubro] || []) : [];

  // Lo que se ve en el input: el borrador si lo tocaste, si no el valor
  // guardado, si no vacío (y el placeholder "—" marca que no tiene mínimo).
  const valorDe = (prod) => {
    if (borradores[prod] !== undefined) return borradores[prod];
    return porProducto[prod] !== undefined ? String(porProducto[prod]) : "";
  };

  const escribir = (prod, valor) => {
    setResultado(null);
    setBorradores(b => ({ ...b, [prod]: valor }));
  };

  // ─── DIFF DEL RUBRO ────────────────────────────────────────────────────────
  // Se manda sólo lo que cambió y no los 28 productos del rubro: el estado final
  // es idéntico y son 28 requests menos por guardado.
  const cambios = { definir: [], quitar: [], invalidos: [] };
  for (const prod of productos) {
    const bruto = borradores[prod];
    if (bruto === undefined) continue;                       // no se tocó

    const txt = String(bruto).trim().replace(",", ".");
    const actual = porProducto[prod];

    if (txt === "") {
      if (actual !== undefined) cambios.quitar.push(prod);    // se vació: sin mínimo
      continue;
    }

    const n = Number(txt);
    if (!Number.isFinite(n) || n < 0) { cambios.invalidos.push(prod); continue; }
    if (actual === undefined || n !== actual) cambios.definir.push({ producto: prod, minimo: n });
  }

  const totalCambios = cambios.definir.length + cambios.quitar.length;
  const puedeGuardar = totalCambios > 0 && cambios.invalidos.length === 0 && !guardando;

  const guardar = async () => {
    setGuardando(true); setError(null); setResultado(null);

    const definidas = [];
    const quitados = [];
    try {
      for (const d of cambios.definir) {
        const m = await API.definirMinimo(d);
        definidas.push(m || { producto: d.producto, minimo: d.minimo });
      }
      for (const prod of cambios.quitar) {
        await API.quitarMinimo(prod);
        quitados.push(prod);
      }
      setResultado({ definidos: definidas.length, quitados: quitados.length });
    } catch (e) {
      // Corta en el primero que falla. Lo que ya se guardó se refleja igual, y
      // lo que no sigue en el borrador para poder reintentar sin retipear.
      setError(e.message || "No se pudieron guardar los mínimos");
    } finally {
      aplicar(definidas, quitados);
      setGuardando(false);
    }
  };

  // Refleja en el estado compartido sólo lo que efectivamente se guardó
  const aplicar = (definidas, quitados) => {
    if (definidas.length === 0 && quitados.length === 0) return;

    setMinimos(prev => {
      const tocados = new Set([...quitados, ...definidas.map(d => d.producto)]);
      return [...prev.filter(m => !tocados.has(m.producto)), ...definidas]
        .sort((a, b) => a.producto.localeCompare(b.producto, "es"));
    });

    setBorradores(b => {
      const next = { ...b };
      for (const p of quitados) delete next[p];
      for (const d of definidas) delete next[d.producto];
      return next;
    });
  };

  const quitarHuerfano = async (producto) => {
    setGuardando(true); setError(null);
    try {
      await API.quitarMinimo(producto);
      setMinimos(prev => prev.filter(m => m.producto !== producto));
    } catch (e) {
      setError(e.message || "No se pudo quitar el mínimo");
    } finally {
      setGuardando(false); setQuitando(null);
    }
  };

  // Mínimos cuyo producto ya no está en el catálogo: si no se mostraran acá
  // seguirían alertando sin ninguna forma de apagarlos desde la app.
  const huerfanos = minimos.filter(m => rubroDe(m.producto) === null);

  const definidosEn = (r) => (CATALOGO[r] || []).filter(p => porProducto[p] !== undefined).length;

  return (
    <>
      <Card>
        <div style={{ fontFamily:F.serif, fontSize:20, fontWeight:700, color:T.primaryDeep, marginBottom:4 }}>
          Stock mínimo por producto
        </div>
        <div style={{ fontSize:13, color:T.muted, lineHeight:1.5 }}>
          Un mínimo por producto, igual para las 7 sucursales. Cuando un control
          queda por debajo, aparece como alerta en el Dashboard hasta que el
          control siguiente lo muestre repuesto. Los productos que dejes en blanco
          no alertan nunca.
        </div>
      </Card>

      {/* ─── SELECTOR DE RUBRO ─────────────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
        {RUBROS.map(r => {
          const activo = rubro === r;
          const n = definidosEn(r);
          return (
            <button key={r} onClick={() => { setRubro(activo ? null : r); setResultado(null); setError(null); }} style={{
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3,
              padding:"14px 8px", borderRadius:14, cursor:"pointer",
              border:`2px solid ${activo ? T.primaryDeep : "transparent"}`,
              background: activo ? T.activeSoft : T.card,
              boxShadow: activo ? "none" : T.shadowList,
              fontFamily:F.body, transition:"all .15s",
            }}>
              <span style={{ fontSize:22 }}>{RUBRO_ICONOS[r] || "📦"}</span>
              <span style={{ fontSize:12, fontWeight:700, color: activo ? T.primaryDeep : T.text, textAlign:"center", lineHeight:1.25 }}>
                {r}
              </span>
              <span style={{ fontSize:10, color: n > 0 ? T.sage : T.muted2, fontWeight:600 }}>
                {n > 0 ? `${n} con mínimo` : "sin mínimos"}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <Card style={{ background:T.errorBg, border:`1px solid ${T.error}` }}>
          <div style={{ fontSize:13, color:T.error, lineHeight:1.5 }}>⚠ {error}</div>
        </Card>
      )}

      {resultado && (
        <Card style={{ background:T.sageBg, border:`1px solid ${T.sage}44` }}>
          <div style={{ fontSize:13, color:T.sage, fontWeight:600, lineHeight:1.5 }}>
            ✓ {resultado.definidos > 0 && `${resultado.definidos} ${resultado.definidos === 1 ? "mínimo guardado" : "mínimos guardados"}`}
            {resultado.definidos > 0 && resultado.quitados > 0 && " · "}
            {resultado.quitados > 0 && `${resultado.quitados} ${resultado.quitados === 1 ? "mínimo quitado" : "mínimos quitados"}`}
          </div>
        </Card>
      )}

      {/* ─── LISTA DEL RUBRO ───────────────────────────────────────────────── */}
      {!rubro && (
        <Card style={{ textAlign:"center", padding:"32px 20px" }}>
          <div style={{ fontSize:34, marginBottom:10 }}>🎯</div>
          <div style={{ fontFamily:F.serif, fontSize:19, fontWeight:700, color:T.primaryDeep, marginBottom:6 }}>
            Elegí un rubro
          </div>
          <div style={{ fontSize:13, color:T.muted, lineHeight:1.5 }}>
            Cargá los mínimos de todos sus productos de una sola vez.
          </div>
        </Card>
      )}

      {rubro && (
        <Card>
          <div style={{ background:T.activeSoft, borderRadius:12, padding:"12px 14px", marginBottom:14 }}>
            <div style={{ fontSize:11, color:T.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>
              Mínimos del rubro
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:22 }}>{RUBRO_ICONOS[rubro] || "📦"}</span>
              <span style={{ fontFamily:F.serif, fontSize:20, fontWeight:700, color:T.primaryDeep }}>{rubro}</span>
            </div>
          </div>

          {productos.map(prod => {
            const valor = valorDe(prod);
            const tocado = borradores[prod] !== undefined;
            const invalido = cambios.invalidos.includes(prod);
            const seQuita = cambios.quitar.includes(prod);

            return (
              <div key={prod} style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"10px 0", borderBottom:`1px solid ${T.divider}`,
              }}>
                <span style={{ fontSize:13, color: invalido ? T.error : T.text, flex:1, marginRight:12 }}>
                  {prod}
                  {seQuita && <span style={{ color:T.amber, fontSize:11, fontWeight:700 }}> · se quita</span>}
                </span>
                <input
                  type="number" min="0" step="0.5" placeholder="—"
                  value={valor}
                  onChange={e => escribir(prod, e.target.value)}
                  style={{
                    width:70, padding:"6px 8px", borderRadius:8,
                    border:`1.5px solid ${invalido ? T.error : tocado ? T.primary : T.border}`,
                    fontSize:14, textAlign:"center", fontFamily:F.body,
                    background: invalido ? T.errorBg : tocado ? T.activeSoft : T.inputBg,
                    color:T.text, outline:"none",
                  }}
                />
              </div>
            );
          })}

          <div style={{ marginTop:16 }}>
            <div style={{ fontSize:12, color:T.muted, marginBottom:12, lineHeight:1.5 }}>
              {cambios.invalidos.length > 0
                ? <span style={{ color:T.error, fontWeight:600 }}>Hay valores inválidos: el mínimo tiene que ser un número de 0 en adelante.</span>
                : totalCambios > 0
                  ? `${totalCambios} ${totalCambios === 1 ? "cambio sin guardar" : "cambios sin guardar"}.`
                  : "Dejá en blanco los productos que no querés controlar. Vaciar un campo quita su mínimo."}
            </div>
            <Btn disabled={!puedeGuardar} onClick={guardar}>
              {guardando ? "Guardando…" : `Guardar mínimos de ${rubro}`}
            </Btn>
          </div>
        </Card>
      )}

      {/* ─── HUÉRFANOS ─────────────────────────────────────────────────────── */}
      {huerfanos.length > 0 && (
        <Card>
          <div style={{ fontSize:12, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:6 }}>
            📌 Fuera del catálogo · {huerfanos.length}
          </div>
          <div style={{ fontSize:12, color:T.muted, lineHeight:1.5, marginBottom:10 }}>
            Tienen mínimo definido pero su nombre ya no está en el catálogo, así
            que no aparecen en ningún rubro. Si algún control viejo los incluye,
            pueden seguir alertando: quitalos si ya no van.
          </div>
          {huerfanos.map(m => (
            <div key={m.producto} style={{
              display:"flex", alignItems:"center", justifyContent:"space-between", gap:10,
              padding:"9px 0", borderTop:`1px solid ${T.divider}`,
            }}>
              <span style={{ fontSize:13, color:T.text, minWidth:0 }}>
                {m.producto} <span style={{ color:T.muted2 }}>· mín. {m.minimo}</span>
              </span>
              {quitando === m.producto ? (
                <span style={{ display:"flex", gap:6, flexShrink:0 }}>
                  <BtnSm variant="danger" onClick={() => quitarHuerfano(m.producto)}>Quitar</BtnSm>
                  <BtnSm variant="ghost" onClick={() => setQuitando(null)}>No</BtnSm>
                </span>
              ) : (
                <BtnSm variant="ghost" onClick={() => setQuitando(m.producto)}>Quitar</BtnSm>
              )}
            </div>
          ))}
        </Card>
      )}
    </>
  );
}
