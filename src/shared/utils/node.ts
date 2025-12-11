import { Edge, Node } from 'reactflow';
import { NODE_DEFINITIONS, NodeTypeProps } from '../constants';
import { NodeDefinition, VersionData } from '../types';
import { NodeData } from '@/store';
import { v4 as uuidv4 } from "uuid";

export const getNodeDefinition = (type?: string): NodeDefinition => {
  const key = type?.toLowerCase?.();
  if (!key) {
    return { outputs: ['none'], defaultTarget: 'input' };
  }

  return (
    NODE_DEFINITIONS[key as keyof typeof NODE_DEFINITIONS] ?? {
      outputs: ['none'],
      defaultTarget: 'input',
    }
  );
};

export const getOutputsForNode = (node: Node<NodeData>): string[] => {
  const type = node?.data?.type?.toLowerCase();
  const def = getNodeDefinition(type);

  if (type === NodeTypeProps.SWITCH) {
    const cases = node?.data?.configuration?.switchCases;
    if (Array.isArray(cases) && cases.length > 0)
      return cases.map((c, i: number) => c?.condition || `case_${i + 1}`);
    return ['case_1'];
  }

  return def.outputs;
};

export const getTargetHandleForNode = (node: Node): string =>
  getNodeDefinition(node?.data?.type).defaultTarget;

export const getSelfLoopHandle = (node: Node): string | null =>
  getNodeDefinition(node?.data?.type).selfLoopHandle ?? null;

export const getEdgeLabelForNode = (
  node: Node<NodeData>,
  handle?: string,
): string | undefined => {
  if (!handle) return;
  const normalized = handle.toLowerCase().replace(/^on_/, '');

  const def = getNodeDefinition(node?.data?.type);

  // Static labels
  if (def.labels?.[normalized]) return def.labels[normalized];

  // Dynamic switch case: case_1 → Case 1
  if (normalized.startsWith('case_')) {
    const num = normalized.split('_')[1];
    return `Case ${num}`;
  }

  return undefined;
};

// Includes old trigger logic + extended support
export const isTriggerNode = (nodeType?: string): boolean => {
  if (!nodeType) return false;
  const type = nodeType.toLowerCase?.();
  return [
    'webhook',
    'event',
    'schedule',
    'trigger',
    'cron',
    'http_request',
  ].includes(type);
};




export const handleLoopNodeTopology = ({
  mergedNode,
  oldNodeId,
  nodes,
  edges,
  currentVersion,
  getNewNode,
  trackDeletedEdges,
}: {
  mergedNode: Node<NodeData>;
  oldNodeId: string;
  nodes: Node<NodeData>[];
  edges: Edge[];
  currentVersion: VersionData | null;
  getNewNode: (pos: { x: number; y: number }) => Node<NodeData>;
  trackDeletedEdges: (edges: Edge[]) => void;
}) => {
  mergedNode.data.outputs = ['body', 'end'];
  
  const nodesToDelete = new Set<string>();
  const edgesToDelete = new Set<string>();
  
  // 1. Outgoing Cleanup
  const outgoingEdges = edges.filter(
    (e) => e.source === mergedNode.id || e.source === oldNodeId
  );

  outgoingEdges.forEach((edge) => {
    edgesToDelete.add(edge.id);
    const targetNode = nodes.find((n) => n.id === edge.target);
    if (!targetNode) return;

    const isPlaceholder = ['void_node', 'addNode'].includes(targetNode.data?.type);
    if (isPlaceholder) {
      const isOrphaned = !edges.some(
        (e) =>
          e.target === targetNode.id &&
          e.source !== mergedNode.id &&
          e.source !== oldNodeId
      );
      if (isOrphaned) nodesToDelete.add(targetNode.id);
    }
  });

  // 2. Incoming Cleanup & Rewiring
  const incomingEdges = edges.filter((e) => e.target === oldNodeId);
  
  // CRITICAL: Mark original incoming edges as deleted
  incomingEdges.forEach(edge => edgesToDelete.add(edge.id));

  // Generate NEW incoming edges with new IDs
  let rewiredEdges = incomingEdges.map((edge) => ({
    ...edge,
    id: uuidv4(),
    target: mergedNode.id,
  }));

  // 3. Sync Deletions
  const preservedEdges = edges.filter((e) => !edgesToDelete.has(e.id));
  const deletedEdgesList = edges.filter(e => edgesToDelete.has(e.id));
  trackDeletedEdges(deletedEdgesList);

  // 4. Create Loop Topology
  const containerLoopId = mergedNode.data.parentLoop;
  const { x, y } = mergedNode.position;
  const loopNodes: Node<NodeData>[] = [];
  const loopEdges: Edge[] = [];

  // Self Loop (Body)
  loopEdges.push({
    id: uuidv4(),
    type: 'custom',
    source: mergedNode.id,
    target: mergedNode.id,
    sourceHandle: 'body',
    targetHandle: 'body',
    animated: true,
    data: {
      loopType: 'self',
      loopOwner: mergedNode.id,
      groupId: mergedNode.id,
      versionId: currentVersion?.id,
    },
  });

  if (containerLoopId) {
    const parentLoop = nodes.find((n) => n.id === containerLoopId);
    if (parentLoop) {
      rewiredEdges = rewiredEdges.map((e) => {
        if (e.source === parentLoop.id) {
          return {
            ...e,
            targetHandle: 'input',
            data: { ...e.data, loopType: 'loop-child', groupId: containerLoopId },
          };
        }
        return e;
      });

      const doneDummy = getNewNode({ x: x + 260, y });
      doneDummy.data.parentLoop = containerLoopId;
      loopNodes.push(doneDummy);

      loopEdges.push({
        id: uuidv4(),
        type: 'custom',
        source: mergedNode.id,
        target: doneDummy.id,
        sourceHandle: 'end',
        targetHandle: 'input',
        animated: true,
        data: { loopType: 'loop-child', versionId: currentVersion?.id, groupId: containerLoopId },
      });

      loopEdges.push({
        id: uuidv4(),
        type: 'custom',
        source: doneDummy.id,
        target: parentLoop.id,
        sourceHandle: 'none',
        targetHandle: 'body',
        animated: true,
        data: { loopType: 'loop-back', versionId: currentVersion?.id, groupId: containerLoopId },
      });
    }
  } else {
    const doneNode = getNewNode({ x: x + 260, y });
    doneNode.data.parentLoop = mergedNode.data.parentLoop;
    loopNodes.push(doneNode);

    loopEdges.push({
      id: uuidv4(),
      type: 'custom',
      animated: true,
      source: mergedNode.id,
      target: doneNode.id,
      sourceHandle: 'end',
      targetHandle: 'input',
      data: { loopType: 'end', versionId: currentVersion?.id },
    });
  }

  const finalNodes = nodes
    .filter((n) => !nodesToDelete.has(n.id))
    .map((n) => (n.id === oldNodeId ? mergedNode : n))
    .concat(loopNodes);

  return {
    nodes: finalNodes,
    edges: [...preservedEdges, ...rewiredEdges, ...loopEdges],
  };
};