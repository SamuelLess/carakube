"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Banner.module.css";

export const Banner = () => {
  const pathname = usePathname();
  const isDemo = pathname === "/demo";

  return (
    <div className={styles.banner}>
      <Link href="/" className={styles.logoLink}>
        <Image src="/icon.svg" alt="Carakube Logo" width={40} height={40} />
        <span className={styles.text}>carakube</span>
      </Link>

      {!isDemo && (
        <nav className={styles.nav}>
          <a href="#challenge" className={styles.navLink}>
            Challenge
          </a>
          <a href="#features" className={styles.navLink}>
            Features
          </a>
          <Link href="/demo" className={styles.demoButton}>
            Live Demo
          </Link>
        </nav>
      )}

      {isDemo && (
        <Link href="/" className={styles.backLink}>
          ← Back to Home
        </Link>
      )}
    </div>
  );
};
