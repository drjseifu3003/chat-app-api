import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

const sampleUsers = [
  {
    name: "Sarah Johnson",
    email: "sarah.johnson@example.com",
    picture: "/professional-woman-smiling.png",
    password: "password123",
  },
  {
    name: "Michael Chen",
    email: "michael.chen@example.com",
    picture: "/professional-man-glasses.png",
    password: "password123",
  },
  {
    name: "Emma Williams",
    email: "emma.williams@example.com",
    picture: "/young-woman-developer.jpg",
    password: "password123",
  },
  {
    name: "James Rodriguez",
    email: "james.rodriguez@example.com",
    picture: "/smiling-bearded-man.png",
    password: "password123",
  },
  {
    name: "Olivia Brown",
    email: "olivia.brown@example.com",
    picture: "/curly-haired-woman.png",
    password: "password123",
  },
  {
    name: "David Kim",
    email: "david.kim@example.com",
    picture: "/asian-professional-man.png",
    password: "password123",
  },
  {
    name: "Sophia Martinez",
    email: "sophia.martinez@example.com",
    picture: "/latina-woman-smiling.png",
    password: "password123",
  },
  {
    name: "Liam Anderson",
    email: "liam.anderson@example.com",
    picture: "/young-man-casual.jpg",
    password: "password123",
  },
]

async function main() {
  console.log("Starting database seed...")

  // Hash password for all sample users
  const hashedPassword = await bcrypt.hash("password123", 10)

  // Create sample users
  for (const user of sampleUsers) {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
      })

      if (existingUser) {
        console.log(`User ${user.email} already exists, updating...`)
        await prisma.user.update({
          where: { email: user.email },
          data: {
            name: user.name,
            picture: user.picture,
            isOnline: true, // Keep sample users always online
            lastSeen: new Date(),
          },
        })
      } else {
        console.log(`Creating user ${user.email}...`)
        await prisma.user.create({
          data: {
            email: user.email,
            name: user.name,
            picture: user.picture,
            password: hashedPassword,
            isOnline: true, // Set sample users as online
            lastSeen: new Date(),
          },
        })
      }
    } catch (error) {
      console.error(`Error processing user ${user.email}:`, error)
    }
  }

  console.log("Seed completed successfully!")
}

main()
  .catch((e) => {
    console.error("Error during seed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
