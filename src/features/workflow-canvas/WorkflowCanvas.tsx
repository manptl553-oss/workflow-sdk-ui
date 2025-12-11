import {
  Button,
  EventTriggerOptions,
  formatName,
  GroupedOption,
  Input,
  nodeFieldsConfig,
  NodeTypeProps,
  Option,
  Select,
  WorkFlowStatus,
} from '@/shared';
import { Loader } from '@/shared/Loader';
import { useFlowStore } from '@/store/workflow-store';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ReactFlowProvider } from 'reactflow';
import FlowCanvas from './components/canvas/FlowCanvas';
import { normalizeWorkflowData } from './helpers/normalize';
import { FieldConfig, WorkflowCanvasProps } from './types';
import './workflow-canvas.css';
export function WorkflowCanvas({
  nodeExecution,
  workflow,
  versions,
  handleVersionChange,
  nodeCategory,
  handleBack,
  handleSaveWorkflow,
  handleRunWorkflow,
  handlePublish,
  groupIds,
  eventTriggerOptions,
  isLoading,
}: WorkflowCanvasProps) {
  const {
    getChangesForSync,
    nodes,
    setCurrentVersion,
    currentVersion,
    setNodeCategories,
    nodeCategories,
    voidNode,
    setVoidNode,
    markAsSynced,
    isDirty,
    buildTemplateRegistry,
    setNodeExecutionState,
  } = useFlowStore();

  const [workflowName, setWorkflowName] = useState(workflow?.name || '');
  const normalizedData = useMemo(
    () => (workflow ? normalizeWorkflowData(workflow) : undefined),
    [workflow],
  );

  useEffect(() => {
    if (workflow?.name) {
      setWorkflowName(workflow.name);
    }
  }, [workflow?.name]);

  useEffect(() => {
    if (!currentVersion || currentVersion.id != workflow.version.id)
      setCurrentVersion(workflow.version);
    if (nodeCategories.length === 0) setNodeCategories(nodeCategory);
    buildTemplateRegistry(nodeCategory);
    if (!voidNode && nodeCategories.length) {
      const voidNode = nodeCategory
        .flatMap((cat) => cat.nodeTemplates)
        .find((t) => t?.type === NodeTypeProps.VOID);
      setVoidNode({
        name: voidNode?.name ?? 'Void Node',
        type: voidNode?.type ?? NodeTypeProps.VOID,
        templateId: voidNode?.id ?? '',
      });
    }
  }, [currentVersion, nodeCategories, workflow.version]);

  //group  Id for membership invite
  const groupIdsSelectOptions: Option[] =
    groupIds?.map((e) => ({
      label: e.name,
      value: e.id,
    })) ?? [];
  nodeFieldsConfig[NodeTypeProps.MEMBERSHIP_INVITE] = nodeFieldsConfig?.[
    NodeTypeProps.MEMBERSHIP_INVITE
  ]?.map((e) =>
    e.name == 'groupIds'
      ? ({ ...e, options: groupIdsSelectOptions } as FieldConfig)
      : e,
  );

  const transformToGroupedOptions = (
    apps: EventTriggerOptions[],
  ): GroupedOption[] => {
    return apps
      ?.filter((app) => app.visibility && app.events.length > 0)
      ?.map((app) => ({
        label: app.appName.toUpperCase(),
        options: app.events
          ?.filter((event) => event.visibility)
          ?.map((event) => ({
            value: event.name,
            label: formatName(event.name),
          })),
      }))
      ?.filter((group) => group.options.length > 0);
  };

  nodeFieldsConfig[NodeTypeProps.EVENT] = nodeFieldsConfig?.[
    NodeTypeProps.EVENT
  ]?.map((e) =>
    e.name == 'eventName'
      ? ({
          ...e,
          options: transformToGroupedOptions(eventTriggerOptions),
        } as FieldConfig)
      : e,
  );

  useEffect(() => {
    setNodeExecutionState(nodeExecution);
  }, [nodeExecution, setNodeExecutionState]);

  return (
    <div className="wf-canvas">
      <header className="wf-canvas__header">
        <div className="wf-header-left">
          <button
            onClick={handleBack}
            aria-label="Back"
            className="wf-back-button"
          >
            <ArrowLeft
              color="white"
              size={20}
            />
          </button>

          <div className="wf-name-row">
            <Input
              id="workflow-name"
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              placeholder="Workflow Name"
              className="wf-workflow-name-input"
            />

            <Select
              options={
                versions?.map((version) => ({
                  value: version.version.toString(),
                  label: formatName(version.name),
                })) || []
              }
              value={workflow?.version?.version?.toString()}
              onValueChange={(value: string) => {
                handleVersionChange?.(value);
              }}
              placeholder="Select"
              className="w-[180px]"
            />
          </div>
        </div>
        <div className="wf-header-right">
          {nodes?.length > 0 && (
            <Button
              className="wf-save-btn"
              onClick={async () => {
                const changes = getChangesForSync();
                if (changes) {
                  const payload = {
                    versionId: workflow?.version?.id,
                    name: workflowName,
                    description: workflow.description,
                    slug: workflow?.slug,
                  };
                  const isSaved = await handleSaveWorkflow({
                    ...payload,
                    ...changes,
                  });
                  if (isSaved) markAsSynced();
                } else if (
                  workflow?.version?.status !== WorkFlowStatus.PUBLISHED
                ) {
                  handlePublish(
                    workflow?.version?.id,
                    WorkFlowStatus.PUBLISHED,
                  );
                }
              }}
            >
              {!isDirty() &&
              workflow?.version?.status !== WorkFlowStatus.PUBLISHED
                ? 'Publish'
                : 'Save'}
            </Button>
          )}
          {nodes?.length > 0 && (
            <Button
              className="bg-(--wf-brand-primary) text-(--wf-text-inverted) "
              onClick={() => {
                handleRunWorkflow({
                  workflowId: workflow?.id,
                  versionId: workflow?.version?.id,
                });
              }}
            >
              Dry Run
            </Button>
          )}
        </div>
      </header>

      <ReactFlowProvider>
        <div className="wf-canvas-pane">
          {isLoading ? (
            <div className="wf-loader-container">
              <Loader size={60} />
            </div>
          ) : (
            <FlowCanvas workflow={normalizedData} />
          )}
        </div>
      </ReactFlowProvider>
    </div>
  );
}
