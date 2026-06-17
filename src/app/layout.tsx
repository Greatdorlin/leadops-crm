import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";

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
  metadataBase: new URL("https://pathway.flyconnectglobal.com"),
  title: {
    default: "Fly Connect Pathway Finder",
    template: "%s | Fly Connect Pathway Finder",
  },
  description:
    "Check your study, travel, and relocation pathway before you pay for an agent, school application, or visa service.",
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Check your path before you spend.",
    description:
      "Fly Connect Pathway Finder helps you understand your options before you pay for an agent, school application, or visa service.",
    url: "https://pathway.flyconnectglobal.com",
    siteName: "Fly Connect Pathway Finder",
    images: [
      {
        url: "/pathway-preview.png",
        width: 1200,
        height: 630,
        alt: "Fly Connect Pathway Finder preview: Check your path before you spend.",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Check your path before you spend.",
    description:
      "Understand your pathway options before you pay for an agent, school application, or visa service.",
    images: ["/pathway-preview.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`${headingFont.variable} ${bodyFont.variable}`}>
                {/* Google tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-14BBJS6C4D"
          strategy="afterInteractive"
        />
        <Script id="google-tag" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-14BBJS6C4D');
          `}
        </Script>
        {/* Meta Pixel Code */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1385263936949686');
            fbq('track', 'PageView');
          `}
        </Script>

        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=1385263936949686&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        {/* End Meta Pixel Code */}
        {/* TikTok Pixel Code */}
        <Script id="tiktok-pixel" strategy="afterInteractive">
          {`
            !function (w, d, t) {
              w.TiktokAnalyticsObject=t;
              var ttq=w[t]=w[t]||[];
              ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"];
              ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
              for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
              ttq.instance=function(t){
                for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);
                return e
              };
              ttq.load=function(e,n){
                var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;
                ttq._i=ttq._i||{};
                ttq._i[e]=[];
                ttq._i[e]._u=r;
                ttq._t=ttq._t||{};
                ttq._t[e]=+new Date;
                ttq._o=ttq._o||{};
                ttq._o[e]=n||{};
                n=document.createElement("script");
                n.type="text/javascript";
                n.async=!0;
                n.src=r+"?sdkid="+e+"&lib="+t;
                e=document.getElementsByTagName("script")[0];
                e.parentNode.insertBefore(n,e)
              };

              ttq.load('D8HDTNRC77UDG683MC20');
              ttq.page();
            }(window, document, 'ttq');
          `}
        </Script>
        {/* End TikTok Pixel Code */}
        {children}
      </body>
    </html>
  );
}
