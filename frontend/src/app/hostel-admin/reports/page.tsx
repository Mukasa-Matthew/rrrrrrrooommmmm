'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PieChart from '@/components/charts/PieChart';
import { useAuth } from '@/contexts/AuthContext';

interface HostelOverview {
  hostel_name: string;
  total_rooms: number;
  available_rooms: number;
  occupied_rooms: number;
  occupancy_rate: number;
}

interface ExpensesSummaryItem { category: string; total: number }
interface ExpenseItem { id: number; amount: number; category: string | null }

export default function ReportsPage() {
  const { user } = useAuth();
  const hostelId = user?.hostel_id;

  const [overview, setOverview] = useState<HostelOverview | null>(null);
  const [expenses, setExpenses] = useState<ExpensesSummaryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      if (!hostelId) return;
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        const [oRes, eRes] = await Promise.all([
          fetch(`http://localhost:5000/api/multi-tenant/hostel/${hostelId}/overview`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch('http://localhost:5000/api/expenses/summary', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        const [oData, eData] = await Promise.all([oRes.json(), eRes.json()]);
        if (oRes.ok && oData.success) setOverview(oData.data);

        // Prefer server summary if available
        if (eRes.ok && eData.success && Array.isArray(eData.data?.items) && eData.data.items.length > 0) {
          setExpenses(eData.data.items.map((it: any) => ({ category: it.category, total: Number(it.total || 0) })));
        } else {
          // Fallback: fetch all expenses and aggregate client-side
          const listRes = await fetch('http://localhost:5000/api/expenses', { headers: { Authorization: `Bearer ${token}` } });
          const listData = await listRes.json();
          if (listRes.ok && listData.success && Array.isArray(listData.data)) {
            const items: ExpenseItem[] = listData.data.map((row: any) => ({ id: row.id, amount: Number(row.amount || 0), category: row.category }));
            const map = new Map<string, number>();
            for (const it of items) {
              const key = it.category ?? 'Uncategorized';
              map.set(key, (map.get(key) || 0) + (isFinite(it.amount) ? it.amount : 0));
            }
            setExpenses(Array.from(map.entries()).map(([category, total]) => ({ category, total })));
          } else {
            setExpenses([]);
          }
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load reports');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [hostelId]);

  const occupancyData = useMemo(() => {
    if (!overview) return [] as { name: string; value: number }[];
    const total = Number(overview.total_rooms || 0);
    const occupied = Number(overview.occupied_rooms || 0);
    const available = Math.max(total - occupied, 0);
    return [
      { name: 'Occupied', value: occupied },
      { name: 'Available', value: available }
    ];
  }, [overview]);

  const expenseData = useMemo(() => {
    if (!expenses.length) return [] as { name: string; value: number }[];
    return expenses
      .filter(it => Number(it.total) > 0)
      .map(it => ({ name: it.category, value: Number(it.total) }));
  }, [expenses]);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Financial Reports</h1>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {loading ? <p className="text-sm text-gray-600">Loading...</p> : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Room Occupancy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <PieChart data={occupancyData} colors={["#22c55e", "#e5e7eb"]} />
              </div>
              {overview ? (
                <p className="text-xs text-gray-500 mt-2">
                  {overview.occupied_rooms}/{overview.total_rooms} rooms occupied ({overview.occupancy_rate}%)
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Expenses by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <PieChart data={expenseData} colors={["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"]} />
              </div>
              <div className="text-xs text-gray-500 mt-2">
                {expenses.length ? 'Showing totals by category' : 'No expenses recorded yet'}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
