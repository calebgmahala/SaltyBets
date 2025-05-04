/**
 * @file Button component for the @saltybets/components library.
 */
import * as React from 'react';

/**
 * A simple reusable button component.
 *
 * @param {ButtonProps} props - The component props.
 * @param {React.ReactNode} props.children - The button label or content.
 * @returns {React.JSX.Element} The rendered button.
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const Button = ({ children, ...props }: React.PropsWithChildren<ButtonProps>) => (
  <button {...props} style={{ padding: '8px 16px', borderRadius: 4, background: '#007bff', color: '#fff', border: 'none' }}>
    {children}
  </button>
); 