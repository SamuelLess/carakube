import React, { memo } from "react";
import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";
import { useSelectedNode } from "@/context/SelectedNodeContext";
import type { NodeData } from "@/store/graph";
import styles from "./GraphNode.module.css";

const typeToColor = {
  namespace: "1px solid black",
  node: "2px solid var(--carakube-3)",
  pod: "3px solid var(--carakube-6)",
  service: "4px solid var(--carakube-9)",
};

// Determine health status based on node data
const getHealthStatus = (data: NodeData): "healthy" | "warning" | "critical" | null => {
  // Pods: check status
  if (data.apiType === "pod") {
    const status = data.status?.toLowerCase();
    if (status === "running") {
      // Check for vulnerabilities
      if (data.vulnerabilityCount && data.vulnerabilityCount > 3) return "warning";
      return "healthy";
    }
    if (status === "pending" || status === "unknown") return "warning";
    if (status === "failed" || status === "crashloopbackoff") return "critical";
  }

  // Nodes: check ready status
  if (data.apiType === "node") {
    const status = data.status?.toLowerCase();
    if (status === "ready") return "healthy";
    if (status === "not-ready" || status === "unknown") return "critical";
  }

  // Services: check if they have endpoints (would need more data, for now just show healthy)
  if (data.apiType === "service") {
    return "healthy";
  }

  // Namespaces: based on vulnerability count
  if (data.apiType === "namespace") {
    if (data.vulnerabilityCount && data.vulnerabilityCount > 5) return "warning";
    if (data.vulnerabilityCount && data.vulnerabilityCount > 0) return "healthy";
    return "healthy";
  }

  return null;
};

const GraphNode: React.FC<NodeProps<NodeData>> = ({ data, id }) => {
  const { selectedNodeId, setSelectedNodeId } = useSelectedNode();
  const isSelected = selectedNodeId === id;

  const handleClick = () => {
    setSelectedNodeId(isSelected ? null : id);
  };

  const healthStatus = getHealthStatus(data);

  return (
    <div
      className={`${styles.node} ${isSelected ? styles.selected : ""}`}
      style={{ border: data.apiType ? typeToColor[data.apiType] : "inherit" }}
      onClick={handleClick}
    >
      {/* Health Indicator */}
      {healthStatus && (
        <div
          className={`${styles.healthIndicator} ${styles[`health${healthStatus.charAt(0).toUpperCase() + healthStatus.slice(1)}`]}`}
          title={`Health: ${healthStatus}`}
        />
      )}

      {data.apiType && <span className={styles.nodeType}>{data.apiType}</span>}
      {data.label}
      {data.vulnerabilityCount && data.vulnerabilityCount > 1 && (
        <span className={styles.vulnerabilityBadge}>{data.vulnerabilityCount}</span>
      )}

      <Handle
        type="target"
        position={Position.Left}
        style={{
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          background: "transparent",
          border: "none",
          zIndex: -1,
        }}
      />

      <Handle
        type="source"
        position={Position.Right}
        style={{
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          background: "transparent",
          border: "none",
          zIndex: -1,
        }}
      />
    </div>
  );
};

export default memo(GraphNode);
