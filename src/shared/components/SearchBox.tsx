// components/ui/search-box.tsx
import * as React from 'react';
import { Input, InputProps } from './Input';
import { cn } from '../utils';
import { Search } from 'lucide-react';

export interface SearchBoxProps extends Omit<InputProps, 'icon' | 'iconPosition' | 'onIconClick'> {
  debounceMs?: number;
  onSearch?: (value: string) => void;
}

export const SearchBox = React.forwardRef<HTMLInputElement, SearchBoxProps>(
  (
    {
      className,
      wrapperClassName,
      placeholder = 'Search...',
      debounceMs = 300,
      onSearch,
      onChange,
      value: controlledValue,
      defaultValue,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState(
      (controlledValue ?? defaultValue ?? '').toString()
    );
    const value = controlledValue !== undefined ? controlledValue : internalValue;
    const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      if (controlledValue === undefined) setInternalValue(newValue);
      onChange?.(e);

      if (onSearch) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => onSearch(newValue), debounceMs);
      }
    };

    React.useEffect(() => {
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }, []);

    return (
      <Input
        icon={Search}
        ref={ref}
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        className={cn('transition-all', className)}
        wrapperClassName={wrapperClassName}
        aria-label="Search"
        {...props}
      />
    );
  }
);

SearchBox.displayName = 'SearchBox';
export default SearchBox;
