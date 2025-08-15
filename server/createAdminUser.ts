import { storage } from "./storage";
import { hashPassword } from "./auth";
import { randomBytes } from "crypto";

export async function createDefaultAdminUser() {
  try {
    // Check if admin user already exists
    const existingAdmin = await storage.getUserByEmail("admin@currencia.com");
    if (existingAdmin) {
      console.log("Default admin user already exists");
      return;
    }

    // Create default admin user with default password
    const defaultPassword = "admin123";
    const hashedPassword = await hashPassword(defaultPassword);
    const adminId = randomBytes(16).toString('hex');

    const adminUser = await storage.upsertUser({
      id: adminId,
      email: "admin@currencia.com",
      password: hashedPassword,
      firstName: "Admin",
      lastName: "User",
      role: "admin",
      status: "active",
      isDefaultPassword: true,
      mustChangePassword: true,
      companyName: "Currencia Admin",
      businessType: "financial_institution",
      isRegistrationComplete: true,
      balance: "1000000.00",
      ugxBalance: "3700000000.00",
      usdBalance: "1000000.00",
      kesBalance: "130000000.00",
      eurBalance: "920000.00",
      gbpBalance: "780000.00",
    });

    console.log("Default admin user created successfully:");
    console.log("Email: admin@currencia.com");
    console.log("Password: admin123");
    console.log("⚠️  IMPORTANT: Change this password immediately after first login!");
    
    return adminUser;
  } catch (error) {
    console.error("Error creating default admin user:", error);
    throw error;
  }
}