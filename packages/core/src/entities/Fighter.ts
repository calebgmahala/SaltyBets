import { ObjectType, Field, ID, Int } from "type-graphql";

@ObjectType()
export class Fighter {
  @Field(() => ID)
  id: number;

  @Field()
  name: string;

  @Field()
  tier: string;

  @Field()
  prevTier: string;

  @Field(() => Int)
  elo: number;

  @Field(() => Int)
  tierElo: number;

  @Field(() => Int)
  bestStreak: number;

  @Field()
  createdTime: Date;

  @Field()
  lastUpdated: Date;
}
