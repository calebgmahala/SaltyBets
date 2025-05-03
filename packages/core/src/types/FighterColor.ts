import { registerEnumType } from "type-graphql";

export enum FighterColor {
  RED = "RED",
  BLUE = "BLUE",
}

registerEnumType(FighterColor, {
  name: "FighterColor",
  description: "The color of the fighter (BLUE or RED)",
});
