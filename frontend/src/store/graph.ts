import type { Connection, Edge, Node, OnEdgesChange, OnNodesChange } from "reactflow";
import { addEdge, applyEdgeChanges, applyNodeChanges } from "reactflow";
import { create } from "zustand";

export type NodeData = {
  id: string;
  label: string;
  apiType?: "namespace" | "node" | "pod" | "service";
  status?: string;
  namespace?: string;
};

interface GraphState {
  nodes: Node<NodeData>[];
  edges: Edge[];
  updateLayoutCounter: number;
  incrementUpdateLayoutCounter: () => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  onConnect: (connection: Connection) => void;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  edges: [],
  updateLayoutCounter: 0,
  incrementUpdateLayoutCounter: () => set({ updateLayoutCounter: get().updateLayoutCounter + 1 }),
  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },
  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  onConnect: (connection) => {
    set({
      edges: addEdge(connection, get().edges),
    });
  },
}));
