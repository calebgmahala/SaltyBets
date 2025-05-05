import React from 'react';
import { CardSection } from './CardSection';
import { Heading } from '../Typography/Heading';

export default {
  title: 'Layout/CardSection',
  component: CardSection,
};

export const Default = () => (
  <CardSection>
    <Heading level={3}>Card Section Title</Heading>
    <p>This is a card section. You can put any content here.</p>
  </CardSection>
); 