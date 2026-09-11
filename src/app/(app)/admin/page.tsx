'use client';

import { useEffect, useState } from 'react';
import { api, post } from '@/lib/fetcher';
import { won } from '@/lib/format';
import { Spinner, Empty, ErrorBox } from '@/components/ui';

type U = {
  id: string; email: string; name: string; role: string;
  cash: number; seedCash: number; createdAt: string;
  _count: { orders: number; holdings: number };
};

export default function AdminPage() {
  const [users, setUsers] = useState<U[] | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');

  const load = () =>
    api<{ users: U[] }>('/api/admin/users')
      .then((r) => setUsers(r.users))
      .catch((e) => { setErr(e.message); setUsers([]); });

  useEffect(() => { load(); }, []);

  async function reset(u: U) {
    if (!confirm(`${u.name}님의 계좌를 초기화합니다.\n보유 종목·주문·자산 기록이 모두 삭제되고 시드머니가 재지급됩니다.\n되돌릴 수 없습니다. 진행할까요?`)) return;
    setErr('');
    setBusy(u.id);
    try {
      await post('/api/admin/reset', { userId: u.id });
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy('');
    }
  }

  if (!users) return <Spinner />;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">관리자</h1>
      <ErrorBox message={err} />

      <section className="card">
        <h2 className="mb-3 font-semibold">참가자 {users.length}명</h2>
        {users.length === 0 ? (
          <Empty>참가자가 없습니다</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-line">
                  <th className="th">이름</th>
                  <th className="th">이메일</th>
                  <th className="th">권한</th>
                  <th className="th text-right">예수금</th>
                  <th className="th text-right">시드머니</th>
                  <th className="th text-right">보유</th>
                  <th className="th text-right">주문</th>
                  <th className="th text-right">관리</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-line/50 last:border-0">
                    <td className="td font-medium">{u.name}</td>
                    <td className="td text-muted">{u.email}</td>
                    <td className="td"><span className="chip">{u.role}</span></td>
                    <td className="td text-right">{won(u.cash)}</td>
                    <td className="td text-right text-muted">{won(u.seedCash)}</td>
                    <td className="td text-right text-muted">{u._count.holdings}</td>
                    <td className="td text-right text-muted">{u._count.orders}</td>
                    <td className="td text-right">
                      <button
                        onClick={() => reset(u)}
                        disabled={busy === u.id}
                        className="btn-ghost !px-2.5 !py-1 !text-xs"
                      >
                        {busy === u.id ? '초기화 중...' : '계좌 초기화'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-muted">
        계좌 초기화는 되돌릴 수 없습니다. 리그를 새로 시작할 때만 사용하세요.
      </p>
    </div>
  );
}
