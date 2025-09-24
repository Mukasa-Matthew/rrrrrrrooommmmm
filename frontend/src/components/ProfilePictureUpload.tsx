'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { API_CONFIG, getAuthHeadersForUpload } from '@/config/api';

interface ProfilePictureUploadProps {
  onUploadSuccess?: (profilePicture: string) => void;
  onUploadError?: (error: string) => void;
}

export const ProfilePictureUpload: React.FC<ProfilePictureUploadProps> = ({
  onUploadSuccess,
  onUploadError
}) => {
  const { user, updateUser } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setError(null);
    setSuccess(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await fetch(API_CONFIG.ENDPOINTS.AUTH.UPLOAD_PROFILE_PICTURE, {
        method: 'POST',
        headers: getAuthHeadersForUpload(),
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Profile picture uploaded successfully!');
        setPreview(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        // Update user context with new profile picture
        if (updateUser) {
          updateUser({ ...user, profile_picture: data.profilePicture });
        }
        
        onUploadSuccess?.(data.profilePicture);
      } else {
        setError(data.message || 'Failed to upload profile picture');
        onUploadError?.(data.message || 'Failed to upload profile picture');
      }
    } catch (error) {
      const errorMessage = 'Failed to upload profile picture. Please try again.';
      setError(errorMessage);
      onUploadError?.(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePreview = () => {
    setPreview(null);
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteProfilePicture = async () => {
    if (!user?.profile_picture) return;

    setIsUploading(true);
    setError(null);

    try {
      const response = await fetch(API_CONFIG.ENDPOINTS.AUTH.DELETE_PROFILE_PICTURE, {
        method: 'DELETE',
        headers: getAuthHeadersForUpload()
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Profile picture removed successfully!');
        
        // Update user context to remove profile picture
        if (updateUser) {
          updateUser({ ...user, profile_picture: null });
        }
      } else {
        setError(data.message || 'Failed to remove profile picture');
      }
    } catch (error) {
      setError('Failed to remove profile picture. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Profile Picture
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Profile Picture */}
        {user?.profile_picture && (
          <div className="flex flex-col items-center space-y-2">
            <div className="relative">
              <img
                src={`${API_CONFIG.BASE_URL}${user.profile_picture}`}
                alt="Current profile"
                className="w-24 h-24 rounded-full object-cover border-2 border-slate-200"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteProfilePicture}
              disabled={isUploading}
              className="text-red-600 hover:text-red-700"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
              Remove Current Picture
            </Button>
          </div>
        )}

        {/* Upload Section */}
        <div className="space-y-4">
          <div className="flex flex-col items-center space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Choose New Picture
            </Button>
          </div>

          {/* Preview */}
          {preview && (
            <div className="flex flex-col items-center space-y-2">
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-24 h-24 rounded-full object-cover border-2 border-slate-200"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                  onClick={handleRemovePreview}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Picture
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Messages */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Instructions */}
        <div className="text-sm text-slate-600 space-y-1">
          <p>• Supported formats: JPEG, PNG, GIF, WebP</p>
          <p>• Maximum file size: 5MB</p>
          <p>• Recommended size: 400x400 pixels</p>
        </div>
      </CardContent>
    </Card>
  );
};
