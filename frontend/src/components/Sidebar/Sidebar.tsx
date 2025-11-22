"use client";

import {
  AlertTriangle,
  CheckCircle,
  ChevronsLeft,
  ChevronsRight,
  Info,
  ShieldAlert,
  X,
} from "lucide-react";
import { useSelectedNode } from "@/context/SelectedNodeContext";
import { useIncidentStore } from "@/store/incidents";
import { useSidebarStore } from "@/store/sidebar";
import { IncidentReportCard } from "../IncidentReportCard";
import styles from "./Sidebar.module.css";

export const Sidebar = () => {
  const { isOpen, toggle } = useSidebarStore();
  const { incidents } = useIncidentStore();
  const { selectedNodeId, setSelectedNodeId, setCenterNodeId } = useSelectedNode();

  // Filter incidents based on selected node
  const filteredIncidents = selectedNodeId
    ? incidents.filter((i) => i.nodeId === selectedNodeId)
    : incidents;

  const handleIncidentClick = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setCenterNodeId(nodeId);
  };

  const criticals = filteredIncidents.filter((i) => i.severity === "critical");
  const highs = filteredIncidents.filter((i) => i.severity === "high");
  const mediums = filteredIncidents.filter((i) => i.severity === "medium");
  const low = filteredIncidents.filter((i) => i.severity === "low");
  const info = filteredIncidents.filter((i) => i.severity === "info");

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
          {filteredIncidents.length === 0 && <CheckCircle size={24} color="green" />}
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
      {selectedNodeId && (
        <div
          key={`filter-notice-${selectedNodeId}`}
          className={styles.filterNotice}
          style={{
            padding: "0.75rem 1rem",
            background: "var(--carakube-6)",
            color: "white",
            borderRadius: "6px",
            marginBottom: "1rem",
            fontSize: "0.9rem",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.5rem",
          }}
        >
          <span>Filtering vulnerabilities for selected node</span>
          <button
            onClick={() => setSelectedNodeId(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              padding: "0.25rem",
              borderRadius: "4px",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
            title="Clear filter"
          >
            <X size={18} />
          </button>
        </div>
      )}
      <div className={styles.content}>
        {selectedNodeId && filteredIncidents.length === 0 && (
          <div
            key={`empty-state-${selectedNodeId}`}
            className={styles.emptyState}
            style={{
              padding: "2rem 1rem",
              textAlign: "center",
              color: "#666",
              fontSize: "0.9rem",
            }}
          >
            <CheckCircle size={48} color="green" style={{ marginBottom: "1rem" }} />
            <div>No vulnerabilities found for this node</div>
          </div>
        )}
        {criticals.length ? (
          <div
            className={`${styles.header} ${styles.vulnerabilitySection}`}
            key={`criticals-${selectedNodeId || "all"}`}
          >
            <div className={styles.title}>Critical Vulnerabilities</div>
            {criticals.map((incident, index) => (
              <IncidentReportCard key={index} incident={incident} onClick={handleIncidentClick} />
            ))}
          </div>
        ) : null}
        {highs.length ? (
          <div
            className={`${styles.header} ${styles.vulnerabilitySection}`}
            key={`highs-${selectedNodeId || "all"}`}
          >
            <div className={styles.title}>High Vulnerabilities</div>
            {highs.map((incident, index) => (
              <IncidentReportCard key={index} incident={incident} onClick={handleIncidentClick} />
            ))}
          </div>
        ) : null}
        {mediums.length ? (
          <div
            className={`${styles.header} ${styles.vulnerabilitySection}`}
            key={`mediums-${selectedNodeId || "all"}`}
          >
            <div className={styles.title}>Medium Vulnerabilities</div>
            {mediums.map((incident, index) => (
              <IncidentReportCard key={index} incident={incident} onClick={handleIncidentClick} />
            ))}
          </div>
        ) : null}
        {low.length ? (
          <div
            className={`${styles.header} ${styles.vulnerabilitySection}`}
            key={`low-${selectedNodeId || "all"}`}
          >
            <div className={styles.title}>Low Vulnerabilities</div>
            {low.map((incident, index) => (
              <IncidentReportCard key={index} incident={incident} onClick={handleIncidentClick} />
            ))}
          </div>
        ) : null}
        {info.length ? (
          <div
            className={`${styles.header} ${styles.vulnerabilitySection}`}
            key={`info-${selectedNodeId || "all"}`}
          >
            <div className={styles.title}>Information</div>
            {info.map((incident, index) => (
              <IncidentReportCard key={index} incident={incident} onClick={handleIncidentClick} />
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
