import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Masthead } from "@/components/masthead"
import { Toaster } from "@/components/ui/toaster"

const geist = Geist({ subsets: ["latin"], variable: "--type-geist" })
const mono = Geist_Mono({ subsets: ["latin"], variable: "--type-mono" })

// Updated metadata for Senior Conversation Trainer app
export const metadata: Metadata = {
  title: "ConverseBetter",
  description: "Learn to communicate with empathy and confidence with senior citizens through interactive practice",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${mono.variable} font-sans antialiased`}>
        <Masthead />
        {children}
        <Toaster />
      </body>
    </html>
  )
}
