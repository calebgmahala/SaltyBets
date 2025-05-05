import React, { useState } from "react";
import { NumberInput } from "./NumberInput";
import { Label } from '../Typography/Label';

export default {
  title: "Components/NumberInput",
  component: NumberInput,
};

export const Default = () => <NumberInput value={0} onChange={() => {}} placeholder="Enter number" />;

export const WithLabel = () => <NumberInput value={0} onChange={() => {}} label="Amount" placeholder="Enter amount" />;

export const WithError = () => <NumberInput value={0} onChange={() => {}} label="Amount" error="Required" placeholder="Enter amount" />;

export const Controlled = () => {
  const [value, setValue] = useState(0);
  return <NumberInput value={value} onChange={e => setValue(Number(e.target.value))} label="Controlled" placeholder="Type a number..." />;
}; 