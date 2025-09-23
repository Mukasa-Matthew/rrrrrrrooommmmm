'use client';

import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

interface PaymentsSummary { total_collected: number; total_outstanding: number }

export default function OutstandingPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<PaymentsSummary>({ total_collected: 0, total_outstanding: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        const res = await fetch('http://localhost:5000/api/payments/summary', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (res.ok && data.success) setSummary({ total_collected: Number(data.data.total_collected || 0), total_outstanding: Number(data.data.total_outstanding || 0) });
      } catch (e: any) {
        setError(e?.message || 'Failed to load summary');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0 }).format(amount);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Outstanding Balances</h1>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {loading ? <p className="text-sm text-gray-600">Loading...</p> : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Collections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.total_collected)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Outstanding</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(summary.total_outstanding)}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

