import { InputType, Field } from "type-graphql";
import { SecurityLevel } from "../types/SecurityLevel";
import { MinLength } from "class-validator";

@InputType()
export class CreateUserInputDto {
  @Field()
  username: string;

  @Field()
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  password: string;

  @Field()
  alias: string;

  @Field(() => SecurityLevel, { defaultValue: SecurityLevel.USER })
  securityLevel: SecurityLevel;

  @Field({ defaultValue: 0 })
  balance: number;
}

@InputType()
export class UpdateUserInputDto {
  @Field({ nullable: true })
  alias?: string;

  @Field({ nullable: true })
  username?: string;

  @Field({ nullable: true })
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  password?: string;

  @Field({ nullable: true })
  balance?: number;

  @Field(() => SecurityLevel, { nullable: true })
  securityLevel?: SecurityLevel;
}
