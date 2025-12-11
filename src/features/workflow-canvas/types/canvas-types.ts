import { NodeExecutionEvent, Workflow, VersionData, SaveWorkFlowPayload, WorkFlowStatus, GroupIds, EventTriggerOptions } from "@/shared";
import { WorkflowCategoryList } from "./node-picker-panel-types";

export interface WorkflowCanvasProps {
  nodeExecution: NodeExecutionEvent;
  workflow: Workflow;
  versions: VersionData[];
  handleVersionChange: (versionId: string) => void;
  nodeCategory: WorkflowCategoryList;
  handleBack: () => void;
  handleRunWorkflow: (_: { workflowId: string; versionId: string }) => void;
  handleSaveWorkflow: (workflow: SaveWorkFlowPayload) => Promise<boolean>;
  handlePublish: (versionId: string, status: WorkFlowStatus) => void;
  groupIds: GroupIds[];
  eventTriggerOptions: EventTriggerOptions[];
  isLoading?: boolean;
}
