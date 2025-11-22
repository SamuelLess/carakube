"use client";

import { Box, Flex, Progress, Theme } from "@radix-ui/themes";
import type { ElkNode, LayoutOptions } from "elkjs/lib/elk.bundled.js";
import ELK from "elkjs/lib/elk.bundled.js";
import React, { useCallback, useEffect, useEffectEvent, useState } from "react";
import type { Edge, Node, ReactFlowInstance } from "reactflow";
import ReactFlow, { Background, ConnectionLineType, Controls, Panel } from "reactflow";
import "reactflow/dist/style.css";
import { useSelectedNode } from "@/context/SelectedNodeContext";
import { useGraphStore } from "@/store/graph";
import GraphNode from "../GraphNode";
import styles from "./FlowingTreeGraph.module.css";

const nodeTypes = {
  graphNode: GraphNode,
};

const elk = new ELK();

/**
 * Calculates the actual width of a node based on its label content.
 * Accounts for text width, padding, and CSS constraints.
 */
const calculateNodeWidth = (label: string): number => {
  // Create a temporary canvas to measure text width accurately
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    // Fallback: estimate based on character count
    const avgCharWidth = 9; // approximate for IBM Plex Sans
    const estimatedTextWidth = label.length * avgCharWidth;
    const padding = 32; // 1rem on each side = 16px * 2
    const minWidth = 100;
    const maxWidth = 250;
    return Math.min(Math.max(estimatedTextWidth + padding, minWidth), maxWidth);
  }

  // Use the same font as defined in GraphNode.module.css
  // IBM Plex Sans is loaded as --font-ibm variable, defaulting to sans-serif
  context.font = "400 16px -apple-system, BlinkMacSystemFont, 'IBM Plex Sans', sans-serif";
  const textMetrics = context.measureText(label);
  const textWidth = textMetrics.width;

  // Add padding (1rem = 16px on each side) + small buffer for border
  const padding = 32; // 16px * 2
  const border = 4; // border width
  const buffer = 10; // extra buffer for safety
  const totalWidth = textWidth + padding + border + buffer;

  // Respect CSS constraints: min-width: 100px, max-width: 250px
  const minWidth = 100;
  const maxWidth = 250;

  return Math.min(Math.max(totalWidth, minWidth), maxWidth);
};

/**
 * Computes a deterministic graph layout using ELK (Eclipse Layout Kernel).
 * The layout is guaranteed to be consistent across page reloads by:
 * 1. Sorting nodes and edges by ID before layout computation
 * 2. Using deterministic ELK algorithm options (fixed seed, SIMPLE placement, etc.)
 * 3. Maintaining consistent node ordering throughout the process
 * 4. Calculating actual node widths based on label content
 */
const getLayoutedElements = async (
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {},
  onlyNew: boolean = false
) => {
  // Sort nodes and edges by ID to ensure deterministic ordering
  const sortedNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  const sortedEdges = [...edges].sort((a, b) => a.id.localeCompare(b.id));

  const graph: ElkNode = {
    id: "root",
    layoutOptions: options,
    children: sortedNodes.map((node) => {
      // Calculate actual width based on node label content
      const nodeWidth = calculateNodeWidth(node.data?.label || "");
      const baseHeight = 60;
      // Add extra space for the node type label positioned above the node
      const labelSpacing = 20; // Account for nodeType label

      return {
        ...node,
        width: nodeWidth,
        height: baseHeight + labelSpacing,
      };
    }),
    edges: sortedEdges.map((edge) => ({
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
          const originalNode = sortedNodes.find((n) => n.id === node_1.id);

          const isUserPositioned =
            originalNode && (originalNode.position.x !== 0 || originalNode.position.y !== 0);

          if (onlyNew && isUserPositioned) {
            return originalNode!;
          }

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
  const { nodes, edges, onNodesChange, onEdgesChange, setNodes, onConnect, updateLayoutCounter } =
    useGraphStore();

  const { setSelectedNodeId } = useSelectedNode();
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [hidden, setHidden] = useState<boolean>(true);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  const onLayout = useCallback(
    (onlyNew?: boolean) => {
      const opts: LayoutOptions = {
        // Layered is best for directed graphs (trees, flows) with variable node sizes
        "elk.algorithm": "org.eclipse.elk.layered",

        // Increased spacing to prevent horizontal overlap - nodes can be up to 282px wide
        "elk.spacing.nodeNode": "80",

        // Space between layers (levels)
        "elk.layered.spacing.layerNodeBetweenLayers": "200",

        // Additional spacing between nodes in the same layer
        "elk.layered.spacing.nodeNodeBetweenLayers": "80",

        // Use SIMPLE strategy for deterministic placement
        // BRANDES_KOEPF can have non-deterministic behavior
        "elk.layered.nodePlacement.strategy": "SIMPLE",

        // Ensure deterministic cycle breaking
        "elk.layered.cycleBreaking.strategy": "DEPTH_FIRST",

        // Make the crossing minimization deterministic
        "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
        "elk.layered.crossingMinimization.semiInteractive": "false",

        // Ensure consistent ordering
        "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",

        // Set fixed random seed for any remaining randomization
        "elk.randomSeed": "42",

        // Top-down direction for clearer hierarchy
        "elk.direction": "DOWN",
      };

      getLayoutedElements(nodes, edges, opts, onlyNew).then((layoutedElements) => {
        if (layoutedElements) {
          setNodes(layoutedElements.nodes);
        }
      });
    },
    [nodes, edges, setNodes]
  );

  const updateLayout = useEffectEvent((onlyNew?: boolean) => onLayout(onlyNew));

  useEffect(() => {
    updateLayout();
  }, [updateLayoutCounter]);

  const initialDelayedFormat = useEffectEvent(() => {
    rfInstance?.fitView();
    updateLayout(false);
  });

  useEffect(() => {
    setTimeout(() => setHidden(false), 500);
    setTimeout(() => initialDelayedFormat(), 500);
  }, []);

  return (
    <>
      {hidden && (
        <Theme>
          <Flex
            align={"center"}
            justify={"center"}
            width={"100%"}
            height={"100%"}
            position={"absolute"}
            style={{ zIndex: 999 }}
          >
            <Box height={"2px"} width={"300px"}>
              <Progress duration=".5s" />
            </Box>
          </Flex>
        </Theme>
      )}
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
          defaultEdgeOptions={{ type: "straight", animated: true }}
          onInit={setRfInstance}
          onPaneClick={handlePaneClick}
        >
          <Background />
          <Controls />

          <Panel position="top-right">
            <button
              onClick={() => onLayout(false)}
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
    </>
  );
};

export default FlowingTreeGraph;
