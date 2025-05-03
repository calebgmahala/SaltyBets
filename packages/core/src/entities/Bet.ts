import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { ObjectType, Field, ID } from "type-graphql";
import { User } from "./User";
import { Match } from "./Match";
import { FighterColor } from "../types/FighterColor";

@ObjectType()
@Entity()
export class Bet {
  // Primary Key
  @Field(() => ID)
  @PrimaryGeneratedColumn("uuid")
  id: string;

  // Bet Details
  @Field()
  @Column("decimal", { precision: 10, scale: 2 })
  amount: number;

  @Field(() => FighterColor)
  @Column({
    type: "enum",
    enum: FighterColor,
  })
  fighterColor: FighterColor;

  // Relationships
  @Field(() => User)
  @ManyToOne(() => User, (user) => user.bets)
  @JoinColumn()
  user: User;

  @Field(() => Match)
  @ManyToOne(() => Match, (match) => match.bets)
  @JoinColumn()
  match: Match;

  // Timestamps
  @Field()
  @CreateDateColumn()
  createdAt: Date;
}
