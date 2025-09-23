'use client';

import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface StudentWithBalance {
  user_id: number;
  name: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  access_number?: string;
  room_number?: string;
  room_type?: string;
  expected: number | null;
  paid: number;
  balance: number | null;
  status: string;
}

export default function CustodianOutstandingPage() {
  const [studentsWithBalance, setStudentsWithBalance] = useState<StudentWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchOutstandingStudents = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/payments/summary', {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const withBal = (data.data.students || [])
          .filter((x: any) => x.balance !== null && Number(x.balance) > 0)
          .map((x: any) => ({
            user_id: x.user_id,
            name: x.name,
            email: x.email,
            phone: x.phone,
            whatsapp: x.whatsapp,
            access_number: x.access_number,
            room_number: x.room_number,
            room_type: x.room_type,
            expected: x.expected,
            paid: x.paid,
            balance: Number(x.balance),
            status: x.status
          }));
        setStudentsWithBalance(withBal);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutstandingStudents();
  }, []);

  const filteredStudents = studentsWithBalance.filter(s => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(query) ||
      s.email.toLowerCase().includes(query) ||
      s.access_number?.toLowerCase().includes(query) ||
      s.phone?.toLowerCase().includes(query)
    );
  });

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0 }).format(amount);

  const totalOutstanding = filteredStudents.reduce((sum, s) => sum + (s.balance || 0), 0);

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Outstanding Balances</h1>
            <p className="text-gray-600 mt-1">Students with pending payments</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search by name, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-72"
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Students with balances</p>
                <div className="text-2xl font-bold">{filteredStudents.length}</div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total outstanding</p>
                <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalOutstanding)}</div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Average balance</p>
                <div className="text-2xl font-bold">
                  {filteredStudents.length > 0 ? formatCurrency(totalOutstanding / filteredStudents.length) : 'UGX 0'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Students with Outstanding Balances</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading...</p>
            ) : filteredStudents.length === 0 ? (
              <p className="text-sm text-gray-600">No students with outstanding balances.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4">Student</th>
                      <th className="py-2 pr-4">Contact</th>
                      <th className="py-2 pr-4">Room</th>
                      <th className="py-2 pr-4">Expected</th>
                      <th className="py-2 pr-4">Paid</th>
                      <th className="py-2 pr-4">Balance</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map(s => (
                      <tr key={s.user_id} className="border-b hover:bg-gray-50">
                        <td className="py-2 pr-4">
                          <a className="text-blue-600 hover:underline" href={`/custodian/students/${s.user_id}`}>{s.name}</a>
                          <p className="text-xs text-gray-500">{s.email}</p>
                          {s.access_number && <p className="text-xs text-gray-500">#{s.access_number}</p>}
                        </td>
                        <td className="py-2 pr-4">
                          <div>
                            {s.phone && <p className="text-xs">{s.phone}</p>}
                            {s.whatsapp && <p className="text-xs">{s.whatsapp}</p>}
                          </div>
                        </td>
                        <td className="py-2 pr-4">
                          {s.room_number ? (
                            <div>
                              <p className="font-medium">Room {s.room_number}</p>
                              {s.room_type && <p className="text-xs text-gray-500">{s.room_type}</p>}
                            </div>
                          ) : '-'}
                        </td>
                        <td className="py-2 pr-4">{s.expected ? formatCurrency(s.expected) : '-'}</td>
                        <td className="py-2 pr-4">{formatCurrency(s.paid)}</td>
                        <td className="py-2 pr-4 text-orange-700 font-semibold">{formatCurrency(s.balance || 0)}</td>
                        <td className="py-2">
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => window.location.href = `/custodian/students/${s.user_id}`}>View</Button>
                          </div>
                        </td>
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

