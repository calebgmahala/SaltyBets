import React, { useState } from "react";
import { TextInput } from "./TextInput";
import { Label } from '../Typography/Label';

export default {
  title: "Components/TextInput",
  component: TextInput,
};

export const Default = () => <TextInput value="" onChange={() => {}} placeholder="Enter text" />;

export const WithLabel = () => <TextInput value="" onChange={() => {}} label="Username" placeholder="Enter username" />;

export const WithError = () => <TextInput value="" onChange={() => {}} label="Username" error="Required" placeholder="Enter username" />;

export const Controlled = () => {
  const [value, setValue] = useState("");
  return <TextInput value={value} onChange={e => setValue(e.target.value)} label="Controlled" placeholder="Type here..." />;
};

export const Password = () => <TextInput value="" onChange={() => {}} label="Password" placeholder="Enter password" type="password" />; 