import React, { forwardRef } from "react";
import styles from "./TreeNode.module.css";

export interface TreeNodeProps {
  text: string;
}

const TreeNode = forwardRef<HTMLDivElement, TreeNodeProps>(({ text }, ref) => {
  return (
    <div ref={ref} className={styles.node}>
      {text}
    </div>
  );
});

TreeNode.displayName = "TreeNode";

export default TreeNode;
