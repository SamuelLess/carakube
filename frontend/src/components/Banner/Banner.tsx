import Image from "next/image";
import styles from "./Banner.module.css";

export const Banner = () => {
  return (
    <div className={styles.banner}>
      <Image src="/icon.svg" alt="Carakube Logo" width={48} height={48} />
      <span className={styles.text}>carakube</span>
    </div>
  );
};
