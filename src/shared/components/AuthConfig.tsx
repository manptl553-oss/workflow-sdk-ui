import { Control, FieldErrors, useWatch } from 'react-hook-form';
import { EAuthType } from '../constants';
import { FieldConfig } from '@/features';
import { getFieldRenderer } from '@/features/workflow-canvas/components';

export function AuthConfigFields({
  control,
  name = 'authentication',
  errors,
}: {
  control: Control;
  name?: string;
  errors?: FieldErrors;
}) {
  // Watch which auth type user selected
  const type = useWatch({
    control,
    name: `${name}.type`,
  }) as EAuthType;

  // Field configuration
  const fields: Record<string, FieldConfig> = {
    type: {
      name: `${name}.type`,
      label: 'Authentication Type',
      type: 'select',
      options: Object.values(EAuthType).map((t) => ({
        value: t,
        label: t,
      })),
      placeholder: 'Select authentication',
    },

    username: {
      name: `${name}.username`,
      label: 'Username',
      type: 'input',
      placeholder: 'Enter username',
    },

    password: {
      name: `${name}.password`,
      label: 'Password',
      type: 'input',
      placeholder: 'Enter password',
    },

    headers: {
      name: `${name}.auth`,
      label: 'Headers',
      type: 'table',
      options: [
        { name: 'headerKey', label: 'Header Key', type: 'input' },
        { name: 'headerValue', label: 'Header Value', type: 'input' },
      ],
    },
  };

  // Render helper
  const renderField = (field: FieldConfig) => {
    const filedName = field.name.split('.')[1];
    const Renderer = getFieldRenderer(field.type);
    return (
      <Renderer
        key={field.name}
        field={field}
        control={control}
        errors={errors?.[filedName]}
      />
    );
  };

  return (
    <div className="wf-auth-wrapper">
      {renderField(fields.type)}

      {type === EAuthType.BASIC && (
        <>
          {renderField(fields.username)}
          {renderField(fields.password)}
        </>
      )}

      {type === EAuthType.HEADER && renderField(fields.headers)}

      {errors?.[name]?.message && (
        <p className="wf-error-text">{errors[name].message as string}</p>
      )}
    </div>
  );
}
