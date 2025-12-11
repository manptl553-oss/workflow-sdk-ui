import { TemplateMeta, WorkflowCategoryList } from '@/features';
import { transformEdge, transformNode } from '@/features/workflow-canvas';
import {
  getOutputsForNode,
  getTargetHandleForNode,
  handleLoopNodeTopology,
  isTriggerNode,
  NodeExecutionEvent,
  VersionData,
  WorkflowEdge,
  WorkflowNode,
} from '@/shared';
import { CategoryTypes, NodeTypeProps } from '@/shared/constants';
import { computeConnectedHandles, makeEdge } from '@/shared/utils/edge';
import React from 'react';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  XYPosition,
} from 'reactflow';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';

export interface NodeData {
  id: string;
  name: string;
  type: string;
  versionId: string | null;
  description?: string;
  outputs?: string[];
  parentLoop?: string;
  templateId?: string;
  configuration?: Record<string, any>;
  data?: Record<string, any>;
}

interface WorkflowDiff {
  nodes: WorkflowNode[];
  deletedNodes: string[];
  edges: WorkflowEdge[];
  deletedEdges: string[];
}

interface VoidNodeData {
  name: string;
  type: string;
  templateId: string;
}

interface FlowState {
  nodes: Node<NodeData>[];
  edges: Edge[];
  nodeCategories: WorkflowCategoryList;
  voidNode: VoidNodeData | null;
  isDragging: boolean;

  // Track what exists in backend
  syncedNodeIds: Set<string>;
  syncedEdgeIds: Set<string>;

  // Track changes
  dirtyNodeIds: Set<string>;
  dirtyEdgeIds: Set<string>;
  deletedNodeIds: Set<string>;
  deletedEdgeIds: Set<string>;

  sourceNodeId: string | null;
  sourceHandleId: string | null;
  sourceEdgeId: string | null;
  showSidebar: boolean;
  connectedHandles: Record<string, Set<string>>;
  workflowId: string | null;
  currentVersion: VersionData | null;
  activeNode: Node | null;
  nodeTypeMeta: Map<NodeTypeProps, TemplateMeta>;
  categoryMeta: Map<CategoryTypes, TemplateMeta>;
  nodeExecutionState: NodeExecutionEvent;

  //rollback of nodeChange in update Node
  rollback: null | (() => void);

  // Initialize from backend
  setNodeCategories: (value: WorkflowCategoryList) => void;
  setVoidNode: (nodeData: VoidNodeData) => void;
  getNewNode: (position: XYPosition) => Node<NodeData>;

  initializeFromBackend: (workflow: {
    nodes: Node<NodeData>[];
    edges: Edge[];
  }) => void;

  // Get changes for sync
  getChangesForSync: () => WorkflowDiff | null;

  // After successful sync
  markAsSynced: () => void;

  // Check if there are unsaved changes
  isDirty: () => boolean;

  setActiveNode: (node: Node | null) => void;
  setWorkflowId: (id: string | null) => void;
  setCurrentVersion: (data: VersionData | null) => void;

  buildTemplateRegistry: (categories: WorkflowCategoryList) => void;

  // set running node
  setNodeExecutionState: (nodeExecutionState: NodeExecutionEvent) => void;

  // React Flow API
  onNodeDragStop: (
    event: React.MouseEvent | React.PointerEvent,
    node: Node,
  ) => void;
  onNodeDrag: (
    event: React.MouseEvent | React.PointerEvent,
    node: Node,
  ) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  // Core actions
  addEdge: (edge: Edge) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  deleteEdge: (edgeId: string) => void;
  setSourceNodeId: (id: string | null) => void;
  setSourceHandleId: (id: string | null) => void;
  setSourceEdgeId: (id: string | null) => void;
  setShowSidebar: (value: boolean) => void;

  // Node operations
  // addNode: (node: Node, shouldConnect?: boolean) => void;
  addNodeAfter: (
    sourceNodeId: string,
    position: XYPosition,
    sourceHandleId?: string,
  ) => void;
  addNodeBetweenEdge: (position: XYPosition, edge: Edge) => void;
  deleteNode: (nodeId: string) => void;
  renameNode: (id: string, newName: string) => void;
  updateNode: (nodeId: string, nodeData: Partial<NodeData>) => void;

  // Utility
  setEdgeForSidebar: (edgeId: string, sourceNodeId: string) => void;
  clearSource: () => void;
  clearAll: () => void;

  // 🔁 bridge to RF's updateNodeInternals
  _updateNodeInternals?: (id: string) => void;
  setUpdateNodeInternals: (fn: (id: string) => void) => void;

  // public helpers
  refreshNodeHandles: (nodeId: string) => void;
  refreshManyHandles: (nodeIds: string[]) => void;

  //syncChanges
  setDeletedNodeId: (nodeId: string) => void;
  setDeletedEdgeId: (edgId: string) => void;
  setDirtyNodeId: (nodeId: string) => void;
  setDirtyEdgeId: (edgeId: string) => void;
}

//  Zustand Store with Dirty Tracking
export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: [],
  edges: [],
  nodeCategories: [],
  voidNode: null,
  //it is for track pos change bcs if we calculate in onNodeChange it gives us lagging issue
  isDragging: false,

  // Sync tracking
  syncedNodeIds: new Set(),
  syncedEdgeIds: new Set(),

  //initial rollback is null set in updateNode
  rollback: null,

  // Change tracking
  dirtyNodeIds: new Set(),
  dirtyEdgeIds: new Set(),
  deletedNodeIds: new Set(),
  deletedEdgeIds: new Set(),

  sourceNodeId: null,
  sourceHandleId: null,
  sourceEdgeId: null,
  showSidebar: false,
  connectedHandles: {},
  workflowId: null,
  currentVersion: null,
  activeNode: null,
  nodeExecutionState: {},
  nodeTypeMeta: new Map<NodeTypeProps, TemplateMeta>(),
  categoryMeta: new Map<CategoryTypes, TemplateMeta>(),

  // Initialize workflow from backend
  initializeFromBackend: (workflow) => {
    set({
      nodes: workflow.nodes,
      edges: workflow.edges,
      syncedNodeIds: new Set(workflow.nodes.map((n) => n.id)),
      syncedEdgeIds: new Set(workflow.edges.map((e) => e.id)),
      // Clear all tracking
      dirtyNodeIds: new Set(),
      dirtyEdgeIds: new Set(),
      deletedNodeIds: new Set(),
      deletedEdgeIds: new Set(),
      connectedHandles: computeConnectedHandles(workflow.edges),
    });
  },

  setNodeExecutionState: (nodeExecutionState: NodeExecutionEvent) =>
    set({ nodeExecutionState }),

  // Rebuild registry from categories
  buildTemplateRegistry: (categories: WorkflowCategoryList) => {
    const state = get();
    const nodeTypeMeta = state.nodeTypeMeta;
    const categoryMeta = state.categoryMeta;
    nodeTypeMeta.clear();
    categoryMeta.clear();

    const traverse = (items: any[]) => {
      for (const item of items) {
        if (item.visibility !== false) {
          categoryMeta.set(item.name, {
            icon: item.metadata?.icon ?? null,
            color: item.metadata?.color ?? '#d1d6e1',
            border: item.metadata?.border ?? 'rgba(107, 114, 128, 0.35)',
            request: item.metadata?.request ?? {},
            response: item.metadata?.response ?? {},
          });
        }
        if (item.nodeTemplates) {
          for (const template of item.nodeTemplates) {
            if (template.visibility === false) continue;

            const type = template.type as NodeTypeProps;

            nodeTypeMeta.set(type, {
              icon: template.metadata?.icon ?? null,
              color: template.metadata?.color ?? '#d1d6e1',
              border: template.metadata?.border ?? 'rgba(107, 114, 128, 0.35)',
              request: template.metadata?.request ?? {},
              response: template.metadata?.response ?? {},
            });
          }
        }
        if (item.subCategories?.length) traverse(item.subCategories);
      }
    };

    traverse(categories);
  },
  getTemplateMeta: (type: NodeTypeProps | string): TemplateMeta => {
    const state = get();
    const meta = state.nodeTypeMeta.get(type as NodeTypeProps);
    if (meta) return meta;

    return {
      color: '#d1d6e1',
      border: 'rgba(107, 114, 128, 0.35)',
      request: {},
      response: {},
    };
  },
  // Get changes for API sync
  getChangesForSync: () => {
    const state = get();

    // Quick check: any changes?
    if (
      state.dirtyNodeIds.size === 0 &&
      state.deletedNodeIds.size === 0 &&
      state.dirtyEdgeIds.size === 0 &&
      state.deletedEdgeIds.size === 0 &&
      state.nodes.every((n) => state.syncedNodeIds.has(n.id)) &&
      state.edges.every((e) => state.syncedEdgeIds.has(e.id))
    ) {
      return null; // No changes
    }

    // New nodes = nodes not in syncedNodeIds
    const addedNodes = state.nodes.filter(
      (n) => !state.syncedNodeIds.has(n.id),
    );

    // Updated nodes = nodes in dirtyNodeIds
    const updatedNodes = state.nodes.filter((n) =>
      state.dirtyNodeIds.has(n.id),
    );

    // Deleted nodes = IDs in deletedNodeIds
    const deletedNodes = Array.from(state.deletedNodeIds);

    // Same for edges
    const addedEdges = state.edges.filter(
      (e) => !state.syncedEdgeIds.has(e.id),
    );
    const updatedEdges = state.edges.filter((e) =>
      state.dirtyEdgeIds.has(e.id),
    );
    const deletedEdges = Array.from(state.deletedEdgeIds);

    const nodes = [...addedNodes, ...updatedNodes].map(transformNode);
    const edges = [...addedEdges, ...updatedEdges].map(transformEdge);
    return {
      nodes,
      edges,
      deletedNodes,
      deletedEdges,
    };
  },

  // Mark everything as synced after successful save
  markAsSynced: () => {
    set((state) => {
      // Add all current nodes/edges to synced sets
      const newSyncedNodeIds = new Set(state.nodes.map((n) => n.id));
      const newSyncedEdgeIds = new Set(state.edges.map((e) => e.id));

      return {
        syncedNodeIds: newSyncedNodeIds,
        syncedEdgeIds: newSyncedEdgeIds,
        // Clear all tracking
        dirtyNodeIds: new Set(),
        dirtyEdgeIds: new Set(),
        deletedNodeIds: new Set(),
        deletedEdgeIds: new Set(),
      };
    });
  },

  // Check if there are unsaved changes
  isDirty: () => {
    const state = get();
    return (
      state.dirtyNodeIds.size > 0 ||
      state.deletedNodeIds.size > 0 ||
      state.dirtyEdgeIds.size > 0 ||
      state.deletedEdgeIds.size > 0 ||
      state.nodes.some((n) => !state.syncedNodeIds.has(n.id)) ||
      state.edges.some((e) => !state.syncedEdgeIds.has(e.id))
    );
  },

  setActiveNode: (node) => {
    set({ activeNode: node });
  },
  setWorkflowId: (id) => set({ workflowId: id }),
  setCurrentVersion: (data) => set({ currentVersion: data }),

  _updateNodeInternals: undefined,
  setUpdateNodeInternals: (fn) => set({ _updateNodeInternals: fn }),

  refreshNodeHandles: (nodeId) => {
    const fn = get()._updateNodeInternals;
    if (!fn) return;
    requestAnimationFrame(() => fn(nodeId));
  },

  refreshManyHandles: (nodeIds) => {
    const fn = get()._updateNodeInternals;
    if (!fn) return;
    requestAnimationFrame(() => nodeIds.forEach((id) => fn(id)));
  },

  // Basic Setters
  setNodes: (nodes) => {
    const { syncedNodeIds, dirtyNodeIds } = get();
    const newDirtyNodeIds = new Set([
      ...dirtyNodeIds,
      ...(nodes
        ?.flatMap((node) => node.id)
        ?.filter((nodeId) => syncedNodeIds.has(nodeId)) ?? []),
    ]);
    set({ nodes, dirtyNodeIds: newDirtyNodeIds });
  },

  setEdges: (edges) => {
    const prevEdges = get().edges;
    const handleMap =
      prevEdges.length === edges.length
        ? get().connectedHandles
        : computeConnectedHandles(edges);
    set({ edges, connectedHandles: handleMap });
  },

  deleteEdge: (edgeId: string) => {
    const { edges, setDeletedEdgeId } = get();

    setDeletedEdgeId(edgeId);
    // Remove edge
    const newEdges = edges.filter((e) => e.id !== edgeId);

    set({
      edges: newEdges,
      connectedHandles: computeConnectedHandles(newEdges),
    });
  },

  setSourceNodeId: (id) => set({ sourceNodeId: id }),
  setSourceHandleId: (id) => set({ sourceHandleId: id }),
  setSourceEdgeId: (id) => set({ sourceEdgeId: id }),
  setShowSidebar: (value) => set({ showSidebar: value }),

  // Edge Operations
  addEdge: (edge) => {
    const { edges, currentVersion } = get();
    const newEdges = addEdge(
      { ...edge, data: { ...edge.data, versionId: currentVersion?.id } },
      edges,
    );

    // Don't mark as dirty - it's a new edge
    // Will be picked up by getChangesForSync as addedEdge

    set({
      edges: newEdges,
      connectedHandles: computeConnectedHandles(newEdges),
    });
  },

  // React Flow Handlers
  // onNodesChange: (changes) => {
  //   const state = get();
  //   const nodes = applyNodeChanges(changes, state.nodes);

  //   if (nodes !== state.nodes) {
  //     const dirtyNodeIds = new Set(state.dirtyNodeIds);

  //     changes.forEach((change) => {
  //       if (change.type === "position" && state.syncedNodeIds.has(change.id)) {
  //         // find previous node position
  //         const prev = state.nodes.find((n) => n.id === change.id);
  //         // change.position may be present on the change object
  //         const newPos = (change as any).position;
  //         if (prev && newPos) {
  //           const moved =
  //             prev.position?.x !== newPos.x || prev.position?.y !== newPos.y;
  //           if (moved) dirtyNodeIds.add(change.id);
  //         }
  //       }
  //     });

  //     set({ nodes, dirtyNodeIds });
  //   }
  // },

  onNodesChange: (changes) => {
    const nodes = applyNodeChanges(changes, get().nodes);
    if (nodes !== get().nodes) set({ nodes });
  },
  //on nodeDrag to handle change in pos of not to mark that dirty
  onNodeDrag: (_event, node) => {
    const { isDragging, syncedNodeIds } = get();
    if (isDragging == true || !syncedNodeIds.has(node.id)) return;
    set({ isDragging: true });
  },
  //set dirtyNode and flag to false
  onNodeDragStop: (_event, node) => {
    const state = get();
    if (!state.isDragging) return;
    const dirtyNodeIds = new Set(state.dirtyNodeIds);
    dirtyNodeIds.add(node.id);
    set({ dirtyNodeIds, isDragging: false });
  },

  onEdgesChange: (changes) => {
    const state = get();
    const prevEdges = state.edges;
    const updatedEdges = applyEdgeChanges(changes, prevEdges);
    const nodeIds = new Set(state.nodes.map((n) => n.id));

    const cleanedEdges = updatedEdges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
    );

    //i think we don't need it bcs we have other function to delete edge
    // changes.forEach((change) => {
    //   if (change.type === "remove") {
    //     state.setDeletedEdgeId(change.id);
    //   }
    // });

    if (cleanedEdges !== prevEdges) {
      set({
        edges: cleanedEdges,
        connectedHandles: computeConnectedHandles(cleanedEdges),
      });
    }
  },

  onConnect: (connection) => {
    const { edges } = get();

    const newEdge = makeEdge({
      source: connection.source!,
      target: connection.target!,
      sourceHandle: connection.sourceHandle ?? 'none',
      targetHandle: connection.targetHandle ?? 'input',
    });

    const newEdges = addEdge(newEdge, edges);

    set({
      edges: newEdges,
      connectedHandles: computeConnectedHandles(newEdges),
    });
  },

  addNodeAfter: (sourceNodeId, position, sourceHandleId = 'none') => {
    const { nodes, edges, getNewNode } = get();
    const newNode = getNewNode(position);

    const filteredEdges = edges.filter(
      (e) => !(e.source === sourceNodeId && e.sourceHandle === sourceHandleId),
    );

    const newEdges: Edge[] = [...filteredEdges];

    //will remove this if condition
    if (!isTriggerNode(newNode?.data?.type?.toLowerCase?.())) {
      newEdges.push(
        makeEdge({
          source: sourceNodeId,
          target: newNode.id,
          sourceHandle: sourceHandleId,
          targetHandle: getTargetHandleForNode(newNode),
        }),
      );
    }

    set({
      nodes: [...nodes, newNode],
      edges: newEdges,
      connectedHandles: computeConnectedHandles(newEdges),
    });
  },

  addNodeBetweenEdge: (position, edge) => {
    const { nodes, edges, getNewNode, setDeletedEdgeId, currentVersion } =
      get();

    if (!edge) return;

    // 1. ROBUST LOOKUP: Find the edge in the store
    const sourceEdge = edges.find((e) => e.id === edge.id);
    if (!sourceEdge) return; // Edge doesn't exist in store, abort

    const sourceEdgeId = sourceEdge.id;
    const sourceNode = nodes.find((n) => n.id === sourceEdge.source);
    const targetNode = nodes.find((n) => n.id === sourceEdge.target);
    if (!sourceNode || !targetNode) return;

    // 2. Detect Loop Context from STORE data
    const isSelfLoop = sourceEdge.source === sourceEdge.target;
    const isLoopBack = sourceEdge.data?.loopType === 'loop-back';

    let parentLoopId = sourceNode.data.parentLoop;

    if (isSelfLoop && sourceNode.data.type === 'loop') {
      parentLoopId = sourceNode.id;
    }

    // 3. Create New Node
    const newNode = getNewNode(position);
    if (parentLoopId) {
      newNode.data.parentLoop = parentLoopId;
    }

    // 4. DELETE OLD EDGE
    setDeletedEdgeId(sourceEdgeId);
    const newEdges = edges.filter((e) => e.id !== sourceEdgeId);

    if (isTriggerNode(newNode?.data?.type?.toLowerCase?.())) {
      set({
        nodes: [...nodes, newNode],
        edges: newEdges,
        sourceEdgeId: null,
        showSidebar: false,
      });
      return;
    }

    // 5. Create Edge 1 (Source -> New)
    const dataToNew = { ...sourceEdge.data };
    if (parentLoopId) dataToNew.groupId = parentLoopId;

    if (isSelfLoop) {
      dataToNew.loopType = 'loop-child';
    } else if (isLoopBack) {
      delete dataToNew.loopType;
    }

    const edgeToNew = makeEdge({
      source: sourceNode.id,
      target: newNode.id,
      sourceHandle: sourceEdge.sourceHandle ?? 'none',
      targetHandle: getTargetHandleForNode(newNode),
      data: dataToNew,
    });

    // 6. Create Edge 2 (New -> Target)
    const dataFromNew = {
      versionId: currentVersion?.id,
      loopType: '',
      groupId: parentLoopId || undefined,
    };

    if (isSelfLoop || isLoopBack) {
      dataFromNew.loopType = 'loop-back';
    }

    const primaryOutput = getOutputsForNode(newNode)[0];

    const edgeFromNew = makeEdge({
      source: newNode.id,
      target: targetNode.id,
      sourceHandle: primaryOutput,
      targetHandle: sourceEdge.targetHandle ?? 'input',
      data: dataFromNew,
    });

    newEdges.push(edgeToNew, edgeFromNew);

    set({
      nodes: [...nodes, newNode],
      edges: newEdges,
      connectedHandles: computeConnectedHandles(newEdges),
      sourceEdgeId: null,
      showSidebar: false,
    });
  },

  renameNode: (nodeId, newName) => {
    set((state) => {
      const dirtyNodeIds = new Set(state.dirtyNodeIds);

      // Only mark as dirty if it's a synced node
      if (state.syncedNodeIds.has(nodeId)) {
        dirtyNodeIds.add(nodeId);
      }

      return {
        nodes: state.nodes.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, name: newName } }
            : node,
        ),
        dirtyNodeIds,
      };
    });
  },

  deleteNode: (nodeId) => {
    const state = get();
    const {
      nodes,
      edges,
      setDeletedNodeId,
      activeNode,
      setActiveNode,
      setDeletedEdgeId,
    } = state;

    if (activeNode && activeNode?.id == nodeId) setActiveNode(null);

    const deletedNode = nodes.find((n) => n.id === nodeId);
    if (!deletedNode) return;

    const isLoop = deletedNode?.data?.type === 'loop';

    // 1. Identify Edges
    const incoming = edges.filter((e) => e.target === nodeId);
    const outgoing = edges.filter((e) => e.source === nodeId);

    const removedEdges = [...incoming, ...outgoing];
    const nodesToRemoveIds = new Set<string>([nodeId]);

    let updatedEdges = edges.filter(
      (e) => e.source !== nodeId && e.target !== nodeId,
    );

    // ---------------------------------------------------------
    // SCENARIO A: DELETING A LOOP CONTROLLER (Parent)
    // ---------------------------------------------------------
    if (isLoop) {
      const childNodes = nodes.filter((n) => n.parentNode === nodeId);
      const childIds = new Set(childNodes.map((n) => n.id));

      const loopEdges = edges.filter(
        (e) => childIds.has(e.source) && e.target === nodeId,
      );

      removedEdges.push(...loopEdges);
      updatedEdges = updatedEdges.filter(
        (e) => !(childIds.has(e.source) && e.target === nodeId),
      );
    }

    // ---------------------------------------------------------
    // SCENARIO B: DELETING A CHILD NODE (Preserve Loop Logic)
    // ---------------------------------------------------------
    else {
      // 1. Determine "Best Path"
      let bestOutgoingEdge: Edge | undefined;

      // Priority: True -> Default -> First Output -> First Edge
      bestOutgoingEdge = outgoing.find((e) => e.sourceHandle === 'true');
      if (!bestOutgoingEdge)
        bestOutgoingEdge = outgoing.find((e) => e.sourceHandle === 'default');
      if (!bestOutgoingEdge && deletedNode.data?.outputs?.length) {
        const firstOutputHandle = deletedNode.data.outputs[0];
        bestOutgoingEdge = outgoing.find(
          (e) =>
            e.sourceHandle === firstOutputHandle ||
            e.sourceHandle === firstOutputHandle.toLowerCase(),
        );
      }
      if (!bestOutgoingEdge && outgoing.length > 0)
        bestOutgoingEdge = outgoing[0];

      // 2. Reconnect Incoming -> Best Outgoing
      if (incoming.length > 0 && bestOutgoingEdge) {
        const reconnectedEdges = incoming.map((inEdge) => {
          // --- CRITICAL FIX START ---
          const sourceNodeId = inEdge.source;
          const targetNodeId = bestOutgoingEdge!.target;

          // Merge Data: Start with incoming data
          const newData = { ...(inEdge.data || {}) };
          const outData = bestOutgoingEdge!.data || {};

          // Logic 1: If the resulting connection is Node -> Same Node, force 'self'
          if (sourceNodeId === targetNodeId) {
            newData.loopType = 'self';
          }
          // Logic 2: If the OUTGOING edge was the one closing the loop ('loop-back'),
          // the NEW edge must inherit that responsibility.
          else if (outData.loopType === 'loop-back') {
            newData.loopType = 'loop-back';
          }
          // Logic 3: If the incoming edge was the loop start ('loop-child'), keep it.
          // (No change needed, it's already in newData)

          // --- CRITICAL FIX END ---

          return makeEdge({
            source: sourceNodeId,
            target: targetNodeId,
            sourceHandle: inEdge.sourceHandle ?? 'none',
            targetHandle: bestOutgoingEdge!.targetHandle ?? 'input',
            data: newData,
          });
        });

        updatedEdges = [...updatedEdges, ...reconnectedEdges];
      }

      // 3. CLEANUP: Handle Abandoned Branches
      const abandonedEdges = outgoing.filter(
        (e) => e.id !== bestOutgoingEdge?.id,
      );

      abandonedEdges.forEach((edge) => {
        const targetNode = nodes.find((n) => n.id === edge.target);
        if (targetNode) {
          const isVoid = ['void_node', 'placeholder', 'addNode'].includes(
            targetNode.data?.type || targetNode.type || '',
          );
          if (isVoid) {
            const otherInputs = edges.filter(
              (e) => e.target === targetNode.id && e.source !== nodeId,
            );
            if (otherInputs.length === 0) {
              nodesToRemoveIds.add(targetNode.id);
              setDeletedNodeId(targetNode.id);
              const voidEdges = edges.filter(
                (e) => e.source === targetNode.id || e.target === targetNode.id,
              );
              voidEdges.forEach((ve) => {
                updatedEdges = updatedEdges.filter((ue) => ue.id !== ve.id);
                setDeletedEdgeId(ve.id);
              });
            }
          }
        }
      });
    }

    // Final Updates
    const updatedNodes = nodes.filter((n) => !nodesToRemoveIds.has(n.id));
    const validNodeIds = new Set(updatedNodes.map((n) => n.id));
    const cleanedEdges = updatedEdges.filter(
      (e) => validNodeIds.has(e.source) && validNodeIds.has(e.target),
    );

    nodesToRemoveIds.forEach((id) => setDeletedNodeId(id));
    removedEdges.forEach((edge) => {
      setDeletedEdgeId(edge.id);
    });

    set({
      nodes: updatedNodes,
      edges: cleanedEdges,
      connectedHandles: computeConnectedHandles(cleanedEdges, updatedNodes),
    });
  },

  updateNode: (nodeId, nodeData) => {
    let {
      nodes,
      edges,
      currentVersion,
      setDeletedEdgeId,
      setDirtyEdgeId,
      setDirtyNodeId,
      getNewNode,
      setDeletedNodeId,
      _updateNodeInternals,
      setActiveNode,
      deletedNodeIds,
      deletedEdgeIds,
      dirtyNodeIds,
      dirtyEdgeIds,
    } = get();

    //initial nodes & edges
    const initialNodes = nodes;
    const initialEdges = edges;

    // Find existing node
    const oldNode = nodes.find((n) => n.id === nodeId);
    if (!oldNode) return;

    const oldType = oldNode.data.type;
    const newType = nodeData.type ?? oldType;
    const typeChanged = oldType !== newType;
    // Merge or reset data
    // const mergedData = typeChanged
    // ? { ...nodeData } // FULL RESET
    // : { ...oldNode.data, ...nodeData }; // merge for same type

    //function for rollback
    const rollback = typeChanged
      ? () => {
          set({
            nodes: initialNodes,
            edges: initialEdges,
            connectedHandles: computeConnectedHandles(initialEdges),
            dirtyEdgeIds,
            dirtyNodeIds,
            deletedNodeIds,
            deletedEdgeIds,
          });
          setActiveNode(oldNode);
        }
      : null;

    const newNodeId = uuidv4();
    const mergedNode: Node<NodeData> = {
      ...oldNode,
      ...(typeChanged ? { id: newNodeId } : {}),
      data: {
        ...oldNode.data,
        ...nodeData,
        ...(typeChanged ? { id: newNodeId } : {}),
      },
    };
    setActiveNode(mergedNode);

    // Recompute outputs
    const newOutputs = getOutputsForNode(mergedNode);
    mergedNode.data.outputs = newOutputs;

    const normalizedOutputs = newOutputs.map((o) => o.toLowerCase());

    const trackDeletedEdges = (edgesToDelete: Edge[]) => {
      edgesToDelete.forEach((edge) => {
        setDeletedEdgeId(edge.id);
      });
    };

    //set nodeId dirty or delete node
    if (typeChanged) {
      setDeletedNodeId(nodeId);
    } else {
      setDirtyNodeId(nodeId);
    }
    if (newType === NodeTypeProps.LOOP) {
      if (typeChanged) {
        const result = handleLoopNodeTopology({
          mergedNode,
          oldNodeId: nodeId, // <--- PASS THE ORIGINAL ID HERE (This is critical)
          nodes,
          edges,
          currentVersion,
          getNewNode,
          trackDeletedEdges,
        });

        set({
          nodes: result.nodes,
          edges: result.edges,
          connectedHandles: computeConnectedHandles(result.edges),
          rollback,
        });

        _updateNodeInternals?.(mergedNode.id);
        return; // Stop here for Loops
      }
    }
    // SPECIAL RULE: If the node is a TRIGGER → remove all incoming edges
    if (isTriggerNode(newType)) {
      const incomingEdges = edges.filter((edge) => edge.target === nodeId);
      edges = edges.filter((edge) => edge.target !== nodeId);

      trackDeletedEdges(incomingEdges);
    }

    //check for typeChange & Update Edge as per that
    // Update invalid edges for this node (only outgoing)
    if (typeChanged) {
      const affectedEdges = edges.filter(
        (edge) => edge.source === nodeId || edge.target === nodeId,
      );

      // Track old edges as deleted
      trackDeletedEdges(affectedEdges);

      // Update edges with new node ID
      edges = edges.map((edge) => {
        if (edge.source !== nodeId && edge.target !== nodeId) return edge;

        if (edge.source === nodeId) {
          return {
            ...edge,
            id: uuidv4(), // New edge ID
            source: mergedNode.id,
            sourceHandle: normalizedOutputs[0],
          };
        } else {
          return {
            ...edge,
            id: uuidv4(), // New edge ID
            target: mergedNode.id,
          };
        }
      });

      //hot fix critical here
      const sourceEdgeId = edges.find(
        (edge) => edge.source === mergedNode.id,
      )?.id;
      if (sourceEdgeId) oldNode.data.outputs?.push(normalizedOutputs[0]);
    }

    // If NOT conditional/rule/switch → simple update
    const isConditional =
      newType === NodeTypeProps.CONDITIONAL ||
      newType === NodeTypeProps.RULE_EXECUTOR ||
      newType === NodeTypeProps.SWITCH;

    // If TRIGGER node → also behave like simple node
    if (!isConditional || isTriggerNode(newType)) {
      set({
        nodes: nodes.map((n) => (n.id == nodeId ? mergedNode : n)),
        edges,
        connectedHandles: computeConnectedHandles(edges),
        rollback,
      });
      return;
    }

    // ------------------------------------------------------------
    // CONDITIONAL, RULE EXECUTOR, or SWITCH → Create branch children
    // ------------------------------------------------------------

    const x = oldNode.position.x;
    const y = oldNode.position.y;

    let branchNodes: Node<NodeData>[] = [];
    let branchEdges: Edge[] = [];

    // Handle SWITCH node differently
    const isSwitch = newType === NodeTypeProps.SWITCH;

    const branchNames = isSwitch
      ? newOutputs // e.g. ["case_1", "case_2", ...]
      : newOutputs.map((out) => out.toLowerCase()); // ["on_true","on_false"] etc.

    // Offset logic (clean)
    const getOffsetY = (idx: number, total: number, handle: string) => {
      if (!isSwitch) {
        // Conditional → True/False custom spacing
        const fixedOffsets: Record<string, number> = {
          true: -100,
          false: 100,
        };
        if (fixedOffsets[handle] !== undefined) return fixedOffsets[handle];
      }
      // Switch or generic fallback
      return idx * 140 - ((total - 1) * 140) / 2;
    };
    branchNames.forEach((handle, index) => {
      const normalized = handle.toLowerCase();
      if (oldNode.data.outputs?.includes(normalized)) {
        if (!isSwitch) return;
        edges = edges.map((edge) => {
          const isMatch =
            edge.source === mergedNode.id && edge.sourceHandle === normalized;

          if (!isMatch) return edge;

          const caseData =
            isSwitch && nodeData?.configuration
              ? nodeData?.configuration?.switchCases?.find(
                  (c: Record<string, string>) => c.condition === normalized,
                )
              : null;

          return {
            ...edge,
            data: {
              ...edge.data,
              ...(caseData ?? {}),
            },
          };
        });

        const dirtyEdge = edges.find(
          (e) => e.source == mergedNode.id && e.sourceHandle == normalized,
        );

        if (dirtyEdge) setDirtyEdgeId(dirtyEdge.id);
        return;
      }

      // const childId = uuidv4();
      const offsetY = getOffsetY(index, branchNames.length, normalized);
      const newBranchNode = getNewNode({ x: x + 250, y: y + offsetY });
      branchNodes.push(newBranchNode);

      // Edge
      branchEdges.push({
        id: uuidv4(),
        type: 'custom',
        source: mergedNode.id,
        sourceHandle: normalized,
        target: newBranchNode.id,
        targetHandle: 'input',
        ...(isSwitch && {
          label: handle.replace(/_/g, ' ').toUpperCase(),
          labelStyle: { fontWeight: 600, fontSize: 12 },
        }),
        data: {
          versionId: currentVersion?.id,
          condition: normalized,
          ...(isSwitch &&
            nodeData?.configuration && {
              ...nodeData?.configuration?.switchCases.find(
                (e: Record<string, string>) => e.condition == normalized,
              ),
            }),
        },
      });
    });

    //delete edges for switch node

    if (isSwitch) {
      const oldConditions =
        oldNode.data?.configuration?.switchCases?.flatMap(
          (e: Record<string, string>) => e.condition,
        ) ?? [];
      const newConditions =
        nodeData?.configuration?.switchCases?.flatMap(
          (e: Record<string, string>) => e.condition,
        ) ?? [];
      const casesToDelete = oldConditions?.filter(
        (e: string) => !newConditions?.includes(e),
      );
      const deletedEdges = edges.filter(
        (e) =>
          e.source === mergedNode.id && casesToDelete?.includes(e.sourceHandle),
      );
      edges = edges.filter((e) => {
        if (e.source != mergedNode.id) return true;
        return !casesToDelete?.includes(e.sourceHandle);
      });
      trackDeletedEdges(deletedEdges);
    }
    const finalEdges = [...edges, ...branchEdges];
    const finalNodes = [
      ...nodes.map((n) => (n.id == nodeId ? mergedNode : n)),
      ...branchNodes,
    ];

    set({
      nodes: finalNodes,
      edges: finalEdges,
      connectedHandles: computeConnectedHandles(finalEdges),
      rollback,
    });
    _updateNodeInternals?.(mergedNode.id);
  },

  setNodeCategories: (categories) => set({ nodeCategories: categories }),

  setVoidNode: (nodeData) => set({ voidNode: nodeData }),

  getNewNode: (position) => {
    const { voidNode, currentVersion } = get();
    const id = uuidv4();
    const newNode = {
      id,
      type: 'custom',
      position,
      data: {
        id,
        name: voidNode?.name ?? '',
        type: voidNode?.type ?? 'void_node',
        templateId: voidNode?.templateId,
        versionId: currentVersion?.id ?? null,
        outputs: ['none'],
      },
    };

    return newNode;
  },

  setDeletedNodeId: (nodeId) => {
    const { syncedNodeIds, deletedNodeIds, dirtyNodeIds } = get();
    const newDeletedNodeIds = new Set(deletedNodeIds);
    const newDirtyNodeIds = new Set(dirtyNodeIds);
    if (syncedNodeIds.has(nodeId)) {
      newDeletedNodeIds.add(nodeId);
      newDirtyNodeIds.delete(nodeId);
    }
    set({
      deletedNodeIds: newDeletedNodeIds,
      dirtyNodeIds: newDirtyNodeIds,
    });
  },

  setDeletedEdgeId: (edgeId) => {
    const { syncedEdgeIds, deletedEdgeIds, dirtyEdgeIds } = get();
    const newDeletedEdgeIds = new Set(deletedEdgeIds);
    const newDirtyEdgeIds = new Set(dirtyEdgeIds);
    if (syncedEdgeIds.has(edgeId)) {
      newDeletedEdgeIds.add(edgeId);
      newDirtyEdgeIds.delete(edgeId);
    }
    set({
      deletedEdgeIds: newDeletedEdgeIds,
      dirtyEdgeIds: newDirtyEdgeIds,
    });
  },
  setDirtyNodeId: (nodeId) => {
    const { syncedNodeIds, dirtyNodeIds } = get();
    const newDirtyNodeIds = new Set(dirtyNodeIds);
    if (syncedNodeIds.has(nodeId)) {
      newDirtyNodeIds.add(nodeId);
    }
    set({
      dirtyNodeIds: newDirtyNodeIds,
    });
  },
  setDirtyEdgeId: (edgeId) => {
    const { syncedEdgeIds, dirtyEdgeIds } = get();
    const newDirtyEdgeIds = new Set(dirtyEdgeIds);
    if (syncedEdgeIds.has(edgeId)) {
      newDirtyEdgeIds.add(edgeId);
    }
    set({
      dirtyEdgeIds: newDirtyEdgeIds,
    });
  },
  setEdgeForSidebar: (edgeId, sourceNodeId) =>
    set({ sourceEdgeId: edgeId, sourceNodeId, showSidebar: true }),

  clearSource: () =>
    set({ sourceNodeId: null, sourceHandleId: null, sourceEdgeId: null }),

  clearAll: () =>
    set({
      nodes: [],
      edges: [],
      connectedHandles: {},
      syncedNodeIds: new Set(),
      syncedEdgeIds: new Set(),
      dirtyNodeIds: new Set(),
      dirtyEdgeIds: new Set(),
      deletedNodeIds: new Set(),
      deletedEdgeIds: new Set(),
    }),
}));
