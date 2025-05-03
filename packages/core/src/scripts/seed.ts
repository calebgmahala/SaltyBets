import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import { SecurityLevel } from "../types/SecurityLevel";

async function seed() {
  try {
    // Initialize the database connection
    await AppDataSource.initialize();
    console.log("Database connection initialized");

    // Clear existing users
    await AppDataSource.getRepository(User).delete({});
    console.log("Cleared existing users");

    // Create admin user
    const admin = new User();
    admin.username = "admin";
    admin.alias = "Admin";
    admin.password = "admin";
    admin.securityLevel = SecurityLevel.ADMIN;
    admin.balance = 1000;
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
