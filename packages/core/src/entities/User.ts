import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { ObjectType, Field, ID } from "type-graphql";
import * as bcryptjs from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { SecurityLevel } from "../types/SecurityLevel";
import { Bet } from "./Bet";

@ObjectType()
@Entity()
export class User {
  // Basic User Information
  @Field(() => ID)
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Field()
  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Field()
  @Column()
  alias: string;

  // Security and Authentication
  @Field(() => SecurityLevel)
  @Column({
    type: "enum",
    enum: SecurityLevel,
    default: SecurityLevel.USER,
  })
  securityLevel: SecurityLevel;

  // Financial Tracking
  @Field()
  @Column("decimal", { precision: 10, scale: 2, default: 0 })
  balance: number;

  @Field()
  @Column({ default: 0 })
  totalWins: number;

  @Field()
  @Column({ default: 0 })
  totalLosses: number;

  @Field()
  @Column("decimal", { precision: 10, scale: 2, default: 0 })
  totalRevenueGained: number;

  @Field()
  @Column("decimal", { precision: 10, scale: 2, default: 0 })
  totalRevenueLost: number;

  // Relationships
  @Field(() => [Bet], { nullable: true })
  @OneToMany(() => Bet, (bet) => bet.user)
  bets: Bet[];

  // Timestamps
  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;

  // Methods
  async hashPassword(): Promise<void> {
    this.password = await bcryptjs.hash(this.password, 10);
  }

  async validatePassword(password: string): Promise<boolean> {
    return await bcryptjs.compare(password, this.password);
  }

  generateJWT(): string {
    return jwt.sign(
      {
        id: this.id,
        username: this.username,
        securityLevel: this.securityLevel,
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "1d" }
    );
  }
}
