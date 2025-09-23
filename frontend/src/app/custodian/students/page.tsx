'use client';

import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Student {
  id: number;
  name: string;
  email: string;
  created_at: string;
  gender?: string;
  date_of_birth?: string;
  access_number?: string;
  phone?: string;
  whatsapp?: string;
  emergency_contact?: string;
  room?: {
    room_number?: string | number;
    room_type?: string;
    price?: number | string;
  };
}

export default function CustodianStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ 
    name: '', email: '',
    gender: '', date_of_birth: '', access_number: '',
    phone: '', whatsapp: '', emergency_contact: '',
    room_id: '', initial_payment_amount: '', currency: 'UGX'
  });
  const [saving, setSaving] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<Array<{ id: number; room_number: string; price: number | string; room_type?: string }>>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'register'>('list');
  const [paymentsSummary, setPaymentsSummary] = useState<{ total_collected: number; total_outstanding: number } | null>(null);
  const [studentPaymentsMap, setStudentPaymentsMap] = useState<Record<number, { expected: number | null; paid: number; balance: number | null; status: string }>>({});

  useEffect(() => {
    fetchStudents();
    fetchAvailableRooms();
    fetchPaymentsSummary();
    const id = setInterval(() => {
      fetchStudents();
      fetchPaymentsSummary();
    }, 10000);
    return () => clearInterval(id);
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/students', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load students');
      setStudents(data.data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const deleteStudent = async (id: number) => {
    if (!confirm('Delete this student?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/students/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to delete student');
      await fetchStudents();
    } catch (e: any) {
      setError(e?.message || 'Failed to delete student');
    }
  };

  const registerStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch('http://localhost:5000/api/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ 
          name: form.name.trim(), email: form.email.trim(),
          gender: form.gender || undefined,
          date_of_birth: form.date_of_birth || undefined,
          access_number: form.access_number || undefined,
          phone: form.phone || undefined,
          whatsapp: form.whatsapp || undefined,
          emergency_contact: form.emergency_contact || undefined,
          room_id: form.room_id ? Number(form.room_id) : undefined,
          initial_payment_amount: form.initial_payment_amount ? Number(form.initial_payment_amount) : undefined,
          currency: form.currency || 'UGX'
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to register student');
      setForm({ 
        name: '', email: '', gender: '', date_of_birth: '', access_number: '',
        phone: '', whatsapp: '', emergency_contact: '', room_id: '', initial_payment_amount: '', currency: 'UGX'
      });
      await fetchStudents();
      await fetchAvailableRooms();
    } catch (e: any) {
      setError(e?.message || 'Failed to register student');
    } finally {
      setSaving(false);
    }
  };

  const fetchAvailableRooms = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/rooms/available', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      const data = await res.json();
      if (res.ok && data.success) setAvailableRooms(data.data);
    } catch {}
  };

  const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';
  const formatPrice = (value?: number | string) => {
    if (value === undefined || value === null || value === '') return '-';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return String(value);
    return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0 }).format(num);
  };

  const fetchPaymentsSummary = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/payments/summary', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const map: Record<number, { expected: number | null; paid: number; balance: number | null; status: string }> = {};
        for (const s of (data.data.students || [])) {
          map[s.user_id] = {
            expected: s.expected === null ? null : Number(s.expected),
            paid: Number(s.paid || 0),
            balance: s.balance === null ? null : Number(s.balance),
            status: s.status || 'unassigned'
          };
        }
        setStudentPaymentsMap(map);
      }
    } catch {}
  };

  const normalizedIncludes = (value: any, query: string) => String(value || '').toLowerCase().includes(query.toLowerCase());
  const filteredStudents = students.filter(s => {
    if (!search.trim()) return true;
    return (
      normalizedIncludes(s.name, search) ||
      normalizedIncludes(s.email, search) ||
      normalizedIncludes(s.access_number, search) ||
      normalizedIncludes(s.phone, search) ||
      normalizedIncludes(s.whatsapp, search)
    );
  });

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Students</h1>
            <p className="text-gray-600 mt-1">Manage student registrations and records</p>
          </div>
          <div className="flex gap-2">
            <Button variant={activeTab === 'list' ? 'default' : 'outline'} onClick={() => setActiveTab('list')}>List</Button>
            <Button variant={activeTab === 'register' ? 'default' : 'outline'} onClick={() => setActiveTab('register')}>Register</Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Student Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Total students registered</p>
              <div className="text-2xl font-bold">{students.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Available Rooms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Rooms ready for assignment</p>
              <div className="text-2xl font-bold">{availableRooms.length}</div>
            </CardContent>
          </Card>
        </div>

        {activeTab === 'register' && (
          <Card>
            <CardHeader>
              <CardTitle>Register Student</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => {
                if (!form.room_id) {
                  e.preventDefault();
                  alert('Room assignment is required.');
                  return;
                }
                if (!form.initial_payment_amount) {
                  e.preventDefault();
                  alert('Booking fee is required.');
                  return;
                }
                registerStudent(e);
              }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Name</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  </div>
                  <div>
                    <Label>Gender</Label>
                    <Input value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} placeholder="Male / Female" />
                  </div>
                  <div>
                    <Label>Date of Birth</Label>
                    <Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
                  </div>
                  <div>
                    <Label>Access Number</Label>
                    <Input value={form.access_number} onChange={(e) => setForm({ ...form, access_number: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="07xx xxx xxx" />
                  </div>
                  <div>
                    <Label>WhatsApp</Label>
                    <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="07xx xxx xxx" />
                  </div>
                  <div>
                    <Label>Emergency Contact</Label>
                    <Input value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} placeholder="Name • 07xx xxx xxx" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Label>Assign Room *</Label>
                    <select className="border rounded h-10 px-2 w-full" value={form.room_id} onChange={(e) => setForm({ ...form, room_id: e.target.value })}>
                      <option value="">-- Select available room --</option>
                      {availableRooms.map(r => (
                        <option key={r.id} value={r.id}>
                          Room {r.room_number} • {typeof r.price === 'string' ? r.price : r.price.toFixed(2)} UGX
                          {r.room_type ? ` • ${r.room_type}` : ''}
                          {(r as any).description ? ` • ${(r as any).description}` : ''}
                        </option>
                      ))}
                    </select>
                    {availableRooms.length === 0 && (
                      <p className="text-sm text-red-600 mt-1">No available rooms. Contact admin to register rooms.</p>
                    )}
                  </div>
                  <div>
                    <Label>Booking Fee *</Label>
                    <div className="flex gap-2">
                      <Input required type="number" step="0.01" value={form.initial_payment_amount} onChange={(e) => setForm({ ...form, initial_payment_amount: e.target.value })} />
                      <Input className="w-24" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
                    </div>
                  </div>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}
                <div>
                  <Button type="submit" disabled={saving}>{saving ? 'Registering...' : 'Register Student'}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {activeTab === 'list' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <CardTitle>Students List</CardTitle>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Input
                    placeholder="Search by name, email, access number, phone..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full md:w-96"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading...</p>
              ) : (
                <div className="overflow-x-auto">
                  {filteredStudents.length === 0 ? (
                    <p className="text-sm text-gray-600">No students found.</p>
                  ) : (
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left border-b">
                          <th className="py-2 pr-4">Name</th>
                          <th className="py-2 pr-4">Email</th>
                          <th className="py-2 pr-4">Access #</th>
                          <th className="py-2 pr-4">Phone</th>
                          <th className="py-2 pr-4">Room</th>
                          <th className="py-2 pr-4">Paid</th>
                          <th className="py-2 pr-4">Balance</th>
                          <th className="py-2 pr-4">Status</th>
                          <th className="py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((s) => (
                          <tr key={s.id} className="border-b hover:bg-gray-50">
                            <td className="py-2 pr-4 font-medium"><a className="text-blue-600 hover:underline" href={`/custodian/students/${s.id}`}>{s.name}</a></td>
                            <td className="py-2 pr-4 text-gray-600">{s.email}</td>
                            <td className="py-2 pr-4">{s.access_number || '-'}</td>
                            <td className="py-2 pr-4">{s.phone || '-'}</td>
                            <td className="py-2 pr-4">
                              {s.room?.room_number ? `Room ${s.room.room_number}` : '-'}
                              {s.room?.room_type ? ` • ${s.room.room_type}` : ''}
                            </td>
                            <td className="py-2 pr-4">{formatPrice(studentPaymentsMap[s.id]?.paid)}</td>
                            <td className="py-2 pr-4">{studentPaymentsMap[s.id]?.balance !== null && studentPaymentsMap[s.id]?.balance !== undefined ? formatPrice(studentPaymentsMap[s.id]?.balance!) : '-'}</td>
                            <td className="py-2 pr-4 capitalize">{studentPaymentsMap[s.id]?.status || '-'}</td>
                            <td className="py-2">
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => window.location.href = `/custodian/students/${s.id}`}>View</Button>
                                <Button size="sm" onClick={async () => {
                                  const amountStr = prompt('Enter payment amount (UGX)');
                                  if (!amountStr) return;
                                  const amount = parseFloat(amountStr);
                                  if (isNaN(amount) || amount <= 0) return alert('Invalid amount');
                                  try {
                                    const res = await fetch('http://localhost:5000/api/payments', {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                                      },
                                      body: JSON.stringify({ user_id: s.id, amount, currency: 'UGX', purpose: 'instalment' })
                                    });
                                    const data = await res.json();
                                    if (!res.ok || !data.success) throw new Error(data.message || 'Failed to record payment');
                                    await fetchPaymentsSummary();
                                    alert('Payment recorded');
                                  } catch (e: any) {
                                    alert(e?.message || 'Failed to record payment');
                                  }
                                }}>Record Payment</Button>
                                <Button variant="outline" size="sm" onClick={async () => {
                                  const bal = studentPaymentsMap[s.id]?.balance;
                                  if (bal === null || bal === undefined) return alert('No balance to clear (no room assigned)');
                                  if (bal <= 0) return alert('This student has no outstanding balance.');
                                  if (!confirm(`Clear remaining balance of ${formatPrice(bal)} for ${s.name}?`)) return;
                                  try {
                                    const res = await fetch('http://localhost:5000/api/payments', {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                                      },
                                      body: JSON.stringify({ user_id: s.id, amount: bal, currency: 'UGX', purpose: 'balance_clearance' })
                                    });
                                    const data = await res.json();
                                    if (!res.ok || !data.success) throw new Error(data.message || 'Failed to record payment');
                                    await fetchPaymentsSummary();
                                    alert('Balance cleared');
                                  } catch (e: any) {
                                    alert(e?.message || 'Failed to clear balance');
                                  }
                                }}>Clear Balance</Button>
                                <Button variant="destructive" size="sm" onClick={() => deleteStudent(s.id)}>Delete</Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}




















