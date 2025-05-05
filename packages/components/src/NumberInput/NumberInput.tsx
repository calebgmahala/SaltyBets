import React, { FC } from "react";
import styles from "./NumberInput.module.css";
import { Label } from '../Typography/Label';

/**
 * NumberInput component for numeric entry.
 * @param {Object} props - Component props
 * @param {number} props.value - The current value
 * @param {(e: React.ChangeEvent<HTMLInputElement>) => void} props.onChange - Change handler
 * @param {string} [props.placeholder] - Placeholder text
 * @param {string} [props.label] - Optional label
 * @param {string} [props.error] - Optional error message
 * @returns {React.ReactElement}
 */
export interface NumberInputProps {
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  label?: string;
  error?: string;
}

export const NumberInput: FC<NumberInputProps> = ({ value, onChange, placeholder, label, error }) => {
  // Generate a unique id for the input if label is provided
  const inputId = label ? `numberinput-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined;
  return (
    <div className={styles.container}>
      {label && <Label htmlFor={inputId} className={styles.label}>{label}</Label>}
      <input
        id={inputId}
        type="number"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={error ? `${styles.input} ${styles.inputError}` : styles.input}
      />
      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
};

export default NumberInput; 