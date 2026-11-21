const mockInvoke = jest.fn();
jest.mock('../../lib/supabase', () => ({ supabase: { functions: { invoke: (...a: unknown[]) => mockInvoke(...a) } } }));

import { sendChatMessage, chargeAndSend } from '../../lib/aiChat';
import { wallet, setWalletListeners, seedWallet } from '../../constants/premium';

const onSpend = jest.fn();
const err402 = (body: unknown) => ({ data: null, error: { context: { status: 402, json: async () => body } } });

beforeEach(() => {
  mockInvoke.mockReset(); onSpend.mockReset();
  setWalletListeners({ onSpend });
  seedWallet({ balance: 50 });
});

describe('Hỏi Tuzi — client KHÔNG tự trừ xu (máy chủ trừ)', () => {
  test('trong hạn mức miễn phí: gửi paid=false, không trừ gì', async () => {
    mockInvoke.mockResolvedValue({ data: { reply: 'Xin chào', isFree: true }, error: null });
    expect(await sendChatMessage('hello')).toEqual({ status: 'ok', reply: 'Xin chào' });
    expect(mockInvoke.mock.calls[0][1].body.paid).toBe(false);
    expect(wallet.balance).toBe(50);
  });

  test('vượt hạn mức: trả status quota kèm giá', async () => {
    mockInvoke.mockResolvedValue(err402({ error: 'quota_exceeded', freeLimit: 5 }));
    expect(await sendChatMessage('hello')).toMatchObject({ status: 'quota', freeLimit: 5 });
  });

  test('đồng ý trả phí: gửi paid=true, KHÔNG gọi onSpend (không trừ cục bộ/không gửi spend_xu), số dư lấy từ máy chủ', async () => {
    mockInvoke.mockResolvedValue({ data: { reply: 'Đây là câu trả lời', isFree: false, charged: 1, balance: 41 }, error: null });
    expect(await chargeAndSend('hello')).toEqual({ status: 'ok', reply: 'Đây là câu trả lời' });
    expect(mockInvoke.mock.calls[0][1].body.paid).toBe(true);
    expect(onSpend).not.toHaveBeenCalled();
    expect(wallet.balance).toBe(41);
  });

  test('máy chủ báo không đủ xu: báo lỗi và đồng bộ lại số dư thật', async () => {
    mockInvoke.mockResolvedValue(err402({ error: 'insufficient_xu', balance: 0, cost: 1 }));
    const r = await chargeAndSend('hello');
    expect(r).toMatchObject({ status: 'error' });
    expect((r as { message: string }).message).toMatch(/không đủ/);
    expect(wallet.balance).toBe(0);
  });

  test('số dư cục bộ không đủ: không gọi máy chủ', async () => {
    seedWallet({ balance: 0 });
    const r = await chargeAndSend('hello');
    expect(r).toMatchObject({ status: 'error' });
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  test('máy chủ lỗi (không phải 402): báo lỗi chung, số dư giữ nguyên', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { context: { status: 502, json: async () => ({}) } } });
    expect(await chargeAndSend('hello')).toMatchObject({ status: 'error' });
    expect(wallet.balance).toBe(50);
  });
});
