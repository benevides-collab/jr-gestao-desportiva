import "dotenv/config";

import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Configure DIRECT_URL ou DATABASE_URL antes de rodar o seed.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const roles = [
  {
    slug: "admin",
    name: "SUPER_ADMIN",
    description: "Acesso total ao sistema interno da JR.",
  },
  {
    slug: "diretoria",
    name: "DIRETORIA",
    description: "Acesso às áreas administrativas e operacionais.",
  },
  {
    slug: "secretaria",
    name: "SECRETARIA",
    description: "Acesso aos cadastros, documentos, turmas e agenda.",
  },
  {
    slug: "professor",
    name: "PROFESSOR",
    description: "Acesso às turmas, chamadas e informações essenciais.",
  },
  {
    slug: "assistente",
    name: "ASSISTENTE",
    description: "Acesso limitado às turmas vinculadas.",
  },
  {
    slug: "financeiro",
    name: "FINANCEIRO",
    description: "Acesso a mensalidades, pagamentos e relatórios financeiros.",
  },
  {
    slug: "consulta",
    name: "CONSULTA",
    description: "Acesso somente para visualização limitada.",
  },
];

async function main() {
  for (const role of roles) {
    await prisma.role.upsert({
      where: { slug: role.slug },
      create: role,
      update: {
        name: role.name,
        description: role.description,
        isActive: true,
      },
    });
  }

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { slug: "admin" },
  });

  const passwordHash = await bcrypt.hash("Admin@123", 12);

  await prisma.user.upsert({
    where: { email: "admin@jrdesportos.local" },
    create: {
      name: "Administrador JR",
      email: "admin@jrdesportos.local",
      passwordHash,
      roleId: adminRole.id,
      isActive: true,
    },
    update: {
      name: "Administrador JR",
      passwordHash,
      roleId: adminRole.id,
      isActive: true,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed administrativo concluído.");
  })
  .catch(async (error) => {
    await prisma.$disconnect();
    console.error("Falha ao executar seed administrativo.");
    throw error;
  });
