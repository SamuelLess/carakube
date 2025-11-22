"use client";

import type { ElkNode, LayoutOptions } from "elkjs/lib/elk.bundled.js";
import ELK from "elkjs/lib/elk.bundled.js";
import React, { useCallback, useEffect } from "react";
import type { Edge, Node } from "reactflow";
import ReactFlow, { Background, ConnectionLineType, Controls, Panel } from "reactflow";
import "reactflow/dist/style.css";
import { useGraphStore } from "@/store/graph";
import GraphNode from "../GraphNode";
import styles from "./FlowingTreeGraph.module.css";

const nodeTypes = {
  graphNode: GraphNode,
};

const elk = new ELK();

const getLayoutedElements = async (nodes: Node[], edges: Edge[], options: LayoutOptions = {}) => {
  const graph: ElkNode = {
    id: "root",
    layoutOptions: options,
    children: nodes.map((node) => {
      // 👇 FIX: Estimate width based on text length, or use a safe max-width
      // "Grandchild 1.B" is long, so we must tell ELK it's wide.
      const approxWidth = node.data.label.length * 8 > 150 ? node.data.label.length * 10 : 180;

      return {
        ...node,
        width: approxWidth,
        height: 60,
      };
    }),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  try {
    const layoutedGraph = await elk.layout(graph);
    return {
      nodes:
        layoutedGraph.children?.map((node_1) => {
          const originalNode = nodes.find((n) => n.id === node_1.id);
          return {
            ...node_1,
            position: { x: node_1.x ?? 0, y: node_1.y ?? 0 },
            data: originalNode?.data,
            id: node_1.id,
            type: originalNode?.type,
          };
        }) ?? [],
    };
  } catch (message) {
    console.error(message);
    return null;
  }
};

const FlowingTreeGraph: React.FC = () => {
  const { nodes, edges, onNodesChange, onEdgesChange, setNodes, onConnect } = useGraphStore();

  const onLayout = useCallback(() => {
    const opts: LayoutOptions = {
      "elk.algorithm": "org.eclipse.elk.stress",
      "elk.stress.desiredEdgeLength": "200",
      "elk.spacing.nodeNode": "60",
    };

    getLayoutedElements(nodes, edges, opts).then((layoutedElements) => {
      if (layoutedElements) {
        setNodes(layoutedElements.nodes);
      }
    });
  }, [nodes, edges, setNodes]);

  useEffect(() => {
    onLayout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, edges.length]);

  return (
    <div className={styles.container}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        connectionLineType={ConnectionLineType.Straight}
        defaultEdgeOptions={{ type: "straight", animated: false }}
      >
        <Background />
        <Controls />

        <Panel position="top-right">
          <button
            onClick={() => onLayout()}
            style={{
              padding: "8px 12px",
              borderRadius: "5px",
              border: "1px solid #ccc",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Reset Layout
          </button>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default FlowingTreeGraph;
