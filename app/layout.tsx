import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { publicOriginFromHeaders } from "@/lib/public-url";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const defaultTitle = "szeruj — dokumenty od agentów, gotowe do pokazania";
const defaultDescription =
  "Proste, bezpieczne udostępnianie dokumentów Markdown, HTML i pakietów ZIP pod jednym linkiem.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const publicOrigin = publicOriginFromHeaders(requestHeaders);
  const imageUrl = new URL("/og.png", publicOrigin).toString();

  return {
    metadataBase: new URL(publicOrigin),
    title: { default: defaultTitle, template: "%s · szeruj" },
    description: defaultDescription,
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: defaultTitle,
      description: defaultDescription,
      siteName: "szeruj",
      locale: "pl_PL",
      type: "website",
      images: [{ url: imageUrl, width: 1731, height: 909, alt: "szeruj — Wrzuć. Otwórz. Szeruj." }],
    },
    twitter: {
      card: "summary_large_image",
      title: defaultTitle,
      description: defaultDescription,
      images: [imageUrl],
    },
  };
}

const themeBoot = `try{var t=localStorage.getItem('szeruj-theme');if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'night':'paper';document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
