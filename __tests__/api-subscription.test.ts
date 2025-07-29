// __tests__/api-subscription.test.ts
import request from 'supertest';
import { app } from '../server/app';
import * as db from '../server/lib/db';
import { supabaseAdmin } from '../server/lib/supabaseAdmin';
import { makeTestUser } from './factories';

jest.mock('../server/lib/db');

describe('GET /api/subscription/status', () => {
  let agent: any;
  let testUser: ReturnType<typeof makeTestUser>;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Arrange: register and login user
    testUser = makeTestUser();
    agent = request.agent(app);

    // Mock db helpers (après avoir défini testUser)
    (db.getSubscription as jest.Mock).mockResolvedValue(null);
    (db.subscriptionStatusHelper as jest.Mock).mockResolvedValue('none');
    (db.upsertUser as jest.Mock).mockImplementation(async (user) => ({
      id: 123,
      username: user.username,
      email: user.email,
      password: user.password,
      created_at: new Date().toISOString()
    }));
    (db.getUserById as jest.Mock).mockImplementation(async (id) => ({
      id: 123,
      username: testUser.username,
      email: testUser.email,
      password: testUser.password,
      created_at: new Date().toISOString()
    }));
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    (db.getUserByEmail as jest.Mock).mockImplementation(async (email) => ({
      id: 123,
      username: testUser.username,
      email: testUser.email,
      password: hashedPassword,
      created_at: new Date().toISOString()
    }));

    await agent.post('/api/auth/register').send(testUser);
    const loginRes = await agent.post('/api/auth/login').send({ username: testUser.username, password: testUser.password });
    
    // Verify login succeeded
    if (loginRes.status !== 200) {
      throw new Error(`Login failed: ${loginRes.status} ${JSON.stringify(loginRes.body)}`);
    }
  });

  it('retourne status: none si pas d’abonnement', async () => {
    // Act
    const res = await agent.get('/api/subscription/status');

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'none');
    expect(res.body.subscription).toBeNull();
  });

  it('retourne status: active et subscription pour un utilisateur avec abonnement actif', async () => {
    // Arrange : register/login user déjà fait dans beforeEach
    const activeSub = {
      id: 'sub_123',
      user_id: 123,
      plan: 'artist',
      status: 'active',
      current_period_end: '2099-12-31T00:00:00.000Z'
    };
    (db.getSubscription as jest.Mock).mockResolvedValue(activeSub);
    (db.subscriptionStatusHelper as jest.Mock).mockResolvedValue('active');

    // Act
    const res = await agent.get('/api/subscription/status');

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'active');
    expect(res.body.subscription).toBeDefined();
    expect(res.body.subscription).toMatchObject({
      id: 'sub_123',
      plan: 'artist',
      status: 'active'
    });
  });

  it('retourne status: canceled et subscription pour un utilisateur avec abonnement annulé', async () => {
    // Arrange : mock Supabase pour une subscription annulée
    const canceledSub = {
      id: 'sub_456',
      user_id: 123,
      plan: 'artist',
      status: 'canceled',
      current_period_end: '2020-01-01T00:00:00.000Z'
    };
    (db.getSubscription as jest.Mock).mockResolvedValue(canceledSub);
    (db.subscriptionStatusHelper as jest.Mock).mockResolvedValue('canceled');

    // Act
    const res = await agent.get('/api/subscription/status');

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'canceled');
    expect(res.body.subscription).toBeDefined();
    expect(res.body.subscription).toMatchObject({
      id: 'sub_456',
      plan: 'artist',
      status: 'canceled'
    });
  });

  it('retourne status: inactive et subscription pour un utilisateur avec abonnement expiré', async () => {
    // Arrange : mock Supabase pour une subscription expirée
    const expiredSub = {
      id: 'sub_789',
      user_id: 123,
      plan: 'artist',
      status: 'active', // status dans la DB, mais expiré côté date
      current_period_end: '2000-01-01T00:00:00.000Z' // date passée
    };
    (db.getSubscription as jest.Mock).mockResolvedValue(expiredSub);
    (db.subscriptionStatusHelper as jest.Mock).mockResolvedValue('inactive');

    // Act
    const res = await agent.get('/api/subscription/status');

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'inactive');
    expect(res.body.subscription).toBeDefined();
    expect(res.body.subscription).toMatchObject({
      id: 'sub_789',
      plan: 'artist',
      status: 'active'
    });
  });

  it('retourne status: trialing et subscription pour un utilisateur en période d\'essai', async () => {
    // Arrange : mock Supabase pour une subscription trialing
    const trialingSub = {
      id: 'sub_trial',
      user_id: 123,
      plan: 'artist',
      status: 'trialing',
      current_period_end: '2099-12-31T00:00:00.000Z'
    };
    (db.getSubscription as jest.Mock).mockResolvedValue(trialingSub);
    (db.subscriptionStatusHelper as jest.Mock).mockResolvedValue('trialing');

    // Act
    const res = await agent.get('/api/subscription/status');

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'trialing');
    expect(res.body.subscription).toBeDefined();
    expect(res.body.subscription).toMatchObject({
      id: 'sub_trial',
      plan: 'artist',
      status: 'trialing'
    });
  });

  it('retourne status: canceled_pending si cancel_at_period_end=true et période en cours', async () => {
    // Arrange : mock Supabase pour une subscription active mais annulée à la fin de la période
    const canceledPendingSub = {
      id: 'sub_cancel_pending',
      user_id: 123,
      plan: 'artist',
      status: 'active',
      current_period_end: '2099-12-31T00:00:00.000Z',
      cancel_at_period_end: true
    };
    (db.getSubscription as jest.Mock).mockResolvedValue(canceledPendingSub);
    (db.subscriptionStatusHelper as jest.Mock).mockResolvedValue('canceled_pending');

    // Act
    const res = await agent.get('/api/subscription/status');

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'canceled_pending');
    expect(res.body.subscription).toBeDefined();
    expect(res.body.subscription).toMatchObject({
      id: 'sub_cancel_pending',
      plan: 'artist',
      status: 'active',
      cancel_at_period_end: true
    });
  });

  it('retourne 401 si non authentifié', async () => {
    const res = await request(app).get('/api/subscription/status');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('retourne 404 si user absent en DB', async () => {
    // Arrange: login user avec getUserByEmail mocké pour succès
    (db.getUserByEmail as jest.Mock).mockImplementation(async (email) => ({
      id: 123,
      username: 'testuser',
      email,
      password: 'hashed',
      created_at: new Date().toISOString()
    }));
    const agent = request.agent(app);
    const user = makeTestUser();
    await request(app).post('/api/auth/register').send(user);
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(user.password, 10);
    (db.getUserByEmail as jest.Mock).mockImplementation(async (email) => ({
      id: 123,
      username: user.username,
      email,
      password: hashedPassword,
      created_at: new Date().toISOString()
    }));
    const loginRes = await agent.post('/api/auth/login').send({ username: user.username, password: user.password });
    // Après le login, tous les appels à getUserById renvoient null
    (db.getUserById as jest.Mock).mockReset();
    (db.getUserById as jest.Mock).mockResolvedValue(null);
    const res = await agent.get('/api/subscription/status');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'USER_NOT_FOUND');
  });

  it('retourne 500 si erreur Supabase', async () => {
    // Arrange: login user, puis mock getSubscription pour throw
    (db.getSubscription as jest.Mock).mockImplementation(() => { throw new Error('DB_ERROR'); });
    const agent = request.agent(app);
    const user = makeTestUser();
    await request(app).post('/api/auth/register').send(user);
    await agent.post('/api/auth/login').send({ username: user.username, password: user.password });
    const res = await agent.get('/api/subscription/status');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});

describe('POST /api/subscription/webhook (Stripe)', () => {
  it('traite checkout.session.completed, upsert la subscription et retourne 200', async () => {
    // Arrange : fake event Stripe
    const fakeEvent = {
      id: 'evt_123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          customer_email: 'test@example.com',
          subscription: 'sub_123',
          metadata: { plan: 'artist' }
        }
      }
    };

    // Mock Stripe SDK
    jest.resetModules();
    jest.mock('stripe', () => {
      return jest.fn().mockImplementation(() => ({
        webhooks: {
          constructEvent: jest.fn().mockReturnValue(fakeEvent)
        }
      }));
    });

    // Mock Supabase upsert
    const upsertSpy = jest.spyOn(supabaseAdmin, 'from').mockReturnValue({
      upsert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: {}, error: null }),
    } as any);

    // Mock upsertSubscription
    (db.upsertSubscription as jest.Mock).mockResolvedValue({});

    process.env.STRIPE_WEBHOOK_SECRET = '';
    // Mock supabaseAdmin.from pour stripe_events (idempotence)
    jest.spyOn(supabaseAdmin, 'from').mockImplementation((table: string) => {
      if (table === 'stripe_events') {
        return {
          select: function () { return this; },
          eq: function () {
            return {
              single: async () => ({ data: null, error: null })
            };
          },
          insert: function () {
            return { select: async () => ({ data: { id: fakeEvent.id }, error: null }) };
          }
        } as any;
      }
      // fallback pour les autres tables
      return {
        upsert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: {}, error: null }),
      } as any;
    });
    // Act
    const res = await request(app)
      .post('/api/subscription/webhook')
      .set('stripe-signature', 'testsig')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(fakeEvent));

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('received', true);
    expect(db.upsertSubscription).toHaveBeenCalledWith({
      stripeSubId: 'sub_123',
      userId: 123,
      plan: 'artist',
      status: 'active',
      current_period_end: '2099-12-31T00:00:00.000Z'
    });
  });
});

describe('POST /api/subscription/webhook (Stripe) - cas avancés', () => {
  it('retourne 400 et error: invalid_signature si signature Stripe invalide', async () => {
    // Arrange
    const fakeEvent = { id: 'evt_invalid', type: 'checkout.session.completed', data: { object: {} } };
    jest.resetModules();
    jest.mock('stripe', () => {
      return jest.fn().mockImplementation(() => ({
        webhooks: {
          constructEvent: jest.fn(() => { throw new Error('Signature verification failed'); })
        }
      }));
    });
    process.env.STRIPE_WEBHOOK_SECRET = 'dummy';
    // Act
    const res = await request(app)
      .post('/api/subscription/webhook')
      .set('stripe-signature', 'bad')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(fakeEvent));
    // Assert
    expect(res.status).toBe(400);
    expect(res.text).toMatch(/Webhook Error: (Signature verification failed|Unable to extract timestamp and signatures from header)/);
  });

  it('ignore un event dupliqué (idempotence) : upsertSubscription appelé une seule fois', async () => {
    // Arrange
    const fakeEvent = {
      id: 'evt_dup',
      type: 'checkout.session.completed',
      data: { object: { subscription: 'sub_123', metadata: { plan: 'artist' } } }
    };
    (db.upsertSubscription as jest.Mock).mockResolvedValue({});
    jest.resetModules();
    jest.mock('stripe', () => {
      return jest.fn().mockImplementation(() => ({
        webhooks: {
          constructEvent: jest.fn().mockReturnValue(fakeEvent)
        }
      }));
    });
    process.env.STRIPE_WEBHOOK_SECRET = '';
    // Mock supabaseAdmin.from pour stripe_events (idempotence)
    let eventAlreadyProcessed = false;
    jest.spyOn(supabaseAdmin, 'from').mockImplementation((table: string) => {
      if (table === 'stripe_events') {
        return {
          select: function () { return this; },
          eq: function () {
            return {
              single: async () => {
                if (eventAlreadyProcessed) {
                  return { data: { id: fakeEvent.id }, error: null };
                }
                return { data: null, error: null };
              }
            };
          },
          insert: function () {
            eventAlreadyProcessed = true;
            return { select: async () => ({ data: { id: fakeEvent.id }, error: null }) };
          }
        } as any;
      }
      // fallback pour les autres tables
      return {
        upsert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: {}, error: null }),
      } as any;
    });
    // Act
    const res1 = await request(app)
      .post('/api/subscription/webhook')
      .set('stripe-signature', 'testsig')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(fakeEvent));
    const res2 = await request(app)
      .post('/api/subscription/webhook')
      .set('stripe-signature', 'testsig')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(fakeEvent));
    // Assert
    expect(db.upsertSubscription).toHaveBeenCalledTimes(1);
    expect(res2.body).toHaveProperty('duplicated', true);
  });

  it('répond 200 {received:true} pour un event non supporté', async () => {
    // Arrange
    const fakeEvent = {
      id: 'evt_unsupported',
      type: 'customer.deleted',
      data: { object: { id: 'cus_123' } }
    };
    jest.resetModules();
    jest.mock('stripe', () => {
      return jest.fn().mockImplementation(() => ({
        webhooks: {
          constructEvent: jest.fn().mockReturnValue(fakeEvent)
        }
      }));
    });
    process.env.STRIPE_WEBHOOK_SECRET = '';
    // Act
    const res = await request(app)
      .post('/api/subscription/webhook')
      .set('stripe-signature', 'testsig')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(fakeEvent));
    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('received', true);
  });
}); 