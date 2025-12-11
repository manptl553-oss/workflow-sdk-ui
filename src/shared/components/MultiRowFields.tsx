import { getFieldRenderer } from '@/features/workflow-canvas/components';
import { Trash2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useFieldArray } from 'react-hook-form';
import { MultiRowFieldOptions, MultiRowFieldProps } from '../types';
import { cn } from '../utils';
import { Button } from './Button';
import { Label } from './Label';

function MultiRowFields({
  control,
  name,
  label,
  errors,
  isTag = false,
  columns,
  className,
  headerClassName,
  rowClassName,
  cellClassName,
}: MultiRowFieldProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name,
  });

  const addEmptyRow = () => {
    if (columns) {
      const emptyRow = columns.reduce(
        (acc, col) => {
          acc[col.name] = '';
          return acc;
        },
        {} as Record<string, string>,
      );
      append(emptyRow);
    } else {
      append('');
    }
  };

  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current && (!fields || fields.length === 0)) {
      addEmptyRow();
      initializedRef.current = true;
    }
  }, []);

  const renderCell = (
    column: MultiRowFieldOptions,
    isTag: boolean,
    rowIndex: number,
    errorMsg?: any,
  ) => {
    const fieldName = !isTag
      ? `${name}.${rowIndex}.${column.name}`
      : `${name}.${rowIndex}`;

    const Renderer = getFieldRenderer(column.type);
    const colWithoutLabel = {
      ...column,
      name: fieldName, // Use the full field path
      label: undefined,
    };

    return (
      <div
        key={fieldName}
        className={cn('wf-table-field__cell', cellClassName)}
      >
        <Renderer
          key={fieldName}
          field={colWithoutLabel}
          control={control}
          errors={errorMsg}
        />
      </div>
    );
  };

  return (
    <div className={cn('wf-table-field', className)}>
      <Label className="wf-table-field__label">{label}</Label>

      {columns && (
        <div className={cn('wf-table-field__header', headerClassName)}>
          {columns.map((col) => (
            <div
              key={col.name}
              className="wf-table-field__header-col"
            >
              {col.label}
            </div>
          ))}
        </div>
      )}

      {fields.map((row, idx) => (
        <div
          key={row.id}
          className={cn('wf-table-field__row', rowClassName)}
        >
          {columns
            ? columns.map((col) => (
                <div
                  key={col.name}
                  className="wf-table-field__cell"
                >
                  {renderCell(col, isTag, idx, errors?.[idx]?.[col.name])}
                </div>
              ))
            : renderCell(
                { name: '', type: 'input', label }, // Empty name since we'll use the full path
                isTag,
                idx,
                errors?.[idx],
              )}

          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => remove(idx)}
            className="wf-btn wf-btn--destructive wf-btn--size-icon text-black"
            disabled={fields.length === 1}
          >
            <Trash2 />
          </Button>
        </div>
      ))}

      {errors?.root?.message && (
        <p className="wf-error-text">{errors?.root?.message}</p>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={() => {
          addEmptyRow();
        }}
      >
        + Add Row
      </Button>
    </div>
  );
}

export { MultiRowFields };
