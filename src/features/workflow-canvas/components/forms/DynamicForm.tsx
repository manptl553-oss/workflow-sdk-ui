import { Button, EOperatorType } from '@/shared';
import { ELoopType } from '@/shared/constants';
import { zodResolver } from '@hookform/resolvers/zod';
import { memo, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { splitExpression } from '../../helpers';
import { DynamicFormProps, FieldConfig } from '../../types';
import { getFieldRenderer } from './FieldRegistery';

// --- Default Value Logic (Pure Function) ---
const processDefaultValues = (
  defaultValues: Record<string, any>,
  fields: FieldConfig[],
): Record<string, any> => {
  const cleaned: Record<string, any> = { ...defaultValues };

  // Helper for empty condition state
  const emptyCondition = {
    field: '',
    operator: EOperatorType.Equals,
    value: '',
  };

  // Normalize Conditions
  if (!Array.isArray(cleaned.conditions) || cleaned.conditions.length === 0) {
    cleaned.conditions = [emptyCondition];
  } else {
    cleaned.conditions = cleaned.conditions.map((c) =>
      c.expression
        ? { ...splitExpression(c.expression), conjunction: c.operator }
        : c,
    );
  }

  // Normalize Switch Cases
  if (!Array.isArray(cleaned.switchCases) || cleaned.switchCases.length === 0) {
    cleaned.switchCases = [emptyCondition];
  } else {
    cleaned.switchCases = cleaned.switchCases.map((c) =>
      c.expression ? splitExpression(c.expression) : c,
    );
  }

  // Fill in missing fields to avoid "uncontrolled to controlled" warnings
  fields.forEach((f) => {
    if (cleaned[f.name] !== undefined) return;

    switch (f.type) {
      case 'conditions':
      case 'cases':
        cleaned[f.name] = [emptyCondition];
        break;
      case 'tags':
      case 'addOn':
        cleaned[f.name] = [];
        break;
      case 'checkbox':
        cleaned[f.name] = false;
        break;
      case 'select':
        if (f.isMulti) cleaned[f.name] = [];
        else if (f.isGrouped)
          cleaned[f.name] = f.options?.[0]?.options?.[0]?.value ?? '';
        else cleaned[f.name] = f.options?.[0]?.value ?? '';
        break;
      case 'loop':
        cleaned.loopType = cleaned.loopType ?? ELoopType.FIXED;
        cleaned.maxIterations = cleaned.maxIterations ?? '';
        cleaned.exitCondition = cleaned.exitCondition ?? '';
        cleaned.dataSourcePath = cleaned.dataSourcePath ?? '';
        break;
      default:
        cleaned[f.name] = '';
    }
  });

  return cleaned;
};

// --- Main Component ---
export const DynamicForm = memo(
  ({
    fields,
    schema,
    onSubmit,
    defaultValues = {},
    onCancel,
    onClose,
  }: DynamicFormProps) => {
    // 1. Memoize defaults to prevent form re-initialization
    const cleanedDefaults = useMemo(
      () => processDefaultValues(defaultValues, fields),
      [defaultValues, fields],
    );

    // 2. Initialize Form
    const {
      handleSubmit,
      control,
      watch,
      setValue,
      formState: { errors, isSubmitting },
    } = useForm({
      resolver: schema ? zodResolver(schema) : undefined,
      defaultValues: cleanedDefaults,
      mode: 'onSubmit',
    });

    // 3. Handlers
    const onFormSubmit = useCallback(
      (data: Record<string, any>) => {
        onSubmit?.(data);
        onClose?.();
      },
      [onSubmit, onClose],
    );

    const onFormCancel = useCallback(() => {
      onCancel?.();
    }, [onCancel]);

    return (
      <form
        onSubmit={handleSubmit(onFormSubmit)}
        className="wf-dynamic-form"
      >
        <div className="wf-field-column wf-scroll-hide">
          {fields.map((field) => {
            const Renderer = getFieldRenderer(field.type);
            return (
              <Renderer
                key={field.name}
                field={field}
                control={control}
                errors={errors?.[field.name] ?? errors}
                watch={watch}
                setValue={setValue}
              />
            );
          })}
        </div>

        <div className="wf-actions-row">
          <Button
            type="submit"
            className="wf-button-fill wf-button-text-contrast"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              className="wf-button-fill"
              onClick={onFormCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
    );
  },
);

DynamicForm.displayName = 'DynamicForm';
