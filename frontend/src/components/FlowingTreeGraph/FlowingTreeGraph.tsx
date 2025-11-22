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

const getLayoutedElements = async (
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {},
  onlyNew: boolean = false
) => {
  const graph: ElkNode = {
    id: "root",
    layoutOptions: options,
    children: nodes.map((node) => {
      const actualWidth = node.width || 180;
      const actualHeight = node.height || 60;
      // Add extra space for the node type label positioned above the node
      const labelSpacing = 5;

      return {
        ...node,
        width: actualWidth,
        height: actualHeight + labelSpacing,
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

        // crucial for variable sizes: ensures nodes don't overlap
        "elk.spacing.nodeNode": "50",

        // Space between layers (levels)
        "elk.layered.spacing.layerNodeBetweenLayers": "200",

        // Tries to make the graph compact
        "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
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
