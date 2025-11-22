import type { TreeData } from "@/components/TreeGraph";
import TreeGraph from "@/components/TreeGraph";

// Sample data for the tree structure
const sampleTree: TreeData = {
  id: "root",
  text: "Root Node",
  children: [
    {
      id: "child-1",
      text: "Child 1",
      children: [
        {
          id: "grandchild-1a",
          text: "Grandchild 1.A",
          children: [],
        },
        {
          id: "grandchild-1b",
          text: "Grandchild 1.B (with more text to make it wider)",
          children: [],
        },
      ],
    },
    {
      id: "child-2",
      text: "Child 2 (Short)",
      children: [
        {
          id: "grandchild-2a",
          text: "Grandchild 2.A",
          children: [],
        },
      ],
    },
    {
      id: "child-3",
      text: "Child 3",
      children: [],
    },
    {
      id: "child-4",
      text: "Child 3",
      children: [],
    },
  ],
};

const Home = () => {
  return (
    <main>
      <TreeGraph tree={sampleTree} />
    </main>
  );
};

export default Home;
