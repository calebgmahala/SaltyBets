import { ObjectType, Field, Float } from "type-graphql";

@ObjectType()
export class PeriodStatsDto {
  @Field(() => Float)
  wins: number;

  @Field(() => Float)
  losses: number;

  @Field(() => Float)
  revenueGained: number;

  @Field(() => Float)
  revenueLost: number;

  @Field(() => Float)
  winPercentage: number;

  @Field(() => Float)
  grossRevenue: number;
}
