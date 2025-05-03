import { registerEnumType } from "type-graphql";

export enum SecurityLevel {
  USER = "USER", // Regular user
  PAYOUT_MANAGER = "PAYOUT_MANAGER", // Can process payouts
  ADMIN = "ADMIN", // Full system access
}

registerEnumType(SecurityLevel, {
  name: "SecurityLevel",
  description: "The security level of a user",
});
