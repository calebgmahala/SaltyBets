import React from 'react';
import styles from './Label.module.css';

// ============================================
// Types
// ============================================

/**
 * Props for the Label component.
 */
export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /** The label content. */
  children: React.ReactNode;
  /** Additional class names. */
  className?: string;
}

// ============================================
// Component
// ============================================

/**
 * Renders a styled label for form fields.
 * @param {LabelProps} props - The label props.
 * @returns {React.ReactNode} The rendered label.
 */
export function Label({ children, className = '', ...props }: LabelProps): React.ReactNode {
  return (
    <label className={`${styles.label} ${className}`.trim()} {...props}>
      {children}
    </label>
  );
} 