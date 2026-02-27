
const { Pool } = require('pg');
// Create a fake pool object that just logs and returns dummy data
const pool = {
  query: async (text, params) => {
    console.log('[MOCK DB] Query:', text);
    if (text.includes('SELECT id, status FROM')) {
      return { rows: [{ id: 1, status: 'pending' }] };
    }
    if (text.includes('INSERT INTO')) {
      return { rows: [{ id: Math.floor(Math.random() * 1000), status: 'pending' }] };
    }
    return { rows: [] };
  }
};
console.log('Mock PostgreSQL connected successfully.');
module.exports = { pool };
