import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import { SecurityLevel } from "../types/SecurityLevel";
import { Match } from "../entities/Match";
import { Bet } from "../entities/Bet";

/**
 * Seeds the database by clearing all bets, matches, and users, then creating an admin user.
 * Deletion order is important to avoid foreign key constraint errors:
 * 1. Bets (references User and Match)
 * 2. Matches (may be referenced by Bet)
 * 3. Users (may be referenced by Bet)
 *
 * @returns {Promise<void>} Resolves when seeding is complete
 */
async function seed() {
  try {
    // Initialize the database connection
    await AppDataSource.initialize();
    console.log("Database connection initialized");

    // Clear existing bets, matches, and users (in this order to avoid FK errors)
    await AppDataSource.getRepository(Bet).delete({});
    console.log("Cleared existing bets");
    await AppDataSource.getRepository(Match).delete({});
    console.log("Cleared existing matches");
    await AppDataSource.getRepository(User).delete({});
    console.log("Cleared existing users");

    // Create admin user
    const admin = new User();
    admin.username = "admin";
    admin.alias = "Admin";
    admin.password = "admin";
    admin.securityLevel = SecurityLevel.ADMIN;
    admin.balance = 0;
    await admin.hashPassword();
    await AppDataSource.getRepository(User).save(admin);
    console.log("Created admin user");

    console.log("Seed completed successfully");
  } catch (error) {
    console.error("Error during seeding:", error);
  } finally {
    await AppDataSource.destroy();
  }
}

// Run the seed function
seed();
