console.log("Welcome to the POSH Telegram Bot bypass script!");
console.log("We are replacing the local database/redis connections with mocked versions so the bot runs without installing Postgres/Redis.");

const fs = require('fs');

// 1. Mock DB
const dbMock = `
const { Pool } = require('pg');
// Create a fake pool object that just logs and returns dummy data
const pool = {
  query: async (text, params) => {
    console.log('[MOCK DB] Query:', text);
    if (text.includes('SELECT id, status FROM')) {
      return { rows: [{ id: 1, status: 'pending' }] };
    }
    if (text.includes('INSERT INTO')) {
      return { rows: [{ id: Math.floor(Math.random() * 1000) }] };
    }
    return { rows: [] };
  }
};
console.log('Mock PostgreSQL connected successfully.');
module.exports = { pool };
`;

fs.writeFileSync('src/db.js', dbMock);

// 2. Mock Redis
const redisMock = `
const redisClient = {
  connect: async () => console.log('Mock Redis connected successfully'),
  setEx: async (key, time, val) => console.log(\`[MOCK REDIS] SetEx \${key} for \${time}s\`),
  get: async (key) => null,
  on: () => {}
};
module.exports = redisClient;
`;

fs.writeFileSync('src/redis.js', redisMock);

console.log("Successfully mocked Database and Redis. You can now run the bot!");
