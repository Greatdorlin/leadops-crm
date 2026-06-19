import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";

const headingFont = localFont({
  src: [
    {
      path: "../../public/fonts/barlow-condensed-500.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/barlow-condensed-600.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/barlow-condensed-700.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-heading-google",
  display: "swap",
});

const bodyFont = localFont({
  src: [
    {
      path: "../../public/fonts/manrope-400.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/manrope-500.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/manrope-500.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/manrope-700.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-body-google",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Leads Desk",
    template: "%s | Leads Desk",
  },
  description:
    "Private lead management for businesses that need every lead captured, assigned, followed up, customized, and reported in one branded system.",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "Leads Desk",
    description:
      "Capture, assign, follow up, customize, and report on every lead in one private system.",
    url: appUrl,
    siteName: "Leads Desk",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Leads Desk",
    description:
      "Capture, assign, follow up, customize, and report on every lead in one private system.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`${headingFont.variable} ${bodyFont.variable}`}>
        {children}
      </body>
    </html>
  );
}
