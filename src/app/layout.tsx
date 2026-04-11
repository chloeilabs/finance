import "./globals.css"

import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"
import type { Metadata, Viewport } from "next"
import localFont from "next/font/local"
import { Toaster } from "sonner"

import { QueryClientProvider } from "@/components/layout/query-client-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const departureMono = localFont({
  src: "./fonts/DepartureMono-Regular.woff2",
  variable: "--font-departure-mono",
})

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0c0a09",
}

export const metadata: Metadata = {
  title: "Yurie Markets",
  description: "Stock research terminal for the Yurie family of apps.",
  applicationName: "Yurie Markets",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Yurie Markets",
  },
  icons: {
    icon: [
      {
        url: "/yurie-black.svg",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/yurie.svg",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: [
      {
        url: "/apple-touch-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("dark font-sans", GeistSans.variable, GeistMono.variable)}
    >
      <body
        className={cn(departureMono.variable, "overscroll-none antialiased")}
      >
        <QueryClientProvider>
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </body>
    </html>
  )
}
