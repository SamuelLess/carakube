import { AlertTriangle, GitPullRequest, Info, Loader2, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { triggerVulnerabilityFix } from "@/lib/api";
import type { VulnerabilityWithId } from "@/store/incidents";
import { useVulnerabilityStatesStore } from "@/store/vulnerabilityStates";
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
  const { severity, title, id: vulnId } = incident;
  const { label, color, icon } = levelMapping[severity];

  // Get just the state for THIS vulnerability
  // Using a direct selector prevents unnecessary re-renders
  const states = useVulnerabilityStatesStore((state) => state.states);
  const setState = useVulnerabilityStatesStore((state) => state.setState);

  // Get this specific vulnerability's state
  const vulnState = states[vulnId] || {
    state: "untouched" as const,
    pr_url: null,
    updated_at: null,
  };

  const [isLoading, setIsLoading] = useState(false);

  // Debug: log the vulnerability ID to ensure it's unique
  if (!vulnId || vulnId === "undefined") {
    console.error("IncidentReportCard: Missing or invalid vulnerability ID", incident);
  }

  const handleClick = () => {
    if (onClick) {
      onClick(incident.nodeId);
    }
  };

  const handleCreatePR = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!vulnId) {
      console.error("❌ Cannot create PR: vulnerability ID is missing");
      return;
    }

    console.log(`🔵 [${vulnId}] Current state:`, vulnState);

    if (vulnState.state !== "untouched") {
      // If already processing or PR available, don't trigger again
      console.log(`⏭️  [${vulnId}] Already ${vulnState.state}, skipping`);
      return;
    }

    console.log(`🚀 [${vulnId}] Starting PR creation process`);
    console.log(`📋 [${vulnId}] Vulnerability details:`, {
      type: incident.type,
      severity: incident.severity,
      title: incident.title,
      nodeId: incident.nodeId,
    });
    setIsLoading(true);

    // Immediately update state to in_processing for THIS specific vulnerability
    console.log(`⏳ [${vulnId}] Setting state to in_processing`);
    setState(vulnId, {
      state: "in_processing",
      pr_url: null,
      updated_at: new Date().toISOString(),
    });

    try {
      console.log(`📡 [${vulnId}] Calling API to trigger fix...`);
      const response = await triggerVulnerabilityFix(vulnId);
      console.log(`📨 [${vulnId}] API response:`, response);

      if (response.status === "success" && response.state) {
        // Update state with response from backend
        console.log(`✅ [${vulnId}] PR creation successful!`, response.state);
        console.log(`🔗 [${vulnId}] PR URL:`, response.state.pr_url);
        setState(vulnId, response.state);
      } else {
        // If failed, reset to untouched
        console.error(`❌ [${vulnId}] PR creation failed:`, response.message);
        setState(vulnId, {
          state: "untouched",
          pr_url: null,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      // If error, reset to untouched
      console.error(`💥 [${vulnId}] Exception during PR creation:`, error);
      setState(vulnId, {
        state: "untouched",
        pr_url: null,
        updated_at: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
      console.log(`🏁 [${vulnId}] PR creation process completed`);
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

  // Render the appropriate button based on state
  const renderActionButton = () => {
    if (vulnState.state === "pr_available" && vulnState.pr_url) {
      return (
        <a
          href={vulnState.pr_url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.prLink}
          onClick={(e) => e.stopPropagation()}
        >
          <GitPullRequest size={16} />
          <span>View Fix PR</span>
        </a>
      );
    }

    if (vulnState.state === "in_processing" || isLoading) {
      return (
        <button
          className={`${styles.prLink} ${styles.processing}`}
          disabled
          onClick={(e) => e.stopPropagation()}
        >
          <Loader2 size={16} className={styles.spinner} />
          <span>Processing...</span>
        </button>
      );
    }

    // Default: untouched state
    return (
      <button className={`${styles.prLink} ${styles.createButton}`} onClick={handleCreatePR}>
        <GitPullRequest size={16} />
        <span>Create PR</span>
      </button>
    );
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
        {renderActionButton()}
      </div>
    </div>
  );
};
