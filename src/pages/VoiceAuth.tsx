// Voice Citadel Authentication Page
import React from 'react';
import { VoiceCitadelLogin } from '@/components/auth/VoiceCitadelLogin';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const VoiceAuth: React.FC = () => {
  const navigate = useNavigate();

  const handleAuthSuccess = (userId: string) => {
    toast.success('Identity Verified', {
      description: 'Welcome to the Citadel',
    });
    // Navigate to dashboard after successful auth
    setTimeout(() => navigate('/'), 2000);
  };

  const handleAuthError = (error: string) => {
    toast.error('Authentication Failed', {
      description: error,
    });
  };

  return (
    <VoiceCitadelLogin
      onAuthSuccess={handleAuthSuccess}
      onAuthError={handleAuthError}
    />
  );
};

export default VoiceAuth;
