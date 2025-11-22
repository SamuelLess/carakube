"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { animationManager } from "@/lib/animation";
import styles from "./TreeLine.module.css";

interface TreeLineProps {
  parentRef: React.RefObject<HTMLDivElement | null>;
  childRef: React.RefObject<HTMLDivElement | null>;
  svgRef: React.RefObject<SVGSVGElement | null>;
}

const TreeLine: React.FC<TreeLineProps> = ({ parentRef, childRef, svgRef }) => {
  const lineRef = useRef<SVGLineElement>(null);

  const updater = useMemo(() => {
    return {
      update: () => {
        if (!parentRef.current || !childRef.current || !svgRef.current || !lineRef.current) {
          return;
        }

        const svgRect = svgRef.current.getBoundingClientRect();
        const parentRect = parentRef.current.getBoundingClientRect();
        const childRect = childRef.current.getBoundingClientRect();

        const parentX = parentRect.left + parentRect.width / 2 - svgRect.left;
        const parentY = parentRect.bottom - svgRect.top;
        const childX = childRect.left + childRect.width / 2 - svgRect.left;
        const childY = childRect.top - svgRect.top;

        const line = lineRef.current;
        line.setAttribute("x1", String(parentX));
        line.setAttribute("y1", String(parentY));
        line.setAttribute("x2", String(childX));
        line.setAttribute("y2", String(childY));
      },
    };
  }, [parentRef, childRef, svgRef]);

  useEffect(() => {
    animationManager.add(updater);

    return () => {
      animationManager.remove(updater);
    };
  }, [updater]);

  return <line ref={lineRef} className={styles.connectorLine} />;
};

export default TreeLine;
