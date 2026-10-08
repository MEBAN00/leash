import { config } from "dotenv";

// Next.js loads .env.local itself; standalone scripts need this.
config({ path: ".env.local", quiet: true });
