import { FieldConfig } from '@/features';
import { getFieldRenderer } from '@/features/workflow-canvas/components';
import { Control, FieldErrors, useWatch } from 'react-hook-form';
import { EScheduleType, ETimeUnit } from '../constants';

export function ScheduleConfig({
  control,
  errors,
}: {
  control: Control;
  errors?: FieldErrors;
}) {
  // Watch which schedule type user selected
  const type = useWatch({
    control,
    name: `type`,
  });

  // Watch enableRepeat for interval mode
  const enableRepeat = useWatch({
    control,
    name: `enableRepeat`,
  });

  // Define field configurations
  const fields: Record<string, FieldConfig> = {
    type: {
      name: 'type',
      label: 'Schedule Type',
      type: 'select',
      options: [
        { value: EScheduleType.FIXED_TIME, label: 'Fixed Time' },
        { value: EScheduleType.INTERVAL, label: 'Interval' },
      ],
      placeholder: 'Select schedule type',
    },
    date: {
      name: 'date',
      label: 'Date (YYYY-MM-DD)',
      type: 'date',
      placeholder: 'Enter date',
    },
    hour: {
      name: 'hour',
      label: 'Hour (0-23)',
      type: 'input',
      placeholder: 'Enter hour',
    },
    minute: {
      name: 'minute',
      label: 'Minute (0-59)',
      type: 'input',
      placeholder: 'Enter minute',
    },
    intervalValue: {
      name: 'intervalValue',
      label: 'Interval Value',
      type: 'input',
      placeholder: 'Enter interval value',
    },
    intervalUnit: {
      name: 'intervalUnit',
      label: 'Interval Unit',
      type: 'select',
      options: Object.values(ETimeUnit).map((unit) => ({
        value: unit,
        label: unit.charAt(0).toUpperCase() + unit.slice(1),
      })),
      placeholder: 'Select time unit',
    },
    enableRepeat: {
      name: 'enableRepeat',
      label: 'Enable Repetition',
      type: 'checkbox',
    },
    repeatCount: {
      name: 'repeatCount',
      label: 'Repeat Count',
      type: 'input',
      placeholder: 'Enter repeat count',
    },
    timezone: {
      name: 'timezone',
      label: 'Timezone (Optional)',
      type: 'input',
      placeholder: 'e.g. America/New_York',
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
    <div className="wf-schedule-wrapper">
      {renderField(fields.type)}

      {type === EScheduleType.FIXED_TIME &&
        ['date', 'hour', 'minute'].map((f) => renderField(fields[f]))}

      {type === EScheduleType.INTERVAL && (
        <>
          {['intervalUnit', 'intervalValue', 'enableRepeat'].map((f) =>
            renderField(fields[f]),
          )}
          {enableRepeat && renderField(fields.repeatCount)}
        </>
      )}

      {renderField(fields.timezone)}
    </div>
  );
}