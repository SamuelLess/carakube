import { AlertTriangle, GitPullRequest, Info, ShieldAlert } from "lucide-react";
import type { Incident } from "@/store/incidents";
import styles from "./IncidentReportCard.module.css";

interface IncidentReportCardProps {
  incident: Incident;
}

const levelMapping = {
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
  const { level, title, description, prLink } = incident;
  const { label, color, icon } = levelMapping[level];

  return (
    <div className={styles.card}>
      <div className={styles.icon}>{icon}</div>
      <div className={styles.content}>
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <span className={styles.level} style={{ backgroundColor: color }}>
            {label}
          </span>
        </div>
        <p className={styles.description}>{description}</p>
        <a
          href={`https://github.com/${prLink}`}
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
