import { FieldConfig } from '@/features';
import { getFieldRenderer } from '@/features/workflow-canvas/components';
import { Control, FieldErrors, useWatch } from 'react-hook-form';
import { ELoopType } from '../constants';

export function LoopConfigFields({
  control,
  errors,
}: {
  control: Control;
  errors?: FieldErrors;
}) {
  // Watch which loop type user selected
  const loopType = useWatch({
    control,
    name: `loopType`,
  });

  // Define field configurations
  const fields: Record<string, FieldConfig> = {
    loopType: {
      name: 'loopType',
      label: 'Loop Strategy',
      type: 'select',
      options: [
        { value: ELoopType.FIXED, label: 'Fixed Iterations' },
        { value: ELoopType.WHILE, label: 'While Loop' },
        { value: ELoopType.FOR_EACH, label: 'For Each' },
      ],
      placeholder: 'Select loop type',
    },
    maxIterations: {
      name: 'maxIterations',
      label: 'Maximum Iterations',
      type: 'input',
      placeholder: 'e.g. 10',
    },
    exitCondition: {
      name: 'exitCondition',
      label: 'Exit Condition',
      type: 'input',
      placeholder: 'e.g. $.input.isComplete == true',
    },
    dataSourcePath: {
      name: 'dataSourcePath',
      label: 'Data Source Path',
      type: 'input',
      placeholder: 'e.g. $.input.items',
    },
  };

  const renderField = (field: FieldConfig) => {
    const Renderer = getFieldRenderer(field.type);
    return (
      <Renderer
        key={field.name}
        field={field}
        control={control}
        errors={errors?.[field.name]}
      />
    );
  };

  return (
    // <div className="wf-loop-wrapper">
    <>
      {renderField(fields.loopType)}
      {loopType === ELoopType.FIXED && renderField(fields.maxIterations)}
      {loopType === ELoopType.WHILE && renderField(fields.exitCondition)}
      {loopType === ELoopType.FOR_EACH && renderField(fields.dataSourcePath)}
    </>
    // </div>
  );
}
