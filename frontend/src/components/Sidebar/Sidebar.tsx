"use client";

import {
  AlertTriangle,
  CheckCircle,
  ChevronsLeft,
  ChevronsRight,
  Info,
  ShieldAlert,
} from "lucide-react";
import { useIncidentStore } from "@/store/incidents";
import { useSidebarStore } from "@/store/sidebar";
import { IncidentReportCard } from "../IncidentReportCard";
import styles from "./Sidebar.module.css";

// const levelOrder = {
//   critical: 1,
//   high: 2,
//   medium: 3,
// };

export const Sidebar = () => {
  const { isOpen, toggle } = useSidebarStore();
  const { incidents } = useIncidentStore();

  // const sortedIncidents = [...incidents].sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);

  const criticals = incidents.filter((i) => i.severity === "critical");
  const highs = incidents.filter((i) => i.severity === "high");
  const mediums = incidents.filter((i) => i.severity === "medium");
  const low = incidents.filter((i) => i.severity === "low");
  const info = incidents.filter((i) => i.severity === "info");

  if (!isOpen) {
    return (
      <div className={styles.collapsedSidebar}>
        <div className={styles.iconWrapper} onClick={toggle}>
          {criticals.length > 0 && (
            <div className={styles.badgeContainer}>
              <ShieldAlert size={24} color="darkred" />
              <span className={`${styles.badge}`}>{criticals.length}</span>
            </div>
          )}
          {highs.length > 0 && (
            <div className={styles.badgeContainer}>
              <AlertTriangle size={24} color="red" />
              <span className={`${styles.badge}`}>{highs.length}</span>
            </div>
          )}
          {mediums.length > 0 && (
            <div className={styles.badgeContainer}>
              <Info size={24} color="orange" />
              <span className={`${styles.badge}`}>{mediums.length}</span>
            </div>
          )}
          {low.length > 0 && (
            <div className={styles.badgeContainer}>
              <Info size={24} color="blue" />
              <span className={`${styles.badge}`}>{low.length}</span>
            </div>
          )}
          {info.length > 0 && (
            <div className={styles.badgeContainer}>
              <Info size={24} color="black" />
              <span className={`${styles.badge}`}>{info.length}</span>
            </div>
          )}
          {incidents.length === 0 && <CheckCircle size={24} color="green" />}
        </div>
        <button
          onClick={toggle}
          className={`${styles.buttomButtonCollapsed} ${styles.bottomToggleButton}`}
        >
          <ChevronsLeft size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className={styles.sidebar}>
      <div className={styles.content}>
        {criticals.length ? (
          <div className={styles.header}>
            <div className={styles.title}>Critical Vulnerabilities</div>
            {criticals.map((incident, index) => (
              <IncidentReportCard key={index} incident={incident} />
            ))}
          </div>
        ) : null}
        {highs.length ? (
          <div className={styles.header}>
            <div className={styles.title}>High Vulnerabilities</div>
            {highs.map((incident, index) => (
              <IncidentReportCard key={index} incident={incident} />
            ))}
          </div>
        ) : null}
        {mediums.length ? (
          <div className={styles.header}>
            <div className={styles.title}>Medium Vulnerabilities</div>
            {mediums.map((incident, index) => (
              <IncidentReportCard key={index} incident={incident} />
            ))}
          </div>
        ) : null}
        {low.length ? (
          <div className={styles.header}>
            <div className={styles.title}>Low Vulnerabilities</div>
            {low.map((incident, index) => (
              <IncidentReportCard key={index} incident={incident} />
            ))}
          </div>
        ) : null}
        {info.length ? (
          <div className={styles.header}>
            <div className={styles.title}>Medium Vulnerabilities</div>
            {info.map((incident, index) => (
              <IncidentReportCard key={index} incident={incident} />
            ))}
          </div>
        ) : null}
      </div>
      <div className={styles.footer}>
        <button onClick={toggle} className={styles.bottomToggleButton}>
          <ChevronsRight size={20} />
        </button>
      </div>
    </div>
  );
};
