import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from "typeorm";
import { ObjectType, Field, ID, Float, Int } from "type-graphql";
import { Bet } from "./Bet";
import { FighterColor } from "../types/FighterColor";
import { Fighter } from "./Fighter";

@ObjectType()
@Entity()
export class Match {
  // Primary Key
  @Field(() => ID)
  @Column({ primary: true })
  id: string;

  // Match Details
  @Field({ nullable: true })
  @Column({ nullable: true })
  externalId?: number | null;

  @Field(() => FighterColor, { nullable: true })
  @Column({
    type: "enum",
    enum: FighterColor,
    nullable: true,
  })
  winner: FighterColor | null;

  // Fighter Relationships
  @Column()
  fighterBlueId: number;

  @Column()
  fighterRedId: number;

  // Relationships
  @Field(() => [Bet], { nullable: true })
  @OneToMany(() => Bet, (bet) => bet.match)
  bets: Bet[];

  // Computed Fields
  @Field(() => Float)
  totalBlueBets: number;

  @Field(() => Float)
  totalRedBets: number;

  // Timestamps
  @Field()
  @CreateDateColumn()
  createdAt: Date;
}
