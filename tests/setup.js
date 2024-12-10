const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { User, Session } = require('../src/models');

let mongoServer;

// Redis mock
jest.mock('../src/utils/redisClient', () => ({
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  setHash: jest.fn(),
  getHash: jest.fn(),
  keys: jest.fn().mockResolvedValue([])
}));

// Logger mock
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear all mocks
  jest.clearAllMocks();
});

afterEach(async () => {
  // Clear database
  await User.deleteMany({});
  await Session.deleteMany({});
});