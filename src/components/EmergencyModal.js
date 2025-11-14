import React from "react";

export default function EmergencyModal({ visible, close }) {
  if (!visible) return null;

  return (
    <div style={{ display: "flex", position: "fixed", top:0, left:0, width:"100%", height:"100%", background:"rgba(0,0,0,0.6)", zIndex:100000, justifyContent:"center", alignItems:"center", overflowY:"auto", padding:10 }}>
      <div style={{ background:"#f9f9f9", padding:25, borderRadius:12, maxWidth:1000, width:"100%", margin:"40px auto", boxShadow:"0 4px 12px rgba(0,0,0,0.2)" }}>
        <p style={{ fontSize:14, color:"#555", marginBottom:12, textAlign:"center" }}>
          This is just a reference, some cities dataset are outdated. <a href="https://www.abs-cbn.com/news/nation/2025/11/9/list-emergency-hotlines-for-rescue-and-assistance-2035" target="_blank" rel="noreferrer">Click here for hotlines</a>
        </p>
        <h2 style={{ color:"#EC1B34", textAlign:"center", fontSize:"1.6em" }}>Emergency Numbers</h2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:16, marginTop:15 }}>
          <div style={{ background:"#fff", padding:16, borderRadius:10, boxShadow:"0 2px 8px rgba(0,0,0,0.1)" }}>
            <h3 style={{ fontSize: "1.1em", color:"#EC1B34", marginTop:0 }}>National Emergency Hotline</h3>
            <p><strong>911</strong> (SMART, TNT, SUN)</p>
            <p><strong>0932 537 7770</strong></p>
            <p><strong>0917 839 9896</strong></p>
          </div>
          <div style={{ background:"#fff", padding:16, borderRadius:10, boxShadow:"0 2px 8px rgba(0,0,0,0.1)" }}>
            <h3 style={{ fontSize: "1.1em", color:"#EC1B34", marginTop:0 }}>Philippine Coast Guard</h3>
            <p>Hotline: (02) 8527-8481 to 89</p>
            <p>Facebook: <a href="https://facebook.com/coastguardph" target="_blank" rel="noreferrer">facebook.com/coastguardph</a></p>
          </div>
          <div style={{ background:"#fff", padding:16, borderRadius:10, boxShadow:"0 2px 8px rgba(0,0,0,0.1)" }}>
            <h3 style={{ fontSize: "1.1em", color:"#EC1B34", marginTop:0 }}>PAGASA</h3>
            <p>Trunk Line: (02) 8284-0800</p>
            <p>Facebook: <a href="https://facebook.com/PAGASA.DOST.GOV.PH" target="_blank" rel="noreferrer">fb.com/PAGASA.DOST.GOV.PH</a></p>
          </div>
        </div>
        <div style={{ textAlign:"center", marginTop:15 }}>
          <button onClick={close} style={{ padding:"10px 20px", border:"none", borderRadius:8, background:"#EC1B34", color:"#fff", cursor:"pointer" }}>Close</button>
        </div>
      </div>
    </div>
  );
}
