'use client'

import { cn } from '@/utilities/ui'
import { Eye, EyeOff } from 'lucide-react'
import { useState, forwardRef } from 'react'

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, placeholder, required, disabled, className, id, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)

    return (
      <div className={cn('relative', className)}>
        {label && (
          <label htmlFor={id} className="block text-xs font-semibold text-foreground mb-1.5">
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            type={showPassword ? 'text' : 'password'}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'flex h-10 w-full rounded border border-border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-10',
              className
            )}
            id={id}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>
    )
  }
)

PasswordInput.displayName = 'PasswordInput'