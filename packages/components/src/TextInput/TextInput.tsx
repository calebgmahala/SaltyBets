import React, { FC } from "react";
import styles from "./TextInput.module.css";
import { Label } from '../Typography/Label';

/**
 * TextInput component for text entry.
 * @param {Object} props - Component props
 * @param {string} props.value - The current value
 * @param {(e: React.ChangeEvent<HTMLInputElement>) => void} props.onChange - Change handler
 * @param {string} [props.placeholder] - Placeholder text
 * @param {string} [props.label] - Optional label
 * @param {string} [props.error] - Optional error message
 * @param {string} [props.id] - Optional id for the input
 * @param {string} [props.type] - Optional type for the input
 * @returns {React.ReactElement}
 */
export interface TextInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  id?: string;
  type?: string;
}

export const TextInput: FC<TextInputProps> = ({ value, onChange, placeholder, label, error, id, type = 'text' }) => {
  // Generate a unique id for the input if label is provided and no id is passed
  const inputId = id || (label ? `textinput-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return (
    <div className={styles.container}>
      {label && <Label htmlFor={inputId} className={styles.label}>{label}</Label>}
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={error ? `${styles.input} ${styles.inputError}` : styles.input}
      />
      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
};

export default TextInput; 