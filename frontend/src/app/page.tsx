"use client";

import { useEffect } from "react";
import type { Edge, Node } from "reactflow";
import FlowingTreeGraph from "@/components/FlowingTreeGraph";
import { fetchGraph } from "@/lib/api";
import type { NodeData } from "@/store/graph";
import { useGraphStore } from "@/store/graph";
import type { VulnerabilityWithId } from "@/store/incidents";
import { useIncidentStore } from "@/store/incidents";
import { useSidebarStore } from "@/store/sidebar";
import styles from "./page.module.css";

const POLL_INTERVAL = 5000;

const Home = () => {
  // Access store setters
  const { setNodes, setEdges, incrementUpdateLayoutCounter } = useGraphStore((state) => state);
  const { setIncidents } = useIncidentStore();
  const { isOpen } = useSidebarStore();

  useEffect(() => {
    const fetchData = async () => {
      const call = await fetchGraph();
      if (!call.success) {
        console.error("API Schema Validation Failed");
        return;
      }

      const { nodes: apiNodes, links: apiLinks } = call.data.data;
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
                id: n.id,
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
      if (updateLayout) incrementUpdateLayoutCounter();
    };

    // Initial fetch
    fetchData();

    // Poll every 5 seconds
    const intervalId = setInterval(fetchData, POLL_INTERVAL);

    return () => clearInterval(intervalId);
  }, [setNodes, setEdges, incrementUpdateLayoutCounter, setIncidents]);

  return (
    <main className={`${styles.main} ${isOpen ? "" : styles["sidebar-closed"]}`}>
      <div style={{ height: "100%", width: "100%" }}>
        <FlowingTreeGraph />;
      </div>
    </main>
  );
};

export default Home;
