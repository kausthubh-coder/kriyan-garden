import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { socialImageTokens as tokens } from "@kriyan/core";
export const alt = "Kriyan. Your day on one timeline.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function Image() {
  const font = await readFile(path.join(process.cwd(), "public/fonts/SchibstedGrotesk-SemiBold.ttf"));
  return new ImageResponse(<div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: tokens.background, color: tokens.ink, padding: tokens.padding, fontFamily: "Schibsted Grotesk" }}>
    <div style={{ fontSize: tokens.wordmarkSize, letterSpacing: -1 }}>kriyan</div>
    <div style={{ fontSize: tokens.lineSize, letterSpacing: -3, marginTop: tokens.gap }}>Your day on one timeline.</div>
    <div style={{display:"flex", position:"relative", marginTop:tokens.gap, height:260}}>
      {["10:00", "11:00", "12:00", "13:00"].map((time,index) => <div key={time} style={{display:"flex", position:"absolute", top:index * 70, left:0, right:0, borderTop:`1px solid ${tokens.line}`, color:tokens.muted, fontSize:16}}>{time}</div>)}
      {[{title:"CS 201 lecture",time:"10:00 to 11:15",top:4,height:70,color:tokens.line}, {title:"Problem set 4, linked lists",time:"11:30 to 12:30",top:106,height:66,color:tokens.school}, {title:"Send the invoice to Hartley",time:"13:00",top:212,height:38,color:tokens.business}].map(item => <div key={item.title} style={{display:"flex",alignItems:"center",gap:16,position:"absolute",left:84,right:0,top:item.top,height:item.height,borderRadius:10,padding:"0 20px",background:item.color,color:item.color === tokens.line ? tokens.ink : tokens.background}}><div style={{display:"flex",width:18,height:18,borderRadius:20,border:"2px solid currentColor"}} /><div style={{display:"flex",fontSize:22}}>{item.title}</div><div style={{display:"flex",marginLeft:"auto",fontSize:18}}>{item.time}</div></div>)}
    </div>
  </div>, { ...size, fonts: [{ name: "Schibsted Grotesk", data: font, weight: 600, style: "normal" }] });
}
