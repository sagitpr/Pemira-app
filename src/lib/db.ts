import { neon, Pool } from '@neondatabase/serverless';

function getConnectionString() {
  const connectionString = 
    process.env.DATABASE_URL || 
    process.env.POSTGRES_URL || 
    '';

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is missing.');
  }

  return connectionString;
}

export function getPool() {
  return new Pool({ connectionString: getConnectionString() });
}

// Helper penarik instance neon saat runtime API dipanggil
export function getSql() {
  return neon(getConnectionString());
}

// Wrapper template tag: saat build 'next build' fungsi ini tidak dipanggil sehingga build 100% aman
export const sql: any = (strings: TemplateStringsArray, ...values: any[]) => {
  const db = getSql();
  return db(strings, ...values);
};

sql.transaction = (queriesOrFn: any, options?: any) => {
  const db = getSql();
  return db.transaction(queriesOrFn, options);
};
