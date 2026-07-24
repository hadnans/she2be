import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/storefront/auth-provider";
import { ErrorBoundary } from "@/components/storefront/error-boundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "She2Be — Premium Grocery, Delivered",
  description: "Farm-fresh produce, pantry staples, and household essentials delivered to your door. Premium quality, honest prices.",
  keywords: ["grocery", "delivery", "fresh produce", "She2Be", "Egypt grocery"],
  authors: [{ name: "She2Be" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "She2Be — Premium Grocery, Delivered",
    description: "Farm-fresh produce, pantry staples, and household essentials delivered to your door.",
    siteName: "She2Be",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ErrorBoundary>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ErrorBoundary>
        <Toaster />
        <SonnerToaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
