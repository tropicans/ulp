import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { MeshBackground } from "@/components/ui/mesh-background";
import { SiteFooter } from "@/components/navigation/site-footer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TITIAN - Learning Experience Platform",
  description: "Platform pembelajaran digital untuk ASN dengan dukungan on-classroom, hybrid, dan async online learning",
  keywords: ["LXP", "ASN", "learning", "training", "e-learning"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased text-foreground min-h-screen flex flex-col`}>
        <Providers>
          <MeshBackground />
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
