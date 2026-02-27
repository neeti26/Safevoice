
const redisClient = {
  connect: async () => console.log('Mock Redis connected successfully'),
  setEx: async (key, time, val) => console.log(`[MOCK REDIS] SetEx ${key} for ${time}s`),
  get: async (key) => null,
  on: () => {}
};
module.exports = redisClient;
