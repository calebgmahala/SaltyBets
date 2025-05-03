import { ObjectType, Field, Float } from "type-graphql";

@ObjectType()
export class MatchTotalsDto {
  @Field(() => Float)
  blue: number;

  @Field(() => Float)
  red: number;
}
