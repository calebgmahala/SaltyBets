import React from 'react';
import styles from './CardSection.module.css';

// ============================================
// Types
// ============================================

/**
 * Props for the CardSection component.
 */
export interface CardSectionProps {
  /** The content inside the card/section. */
  children: React.ReactNode;
  /** Additional class names. */
  className?: string;
  /** Optional style overrides. */
  style?: React.CSSProperties;
}

// ============================================
// Component
// ============================================

/**
 * Renders a styled card/section container for grouping content.
 * @param {CardSectionProps} props - The card section props.
 * @returns {React.ReactNode} The rendered card section.
 */
export function CardSection({ children, className = '', style }: CardSectionProps): React.ReactNode {
  return (
    <section className={`${styles.cardSection} ${className}`.trim()} style={style}>
      {children}
    </section>
  );
} 