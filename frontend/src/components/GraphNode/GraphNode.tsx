import React, { memo } from "react";
import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";
import styles from "./GraphNode.module.css";

const GraphNode: React.FC<NodeProps> = ({ data }) => {
  return (
    <div className={styles.node}>
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
