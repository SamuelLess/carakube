"use client";

import { useEffect, useState } from "react";
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

const DemoPage = () => {
  // Access store setters
  const { setNodes, setEdges, incrementUpdateLayoutCounter } = useGraphStore((state) => state);
  const { setIncidents } = useIncidentStore();
  const { isOpen } = useSidebarStore();
  const [clusterStatus, setClusterStatus] = useState<
    "loading" | "waiting" | "initializing" | "ready" | "empty"
  >("loading");
  const [statusMessage, setStatusMessage] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      const call = await fetchGraph();
      if (!call.success) {
        console.error("API Schema Validation Failed");
        setClusterStatus("waiting");
        setStatusMessage("Waiting for cluster data...");
        return;
      }

      // Check the API status
      const apiStatus = call.data.status;

      if (apiStatus === "waiting") {
        setClusterStatus("waiting");
        setStatusMessage(call.data.message);
        return;
      }

      if (apiStatus === "initializing") {
        setClusterStatus("initializing");
        setStatusMessage(call.data.message);
        return;
      }

      if (apiStatus === "empty") {
        setClusterStatus("empty");
        setStatusMessage(call.data.message);
        // For empty cluster, we still want to show the graph (just empty)
        setClusterStatus("ready");
        return;
      }

      if (apiStatus === "error") {
        console.error("API Error:", call.data.error);
        setClusterStatus("waiting");
        setStatusMessage("Error loading cluster data");
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
  }, [setNodes, setEdges, incrementUpdateLayoutCounter, setIncidents, clusterStatus]);

  return (
    <main className={`${styles.main} ${isOpen ? "" : styles["sidebar-closed"]}`}>
      {clusterStatus !== "ready" && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            zIndex: 1000,
            background: "rgba(255, 255, 255, 0.95)",
            padding: "2rem 3rem",
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "4px solid #f3f3f3",
              borderTop: "4px solid var(--carakube-6)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 1rem",
            }}
          />
          <h3 style={{ margin: "0 0 0.5rem", color: "var(--carakube-6)" }}>
            {clusterStatus === "loading" && "Loading..."}
            {clusterStatus === "waiting" && "Starting Scanner"}
            {clusterStatus === "initializing" && "Kubernetes Starting Up"}
          </h3>
          <p style={{ margin: 0, color: "#666", fontSize: "0.9rem" }}>
            {statusMessage ||
              (clusterStatus === "loading"
                ? "Connecting to backend..."
                : clusterStatus === "waiting"
                  ? "Waiting for initial scan to complete..."
                  : clusterStatus === "initializing"
                    ? "Kubernetes API is becoming ready..."
                    : "Please wait...")}
          </p>
          <p style={{ margin: "0.75rem 0 0", color: "#999", fontSize: "0.8rem" }}>
            {clusterStatus === "waiting" && "This usually takes 10-30 seconds"}
            {clusterStatus === "initializing" && "This may take 1-2 minutes on first startup"}
          </p>
          <style jsx>{`
            @keyframes spin {
              0% {
                transform: rotate(0deg);
              }
              100% {
                transform: rotate(360deg);
              }
            }
          `}</style>
        </div>
      )}
      <div style={{ height: "100%", width: "100%", opacity: clusterStatus !== "ready" ? 0.3 : 1 }}>
        <FlowingTreeGraph />
      </div>
    </main>
  );
};

export default DemoPage;
