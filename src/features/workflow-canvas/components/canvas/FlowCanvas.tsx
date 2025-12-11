import { Workflow } from '@/shared';
import { getAutoLayoutedElements } from '@/shared/utils/layout';
import { useFlowStore } from '@/store';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import ReactFlow, {
  Controls,
  Node,
  OnConnectStartParams,
  useReactFlow,
  useUpdateNodeInternals,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { v4 as uuidv4 } from 'uuid';
import { mapWorkflowToFlow } from '../../helpers/workflow-to-flow-mapper';
import CustomEdge from '../edges/CustomEdge';
import CustomNode from '../nodes/CustomNode';
import { NodeConfigModal } from '../nodes/NodeConfigModal';
import { Popover } from '../popovers/Popover';

// ---------- CONSTANTS ----------
const nodeTypes = { custom: CustomNode };
const edgeTypes = { custom: CustomEdge };

// ---------- MAIN COMPONENT ----------
export default function FlowCanvas({ workflow }: { workflow?: Workflow }) {
  const {
    setNodes,
    addNodeAfter,
    setEdges,
    nodes,
    edges,
    onNodesChange,
    onNodeDragStop,
    onNodeDrag,
    onEdgesChange,
    onConnect,
    setActiveNode,
    activeNode,
    initializeFromBackend,
    currentVersion,
    setUpdateNodeInternals,
  } = useFlowStore();

  const updateNodeInternals = useUpdateNodeInternals();
  useEffect(() => {
    setUpdateNodeInternals(updateNodeInternals);
  }, [setUpdateNodeInternals, updateNodeInternals]);

  const isPopoverOpen = useMemo(
    () => ['start_workflow', 'void_node'].includes(activeNode?.data?.type),
    [activeNode?.data?.type],
  );

  const idModalOpen = useMemo(
    () => !isPopoverOpen && activeNode != null,
    [isPopoverOpen, activeNode],
  );

  const containerRef = useRef<HTMLDivElement>(null);

  const { screenToFlowPosition, fitView } = useReactFlow();
  const [pendingConnection, setPendingConnection] =
    useState<OnConnectStartParams | null>(null);

  const isEditMode = !!workflow?.id;

  // Load workflow
  useEffect(() => {
    const { nodes, edges } = isEditMode
      ? mapWorkflowToFlow(workflow)
      : { nodes: [], edges: [] };
    initializeFromBackend({ nodes, edges });
  }, [workflow, isEditMode, setNodes, setEdges, initializeFromBackend]);

  // Initial Start Node
  useEffect(() => {
    const isWorkflowEmpty =
      isEditMode && (workflow?.nodes?.length ?? 0) === 0 && nodes.length === 0;

    const id = uuidv4();
    if (isWorkflowEmpty) {
      const startNode: Node = {
        id: id,
        type: 'custom',
        position: { x: 200, y: 250 },
        data: {
          id: id,
          name: 'Start Workflow',
          type: 'start_workflow',
          versionId: currentVersion?.id ?? '',
          outputs: ['none'],
        },
      };
      setNodes([startNode]);
    }
  }, [
    nodes.length,
    isEditMode,
    workflow?.nodes?.length,
    setNodes,
    currentVersion?.id,
  ]);

  const onConnectStart = useCallback(
    (
      _event: React.MouseEvent | React.TouchEvent,
      params: OnConnectStartParams,
    ) => {
      const { nodeId, handleId } = params;

      const isConnected = edges.some(
        (e) => e.source === nodeId && e.sourceHandle === handleId,
      );

      if (isConnected) {
        alert('This node is already connected to the next step.');
        return;
      }

      setPendingConnection(params);
    },
    [edges],
  );

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (
        pendingConnection &&
        (event.target as HTMLElement).classList.contains('react-flow__pane')
      ) {
        const x = 'clientX' in event ? event.clientX : event.touches[0].clientX;
        const y = 'clientY' in event ? event.clientY : event.touches[0].clientY;
        const position = screenToFlowPosition({ x, y });
        addNodeAfter(
          pendingConnection.nodeId ?? '',
          position,
          pendingConnection.handleId ?? '',
        );
      }
      setPendingConnection(null);
    },
    [pendingConnection, screenToFlowPosition, addNodeAfter],
  );

  const handleAutoLayout = useCallback(() => {
    setTimeout(() => {
      const { nodes: layoutedNodes, edges: layoutedEdges } =
        getAutoLayoutedElements(nodes, edges);
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);

      requestAnimationFrame(() => {
        fitView({ padding: 60 });
      });
    }, 100);
  }, [nodes, edges, setNodes, setEdges, fitView]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setActiveNode(activeNode ? null : node);
    },
    [activeNode, setActiveNode],
  );

  const onPaneClick = useCallback(() => {
    setActiveNode(null); // This clears the selected node, which makes isPopoverOpen false
  }, [setActiveNode]);

  return (
    <div
      className="wf-flow-root"
      ref={containerRef}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodeClick={handleNodeClick}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
        fitView
        className="wf-flow-surface"
        proOptions={{ hideAttribution: true }}
      >
        <Controls
          onFitView={handleAutoLayout}
          showInteractive={false}
        />
      </ReactFlow>

      {isPopoverOpen && <Popover />}
      {idModalOpen && <NodeConfigModal />}
    </div>
  );
}
