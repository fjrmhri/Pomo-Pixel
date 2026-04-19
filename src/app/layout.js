import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import localFont from "next/font/local";
import ToastProvider from "./components/ui/ToastProvider";

const monocraft = localFont({
  src: "../../public/fonts/Monocraft.otf",
  display: "swap",
  variable: "--font-pixel",
});

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={`${monocraft.variable} font-mono antialiased`}>
        <ToastProvider>{children}</ToastProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
