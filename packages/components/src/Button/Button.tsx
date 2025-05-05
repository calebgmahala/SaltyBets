/**
 * @file Button component for the @saltybets/components library.
 */
import * as React from "react";
import styles from "./Button.module.css";

/**
 * Button variants for different use cases.
 */
export type ButtonVariant = 'blue' | 'red' | 'green';

/**
 * Props for the Button component.
 *
 * @typedef {Object} ButtonProps
 * @property {ButtonVariant} [variant] - The color variant for the button.
 */
export interface ButtonProps extends React.PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement>> {
  variant?: ButtonVariant;
}

/**
 * A simple reusable button component with basic styles, pseudo-class states, and variants.
 *
 * @param {ButtonProps} props - The component props.
 * @returns {React.JSX.Element} The rendered button.
 */
export const Button = ({
  children,
  className = '',
  variant = 'blue',
  ...props
}: ButtonProps): React.JSX.Element => (
  <button
    {...props}
    className={[
      styles.button,
      variant && styles[`button--${variant}`],
      className
    ].filter(Boolean).join(' ')}
  >
    {children}
  </button>
);
