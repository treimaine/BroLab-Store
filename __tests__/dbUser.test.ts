// __tests__/dbUser.test.ts
import { getUserByEmail } from '../server/lib/dbUser';
import { supabaseAdmin } from '../server/lib/supabaseAdmin';

jest.mock('../server/lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

describe('getUserByEmail', () => {
  it('retourne un utilisateur si trouvé', async () => {
    // Mock de la méthode from().select().eq().single()
    (supabaseAdmin.from as jest.Mock).mockReturnValue({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: { id: 1, email: 'test@example.com', username: 'test', password: 'hashed', createdAt: '2024-01-01T00:00:00Z' },
            error: null,
          }),
        }),
      }),
    });

    const user = await getUserByEmail('test@example.com');
    expect(user).toBeTruthy();
    expect(user?.email).toBe('test@example.com');
  });

  it('lève une erreur si Supabase retourne une erreur', async () => {
    (supabaseAdmin.from as jest.Mock).mockReturnValue({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: null,
            error: { message: 'User not found' },
          }),
        }),
      }),
    });

    await expect(getUserByEmail('notfound@example.com')).rejects.toThrow('User not found');
  });
});
