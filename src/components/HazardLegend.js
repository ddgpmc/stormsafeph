import React from "react";

export default function HazardLegend({ visible, toggle }) {
  if (!visible) return null;

  return (
    <div id="hazardLegend" style={{ position: "absolute", bottom: 30, right: 10, zIndex: 9999, background: "#fff", padding: 15, borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.2)", fontSize: 13, maxWidth: 220 }}>
      <h4 style={{ margin: "0 0 10px 0", color: "#EC1B34", fontSize: 14 }}>Hazard Layers (NOAH PH)</h4>
      <div className="legend-item" style={{ display: "flex", alignItems: "center", margin: "5px 0" }}>
        <div className="legend-color" style={{ width: 20, height: 20, marginRight: 8, borderRadius: 3, border: "1px solid #333", background: "rgba(255,0,0,0.5)" }} />
        <span>High Susceptibility</span>
      </div>
      <div className="legend-item" style={{ display: "flex", alignItems: "center", margin: "5px 0" }}>
        <div className="legend-color" style={{ width: 20, height: 20, marginRight: 8, borderRadius: 3, border: "1px solid #333", background: "rgba(255,165,0,0.5)" }} />
        <span>Moderate</span>
      </div>
      <div className="legend-item" style={{ display: "flex", alignItems: "center", margin: "5px 0" }}>
        <div className="legend-color" style={{ width: 20, height: 20, marginRight: 8, borderRadius: 3, border: "1px solid #333", background: "rgba(255,255,0,0.5)" }} />
        <span>Low Susceptibility</span>
      </div>
      <div className="legend-note" style={{ fontSize: 11, color: "#666", marginTop: 8, fontStyle: "italic" }}>
        Data from Open Hazards PH<br />(NOAH/DOST archives)
      </div>
      <div className="legend-toggle" style={{ cursor: "pointer", textAlign: "right", color: "#EC1B34", fontWeight: "bold", marginTop: 10 }} onClick={toggle}>
        Hide Legend
      </div>
    </div>
  );
}
