import { Workflow } from '@/shared';
import { NodeData } from '@/store';
import { Edge, MarkerType, Node } from 'reactflow';

export function mapWorkflowToFlow(workflow: Workflow) {
  const nodes: Node<NodeData>[] = [];
  const edges: Edge[] = [];
  if (!workflow) return { nodes, edges };

  // 1. Map Nodes
  workflow.nodes?.forEach((wfNode) => {
    let outputs: string[] = [];

    switch (wfNode.type) {
      case 'conditional':
      case 'rule_executor':
        outputs = ['on_true', 'on_false'];
        break;
      case 'switch':
        outputs =
          wfNode.config?.switchCases?.map(
            (c: Record<string, string>) => c.condition,
          ) || [];
        break;
      case 'loop':
        // Loop nodes MUST have these specific handles for validation to pass
        outputs = ['body', 'done'];
        break;
      default:
        outputs = ['none'];
        break;
    }

    nodes.push({
      id: wfNode.id,
      type: 'custom',
      data: {
        id: wfNode.id,
        versionId: wfNode?.versionId,
        templateId: wfNode.templateId,
        name: wfNode.name,
        type: wfNode.type,
        configuration: wfNode.config,
        parentLoop: wfNode.parentId ?? undefined,
        outputs,
      },
      position: wfNode.position,
    });
  });

  // 2. Map Edges
  const seenEdgeIds = new Set<string>();

  workflow.edges?.forEach((e) => {
    const edgeId = e.id;
    if (seenEdgeIds.has(edgeId)) return;
    seenEdgeIds.add(edgeId);

    // --- 1. Identify Source Node Type ---
    // We need to know if the source is a Loop to assign the correct handle ("done" vs "none")
    const sourceNode = workflow?.nodes?.find((n) => n.id === e.sourceId);
    const isSourceLoop = sourceNode?.type === 'loop';

    // --- 2. Detect Loop Context & Visuals ---
    let loopType = '';

    if (e.groupId) {
      if (e.sourceId === e.targetId) {
        loopType = 'self';
      } else if (e.sourceId === e.groupId) {
        loopType = 'loop-child'; // Outer Loop -> First Inner Node
      } else if (e.targetId === e.groupId) {
        loopType = 'loop-back'; // Last Inner Node -> Outer Loop
      }
    } else {
      // Check if this is an "End" edge (Loop Node -> Outside World)
      if (isSourceLoop) {
        loopType = 'end';
      }
    }

    // --- 3. Determine Source Handle ID ---
    let sourceHandle = 'none';

    if (e.condition && e.condition !== 'none') {
      sourceHandle = e.condition;
    } else {
      switch (loopType) {
        case 'self':
        case 'loop-child':
          // Always "body" for the start of a loop
          sourceHandle = 'body';
          break;

        case 'end':
          // Leaving a loop to go outside -> "done"
          sourceHandle = 'done';
          break;

        case 'loop-back':
          // The edge returning to the start.
          // If a Nested Loop is the last item, it connects via "done".
          // If a Standard Node is the last item, it connects via "none".
          sourceHandle = isSourceLoop ? 'done' : 'none';
          break;

        default:
          // Standard Sequential Connection (e.g., Inner Loop -> Void Node)
          // If the source is a Loop, we connect from its "done" handle.
          // If the source is a Map/Void, we connect from its "none" handle.
          sourceHandle = isSourceLoop ? 'done' : 'none';
          break;
      }
    }

    edges.push({
      id: edgeId,
      source: e.sourceId,
      target: e.targetId,
      sourceHandle: sourceHandle, // <--- Corrected handle logic
      targetHandle: 'input',
      type: 'custom',
      animated: true,
      style: { strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed },
      label:
        e.condition && e.condition !== 'none' && e.condition !== 'body'
          ? e.condition
          : '',
      labelStyle: { fontWeight: 600, fontSize: 12 },
      data: {
        expression: e?.expression,
        versionId: e?.versionId,
        loopType: loopType,
        groupId: e.groupId,
      },
    });
  });

  return { nodes, edges };
}
