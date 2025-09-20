import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { QueueMonitorProvider } from "@/components/QueueMonitorProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Concrete Canopy",
  description: "Interactive queue-based slider control for Concrete Canopy projection mapping",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueueMonitorProvider>
          {children}
        </QueueMonitorProvider>
      </body>
    </html>
  );
}
