import "@radix-ui/themes/styles.css";
import type { Metadata } from "next";
import localFont from "next/font/local";
import "reactflow/dist/style.css";
import { Banner } from "@/components/Banner/Banner";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";
import styles from "./layout.module.css";

const crimsonPro = localFont({
  src: [
    {
      path: "../../public/fonts/Crimson_Pro/CrimsonPro-VariableFont_wght.ttf",
      style: "normal",
    },
    {
      path: "../../public/fonts/Crimson_Pro/CrimsonPro-Italic-VariableFont_wght.ttf",
      style: "italic",
    },
  ],
  variable: "--font-crimson",
});

const ibmPlexSans = localFont({
  src: [
    {
      path: "../../public/fonts/IBM_Plex_Sans/IBMPlexSans-VariableFont_wdth,wght.ttf",
      style: "normal",
    },
    {
      path: "../../public/fonts/IBM_Plex_Sans/IBMPlexSans-Italic-VariableFont_wdth,wght.ttf",
      style: "italic",
    },
  ],
  variable: "--font-ibm",
});

const jetBrainsMono = localFont({
  src: [
    {
      path: "../../public/fonts/JetBrains_Mono/JetBrainsMono-VariableFont_wght.ttf",
      style: "normal",
    },
    {
      path: "../../public/fonts/JetBrains_Mono/JetBrainsMono-Italic-VariableFont_wght.ttf",
      style: "italic",
    },
  ],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "carakube",
};

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48.png" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png" />
      </head>
      <body className={`${crimsonPro.variable} ${ibmPlexSans.variable} ${jetBrainsMono.variable} `}>
        <Banner />
        {children}
        <Sidebar />
      </body>
    </html>
  );
};

export default RootLayout;
