import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { publicOriginFromHeaders } from "@/lib/public-url";
import {
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
  THEMES,
  THEME_STORAGE_KEY,
} from "@/lib/themes";
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

const themeBoot = `!function(){var a=${JSON.stringify(THEMES.map((theme) => theme.value))},t;try{t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})}catch(e){}if(a.indexOf(t)<0)t=matchMedia('(prefers-color-scheme: dark)').matches?${JSON.stringify(DEFAULT_DARK_THEME)}:${JSON.stringify(DEFAULT_LIGHT_THEME)};document.documentElement.dataset.theme=t}();`;

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
