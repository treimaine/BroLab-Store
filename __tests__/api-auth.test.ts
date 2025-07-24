import bcrypt from 'bcrypt';
import request from 'supertest';
import { app } from '../server/app'; // Import backend pur, pas de Vite/ESM
import { supabaseAdmin } from '../server/lib/supabaseAdmin';
import { makeTestUser } from './factories';

const TEST_USER = {
  username: 'testuser',
  email: 'testuser@example.com',
  password: 'testpassword',
};

beforeAll(async () => {
  // Nettoie la table users avant les tests
  await supabaseAdmin.from('users').delete().eq('email', TEST_USER.email);
});

afterAll(async () => {
  // Nettoie la table users après les tests
  await supabaseAdmin.from('users').delete().eq('email', TEST_USER.email);
});

beforeEach(async () => {
  // Nettoie l'utilisateur de test avant chaque test
  await supabaseAdmin.from('users').delete().eq('email', TEST_USER.email);

  // Ajoute un utilisateur de test à chaque test
  const hashedPassword = await bcrypt.hash(TEST_USER.password, 10);

  const { data, error } = await supabaseAdmin
    .from('users')
    .upsert([
      {
        username: TEST_USER.username,
        email: TEST_USER.email,
        password: hashedPassword,
        created_at: new Date().toISOString(),
      }
    ], { onConflict: 'email' })
    .select()
    .single();

  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error('User not inserted correctly');
});

afterEach(async () => {
  // Nettoie la table users après chaque test
  await supabaseAdmin.from('users').delete().eq('email', TEST_USER.email);
});

describe('POST /api/auth/login', () => {
  it('login réussi avec les bons identifiants', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: TEST_USER.email, password: TEST_USER.password });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(TEST_USER.email);
  });

  it('échec si mauvais mot de passe', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: TEST_USER.email, password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Invalid credentials/);
  });

  it('échec si utilisateur inexistant', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'notfound@example.com', password: 'irrelevant' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Invalid credentials/);
  });
});

describe('POST /api/auth/register', () => {
  it('ne permet pas de s\'inscrire deux fois avec le même email', async () => {
    const user = makeTestUser();
    // Premier register
    const res1 = await request(app)
      .post('/api/auth/register')
      .send(user);
    expect(res1.status).toBe(201);
    // Deuxième register avec même email
    const res2 = await request(app)
      .post('/api/auth/register')
      .send(user);
    expect(res2.status).toBe(400);
    expect(res2.body.error).toMatch(/already registered/i);
  });
});

describe('POST /api/auth/logout', () => {
  it('logout détruit la session', async () => {
    const user = makeTestUser();
    // Register + login
    await request(app).post('/api/auth/register').send(user);
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ username: user.email, password: user.password });
    // Logout
    const res = await agent.post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/logged out/i);
    // Vérifie que la session est détruite
    const res2 = await agent.get('/api/auth/user');
    expect(res2.status).toBe(401);
  });
});

describe('GET /api/auth/user', () => {
  it('retourne le user courant si connecté', async () => {
    const user = makeTestUser();
    await request(app).post('/api/auth/register').send(user);
    const agent = request.agent(app);
    const loginRes = await agent.post('/api/auth/login').send({ username: user.email, password: user.password });
    const res = await agent.get('/api/auth/user');
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(user.email);
  });
  it('retourne 401 si non connecté', async () => {
    const res = await request(app).get('/api/auth/user');
    expect(res.status).toBe(401);
  });
});
