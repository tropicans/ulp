import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LXP ASN - Learning Experience Platform",
  description: "Platform pembelajaran digital untuk ASN dengan dukungan on-classroom, hybrid, dan async online learning",
  keywords: ["LXP", "ASN", "learning", "training", "e-learning"],
};

import { MeshBackground } from "@/components/ui/mesh-background";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased text-foreground`}>
        <Providers>
          <MeshBackground />
          {children}
        </Providers>
      </body>
    </html>
  );
}
