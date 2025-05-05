import React from 'react';
import { Text } from './Text';

export default {
  title: 'Typography/Text',
  component: Text,
};

export const AllVariants = () => (
  <div>
    <Text variant="body">Body text</Text><br />
    <Text variant="small">Small text</Text><br />
    <Text variant="muted">Muted text</Text><br />
    <Text variant="bold">Bold text</Text><br />
    <Text variant="error">Error text</Text>
  </div>
); 