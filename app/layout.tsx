import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EnergyGraph — Knowledge Graph Builder",
  description: "Build and visualize energy management knowledge graphs",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
