"use client";

import { useEffect, useState } from "react";
import type { Edge, Node } from "reactflow";
import FlowingTreeGraph from "@/components/FlowingTreeGraph";
import { ResourceDetailPanel } from "@/components/ResourceDetailPanel";
import { useSelectedNode } from "@/context/SelectedNodeContext";
import { fetchGraph, fetchVulnerabilityStates } from "@/lib/api";
import type { GraphNode } from "@/lib/apischema";
import type { NodeData } from "@/store/graph";
import { useGraphStore } from "@/store/graph";
import type { VulnerabilityWithId } from "@/store/incidents";
import { useIncidentStore } from "@/store/incidents";
import { useSidebarStore } from "@/store/sidebar";
import { useVulnerabilityStatesStore } from "@/store/vulnerabilityStates";
import styles from "./page.module.css";

const POLL_INTERVAL = 5000;

const DemoPage = () => {
  // Access store setters
  const { setNodes, setEdges, incrementUpdateLayoutCounter } = useGraphStore((state) => state);
  const { setIncidents } = useIncidentStore();
  const { setStates } = useVulnerabilityStatesStore();
  const { isOpen } = useSidebarStore();
  const { selectedNodeId, setSelectedNodeId } = useSelectedNode();
  const [clusterStatus, setClusterStatus] = useState<
    "loading" | "waiting" | "initializing" | "ready" | "empty"
  >("loading");
  const [fullNodesData, setFullNodesData] = useState<GraphNode[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const call = await fetchGraph();
      if (!call.success) {
        console.error("API Schema Validation Failed");
        setClusterStatus("waiting");
        return;
      }

      // Check the API status
      const apiStatus = call.data.status;

      if (apiStatus === "waiting") {
        setClusterStatus("waiting");
        return;
      }

      if (apiStatus === "initializing") {
        setClusterStatus("initializing");
        return;
      }

      if (apiStatus === "empty") {
        setClusterStatus("empty");
        // For empty cluster, we still want to show the graph (just empty)
        setClusterStatus("ready");
        return;
      }

      if (apiStatus === "error") {
        console.error("API Error:", call.data.error);
        setClusterStatus("waiting");
        return;
      }

      // At this point, status must be "success"
      const { nodes: apiNodes, links: apiLinks } = call.data.data;

      // If we got here, cluster is ready
      if (clusterStatus !== "ready") {
        setClusterStatus("ready");
      }

      const currentNodes = useGraphStore.getState().nodes;
      let updateLayout = apiNodes.length !== currentNodes.length;

      // 2. Transform API Nodes to ReactFlow Nodes
      const newNodes: Node<NodeData>[] = apiNodes.map((node) => {
        const existingNode = currentNodes.find((n) => n.id === node.id);
        if (existingNode === undefined) updateLayout = true;

        return {
          id: node.id,
          type: "graphNode", // Ensure this matches your custom node component key
          position: existingNode ? existingNode.position : { x: 0, y: 0 },
          data: {
            id: node.id,
            label: node.label,
            status: node.status,
            apiType: node.type,
            // 'namespace' exists on Pod/Service/etc types in the Discriminated Union
            namespace: "namespace" in node ? node.namespace : undefined,
            vulnerabilityCount: node.vulnerabilities?.length || 0,
          },
        };
      });

      const incidents = apiNodes
        .map((n) =>
          (n.vulnerabilities || []).map(
            (v) =>
              ({
                nodeId: n.id,
                ...v,
              }) as unknown as VulnerabilityWithId
          )
        )
        .flat();

      setIncidents(incidents);

      // 3. Transform API Links to ReactFlow Edges
      const newEdges: Edge[] = apiLinks.map((link) => ({
        id: `${link.source}-${link.target}`,
        source: link.source,
        target: link.target,
        type: "smoothstep",
      }));

      // 4. Update Store
      setNodes(newNodes);
      setEdges(newEdges);
      setFullNodesData(apiNodes);
      if (updateLayout) incrementUpdateLayoutCounter();
    };

    const fetchStates = async () => {
      const response = await fetchVulnerabilityStates();
      if (response && "status" in response && response.status === "success") {
        setStates(response.states);
      }
    };

    // Initial fetch
    fetchData();
    fetchStates();

    // Poll every 5 seconds
    const intervalId = setInterval(() => {
      fetchData();
      fetchStates();
    }, POLL_INTERVAL);

    return () => clearInterval(intervalId);
  }, [setNodes, setEdges, incrementUpdateLayoutCounter, setIncidents, setStates, clusterStatus]);

  // Find the selected node from full data
  const selectedNode = selectedNodeId
    ? fullNodesData.find((n) => n.id === selectedNodeId) || null
    : null;

  return (
    <main className={`${styles.main} ${isOpen ? "" : styles["sidebar-closed"]}`}>
      <div style={{ height: "100%", width: "100%" }}>
        <FlowingTreeGraph />
      </div>
      {selectedNode && (
        <ResourceDetailPanel node={selectedNode} onClose={() => setSelectedNodeId(null)} />
      )}
    </main>
  );
};

export default DemoPage;
