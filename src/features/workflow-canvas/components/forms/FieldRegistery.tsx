import {
  AddOnsConfig,
  AuthConfigFields,
  Checkbox,
  CodeEditor,
  GroupedOption,
  Input,
  Label,
  MultiRowFieldOptions,
  MultiRowFields,
  Option,
  Select,
  Textarea,
} from '@/shared';
import { LoopConfigFields } from '@/shared/components/LoopConfig';
import { ScheduleConfig } from '@/shared/components/ScheduleConfig';
import RichTextEditor from '@/shared/components/TextEditor';
import { ELogicRulesModes } from '@/shared/constants';
import React, { memo } from 'react';
import {
  Control,
  Controller,
  FieldErrors,
  UseFormSetValue,
  UseFormWatch,
} from 'react-hook-form';
import { FieldConfig } from '../../types';
import { LogicRulesField } from '../config/LogicRulesConfig';

// --- Types ---
export interface FieldProps {
  field: FieldConfig;
  control: Control;
  errors: FieldErrors;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
}

// --- Generic Wrapper ---
const FieldWrapper = ({
  label,
  error,
  children,
  className = 'wf-field-group',
}: {
  label?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={className}>
    {label && <Label>{label}</Label>}
    {children}
    {error && <p className="wf-error-text">{error}</p>}
  </div>
);

// --- Individual Field Renderers ---

const RenderInput = memo(({ field, control, errors }: FieldProps) => {
  return (
    <FieldWrapper
      label={field.label}
      error={errors?.message as unknown as string}
    >
      <Controller
        name={field.name}
        control={control}
        render={({ field: rhf }) => (
          <Input
            {...rhf}
            placeholder={field.placeholder}
            disabled={field.readOnly}
            type={field.type}
          />
        )}
      />
    </FieldWrapper>
  );
});

const RenderTextarea = memo(({ field, control, errors }: FieldProps) => (
  <FieldWrapper
    label={field.label}
    error={errors?.message as unknown as string}
  >
    <Controller
      name={field.name}
      control={control}
      render={({ field: rhf }) => (
        <Textarea
          {...rhf}
          placeholder={field.placeholder}
          disabled={field.readOnly}
          value={
            typeof rhf.value === 'string'
              ? rhf.value
              : JSON.stringify(rhf.value ?? {}, null, 2)
          }
          onChange={(e) => rhf.onChange(e.target.value)}
        />
      )}
    />
  </FieldWrapper>
));

const RenderSelect = ({ field, control, errors }: FieldProps) => (
  <FieldWrapper
    label={field.label}
    error={errors?.message as unknown as string}
  >
    <Controller
      name={field.name}
      control={control}
      render={({ field: { value, onChange } }) => (
        <Select
          value={value ?? (field.isMulti ? [] : '')}
          onValueChange={onChange}
          options={(field.options as Option[] | GroupedOption[]) || []}
          isMulti={field.isMulti}
          isGrouped={field.isGrouped}
          placeholder={field.isMulti ? 'Select multiple' : 'Select'}
          isDisabled={field.readOnly}
        />
      )}
    />
  </FieldWrapper>
);

const RenderCheckbox = memo(({ field, control }: FieldProps) => (
  <div className="wf-checkbox-row">
    <Controller
      name={field.name}
      control={control}
      render={({ field: { value, onChange } }) => (
        <Checkbox
          checked={value}
          onCheckedChange={onChange}
          disabled={field.readOnly}
        />
      )}
    />
    <Label>{field.label}</Label>
  </div>
));

const RenderCode = memo(({ field, control, errors, watch }: FieldProps) => {
  const selectedLanguage = watch('language');
  return (
    <FieldWrapper
      label={field.label}
      error={errors?.message as unknown as string}
    >
      <Controller
        name={field.name}
        control={control}
        render={({ field: { value, onChange } }) => (
          <div
            className="wf-code-editor-shell"
            onKeyDown={(e) => e.key === ' ' && e.stopPropagation()}
          >
            <CodeEditor
              value={value ?? ''}
              onChange={onChange}
              selectedLanguage={selectedLanguage}
            />
          </div>
        )}
      />
    </FieldWrapper>
  );
});

const RenderRichText = memo(({ field, control, errors }: FieldProps) => (
  <FieldWrapper
    label={field.label}
    error={errors?.message as unknown as string}
  >
    <Controller
      name={field.name}
      control={control}
      render={({ field: { value, onChange } }) => (
        <RichTextEditor
          value={value}
          onChange={onChange}
          height={300}
        />
      )}
    />
  </FieldWrapper>
));

// --- Complex Components ---

const RenderLogic = ({
  field,
  control,
  errors,
  watch,
  setValue,
  mode,
}: FieldProps & { mode: ELogicRulesModes }) => (
  <LogicRulesField
    name={field.name}
    control={control}
    label={field.label}
    errors={errors}
    watch={watch}
    setValue={setValue}
    mode={mode}
  />
);

// --- The Registry ---

const FIELD_REGISTRY: Record<string, React.FC<any>> = {
  input: RenderInput,
  date: RenderInput,
  textarea: RenderTextarea,
  select: RenderSelect,
  checkbox: RenderCheckbox,
  code: RenderCode,
  richtext: RenderRichText,

  // Table-based fields
  table: ({ field, control, errors }: FieldProps) => (
    <MultiRowFields
      control={control}
      name={field.name}
      label={field.label}
      columns={(field.options as MultiRowFieldOptions[]) || []}
      errors={errors}
    />
  ),
  tags: ({ field, control, errors }: FieldProps) => (
    <MultiRowFields
      control={control}
      name={field.name}
      label={field.label}
      errors={errors}
      isTag
    />
  ),

  // Logic fields
  conditions: (props: FieldProps) => (
    <RenderLogic
      {...props}
      mode={ELogicRulesModes.Conditional}
    />
  ),
  cases: (props: FieldProps) => (
    <RenderLogic
      {...props}
      mode={ELogicRulesModes.Switch}
    />
  ),

  // Specialized Configs
  auth: ({ field, control, errors }: FieldProps) => (
    <AuthConfigFields
      control={control}
      name={field.name}
      errors={errors}
    />
  ),
  schedule: ({ control, errors }: FieldProps) => (
    <ScheduleConfig
      control={control}
      errors={errors}
    />
  ),
  addOn: ({ control, setValue, errors }: FieldProps) => (
    <AddOnsConfig
      control={control}
      setValue={setValue}
      errors={errors}
    />
  ),
  loop: ({ control, errors }: FieldProps) => (
    <LoopConfigFields
      control={control}
      errors={errors}
    />
  ),
};

export const getFieldRenderer = (type: string) => {
  return FIELD_REGISTRY[type] || FIELD_REGISTRY['input'];
};
