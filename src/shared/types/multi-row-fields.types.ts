import { Control } from 'react-hook-form';

export interface FieldOption {
  label: string;
  value: string;
}

interface DynamicFiledBase {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
}

interface MultiRowFieldBase {
  control: Control;
  name: string;
  label: string;
  errors?: any;
  className?: string;
  headerClassName?: string;
  rowClassName?: string;
  cellClassName?: string;
}

export type MultiRowFieldProps =
  | (MultiRowFieldBase & { isTag?: false; columns: MultiRowFieldOptions[] })
  | (MultiRowFieldBase & { isTag: true; columns?: never });

export type MultiRowFieldOptions =
  | (DynamicFiledBase & { type: 'input'; options?: never })
  | (DynamicFiledBase & { type: 'select'; options: FieldOption[] });
