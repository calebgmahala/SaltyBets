import React from 'react';
import styles from './Text.module.css';

// ============================================
// Types
// ============================================

/**
 * Supported text variants.
 */
export type TextVariant = 'body' | 'small' | 'muted' | 'bold' | 'error';

/**
 * Props for the Text component.
 */
export interface TextProps {
  /** The text content. */
  children: React.ReactNode;
  /** The text variant. */
  variant?: TextVariant;
  /** Additional class names. */
  className?: string;
  /** Render as a span, p, or div. */
  as?: 'span' | 'p' | 'div';
}

// ============================================
// Component
// ============================================

/**
 * Renders styled text with variant support.
 * @param {TextProps} props - The text props.
 * @returns {React.ReactNode} The rendered text.
 */
export function Text({ children, variant = 'body', className = '', as = 'span' }: TextProps): React.ReactNode {
  const Tag = as;
  return React.createElement(Tag, { className: `${styles[variant]} ${className}`.trim() }, children);
} 