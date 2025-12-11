import {
  ELogicRulesModes,
  FieldOption,
  GroupedOption,
  MultiRowFieldOptions,
} from '@/shared';
import { Control, UseFormSetValue } from 'react-hook-form';

export type BaseFieldType =
  | 'input'
  | 'textarea'
  | 'richtext'
  | 'checkbox'
  | 'tags'
  | 'code'
  | 'conditions'
  | 'cases'
  | 'auth'
  | 'schedule'
  | 'addOn'
  | 'loop'
  | 'date';

interface FieldBaseConfig {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  readOnly?: boolean;
}

export interface DynamicFormProps {
  fields: FieldConfig[];
  schema?: any;
  onSubmit?: (data: Record<string, any>) => void;
  defaultValues?: Record<string, any>;
  onCancel?: () => void;
  onClose?: () => void;
}

export type FieldConfig =
  | (FieldBaseConfig & {
      type: BaseFieldType;
      options?: never;
      isMulti?: never;
      isGrouped?: never;
    })
  | (FieldBaseConfig & {
      type: 'select';
      options: FieldOption[];
      isMulti?: boolean;
      isGrouped?: false;
    })
  | (FieldBaseConfig & {
      type: 'select';
      options: GroupedOption[];
      isMulti?: boolean;
      isGrouped: true;
    })
  | (FieldBaseConfig & {
      type: 'table';
      options: MultiRowFieldOptions[];
      isMulti?: never;
      isGrouped?: never;
    });

export interface LogicRulesFieldProps {
  control: Control;
  name: string;
  label: string;
  watch?: any;
  setValue?: UseFormSetValue<any>;
  errors?: any;
  mode?: ELogicRulesModes;
}
