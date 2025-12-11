import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  EditableNodeName,
  nodeFieldsConfig,
  nodeValidationSchema,
} from '@/shared';
import { useFlowStore } from '@/store';
import { useMemo, useState, useCallback } from 'react';
import { useReactFlow } from 'reactflow';
import { DynamicForm } from '../forms/DynamicForm'; // Points to index or file above

export function NodeConfigModal() {
  const { setNodes } = useReactFlow();
  const { activeNode, setActiveNode, updateNode, rollback } = useFlowStore();

  const nodeData = activeNode?.data;
  const nodeId = activeNode?.id as string;
  const nodeType = nodeData?.type as string;

  // 1. State
  const [nodeName, setNodeName] = useState(nodeData?.name || nodeType?.toUpperCase());

  // 2. Memoized Configuration
  const fields = useMemo(() => nodeFieldsConfig[nodeType] ?? [], [nodeType]);
  const schema = useMemo(() => nodeValidationSchema[nodeType], [nodeType]);
  
  // Use config OR configuration. No heavy processing needed here as DynamicForm handles defaults.
  const defaultValues = useMemo(() => {
    return nodeData?.configuration ?? nodeData?.config ?? {};
  }, [nodeData]);

  // Check if config is essentially empty (for rollback logic)
  const isConfigEmpty = useMemo(() => {
    const ignored = ['skip', 'continueOnError'];
    const conf = nodeData?.configuration ?? {};
    return !Object.keys(conf).some(k => !ignored.includes(k));
  }, [nodeData]);

  // 3. Handlers
  const handleFormSubmit = useCallback(async (values: Record<string, any>) => {
    try {
      // Create a copy to modify
      const finalConfig = { ...values };

      // Backend specific transformations
      if (Array.isArray(values.conditions)) {
        const defaultConjunction = finalConfig.conditions[0]?.conjunction;
        finalConfig.conditions = values.conditions.map((c) => ({
          expression: `'${c.field}' ${c.operator} '${c.value}'`,
          operator: c.conjunction ?? defaultConjunction ?? '&&',
        }));
      }

      if (Array.isArray(values.switchCases)) {
        finalConfig.switchCases = values.switchCases.map((c, index: number) => ({
          condition: `case_${index + 1}`,
          expression: `'${c.field}' ${c.operator} '${c.value}'`,
        }));
      }

      const payload = {
        type: nodeType,
        name: nodeName,
        configuration: finalConfig, // Frontend
        // config: finalConfig,        // Backend
      };

      if (updateNode) {
        updateNode(nodeId, payload);
      } else {
        setNodes((nodes) =>
          nodes.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, ...payload } } : n)
        );
      }
      setActiveNode(null);
    } catch (e) {
      console.error('Save failed', e);
    }
  }, [nodeType, nodeName, nodeId, updateNode, setNodes, setActiveNode]);

  const handleClose = useCallback(() => {
    setActiveNode(null);
    if (isConfigEmpty && rollback) rollback();
  }, [setActiveNode, isConfigEmpty, rollback]);

  if (!nodeData) return null;

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="wf-node-config-dialog">
        <DialogHeader className="wf-node-config-header">
          <DialogTitle className="wf-node-config-title">
            <EditableNodeName nodeName={nodeName} onRename={setNodeName} />
          </DialogTitle>
        </DialogHeader>
        
        <DynamicForm
          key={`${nodeId}-${nodeType}`} // Re-mount form on node change
          fields={fields}
          defaultValues={defaultValues}
          onSubmit={handleFormSubmit}
          schema={schema}
          onClose={() => setActiveNode(null)}
        />
      </DialogContent>
    </Dialog>
  );
}

NodeConfigModal.displayName = 'NodeConfigModal';