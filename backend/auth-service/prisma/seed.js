require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { hashPassword } = require("../src/utils/password");

const prisma = new PrismaClient();

const seedUsers = [
  {
    username: "admin",
    email: "admin@smarttraffic.local",
    password: "admin123",
    role: "ADMIN"
  },
  {
    username: "operator",
    email: "operator@smarttraffic.local",
    password: "operator123",
    role: "OPERATOR"
  }
];

async function main() {
  for (const user of seedUsers) {
    const password = await hashPassword(user.password);

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        username: user.username,
        password,
        role: user.role
      },
      create: {
        username: user.username,
        email: user.email,
        password,
        role: user.role
      }
    });
  }

  console.log("Seed users ready:");
  for (const user of seedUsers) {
    console.log(`- ${user.role}: ${user.email} / ${user.password}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
