import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import ServiceWorkerRegistration from "./components/ServiceWorkerRegistration";
import Script from "next/script";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "インテリメーカー 〜賢いは作れる〜",
  description: "知識を深め、賢くなるためのアプリ",
  robots: {
    index: false,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "インテリメーカー 〜賢いは作れる〜",
    description: "知識を深め、賢くなるためのアプリ",
    type: "website",
    url: "https://intelli-maker.vercel.app/",
    images: [
      {
        url: "/ogp.png",
        width: 1200,
        height: 630,
        alt: "インテリメーカー 〜賢いは作れる〜",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="manifest" href="/manifest.json" />
        {/* Google Analytics */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
            });
          `}
        </Script>
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; connect-src 'self' https://www.google-analytics.com https://api.perplexity.ai https://generativelanguage.googleapis.com; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://storage.googleapis.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; worker-src 'self'; frame-src 'self';"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
