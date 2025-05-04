/**
 * @file Storybook stories for the Button component.
 */
import * as React from 'react';
import { Button } from './src/Button';

export default {
  title: 'Components/Button',
  component: Button,
};

/**
 * Primary button story.
 */
export const Primary = () => <Button>Primary Button</Button>; 