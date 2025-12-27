import { useContext } from "react";

import { WorkflowDataContext } from "./WorkflowDataContext";

export function useWorkflowData() {
  const context = useContext(WorkflowDataContext);
  if (!context) {
    throw new Error("useWorkflowData must be used within WorkflowDataProvider");
  }
  return context;
}
