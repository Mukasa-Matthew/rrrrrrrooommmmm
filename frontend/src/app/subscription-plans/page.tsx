'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Layout } from '@/components/layout/Layout';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Calendar, 
  DollarSign, 
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { API_CONFIG, getAuthHeaders } from '@/config/api';

interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  duration_months: number;
  price_per_month: number;
  total_price: number;
  is_active: boolean;
}

export default function SubscriptionPlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration_months: 4,
    price_per_month: 250000
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch(API_CONFIG.ENDPOINTS.SUBSCRIPTION_PLANS.LIST, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setPlans(data.plans);
      } else {
        setError('Failed to fetch subscription plans');
      }
    } catch (err) {
      setError('Failed to fetch subscription plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    if (!formData.name || !formData.description || !formData.duration_months || !formData.price_per_month) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.duration_months < 1) {
      setError('Duration must be at least 1 month');
      return;
    }

    if (formData.price_per_month < 0) {
      setError('Price per month must be 0 or greater');
      return;
    }
    
    try {
      const url = editingPlan 
        ? `${API_CONFIG.ENDPOINTS.SUBSCRIPTION_PLANS.UPDATE}/${editingPlan.id}`
        : API_CONFIG.ENDPOINTS.SUBSCRIPTION_PLANS.CREATE;
      
      const method = editingPlan ? 'PUT' : 'POST';
      
      // Ensure values are properly typed as numbers
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        duration_months: Number(formData.duration_months),
        price_per_month: Number(formData.price_per_month)
      };
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchPlans();
        resetForm();
        setError(null);
      } else {
        setError(data.message || 'Failed to save subscription plan');
      }
    } catch (err) {
      console.error('Error saving subscription plan:', err);
      setError('Failed to save subscription plan. Please check your connection and try again.');
    }
  };

  const handleDelete = async (planId: number) => {
    if (!confirm('Are you sure you want to delete this subscription plan?')) return;
    
    try {
      const response = await fetch(`${API_CONFIG.ENDPOINTS.SUBSCRIPTION_PLANS.DELETE}/${planId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchPlans();
      } else {
        setError(data.message || 'Failed to delete subscription plan');
      }
    } catch (err) {
      setError('Failed to delete subscription plan');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      duration_months: 4,
      price_per_month: 250000
    });
    setShowCreateForm(false);
    setEditingPlan(null);
  };

  const startEdit = (plan: SubscriptionPlan) => {
    setFormData({
      name: plan.name,
      description: plan.description,
      duration_months: plan.duration_months,
      price_per_month: plan.price_per_month
    });
    setEditingPlan(plan);
    setShowCreateForm(true);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(price);
  };

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Subscription Plans</h1>
            <p className="text-slate-600 mt-2">Manage subscription plans for hostels</p>
          </div>
          <Button 
            onClick={() => setShowCreateForm(true)}
            className="gradient-bg hover:opacity-90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Plan
          </Button>
        </div>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Create/Edit Form */}
      {showCreateForm && (
        <Card className="card-hover border-0 shadow-lg bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {editingPlan ? 'Edit Subscription Plan' : 'Create New Subscription Plan'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="name">Plan Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Semester Plan"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="duration_months">Duration (Months)</Label>
                  <Input
                    id="duration_months"
                    type="number"
                    value={formData.duration_months || ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                      setFormData({...formData, duration_months: value});
                    }}
                    min="1"
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe this subscription plan..."
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="price_per_month">Price per Month (UGX)</Label>
                <Input
                  id="price_per_month"
                  type="number"
                  value={formData.price_per_month || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                    setFormData({...formData, price_per_month: value});
                  }}
                  min="0"
                  required
                />
              </div>
              
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm text-slate-600">
                  <strong>Total Price:</strong> {
                    formatPrice(
                      (formData.duration_months || 0) * (formData.price_per_month || 0)
                    )
                  }
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button type="submit" className="gradient-bg hover:opacity-90">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {editingPlan ? 'Update Plan' : 'Create Plan'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Plans Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className="card-hover border-0 shadow-lg bg-white">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <Badge variant="secondary" className="mt-2">
                    {plan.duration_months} {plan.duration_months === 1 ? 'Month' : 'Months'}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startEdit(plan)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(plan.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-600 text-sm">{plan.description}</p>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Per Month:</span>
                  <span className="font-semibold">{formatPrice(plan.price_per_month)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Total Price:</span>
                  <span className="font-bold text-lg text-indigo-600">
                    {formatPrice(plan.total_price)}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Clock className="h-4 w-4" />
                <span>Duration: {plan.duration_months} months</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {plans.length === 0 && (
        <Card className="card-hover border-0 shadow-lg bg-white">
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Subscription Plans</h3>
            <p className="text-slate-600 mb-4">Create your first subscription plan to get started.</p>
            <Button 
              onClick={() => setShowCreateForm(true)}
              className="gradient-bg hover:opacity-90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Plan
            </Button>
          </CardContent>
        </Card>
      )}
      </div>
    </Layout>
  );
}
