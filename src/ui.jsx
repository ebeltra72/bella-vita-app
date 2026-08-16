import { useState } from "react";
import { T, F } from "./theme";
import { API } from "./api";

// ─── UI PRIMITIVES ───────────────────────────────────────────────────────────
export const Badge = ({ color, children }) => {
  const colors = {
    sage:  { bg: T.sageBg,   text: T.sage },
    error: { bg: T.errorBg,  text: T.error },
    amber: { bg: T.amberBg,  text: T.amber },
    gold:  { bg: T.goldSoft, text: T.gold },
    terr:  { bg: T.activeSoft, text: T.primaryDeep },
  };
  const c = colors[color] || colors.terr;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:c.bg, color:c.text }}>
      {children}
    </span>
  );
};

export const Btn = ({ variant="primary", disabled, onClick, children, style: sx }) => {
  const bg = variant==="primary"?T.primary:variant==="danger"?T.error:variant==="gold"?T.gold:T.cardSoft;
  const color = variant==="ghost"?T.text:T.white;
  const shadow = (variant==="primary"||variant==="gold")&&!disabled ? T.shadowBtn : "none";
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display:"block", width:"100%", padding:"14px", borderRadius:14, border:"none",
      cursor:disabled?"not-allowed":"pointer", fontSize:15, fontWeight:700,
      fontFamily:F.body, background:bg, color, boxShadow:shadow,
      opacity:disabled?.5:1, transition:"opacity .15s", ...sx
    }}>{children}</button>
  );
};

export const BtnSm = ({ variant="primary", onClick, children }) => {
  const bg = variant==="primary"?T.primary:variant==="danger"?T.error:variant==="gold"?T.gold:T.cardSoft;
  const color = variant==="ghost"?T.text:T.white;
  return (
    <button onClick={onClick} style={{ padding:"6px 14px", borderRadius:10, border:"none", cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:F.body, background:bg, color }}>
      {children}
    </button>
  );
};

export const Card = ({ children, style: sx, className }) => (
  <div className={className} style={{ background:T.card, borderRadius:18, padding:18, boxShadow:T.shadowCard, marginBottom:12, ...sx }}>
    {children}
  </div>
);

export const Label = ({ children }) => (
  <span style={{ display:"block", fontSize:11, fontWeight:600, color:T.muted, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:6 }}>
    {children}
  </span>
);

export const Input = ({ type="text", value, onChange, placeholder, style: sx, ...rest }) => (
  <input type={type} value={value} onChange={onChange} placeholder={placeholder} {...rest} style={{
    width:"100%", padding:"11px 13px", borderRadius:12, border:`1.5px solid ${T.border}`,
    background:T.inputBg, fontSize:14, color:T.text, outline:"none", fontFamily:F.body, ...sx
  }}/>
);

export const Textarea = ({ value, onChange, placeholder, rows=3, style: sx }) => (
  <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} style={{
    width:"100%", padding:"11px 13px", borderRadius:12, border:`1.5px solid ${T.border}`,
    background:T.inputBg, fontSize:14, color:T.text, outline:"none", fontFamily:F.body,
    resize:"vertical", ...sx
  }}/>
);

export const Select = ({ value, onChange, children }) => (
  <select value={value} onChange={onChange} style={{
    width:"100%", padding:"11px 13px", borderRadius:12, border:`1.5px solid ${T.border}`,
    background:T.inputBg, fontSize:14, color:T.text, outline:"none", fontFamily:F.body, cursor:"pointer"
  }}>{children}</select>
);

// ─── PROGRESS BAR ────────────────────────────────────────────────────────────
export const ProgressBar = ({ val, max }) => {
  const pct = max>0 ? Math.min(100,(val/max)*100) : 0;
  const fillColor = pct>=100 ? T.gold : pct>=60 ? T.primary : T.amber;
  return (
    <div style={{ background:T.divider, borderRadius:99, height:8, overflow:"hidden" }}>
      <div style={{ height:"100%", borderRadius:99, width:`${pct}%`, background:fillColor, transition:"width .4s" }}/>
    </div>
  );
};

// ─── FOTO UPLOADER ───────────────────────────────────────────────────────────
export function FotoUploader({ visitaId, sucursal, tipo, value, onChange }) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendo(true); setError(null);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const result = await API.uploadFoto({
            data: ev.target.result,
            visitaId: visitaId || Date.now(),
            sucursal: sucursal || "sucursal",
            tipo,
          });
          onChange(result.url);
        } catch (err) {
          setError("No se pudo subir la foto. Intentá de nuevo.");
        } finally {
          setSubiendo(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setError("Error al leer el archivo.");
      setSubiendo(false);
    }
  };

  if (value) return (
    <div style={{ position:"relative" }}>
      <img src={value} alt="Foto adjunta" style={{ width:"100%", borderRadius:12, objectFit:"cover", maxHeight:200 }}/>
      <button onClick={() => onChange(null)} style={{
        position:"absolute", top:8, right:8, background:"rgba(0,0,0,0.55)", color:"#fff",
        border:"none", borderRadius:20, padding:"4px 10px", fontSize:12, cursor:"pointer"
      }}>✕ Cambiar</button>
    </div>
  );

  return (
    <div>
      <label style={{
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        gap:8, padding:"20px 16px", borderRadius:12, border:`2px dashed ${T.border}`,
        background:T.inputBg, cursor:"pointer", color:T.muted,
      }}>
        <input type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display:"none" }}/>
        {subiendo ? (
          <div style={{ fontSize:13, color:T.primary }}>Subiendo foto…</div>
        ) : (
          <>
            <span style={{ fontSize:28 }}>📷</span>
            <span style={{ fontSize:13, fontWeight:600 }}>Tocar para sacar o adjuntar foto</span>
          </>
        )}
      </label>
      {error && <div style={{ fontSize:12, color:T.error, marginTop:6 }}>{error}</div>}
    </div>
  );
}
