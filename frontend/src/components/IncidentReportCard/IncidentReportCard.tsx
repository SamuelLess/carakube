import { AlertTriangle, GitPullRequest, Info, ShieldAlert } from "lucide-react";
import type { VulnerabilityWithId } from "@/store/incidents";
import styles from "./IncidentReportCard.module.css";

interface IncidentReportCardProps {
  incident: VulnerabilityWithId;
}

const levelMapping = {
  info: {
    label: "info",
    color: "black",
    icon: <Info size={20} color={"black"} />,
  },
  low: {
    label: "low",
    color: "blue",
    icon: <Info size={20} color={"blue"} />,
  },
  medium: {
    label: "medium",
    color: "orange",
    icon: <Info size={20} color={"orange"} />,
  },
  high: {
    label: "high",
    color: "red",
    icon: <AlertTriangle size={20} color={"red"} />,
  },
  critical: {
    label: "critical",
    color: "darkred",
    icon: <ShieldAlert size={20} color={"darkred"} />,
  },
};

export const IncidentReportCard = ({ incident }: IncidentReportCardProps) => {
  const { severity, title } = incident;
  const { label, color, icon } = levelMapping[severity];

  return (
    <div className={styles.card}>
      <span className={styles.icon}>{icon}</span>
      <div>
        <div className={styles.badges}>
          <span className={styles.badge} style={{ backgroundColor: color }}>
            {label}
          </span>
          {incident.type === "image" && (
            <>
              <div className={styles.badge} style={{ background: "var(--carakube-9)" }}>
                Image
              </div>
              <div className={styles.badge} style={{ background: "var(--carakube-10)" }}>
                Image: {incident.image}
              </div>
              <div className={styles.badge} style={{ background: "var(--carakube-10)" }}>
                Pull Policy: {incident.pull_policy}
              </div>
            </>
          )}
          {incident.type === "misconfig" && (
            <>
              <div className={styles.badge} style={{ background: "var(--carakube-9)" }}>
                Misconfiguration
              </div>
            </>
          )}
          {incident.type === "secret" && (
            <>
              <div className={styles.badge} style={{ background: "var(--carakube-9)" }}>
                Secrets
              </div>
              <div className={styles.badge} style={{ background: "var(--carakube-10)" }}>
                {incident.secret_type}
              </div>
              {incident.keys.map((k, i) => {
                <div key={i} className={styles.badge} style={{ background: "var(--carakube-10)" }}>
                  KEY: {k}
                </div>;
              })}
            </>
          )}
          {incident.type === "workload" && (
            <>
              <div className={styles.badge} style={{ background: "var(--carakube-9)" }}>
                Workload
              </div>
              <div className={styles.badge} style={{ background: "var(--carakube-10)" }}>
                Container: {incident.container}
              </div>
            </>
          )}
        </div>

        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
        </div>
        <a
          href={`https://github.com/`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.prLink}
        >
          <GitPullRequest size={16} />
          <span>View Fix PR</span>
        </a>
      </div>
    </div>
  );
};
