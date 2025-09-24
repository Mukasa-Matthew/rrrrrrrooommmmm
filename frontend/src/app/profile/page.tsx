'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/layout/Layout';
import { ProfilePictureUpload } from '@/components/ProfilePictureUpload';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Mail, Building, Shield, Calendar, Key, UserCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        username: (user as any).username || '',
      });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    if (!user) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('auth_token');
      
      // Prepare update data - exclude email for non-super admins
      const updateData: any = {
        name: formData.name,
        username: formData.username
      };
      
      // Only include email if user is super admin
      if (user.role === 'super_admin') {
        updateData.email = formData.email;
      }

      const response = await fetch('http://localhost:5000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      if (data.success) {
        updateUser({ ...user, ...data.user });
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setIsEditing(false);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to update profile' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        username: (user as any).username || '',
      });
    }
    setIsEditing(false);
    setMessage(null);
  };

  const handleChangePassword = async () => {
    if (!user) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters long' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:5000/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Password changed successfully!' });
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setIsChangingPassword(false);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to change password' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to change password. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelPasswordChange = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setIsChangingPassword(false);
    setMessage(null);
  };

  const getRoleLabel = () => {
    switch (user?.role) {
      case 'super_admin':
        return 'Super Admin';
      case 'hostel_admin':
        return 'Hostel Admin';
      case 'custodian':
        return 'Custodian';
      case 'tenant':
        return 'Tenant';
      case 'user':
        return 'User';
      default:
        return 'Unknown';
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-slate-600">Loading profile...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Profile Settings</h1>
            <p className="text-slate-600 mt-1">Manage your account information and preferences</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Profile Picture Section */}
          <div className="lg:col-span-1">
            <ProfilePictureUpload
              onUploadSuccess={(profilePicture) => {
                setMessage({ type: 'success', text: 'Profile picture updated successfully!' });
              }}
              onUploadError={(error) => {
                setMessage({ type: 'error', text: error });
              }}
            />
          </div>

          {/* Profile Information Section */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {message && (
                  <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                    <AlertDescription>{message.text}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className={!isEditing ? 'bg-slate-50' : ''}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled={true}
                      className="bg-slate-50 cursor-not-allowed"
                    />
                    {user?.role !== 'super_admin' && (
                      <p className="text-xs text-slate-500">
                        Email cannot be changed. Contact your super admin if needed.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className={!isEditing ? 'bg-slate-50' : ''}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)}>
                      Edit Profile
                    </Button>
                  ) : (
                    <>
                      <Button onClick={handleSave} disabled={isLoading}>
                        {isLoading ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button variant="outline" onClick={handleCancel}>
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Password Change Section */}
        <div className="max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Change Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isChangingPassword ? (
                <Button 
                  variant="outline" 
                  onClick={() => setIsChangingPassword(true)}
                  className="w-full"
                >
                  <Key className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      placeholder="Enter current password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      placeholder="Enter new password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      placeholder="Confirm new password"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={handleChangePassword} 
                      disabled={isLoading}
                      className="flex-1"
                    >
                      {isLoading ? 'Changing...' : 'Change Password'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleCancelPasswordChange}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
