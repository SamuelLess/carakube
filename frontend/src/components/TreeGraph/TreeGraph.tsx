"use client";

import React, { createRef, useLayoutEffect, useMemo, useRef } from "react";
import TreeLine from "../TreeLine";
import TreeNode from "../TreeNode";
import styles from "./TreeGraph.module.css";

export interface TreeData {
  id: string;
  text: string;
  children: TreeData[];
}

interface TreeGraphProps {
  tree: TreeData;
  density?: {
    horizontal?: number; // in rem
    vertical?: number; // in rem
  };
}

const DEFAULT_DENSITY = {
  horizontal: 3,
  vertical: 5,
};

const flattenTreeToLevels = (root: TreeData): TreeData[][] => {
  const levels: TreeData[][] = [];
  if (!root) return levels;
  const queue: (TreeData & { level: number })[] = [{ ...root, level: 0 }];
  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) continue;
    if (!levels[node.level]) {
      levels[node.level] = [];
    }
    levels[node.level].push(node);
    node.children.forEach((child) => {
      queue.push({ ...child, level: node.level + 1 });
    });
  }
  return levels;
};

const TreeGraph: React.FC<TreeGraphProps> = ({ tree, density: customDensity }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const graphContainerRef = useRef<HTMLDivElement>(null);

  const density = { ...DEFAULT_DENSITY, ...customDensity };
  const levels = useMemo(() => flattenTreeToLevels(tree), [tree]);

  const nodeRefs = useMemo(() => {
    const refs: { [key: string]: React.RefObject<HTMLDivElement | null> } = {};
    levels.flat().forEach((node) => {
      refs[node.id] = createRef<HTMLDivElement>();
    });
    return refs;
  }, [levels]);

  const rowRefs = useMemo(() => levels.map(() => createRef<HTMLDivElement>()), [levels]);

  useLayoutEffect(() => {
    const remInPixels = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const verticalGap = density.vertical * remInPixels;
    let cumulativeTop = 0;
    let maxRowHeight = 0;

    rowRefs.forEach((rowRef) => {
      const rowEl = rowRef.current;
      if (rowEl) {
        rowEl.style.top = `${cumulativeTop}px`;
        rowEl.style.visibility = "visible";

        const rowHeight = rowEl.getBoundingClientRect().height;
        maxRowHeight = Math.max(maxRowHeight, rowHeight);
        cumulativeTop += rowHeight + verticalGap;
      }
    });

    if (graphContainerRef.current) {
      // Set the container height to ensure it wraps all positioned rows
      const totalHeight = cumulativeTop - verticalGap + maxRowHeight;
      graphContainerRef.current.style.height = `${totalHeight}px`;
    }
  }, [levels, rowRefs, density.vertical]);

  const connections = useMemo(() => {
    const conns: [string, string][] = [];
    const traverse = (node: TreeData) => {
      node.children.forEach((child) => {
        conns.push([node.id, child.id]);
        traverse(child);
      });
    };
    traverse(tree);
    return conns;
  }, [tree]);

  const graphStyle = {
    "--horizontal-gap": `${density.horizontal}rem`,
  } as React.CSSProperties;

  return (
    <div ref={graphContainerRef} className={styles.graphContainer} style={graphStyle}>
      <svg ref={svgRef} className={styles.connectorSvg}>
        {connections.map(([parentId, childId]) => (
          <TreeLine
            key={`${parentId}-${childId}`}
            parentRef={nodeRefs[parentId]}
            childRef={nodeRefs[childId]}
            svgRef={svgRef}
          />
        ))}
      </svg>
      <div className={styles.nodesContainer}>
        {levels.map((level, levelIndex) => (
          <div
            key={levelIndex}
            ref={rowRefs[levelIndex]}
            className={styles.levelRow}
            style={{ visibility: "hidden" }} // Initially hide to prevent flicker
          >
            {level.map((node) => (
              <TreeNode key={node.id} ref={nodeRefs[node.id]} text={node.text} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TreeGraph;
