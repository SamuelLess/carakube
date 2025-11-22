import { AlertTriangle, GitPullRequest, Info, ShieldAlert } from "lucide-react";
import type { VulnerabilityWithId } from "@/store/incidents";
import styles from "./IncidentReportCard.module.css";

interface IncidentReportCardProps {
  incident: VulnerabilityWithId;
  onClick?: (nodeId: string) => void;
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

export const IncidentReportCard = ({ incident, onClick }: IncidentReportCardProps) => {
  const { severity, title } = incident;
  const { label, color, icon } = levelMapping[severity];

  const handleClick = () => {
    if (onClick) {
      onClick(incident.nodeId);
    }
  };

  // Category mapping for vulnerability types
  const getCategory = (type: string) => {
    if (
      [
        "privileged_container",
        "running_as_root",
        "dangerous_capabilities",
        "host_network",
        "host_pid",
        "host_ipc",
        "host_path_mount",
      ].includes(type)
    ) {
      return "Container Security";
    }
    if (type === "missing_resource_limits") {
      return "Resource Limits";
    }
    if (["automounted_sa_token", "default_serviceaccount"].includes(type)) {
      return "ServiceAccount";
    }
    if (
      [
        "nodeport_service",
        "unrestricted_loadbalancer",
        "loadbalancer_service",
        "no_network_policy",
      ].includes(type)
    ) {
      return "Network Exposure";
    }
    if (type === "rbac_wildcard") {
      return "RBAC";
    }
    if (["mutable_image_tag", "untrusted_registry"].includes(type)) {
      return "Image Security";
    }
    return "Security";
  };

  return (
    <div
      className={styles.card}
      onClick={handleClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <span className={styles.icon}>{icon}</span>
      <div>
        <div className={styles.badges}>
          <span className={`${styles.badge} ${styles.white}`} style={{ backgroundColor: color }}>
            {label}
          </span>
          <div
            className={styles.badge}
            style={{ background: "color-mix(in srgb, var(--carakube-9), white 70%)" }}
          >
            {getCategory(incident.type)}
          </div>
          {"container" in incident && incident.container && (
            <div
              className={styles.badge}
              style={{ background: "color-mix(in srgb, var(--carakube-10), white 80%)" }}
            >
              Container: {incident.container}
            </div>
          )}
          {"image" in incident && incident.image && (
            <div
              className={styles.badge}
              style={{ background: "color-mix(in srgb, var(--carakube-10), white 80%)" }}
            >
              Image: {incident.image}
            </div>
          )}
          {"service_account" in incident && incident.service_account && (
            <div
              className={styles.badge}
              style={{ background: "color-mix(in srgb, var(--carakube-10), white 80%)" }}
            >
              SA: {incident.service_account}
            </div>
          )}
          {"role_name" in incident && incident.role_name && (
            <div
              className={styles.badge}
              style={{ background: "color-mix(in srgb, var(--carakube-10), white 80%)" }}
            >
              Role: {incident.role_name}
            </div>
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
