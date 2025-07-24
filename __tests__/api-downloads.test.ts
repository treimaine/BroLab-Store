// __tests__/api-downloads.test.ts
import request from 'supertest';
import { app } from '../server/app';
import * as db from '../server/lib/db';
import { makeTestUser } from './factories';

jest.mock('../server/lib/db');

describe('/api/downloads', () => {
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
    // Mock getUserById pour session (plan: 'ultimate' pour autoriser tous les downloads)
    (db.getUserById as jest.Mock).mockImplementation(async (id) => ({
      id: 123,
      username: testUser.username,
      email: testUser.email,
      password: hashedPassword,
      created_at: new Date().toISOString(),
      plan: 'ultimate'
    }));
    await request(app).post('/api/auth/register').send(testUser);
    agent = request.agent(app);
    await agent.post('/api/auth/login').send({ username: testUser.email, password: testUser.password });
  });

  it('log download ok (login → POST → GET)', async () => {
    // Arrange
    const fakeDownload = {
      id: 'uuid-1',
      user_id: 123,
      product_id: 42,
      license: 'premium',
      downloaded_at: new Date().toISOString()
    };
    (db.logDownload as jest.Mock).mockResolvedValue(fakeDownload);
    (db.listDownloads as jest.Mock).mockResolvedValue([fakeDownload]);
    const logActivitySpy = jest.spyOn(db, 'logActivity').mockResolvedValue({
      id: 'log-uuid',
      user_id: 123,
      product_id: 42,
      license: 'premium',
      event_type: 'download',
      timestamp: new Date().toISOString(),
      download_count: 1
    });
    // Act: POST
    const postRes = await agent.post('/api/downloads').send({ productId: 42, license: 'premium' });
    // Assert POST
    expect(postRes.status).toBe(201);
    expect(postRes.body).toMatchObject({
      id: 'uuid-1',
      user_id: 123,
      product_id: 42,
      license: 'premium'
    });
    expect(logActivitySpy).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 123,
      product_id: 42,
      license: 'premium',
      event_type: 'download'
    }));
    // Act: GET
    const getRes = await agent.get('/api/downloads');
    // Assert GET
    expect(getRes.status).toBe(200);
    expect(Array.isArray(getRes.body)).toBe(true);
    expect(getRes.body[0]).toMatchObject({
      id: 'uuid-1',
      user_id: 123,
      product_id: 42,
      license: 'premium'
    });
  });

  it('unauthenticated (POST/GET sans session → 401)', async () => {
    // Arrange: pas de login, pas d'agent
    (db.logDownload as jest.Mock).mockResolvedValue({});
    (db.listDownloads as jest.Mock).mockResolvedValue([]);
    // Act: POST
    const postRes = await request(app).post('/api/downloads').send({ productId: 1, license: 'basic' });
    expect(postRes.status).toBe(401);
    expect(postRes.body).toHaveProperty('error');
    // Act: GET
    const getRes = await request(app).get('/api/downloads');
    expect(getRes.status).toBe(401);
    expect(getRes.body).toHaveProperty('error');
  });

  it('product not found (mock Woo → POST doit répondre 404)', async () => {
    // Arrange: login déjà fait, mock logDownload pour throw 404
    const error = new Error('Product not found');
    (error as any).status = 404;
    (db.logDownload as jest.Mock).mockImplementation(() => { throw error; });
    // Act
    const res = await agent.post('/api/downloads').send({ productId: 999, license: 'basic' });
    // Assert
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatch(/not found/i);
  });

  it('idempotence: retélécharger le même produit incrémente le compteur', async () => {
    // Arrange
    const fakeDownload = {
      id: 'uuid-1',
      user_id: 123,
      product_id: 42,
      license: 'premium',
      downloaded_at: new Date().toISOString(),
      download_count: 1
    };
    const fakeDownload2 = { ...fakeDownload, download_count: 2 };
    (db.logDownload as jest.Mock)
      .mockResolvedValueOnce(fakeDownload)
      .mockResolvedValueOnce(fakeDownload2);
    (db.listDownloads as jest.Mock).mockResolvedValue([fakeDownload2]);
    // Act: POST une première fois
    const postRes1 = await agent.post('/api/downloads').send({ productId: 42, license: 'premium' });
    expect(postRes1.status).toBe(201);
    expect(postRes1.body.download_count).toBe(1);
    // Act: POST une deuxième fois (même produit)
    const postRes2 = await agent.post('/api/downloads').send({ productId: 42, license: 'premium' });
    expect(postRes2.status).toBe(201);
    expect(postRes2.body.download_count).toBe(2);
    // GET doit retourner download_count: 2
    const getRes = await agent.get('/api/downloads');
    expect(getRes.status).toBe(200);
    expect(getRes.body[0].download_count).toBe(2);
  });

  it('export CSV des downloads (GET /api/downloads/export)', async () => {
    // Arrange
    const fakeDownload = {
      id: 'uuid-1',
      user_id: 123,
      product_id: 42,
      license: 'premium',
      downloaded_at: '2024-07-22T12:00:00.000Z',
      download_count: 3
    };
    (db.listDownloads as jest.Mock).mockResolvedValue([fakeDownload]);
    // Act
    const res = await agent.get('/api/downloads/export');
    // Assert
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
    expect(res.text).toMatch(/"product_id","license","downloaded_at","download_count"/);
    expect(res.text).toMatch(/42,"premium","2024-07-22T12:00:00.000Z",3/);
  });

  it('refuse le téléchargement si license non autorisée pour le user (403)', async () => {
    // Arrange
    const user = { id: 123, username: 'test', email: 'test@example.com', password: 'hashed', created_at: new Date().toISOString(), plan: 'basic' };
    (db.getUserById as jest.Mock).mockResolvedValue(user);
    // Act
    const res = await agent.post('/api/downloads').send({ productId: 42, license: 'premium' });
    // Assert
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/not allowed/i);
  });
}); 