/**
 * @file Storybook stories for the Button component.
 */
import * as React from "react";
import { Button } from "./Button";

// ===========================================
// Storybook Meta
// ===========================================
export default {
  title: "Components/Button",
  component: Button,
};

// ===========================================
// Stories
// ===========================================
/**
 * Blue fighter button story.
 * @returns {JSX.Element} The blue fighter button.
 */
export const FighterBlue = () => <Button variant="blue">Blue Fighter</Button>;

/**
 * Red fighter button story.
 * @returns {JSX.Element} The red fighter button.
 */
export const FighterRed = () => <Button variant="red">Red Fighter</Button>;

/**
 * Green action button story.
 * @returns {JSX.Element} The green action button.
 */
export const ActionGreen = () => <Button variant="green">Action Green</Button>;

/**
 * Red action button story.
 * @returns {JSX.Element} The red action button.
 */
export const ActionRed = () => <Button variant="red">Action Red</Button>;
