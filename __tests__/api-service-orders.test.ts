// __tests__/api-service-orders.test.ts
import request from 'supertest';
import { app } from '../server/app';
import * as db from '../server/lib/db';
import { makeTestUser } from './factories';

jest.mock('../server/lib/db');

describe('/api/service-orders', () => {
  let agent: any;
  let testUser: ReturnType<typeof makeTestUser>;

  beforeEach(async () => {
    jest.clearAllMocks();
    testUser = makeTestUser();
    // Mock upsertUser pour register
    (db.upsertUser as jest.Mock).mockImplementation(async (user) => ({
      id: 123,
      username: user.username,
      email: user.email,
      password: user.password,
      created_at: new Date().toISOString()
    }));
    // Mock getUserByEmail pour login
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    (db.getUserByEmail as jest.Mock).mockImplementation(async (email) => ({
      id: 123,
      username: testUser.username,
      email,
      password: hashedPassword,
      created_at: new Date().toISOString()
    }));
    // Mock getUserById pour session
    (db.getUserById as jest.Mock).mockImplementation(async (id) => ({
      id: 123,
      username: testUser.username,
      email: testUser.email,
      password: hashedPassword,
      created_at: new Date().toISOString()
    }));
    await request(app).post('/api/auth/register').send(testUser);
    agent = request.agent(app);
    await agent.post('/api/auth/login').send({ username: testUser.email, password: testUser.password });
  });

  it('create service order ok (login → POST → GET)', async () => {
    // Arrange
    const fakeOrder = {
      id: 'order-uuid',
      user_id: 123,
      service_type: 'mixing',
      details: 'Mix my track',
      status: 'pending',
      created_at: new Date().toISOString()
    };
    (db.createServiceOrder as jest.Mock).mockResolvedValue(fakeOrder);
    (db.listServiceOrders as jest.Mock).mockResolvedValue([fakeOrder]);
    // Act: POST
    const postRes = await agent.post('/api/service-orders').send({
      service_type: 'mixing',
      details: 'Mix my track'
    });
    // Assert POST
    expect(postRes.status).toBe(201);
    expect(postRes.body).toMatchObject({
      id: 'order-uuid',
      user_id: 123,
      service_type: 'mixing',
      details: 'Mix my track'
    });
    // Act: GET
    const getRes = await agent.get('/api/service-orders');
    // Assert GET
    expect(getRes.status).toBe(200);
    expect(Array.isArray(getRes.body)).toBe(true);
    expect(getRes.body[0]).toMatchObject({
      id: 'order-uuid',
      user_id: 123,
      service_type: 'mixing',
      details: 'Mix my track'
    });
  });

  it('unauthenticated (POST/GET sans session → 401)', async () => {
    // Arrange: pas de login, pas d'agent
    (db.createServiceOrder as jest.Mock).mockResolvedValue({});
    (db.listServiceOrders as jest.Mock).mockResolvedValue([]);
    // Act: POST
    const postRes = await request(app).post('/api/service-orders').send({
      service_type: 'mixing',
      details: 'Mix my track'
    });
    expect(postRes.status).toBe(401);
    expect(postRes.body).toHaveProperty('error');
    // Act: GET
    const getRes = await request(app).get('/api/service-orders');
    expect(getRes.status).toBe(401);
    expect(getRes.body).toHaveProperty('error');
  });

  it('invalid body (POST → 400)', async () => {
    // Arrange: login déjà fait
    // Act: POST sans service_type
    const res = await agent.post('/api/service-orders').send({
      details: 'Missing service_type'
    });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    // Act: POST sans details
    const res2 = await agent.post('/api/service-orders').send({
      service_type: 'mixing'
    });
    expect(res2.status).toBe(400);
    expect(res2.body).toHaveProperty('error');
  });
}); 