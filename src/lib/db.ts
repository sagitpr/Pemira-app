import { neon } from '@neondatabase/serverless';

// Gunakan fallback string kosong agar proses build 'next build' tidak crash
const connectionString = process.env.DATABASE_URL || '';

export const sql = neon(connectionString);
