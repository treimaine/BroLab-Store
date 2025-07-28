import bcrypt from 'bcrypt';
import request from 'supertest';
import { app } from '../server/app'; // Import backend pur, pas de Vite/ESM
import { supabaseAdmin } from '../server/lib/supabaseAdmin';
import { makeTestUser } from './factories';

// Génère un utilisateur de test unique à chaque fois
function makeUniqueTestUser() {
  const rand = Math.floor(Math.random() * 1000000);
  return {
    username: `testuser_${rand}`,
    email: `testuser_${rand}@example.com`,
    password: 'testpassword',
  };
}

beforeAll(async () => {
  // Nettoie tous les utilisateurs de test avant les tests
  await supabaseAdmin.from('users').delete().like('email', 'testuser%');
});

afterAll(async () => {
  // Nettoie tous les utilisateurs de test après les tests
  await supabaseAdmin.from('users').delete().like('email', 'testuser%');
});

beforeEach(async () => {
  // Nettoie tous les utilisateurs de test avant chaque test
  await supabaseAdmin.from('users').delete().like('email', 'testuser%');
});

afterEach(async () => {
  // Nettoie tous les utilisateurs de test après chaque test
  await supabaseAdmin.from('users').delete().like('email', 'testuser%');
});

describe('POST /api/auth/login', () => {
  it('login réussi avec les bons identifiants', async () => {
    const testUser = makeUniqueTestUser();
    
    // Créer l'utilisateur d'abord
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    await supabaseAdmin
      .from('users')
      .insert({
        username: testUser.username,
        email: testUser.email,
        password: hashedPassword,
        created_at: new Date().toISOString(),
      });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: testUser.email, password: testUser.password });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email);
  });

  it('échec si mauvais mot de passe', async () => {
    const testUser = makeUniqueTestUser();
    
    // Créer l'utilisateur d'abord
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    await supabaseAdmin
      .from('users')
      .insert({
        username: testUser.username,
        email: testUser.email,
        password: hashedPassword,
        created_at: new Date().toISOString(),
      });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: testUser.email, password: 'wrongpassword' });

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
