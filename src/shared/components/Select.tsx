import { formatName } from '@/shared/utils';
import { JSX, useState } from 'react';
import ReactSelect, {
  GroupBase,
  GroupHeadingProps,
  GroupProps,
  StylesConfig,
} from 'react-select';

export interface Option {
  value: string;
  label: string;
}

// Grouped option type no nesting
export interface GroupedOption {
  label: string;
  options: Option[];
}

// Base props shared between single and multi
interface BaseSelectProps {
  options: Option[] | GroupedOption[];
  placeholder?: string;
  className?: string;
  useFormattedLabel?: boolean;
  isDisabled?: boolean;
  isClearable?: boolean;
  isSearchable?: boolean;
  error?: string;
  isGrouped?: boolean;
}

// Single select props
interface SingleSelectProps extends BaseSelectProps {
  isMulti?: false;
  value?: string;
  onValueChange?: (value: string) => void;
}

// Multi select props
interface MultiSelectProps extends BaseSelectProps {
  isMulti: true;
  value?: string[];
  onValueChange?: (value: string[]) => void;
}

// Union type for all props
type SelectProps = SingleSelectProps | MultiSelectProps;

export function Select(props: SelectProps): JSX.Element {
  const {
    options,
    value,
    onValueChange,
    placeholder = 'Select',
    className,
    useFormattedLabel = true,
    isMulti = false,
    isDisabled = false,
    isClearable = false,
    isSearchable = true,
    error,
    isGrouped = false,
  } = props;

  // State to track collapsed groups
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );

  // Helper to get flat options from grouped or flat structure
  const getFlatOptions = (): Option[] => {
    if (isGrouped) {
      return (options as GroupedOption[]).flatMap((group) => group.options);
    }
    return options as Option[];
  };

  const flatOptions = getFlatOptions();

  // Type guards and converters
  const getSelectedOption = (): Option | Option[] | null => {
    if (isMulti) {
      if (!value || !Array.isArray(value)) return [];
      return flatOptions.filter((opt) =>
        (value as string[]).includes(opt.value),
      );
    } else {
      if (!value || typeof value !== 'string') return null;
      return flatOptions.find((opt) => opt.value === value) || null;
    }
  };

  const selectedOption = getSelectedOption();

  // Handle change with proper typing
  const handleChange = (newValue: Option | Option[] | null) => {
    if (!onValueChange) return;

    if (isMulti) {
      const values = Array.isArray(newValue)
        ? newValue.map((opt) => opt.value)
        : [];
      (onValueChange as (value: string[]) => void)(values);
    } else {
      const singleValue =
        newValue && !Array.isArray(newValue) ? newValue.value : '';
      (onValueChange as (value: string) => void)(singleValue);
    }
  };
  // Toggle group collapse
  const toggleGroup = (groupLabel: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupLabel)) {
        next.delete(groupLabel);
      } else {
        next.add(groupLabel);
      }
      return next;
    });
  };

  // Custom Group Heading component with collapse toggle
  const CustomGroupHeading = (
    props: GroupHeadingProps<Option, boolean, GroupBase<Option>>,
  ) => {
    const isCollapsed = collapsedGroups.has(props.data.label as string);

    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          toggleGroup(props.data.label as string);
        }}
        style={{
          padding: '8px 12px',
          fontSize: '0.75rem',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--wf-text-muted, #9ca3af)',
          backgroundColor:
            'var(--wf-background-highlight, rgba(255,255,255,0.05))',
          borderBottom: '1px solid var(--wf-border-default, #374151)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              transition: 'transform 0.2s',
              transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
              display: 'inline-block',
            }}
          >
            ▼
          </span>
          <span>{props.data.label}</span>
        </div>
        <span
          style={{
            fontSize: '0.75rem',
            backgroundColor: 'var(--wf-background-subtle, #374151)',
            padding: '2px 8px',
            borderRadius: '12px',
            color: 'var(--wf-text-muted, #9ca3af)',
          }}
        >
          {props.data.options.length}
        </span>
      </div>
    );
  };

  // Custom Group component to handle collapsed state
  const CustomGroup = (
    props: GroupProps<Option, boolean, GroupBase<Option>>,
  ) => {
    const isCollapsed = collapsedGroups.has(props?.data?.label as string);

    return (
      <div>
        {/* Render your custom heading */}
        <CustomGroupHeading
          id={props.data.label as string}
          {...props}
        />
        {/* Conditionally render children (options) */}
        {!isCollapsed && <div>{props.children}</div>}
      </div>
    );
  };

  // Pass all options
  const filteredOptions = options;
  // Custom styles
  const customStyles: StylesConfig<Option, boolean, GroupBase<Option>> = {
    control: (base, state) => ({
      ...base,
      minHeight: '42px',
      borderRadius: '8px',
      backgroundColor: 'var(--wf-background-subtle, #111827)',
      borderColor: state.isFocused
        ? 'var(--wf-border-focus, #84cc16)'
        : error
          ? 'var(--wf-feedback-danger-bg, #ef4444)'
          : 'var(--wf-border-default, #374151)',
      color: 'var(--wf-text-default, #f9fafb)',
      boxShadow: 'none',
      '&:hover': {
        borderColor: state.isFocused
          ? 'var(--wf-border-focus, #84cc16)'
          : 'var(--wf-border-default, #4b5563)',
      },
    }),

    menu: (base) => ({
      ...base,
      marginTop: '4px',
      backgroundColor: 'var(--wf-background-subtle, #1f2937)',
      borderRadius: '8px',
      border: '1px solid var(--wf-border-default, #374151)',
      boxShadow: '0 12px 25px rgba(0,0,0,0.4)',
      backdropFilter: 'blur(6px)',
      overflow: 'hidden',
    }),

    menuPortal: (base) => ({
      ...base,
      zIndex: 999999,
    }),

    group: (base) => ({
      ...base,
      paddingTop: '0',
      paddingBottom: '0',
      borderBottom: '1px solid var(--wf-border-default, #374151)',
      '&:last-child': {
        borderBottom: 'none',
      },
    }),

    option: (base, state) => ({
      ...base,
      padding: '8px 12px',
      paddingLeft: isGrouped ? '24px' : '12px',
      fontSize: '0.875rem',
      borderRadius: '0',
      backgroundColor: state.isSelected
        ? 'var(--wf-brand-primary, #7ec040)'
        : 'transparent',

      color: state.isSelected
        ? 'var(--wf-text-inverted, #ffffff)'
        : 'var(--wf-text-default, #f9fafb)',

      cursor: 'pointer',

      '&:hover': {
        backgroundColor: 'var(--wf-brand-primary, #7ec040)',
        color: 'var(--wf-text-inverted, #ffffff)',
      },

      '&:active': {
        backgroundColor: 'transparent',
        color: 'var(--wf-text-default, #f9fafb)',
      },

      ':not(:hover)': {
        backgroundColor: state.isSelected
          ? 'var(--wf-brand-primary, #7ec040)'
          : 'transparent',
      },
    }),

    singleValue: (base) => ({
      ...base,
      color: 'var(--wf-text-default, #f9fafb)',
    }),

    placeholder: (base) => ({
      ...base,
      color: 'var(--wf-text-muted, #9ca3af)',
    }),

    input: (base) => ({
      ...base,
      color: 'var(--wf-text-default, #f9fafb)',
    }),

    multiValue: (base) => ({
      ...base,
      background: 'var(--wf-background-highlight, rgba(255,255,255,0.1))',
      borderRadius: '6px',
    }),

    multiValueLabel: (base) => ({
      ...base,
      color: 'var(--wf-text-default, #e5e7eb)',
    }),

    multiValueRemove: (base) => ({
      ...base,
      color: 'var(--wf-text-muted, #9ca3af)',
      '&:hover': {
        background: 'var(--wf-feedback-danger-bg, #ef4444)',
        color: 'white',
      },
    }),
  };

  // Format label
  const formatLabel = (option: Option) => {
    return useFormattedLabel ? formatName(option.label) : option.label;
  };

  return (
    <div style={{ width: '100%' }}>
      <ReactSelect<Option, boolean, GroupBase<Option>>
        options={filteredOptions}
        value={selectedOption}
        onChange={handleChange as any}
        placeholder={placeholder}
        styles={customStyles}
        className={className}
        classNamePrefix="react-select"
        formatOptionLabel={useFormattedLabel ? formatLabel : undefined}
        components={isGrouped ? { Group: CustomGroup } : undefined}
        menuPortalTarget={document.getElementById('my_workflow')}
        menuPosition="fixed"
        menuPlacement="auto"
        isMulti={isMulti}
        isDisabled={isDisabled}
        isClearable={isClearable}
        isSearchable={isSearchable}
        closeMenuOnSelect={!isMulti}
      />
      {error && <p className="wf-error-text mt-1">{error}</p>}
    </div>
  );
}
