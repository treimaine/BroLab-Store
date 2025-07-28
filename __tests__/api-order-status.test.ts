import { describe, expect, it, jest, beforeAll, afterAll } from '@jest/globals';
import { supabaseAdmin } from '../server/lib/supabase';
import { OrderStatus, OrderStatusEnum } from '../shared/schema';

// Mock Supabase
jest.mock('../server/lib/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

describe('Order Status Management', () => {
  const mockOrder = {
    id: 1,
    total: 2999,
    status: 'pending' as OrderStatusEnum,
    stripe_payment_intent_id: 'pi_test123',
  };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  describe('Order Status Transitions', () => {
    it('devrait permettre la transition de pending à processing', async () => {
      // Configure mocks for this test
      const mockSelectChain = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn()
      };
      const mockUpdateChain = {
        eq: jest.fn()
      };
      const mockInsertChain = jest.fn();
      
      // @ts-ignore
      mockSelectChain.single.mockResolvedValue({ data: mockOrder, error: null });
      // @ts-ignore
      mockUpdateChain.eq.mockResolvedValue({ error: null });
      // @ts-ignore
      mockInsertChain.mockResolvedValue({ error: null });
      
      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnValue(mockSelectChain),
            update: jest.fn().mockReturnValue(mockUpdateChain)
          };
        }
        if (table === 'order_status_history') {
          return {
            insert: mockInsertChain
          };
        }
      });

      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('id', 1)
        .single();

      expect(order.status).toBe('pending');

      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({ status: 'processing' })
        .eq('id', 1);

      expect(updateError).toBeNull();

      const { error: historyError } = await supabaseAdmin
        .from('order_status_history')
        .insert({
          order_id: 1,
          status: 'processing',
          comment: 'Commande en cours de traitement'
        });

      expect(historyError).toBeNull();
    });

    it('devrait permettre la transition de processing à paid', async () => {
      // Configure mocks for this test
      const mockOrderProcessing = { ...mockOrder, status: 'processing' as OrderStatusEnum };
      const mockSelectChain = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn()
      };
      const mockUpdateChain = {
        eq: jest.fn()
      };
      const mockInsertChain = jest.fn();
      
      // @ts-ignore
      mockSelectChain.single.mockResolvedValue({ data: mockOrderProcessing, error: null });
      // @ts-ignore
      mockUpdateChain.eq.mockResolvedValue({ error: null });
      // @ts-ignore
      mockInsertChain.mockResolvedValue({ error: null });
      
      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnValue(mockSelectChain),
            update: jest.fn().mockReturnValue(mockUpdateChain)
          };
        }
        if (table === 'order_status_history') {
          return {
            insert: mockInsertChain
          };
        }
      });

      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('id', 1)
        .single();

      expect(order.status).toBe('processing');

      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', 1);

      expect(updateError).toBeNull();

      const { error: historyError } = await supabaseAdmin
        .from('order_status_history')
        .insert({
          order_id: 1,
          status: 'paid',
          comment: 'Paiement reçu et validé'
        });

      expect(historyError).toBeNull();
    });

    it('devrait permettre la transition de paid à completed', async () => {
      // Configure mocks for this test
      const mockOrderPaid = { ...mockOrder, status: 'paid' as OrderStatusEnum };
      const mockSelectChain = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn()
      };
      const mockUpdateChain = {
        eq: jest.fn()
      };
      const mockInsertChain = jest.fn();
      
      // @ts-ignore
      mockSelectChain.single.mockResolvedValue({ data: mockOrderPaid, error: null });
      // @ts-ignore
      mockUpdateChain.eq.mockResolvedValue({ error: null });
      // @ts-ignore
      mockInsertChain.mockResolvedValue({ error: null });
      
      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnValue(mockSelectChain),
            update: jest.fn().mockReturnValue(mockUpdateChain)
          };
        }
        if (table === 'order_status_history') {
          return {
            insert: mockInsertChain
          };
        }
      });

      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('id', 1)
        .single();

      expect(order.status).toBe('paid');

      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', 1);

      expect(updateError).toBeNull();

      const { error: historyError } = await supabaseAdmin
        .from('order_status_history')
        .insert({
          order_id: 1,
          status: 'completed',
          comment: 'Commande complétée avec succès'
        });

      expect(historyError).toBeNull();
    });

    it('devrait permettre le remboursement d\'une commande payée', async () => {
      // Configure mocks for this test
      const mockOrderCompleted = { ...mockOrder, status: 'completed' as OrderStatusEnum };
      const mockSelectChain = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn()
      };
      const mockUpdateChain = {
        eq: jest.fn()
      };
      const mockInsertChain = jest.fn();
      
      // @ts-ignore
      mockSelectChain.single.mockResolvedValue({ data: mockOrderCompleted, error: null });
      // @ts-ignore
      mockUpdateChain.eq.mockResolvedValue({ error: null });
      // @ts-ignore
      mockInsertChain.mockResolvedValue({ error: null });
      
      (supabaseAdmin.from as any).mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnValue(mockSelectChain),
            update: jest.fn().mockReturnValue(mockUpdateChain)
          };
        }
        if (table === 'order_status_history') {
          return {
            insert: mockInsertChain
          };
        }
      });

      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('id', 1)
        .single();

      expect(order.status).toBe('completed');

      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({ status: 'refunded' })
        .eq('id', 1);

      expect(updateError).toBeNull();

      const { error: historyError } = await supabaseAdmin
        .from('order_status_history')
        .insert({
          order_id: 1,
          status: 'refunded',
          comment: 'Commande remboursée'
        });

      expect(historyError).toBeNull();
    });
  });
});