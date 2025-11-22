"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";

export const ConditionalSidebar = () => {
  const pathname = usePathname();

  // Don't render sidebar on the landing page
  if (pathname === "/") {
    return null;
  }

  return <Sidebar />;
};
