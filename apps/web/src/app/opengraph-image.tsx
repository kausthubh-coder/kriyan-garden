import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { socialImageTokens as tokens } from "@kriyan/core";
export const alt = "Kriyan. Your day on one timeline.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function Image() {
  const font = await readFile(path.join(process.cwd(), "public/fonts/SchibstedGrotesk-SemiBold.ttf"));
  return new ImageResponse(<div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%", background: tokens.background, color: tokens.ink, padding: tokens.padding, fontFamily: "Schibsted Grotesk" }}><div style={{ fontSize: tokens.wordmarkSize, letterSpacing: -5 }}>kriyan</div><div style={{ fontSize: tokens.lineSize, marginTop: tokens.gap }}>Your day on one timeline.</div></div>, { ...size, fonts: [{ name: "Schibsted Grotesk", data: font, weight: 600, style: "normal" }] });
}
