// components/ui/input.tsx
import * as React from 'react';
import { AlertCircle, type LucideIcon } from 'lucide-react';
import { cn } from '../utils';
import { Label } from './Label';

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  labelClassName?: string;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  errorIcon?: LucideIcon;
  wrapperClassName?: string;
  error?: boolean;
  errorMessage?: string;
  errorMessageClassName?: string;
  onIconClick?: () => void;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      wrapperClassName,
      label,
      labelClassName,
      icon: Icon,
      iconPosition = 'left',
      errorIcon: ErrorIcon = AlertCircle,
      error = false,
      errorMessage,
      errorMessageClassName,
      onIconClick,
      id,
      type = 'text',
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || `input-${generatedId}`;
    const hasIcon = !!Icon;
    const hasError = error && !hasIcon;
    const showRightSlot = hasError || (hasIcon && iconPosition === 'right');
    const showLeftSlot = hasIcon && iconPosition === 'left';

    return (
      <div className={cn('wf-input-wrapper', wrapperClassName)}>
        {label && (
          <Label
            htmlFor={inputId}
            className={cn('wf-input-label', disabled && 'wf-input-label-disabled', labelClassName)}
          >
            {label}
          </Label>
        )}

        <div className="wf-input-container">
          {showLeftSlot && Icon && (
            <div
              className={cn(
                'wf-input-icon wf-input-icon-left',
                onIconClick && !disabled && 'wf-input-icon-clickable'
              )}
              onClick={disabled ? undefined : onIconClick}
            >
              <Icon className="wf-input-icon-svg" />
            </div>
          )}

          <input
            id={inputId}
            type={type}
            disabled={disabled}
            className={cn(
              'wf-input',
              showLeftSlot && 'wf-input-has-left-icon',
              showRightSlot && 'wf-input-has-right-icon',
              error && 'wf-input-error',
              className
            )}
            ref={ref}
            aria-invalid={error}
            {...props}
          />

          {showRightSlot && (
            <div
              className={cn(
                'wf-input-icon wf-input-icon-right',
                onIconClick && !disabled && 'wf-input-icon-clickable'
              )}
              onClick={disabled ? undefined : onIconClick}
            >
              {hasError ? (
                <ErrorIcon className="wf-input-error-icon" />
              ) : (
                Icon && <Icon className="wf-input-icon-svg" />
              )}
            </div>
          )}
        </div>

        {error && errorMessage && (
          <p className={cn('wf-input-error-message', errorMessageClassName)}>{errorMessage}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export { Input };
