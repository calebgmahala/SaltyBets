import React from 'react';
import { Label } from './Label';

export default {
  title: 'Typography/Label',
  component: Label,
};

export const Default = () => (
  <div>
    <Label htmlFor="username">Username</Label>
    <input id="username" type="text" />
  </div>
); 