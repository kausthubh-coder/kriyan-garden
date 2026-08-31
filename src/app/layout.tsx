import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Spectral } from "next/font/google";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import "./globals.css";

const spectral = Spectral({ variable: "--font-spectral", subsets: ["latin"], weight: ["300", "400", "500", "600"], style: ["normal", "italic"] });
const atkinson = Atkinson_Hyperlegible({ variable: "--font-atkinson", subsets: ["latin"], weight: ["400", "700"] });

export const metadata: Metadata = {
  title: "Kriyan",
  description: "A garden for the things you mean to keep.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spectral.variable} ${atkinson.variable}`}>
      <body>
        <ClerkProvider>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
