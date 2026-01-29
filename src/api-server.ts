import { app } from "./api";
import { connect } from "./services/lore";

const PORT = Number(process.env.PORT) || 3001;

async function main() {
  // Verify database connection
  await connect();
  console.log("✓ Connected to Convex");

  app.listen(PORT);
  console.log(`✓ Lore API running at http://localhost:${PORT}`);
  console.log(`✓ Swagger docs at http://localhost:${PORT}/swagger`);
}

main().catch((error) => {
  console.error("Failed to start API:", error);
  process.exit(1);
});
