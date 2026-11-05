import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Internship Tracker",
  description: "Track internship applications, deadlines, and next steps in your private workspace.",
};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}
