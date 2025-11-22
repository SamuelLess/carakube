"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import styles from "./DynamicConnection.module.css";

const DynamicConnection = () => {
  const [parentText, setParentText] = useState("Parent Node");
  const [childText, setChildText] = useState("Child Node");

  const parentRef = useRef<HTMLDivElement>(null);
  const childRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const lineRef = useRef<SVGLineElement>(null);

  const updateLine = useCallback(() => {
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
  }, []);

  useEffect(() => {
    updateLine(); // Initial update

    const nodesToObserve = [parentRef.current, childRef.current].filter(
      (node): node is HTMLDivElement => node !== null
    );

    if (nodesToObserve.length < 2) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      updateLine();
    });

    nodesToObserve.forEach((node) => resizeObserver.observe(node));
    window.addEventListener("resize", updateLine);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateLine);
    };
  }, [updateLine, parentText, childText]);

  return (
    <div className={styles.demoContainer}>
      <h2 className={styles.title}>Dynamic SVG Connector Demo</h2>
      <p className={styles.description}>
        Edit the text in the nodes below. The connecting line will automatically adjust its position
        in real-time.
      </p>
      <div className={styles.controls}>
        <div className={styles.inputGroup}>
          <label htmlFor="parent-text">Parent Node Text:</label>
          <input
            id="parent-text"
            type="text"
            value={parentText}
            onChange={(e) => setParentText(e.target.value)}
          />
        </div>
        <div className={styles.inputGroup}>
          <label htmlFor="child-text">Child Node Text:</label>
          <input
            id="child-text"
            type="text"
            value={childText}
            onChange={(e) => setChildText(e.target.value)}
          />
        </div>
      </div>
      <div className={styles.connectionContainer}>
        <svg ref={svgRef} className={styles.connectorSvg}>
          <line ref={lineRef} className={styles.connectorLine} />
        </svg>

        <div ref={parentRef} className={`${styles.node} ${styles.parent}`}>
          {parentText}
        </div>

        <div ref={childRef} className={`${styles.node} ${styles.child}`}>
          {childText}
        </div>
      </div>
    </div>
  );
};

export default DynamicConnection;
