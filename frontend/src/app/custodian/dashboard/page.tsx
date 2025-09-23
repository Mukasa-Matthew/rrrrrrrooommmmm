'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layout } from '@/components/layout/Layout';
import { Users, Building2, DollarSign, TrendingUp } from 'lucide-react';

interface DashboardStats {
  totalStudents: number;
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  totalExpenses: number;
  monthlyExpenses: number;
}

interface PaymentsSummary { total_collected: number; total_outstanding: number }

interface SimpleStudent { id: number; name: string; email: string }

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function CustodianDashboard() {
  const { user, isLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalRooms: 0,
    occupiedRooms: 0,
    availableRooms: 0,
    totalExpenses: 0,
    monthlyExpenses: 0,
  });
  const [payments, setPayments] = useState<PaymentsSummary>({ total_collected: 0, total_outstanding: 0 });
  const [loading, setLoading] = useState(true);
  const [notify, setNotify] = useState({ user_id: '', subject: '', message: '' });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [students, setStudents] = useState<SimpleStudent[]>([]);
  const [studentFilter, setStudentFilter] = useState('');

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      // Fetch students
      const studentsResponse = await fetch('http://localhost:5000/api/students', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const studentsData = await studentsResponse.json();
      const totalStudents = studentsData.success ? studentsData.data.length : 0;
      const list: SimpleStudent[] = (studentsData.data || []).map((s: any) => ({ id: s.id, name: s.name, email: s.email }));
      setStudents(list);

      // Fetch rooms
      const roomsResponse = await fetch('http://localhost:5000/api/rooms', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const roomsData = await roomsResponse.json();
      const rooms = roomsData.success ? roomsData.data : [];
      const totalRooms = rooms.length;
      const occupiedRooms = rooms.filter((r: any) => r.status === 'occupied').length;
      const availableRooms = rooms.filter((r: any) => r.status === 'available').length;

      // Fetch expenses
      const expensesResponse = await fetch('http://localhost:5000/api/expenses', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const expensesData = await expensesResponse.json();
      const expenses = expensesData.success ? expensesData.data : [];
      const totalExpenses = expenses.reduce((sum: number, exp: any) => sum + parseFloat(exp.amount), 0);
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyExpenses = expenses
        .filter((exp: any) => {
          const expDate = new Date(exp.spent_at);
          return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
        })
        .reduce((sum: number, exp: any) => sum + parseFloat(exp.amount), 0);

      // Fetch payments summary
      const payRes = await fetch('http://localhost:5000/api/payments/summary', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payData = await payRes.json();
      const total_collected = payData?.success ? Number(payData.data.total_collected || 0) : 0;
      const total_outstanding = payData?.success ? Number(payData.data.total_outstanding || 0) : 0;

      setStats({ totalStudents, totalRooms, occupiedRooms, availableRooms, totalExpenses, monthlyExpenses });
      setPayments({ total_collected, total_outstanding });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice('');
    setError('');
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('http://localhost:5000/api/students/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          user_id: notify.user_id ? Number(notify.user_id) : undefined,
          subject: notify.subject.trim(),
          message: notify.message.trim(),
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to send');
      setNotice(notify.user_id ? 'Email sent to selected student' : 'Email sent to all students');
      setNotify({ user_id: '', subject: '', message: '' });
      setTimeout(() => setNotice(''), 3000);
    } catch (e: any) {
      setError(e?.message || 'Failed to send');
      setTimeout(() => setError(''), 4000);
    }
  };

  useEffect(() => {
    if (user && !isLoading) {
      fetchStats();
      const interval = setInterval(fetchStats, 30000);
      return () => clearInterval(interval);
    }
  }, [user, isLoading]);

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0 }).format(amount);

  const filteredStudents = students.filter(s => {
    if (!studentFilter.trim()) return true;
    const q = studentFilter.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
  });

  const firstName = (user?.name || '').split(' ')[0] || user?.name || '';
  const greeting = getGreeting();

  return (
    <Layout>
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="wave-emoji text-3xl">👋</span>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{greeting}, {firstName}</h1>
            <p className="text-gray-600 mt-1">Custodian Dashboard</p>
          </div>
        </div>
      </div>

      {/* Main Layout: KPIs + Right Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* KPIs */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Key Metrics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <a href="/custodian/students">
                <Card className="hover:shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalStudents}</div>
                    <p className="text-xs text-muted-foreground">Students registered</p>
                  </CardContent>
                </Card>
              </a>

              <a href="/custodian/transactions">
                <Card className="hover:shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Collections</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(payments.total_collected)}</div>
                    <p className="text-xs text-muted-foreground">Total collected</p>
                  </CardContent>
                </Card>
              </a>

              <a href="/custodian/outstanding">
                <Card className="hover:shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">{formatCurrency(payments.total_outstanding)}</div>
                    <p className="text-xs text-muted-foreground">Balances due</p>
                  </CardContent>
                </Card>
              </a>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Occupancy</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.occupiedRooms}/{stats.totalRooms}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalRooms > 0 ? Math.round((stats.occupiedRooms / stats.totalRooms) * 100) : 0}% rate
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Operations */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Operations</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Available Rooms</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.availableRooms}</div>
                  <p className="text-xs text-muted-foreground">Rooms ready for new students</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">This Month Spend</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats.monthlyExpenses)}</div>
                  <p className="text-xs text-muted-foreground">Current month expenses</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <a href="/custodian/students" className="block text-center bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors">Register Student</a>
              <a href="/custodian/expenses" className="block text-center bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors">Record Expense</a>
              <a href="/custodian/transactions" className="block text-center bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 transition-colors">Transactions</a>
            </div>
          </div>
        </div>

        {/* Communications Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Notify Students</CardTitle>
            </CardHeader>
            <CardContent>
              {notice && <div className="mb-3 p-2 text-green-800 bg-green-50 border border-green-200 text-xs rounded">{notice}</div>}
              {error && <div className="mb-3 p-2 text-red-800 bg-red-50 border border-red-200 text-xs rounded">{error}</div>}
              <form onSubmit={sendNotification} className="space-y-3">
                <div>
                  <label className="text-sm text-gray-600">Search student</label>
                  <input className="border rounded h-9 px-2 w-full" placeholder="Type name or email..." value={studentFilter} onChange={(e) => setStudentFilter(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Select student (or choose All Students)</label>
                  <select className="border rounded h-10 px-2 w-full" value={notify.user_id} onChange={(e) => setNotify({ ...notify, user_id: e.target.value })}>
                    <option value="">All Students</option>
                    {filteredStudents.map(s => (
                      <option key={s.id} value={String(s.id)}>{s.name} ({s.email})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <input className="border rounded h-9 px-2 w-full" placeholder="Subject" value={notify.subject} onChange={(e) => setNotify({ ...notify, subject: e.target.value })} required />
                </div>
                <div>
                  <textarea className="border rounded w-full h-24 p-2" placeholder="Message" value={notify.message} onChange={(e) => setNotify({ ...notify, message: e.target.value })} required />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Send</button>
                  <button type="button" className="px-3 py-2 border rounded" onClick={() => { setNotify({ user_id: '', subject: '', message: '' }); setStudentFilter(''); }}>Clear</button>
                </div>
                <p className="text-xs text-gray-500">Leave selection on "All Students" to email everyone.</p>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalExpenses)}</div>
              <p className="text-xs text-muted-foreground">All-time hostel expenses</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </Layout>
  );
}















