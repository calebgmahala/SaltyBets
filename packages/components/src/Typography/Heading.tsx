import React from 'react';
import styles from './Heading.module.css';

// ============================================
// Types
// ============================================

/**
 * Props for the Heading component.
 * @typedef {Object} HeadingProps
 * @property {React.ReactNode} children - The heading content.
 * @property {1|2|3|4|5|6} [level=1] - The heading level (1-6).
 * @property {string} [className] - Additional class names.
 */
export interface HeadingProps {
  /** The heading content. */
  children: React.ReactNode;
  /** The heading level (1-6). */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Additional class names. */
  className?: string;
}

// ============================================
// Component
// ============================================

/**
 * Renders a semantic heading (h1-h6) with consistent styling.
 * @param {HeadingProps} props - The heading props.
 * @returns {React.ReactNode} The rendered heading.
 */
export function Heading({ children, level = 1, className = '' }: HeadingProps): React.ReactNode {
  const tagLevel = (typeof level === 'number' && level >= 1 && level <= 6) ? level : 1;
  const Tag = (`h${tagLevel}` as 'h1'|'h2'|'h3'|'h4'|'h5'|'h6');
  return React.createElement(Tag, { className: `${styles[Tag]} ${className}`.trim() }, children);
} 