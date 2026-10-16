import { neon } from '@neondatabase/serverless';

// Helper penarik instance neon saat runtime API dipanggil
function getSql() {
  const connectionString = 
    process.env.DATABASE_URL || 
    process.env.POSTGRES_URL || 
    '';

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is missing.');
  }

  return neon(connectionString);
}

// Wrapper template tag: saat build 'next build' fungsi ini tidak dipanggil sehingga build 100% aman
export const sql = (strings: TemplateStringsArray, ...values: any[]) => {
  const db = getSql();
  return db(strings, ...values);
};
