// Prisma 7 : l'URL de connexion doit être ici (plus dans schema.prisma).
// dotenv n'est pas importé car les variables sont injectées par Docker au runtime.
import { defineConfig } from "@prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
