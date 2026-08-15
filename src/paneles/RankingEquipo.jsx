import { T, F } from "../theme";
import { mesActual } from "../utils";
import { ProgressBar } from "../ui";

// ─── RANKING ─────────────────────────────────────────────────────────────────
export default function RankingEquipo({ equipo, registros, meta }) {
  const mes = mesActual();
  const regMes = registros.filter(r => r.fecha?.startsWith(mes));

  const competidores = equipo
    .filter(m => m.enRanking)
    .map(m => {
      const regs = regMes.filter(r => r.personaId === m.id);
      const senias = regs.reduce((a, r) => a + r.senias, 0);
      const turnos = regs.reduce((a, r) => a + r.turnos, 0);
      const premio = Math.max(0, senias - meta.senias) * meta.premioPorSenia;
      const pct = meta.senias > 0 ? Math.min(100, (senias / meta.senias) * 100) : 0;
      return { ...m, senias, turnos, premio, pct, dias: regs.length };
    })
    .sort((a, b) => b.senias - a.senias);

  const medallas = ["🥇", "🥈", "🥉"];
  const bgPodio = [T.goldSoft, "#F0EEEB", "#F5EDE8"];
  const colorPodio = [T.gold, T.muted, T.primary];

  if (competidores.length === 0) return (
    <div style={{ textAlign:"center", color:T.muted, padding:32 }}>
      Sin datos este mes todavía.
    </div>
  );

  return (
    <div>
      <div style={{ fontFamily:F.serif, fontSize:22, fontWeight:700, color:T.primaryDeep, marginBottom:4 }}>
        Ranking del mes 🏆
      </div>
      <div style={{ color:T.muted, fontSize:13, marginBottom:18 }}>
        {new Date().toLocaleDateString("es-AR", { month:"long", year:"numeric" })}
      </div>

      {/* Podio */}
      <div style={{ display:"flex", gap:10, marginBottom:16 }}>
        {competidores.map((p, i) => (
          <div key={p.id} style={{
            flex:1, background:bgPodio[i]||T.cardSoft, borderRadius:18,
            padding:"18px 12px", textAlign:"center",
            border:`2px solid ${i===0?T.gold:T.border}`,
            boxShadow:i===0?T.shadowBtn:"none",
          }}>
            <div style={{ fontSize:28, marginBottom:6 }}>{medallas[i]||"🎯"}</div>
            <div style={{ fontFamily:F.serif, fontSize:18, fontWeight:700, color:colorPodio[i]||T.text }}>
              {p.nombre}
            </div>
            <div style={{ fontFamily:F.serif, fontSize:32, fontWeight:700, color:colorPodio[i]||T.text, lineHeight:1, margin:"8px 0" }}>
              {p.senias}
            </div>
            <div style={{ fontSize:11, color:T.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>
              señas
            </div>
            {p.premio > 0 && (
              <div style={{ marginTop:10, background:T.white, borderRadius:10, padding:"6px 8px" }}>
                <div style={{ fontSize:11, color:T.muted }}>Premio</div>
                <div style={{ fontFamily:F.serif, fontSize:16, fontWeight:700, color:T.gold }}>
                  ${p.premio.toLocaleString("es-AR")}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Detalle con barra de progreso */}
      {competidores.map((p, i) => {
        const siguiente = competidores[i-1];
        const diferencia = siguiente ? siguiente.senias - p.senias : null;
        return (
          <div key={p.id} style={{ background:T.card, borderRadius:14, padding:"14px 16px", marginBottom:10, boxShadow:T.shadowList }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:20 }}>{medallas[i]||"🎯"}</span>
                <div>
                  <div style={{ fontWeight:700, fontSize:14, color:T.text }}>{p.nombre}</div>
                  <div style={{ fontSize:11, color:T.muted }}>{p.dias} días cargados</div>
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontFamily:F.serif, fontSize:20, fontWeight:700, color:colorPodio[i]||T.text }}>{p.senias} señas</div>
                {diferencia !== null && diferencia > 0 && (
                  <div style={{ fontSize:11, color:T.error }}>a {diferencia} de {competidores[i-1].nombre}</div>
                )}
                {i === 0 && <div style={{ fontSize:11, color:T.sage }}>¡Líder del mes!</div>}
              </div>
            </div>
            <ProgressBar val={p.senias} max={meta.senias}/>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:T.muted, marginTop:4 }}>
              <span>Meta: {meta.senias} señas</span>
              <span>{p.pct.toFixed(0)}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
