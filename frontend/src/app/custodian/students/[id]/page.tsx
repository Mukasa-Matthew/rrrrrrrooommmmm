'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface StudentSummary {
  user_id: number;
  name: string;
  email: string;
  access_number?: string;
  phone?: string;
  whatsapp?: string;
  room_number?: string;
  room_type?: string;
  expected: number | null;
  paid: number;
  balance: number | null;
  status: string;
}

interface PaymentRow {
  id: number;
  amount: number;
  currency: string;
  purpose?: string;
  created_at: string;
}

export default function CustodianStudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = Number(params?.id);

  const [summary, setSummary] = useState<StudentSummary | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const formatCurrency = (amount: number, currency: string = 'UGX') => new Intl.NumberFormat('en-UG', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount);
  const formatDateTime = (value: string) => new Date(value).toLocaleString();

  const fetchData = async () => {
    setError('');
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token || !studentId) return;

      // Fetch summary from payments summary endpoint
      const sumRes = await fetch('http://localhost:5000/api/payments/summary', { headers: { Authorization: `Bearer ${token}` } });
      const sumData = await sumRes.json();
      if (sumRes.ok && sumData.success) {
        const s = (sumData.data.students || []).find((x: any) => x.user_id === studentId) || null;
        setSummary(s);
      }

      // Fetch payments for this student
      const payUrl = new URL('http://localhost:5000/api/payments', window.location.origin);
      payUrl.searchParams.set('user_id', String(studentId));
      const payRes = await fetch(payUrl.toString(), { headers: { Authorization: `Bearer ${token}` } });
      const payData = await payRes.json();
      if (payRes.ok && payData.success) setPayments(payData.data || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load student');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const recordPayment = async () => {
    const amountStr = prompt('Enter payment amount (UGX)');
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return alert('Invalid amount');
    try {
      const res = await fetch('http://localhost:5000/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
        body: JSON.stringify({ user_id: studentId, amount, currency: 'UGX', purpose: 'instalment' })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to record payment');
      await fetchData();
      alert('Payment recorded');
    } catch (e: any) {
      alert(e?.message || 'Failed to record payment');
    }
  };

  const clearBalance = async () => {
    const bal = Number(summary?.balance || 0);
    if (!bal || bal <= 0) return alert('No outstanding balance');
    if (!confirm(`Clear remaining balance of ${formatCurrency(bal)}?`)) return;
    try {
      const res = await fetch('http://localhost:5000/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
        body: JSON.stringify({ user_id: studentId, amount: bal, currency: 'UGX', purpose: 'balance_clearance' })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to clear balance');
      await fetchData();
      alert('Balance cleared');
    } catch (e: any) {
      alert(e?.message || 'Failed to clear balance');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6">Loading...</div>
      </Layout>
    );
  }

  if (!summary) {
    return (
      <Layout>
        <div className="p-6">
          <p className="text-sm text-gray-600">Student not found.</p>
          <Button className="mt-3" onClick={() => router.push('/custodian/students')}>Back to Students</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <Button variant="outline" onClick={() => router.back()}>Back</Button>

        <Card>
          <CardHeader>
            <CardTitle>Student Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Name</p>
                <p className="font-medium">{summary.name}</p>
              </div>
              <div>
                <p className="text-gray-500">Email</p>
                <p className="font-medium">{summary.email}</p>
              </div>
              <div>
                <p className="text-gray-500">Access Number</p>
                <p className="font-medium">{summary.access_number || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Phone</p>
                <p className="font-medium">{summary.phone || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">WhatsApp</p>
                <p className="font-medium">{summary.whatsapp || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Room</p>
                <p className="font-medium">{summary.room_number ? `Room ${summary.room_number}` : '-'}{summary.room_type ? ` • ${summary.room_type}` : ''}</p>
              </div>
              <div>
                <p className="text-gray-500">Expected</p>
                <p className="font-medium">{summary.expected === null ? '-' : formatCurrency(Number(summary.expected))}</p>
              </div>
              <div>
                <p className="text-gray-500">Paid</p>
                <p className="font-medium">{formatCurrency(Number(summary.paid))}</p>
              </div>
              <div>
                <p className="text-gray-500">Balance</p>
                <p className="font-medium">{summary.balance === null ? '-' : formatCurrency(Number(summary.balance))}</p>
              </div>
              <div>
                <p className="text-gray-500">Status</p>
                <p className="font-medium capitalize">{summary.status}</p>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <Button onClick={recordPayment}>Record Payment</Button>
              <Button variant="outline" onClick={clearBalance}>Clear Balance</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-sm text-gray-600">No payments yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4">Amount</th>
                      <th className="py-2 pr-4">Purpose</th>
                      <th className="py-2 pr-4">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 pr-4">{formatCurrency(Number(p.amount || 0), (p as any).currency || 'UGX')}</td>
                        <td className="py-2 pr-4 capitalize">{p.purpose || '-'}</td>
                        <td className="py-2 pr-4">{formatDateTime(p.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

