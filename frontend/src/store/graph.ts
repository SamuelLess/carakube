import type { Connection, Edge, Node, OnEdgesChange, OnNodesChange } from "reactflow";
import { addEdge, applyEdgeChanges, applyNodeChanges } from "reactflow";
import { create } from "zustand";

export type NodeData = {
  label: string;
};

interface GraphState {
  nodes: Node<NodeData>[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  onConnect: (connection: Connection) => void;
}

const initialNodes: Node<NodeData>[] = [
  { id: "root", type: "graphNode", data: { label: "Root Node" }, position: { x: 0, y: 0 } },
  { id: "child-1", type: "graphNode", data: { label: "Child 1" }, position: { x: 0, y: 0 } },
  {
    id: "grandchild-1a",
    type: "graphNode",
    data: { label: "Grandchild 1.A" },
    position: { x: 0, y: 0 },
  },
  {
    id: "grandchild-1b",
    type: "graphNode",
    data: { label: "Grandchild 1.B (with more text to make it wider)" },
    position: { x: 0, y: 0 },
  },
  {
    id: "child-2",
    type: "graphNode",
    data: { label: "Child 2 (Short)" },
    position: { x: 0, y: 0 },
  },
  {
    id: "grandchild-2a",
    type: "graphNode",
    data: { label: "Grandchild 2.A" },
    position: { x: 0, y: 0 },
  },
  { id: "child-3", type: "graphNode", data: { label: "Child 3" }, position: { x: 0, y: 0 } },
  { id: "child-4", type: "graphNode", data: { label: "Child 3" }, position: { x: 0, y: 0 } },
];

const initialEdges: Edge[] = [
  { id: "root-child-1", source: "root", target: "child-1" },
  { id: "child-1-grandchild-1a", source: "child-1", target: "grandchild-1a" },
  { id: "child-1-grandchild-1b", source: "child-1", target: "grandchild-1b" },
  { id: "root-child-2", source: "root", target: "child-2" },
  { id: "child-2-grandchild-2a", source: "child-2", target: "grandchild-2a" },
  { id: "child-2-grandchild-2aa", source: "child-3", target: "grandchild-2a" },
  { id: "root-child-3", source: "root", target: "child-3" },
  { id: "root-child-4", source: "root", target: "child-4" },
  { id: "root-child-4as", source: "child-3", target: "child-4" },
];

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
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
