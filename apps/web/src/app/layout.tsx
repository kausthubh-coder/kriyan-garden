import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const font = localFont({ src: "../../public/fonts/SchibstedGrotesk.woff2", variable: "--font-schibsted", weight: "400 700", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://kriyan.app"),
  title: { default: "Kriyan | Organise your life with your AI", template: "%s | Kriyan" },
  description: "An open-source planner that makes organising and planning your life easy. Plan with the AI you already use.",
  openGraph: { type: "website", siteName: "Kriyan", title: "Kriyan | Organise your life with your AI", description: "An open-source planner that makes organising and planning your life easy. Plan with the AI you already use." },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={font.variable}>
      <body>{children}</body>
    </html>
  );
}
