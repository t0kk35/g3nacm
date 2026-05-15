import { config } from 'dotenv';
import path from 'path';

// Load .env.local before any other module that reads process.env (e.g. @/db pool)
config({ path: path.join(process.cwd(), '.env.worker') });