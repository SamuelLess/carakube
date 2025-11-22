"use client";

import React, { type ReactNode, createContext, useContext, useState } from "react";

interface SelectedNodeContextType {
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  centerNodeId: string | null;
  setCenterNodeId: (id: string | null) => void;
}

const SelectedNodeContext = createContext<SelectedNodeContextType | undefined>(undefined);

export const SelectedNodeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [centerNodeId, setCenterNodeId] = useState<string | null>(null);

  return (
    <SelectedNodeContext.Provider
      value={{ selectedNodeId, setSelectedNodeId, centerNodeId, setCenterNodeId }}
    >
      {children}
    </SelectedNodeContext.Provider>
  );
};

export const useSelectedNode = () => {
  const context = useContext(SelectedNodeContext);
  if (context === undefined) {
    throw new Error("useSelectedNode must be used within a SelectedNodeProvider");
  }
  return context;
};
