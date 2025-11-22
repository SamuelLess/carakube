import React, { memo } from "react";
import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";
import type { NodeData } from "@/store/graph";
import styles from "./GraphNode.module.css";

const typeToColor = {
  namespace: "1px solid black",
  node: "2px solid var(--carakube-3)",
  pod: "3px solid var(--carakube-6)",
  service: "4px solid var(--carakube-9)",
};

const GraphNode: React.FC<NodeProps<NodeData>> = ({ data }) => {
  return (
    <div
      className={styles.node}
      style={{ border: data.apiType ? typeToColor[data.apiType] : "inherit" }}
    >
      {data.label}

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
