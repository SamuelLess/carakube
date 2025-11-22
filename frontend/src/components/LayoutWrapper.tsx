"use client";

import { usePathname } from "next/navigation";
import { Banner } from "@/components/Banner/Banner";
import { ConditionalSidebar } from "@/components/ConditionalSidebar";
import { SelectedNodeProvider } from "@/context/SelectedNodeContext";
import styles from "../app/layout.module.css";

export const LayoutWrapper = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const pathname = usePathname();
  const isDemo = pathname === "/demo";

  return (
    <SelectedNodeProvider>
      <Banner />
      <main className={isDemo ? styles.main : styles.mainHomepage}>
        <div style={{ height: isDemo ? "100%" : "auto", width: "100%" }}>{children}</div>
      </main>
      <ConditionalSidebar />
    </SelectedNodeProvider>
  );
};
