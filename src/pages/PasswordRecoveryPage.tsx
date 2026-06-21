import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Mail, Shield, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const emailSchema = z.object({
  email: z.string().email('Invalid email format').max(255, 'Email too long')
});

const PasswordRecoveryPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate email
      const validation = emailSchema.safeParse({ email });
      if (!validation.success) {
        toast({
          title: "Validation Error",
          description: validation.error.errors[0].message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Call security operations edge function
      const { data, error } = await supabase.functions.invoke('security-operations', {
        body: {
          operation: 'request_password_reset',
          email: email.trim()
        }
      });

      if (error) throw error;

      setSent(true);
      toast({
        title: "Recovery Email Sent",
        description: "Check your inbox for password reset instructions.",
      });
    } catch (error: any) {
      console.error('Password recovery error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send recovery email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <Card className="bg-card/40 backdrop-blur-xl border-border/50">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Check Your Email
              </h2>
              <p className="text-muted-foreground mb-6">
                We've sent password reset instructions to <strong>{email}</strong>
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Click the link in the email to reset your password. The link expires in 1 hour.
              </p>
              <Button
                onClick={() => navigate('/auth')}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Sign In
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-4 border border-white/20">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Reset Your Password
          </h1>
          <p className="text-muted-foreground">
            Enter your email to receive reset instructions
          </p>
        </div>

        <Card className="bg-card/40 backdrop-blur-xl border-border/50">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-input/50 border-border/50 pl-10"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => navigate('/auth')}
                className="text-foreground/80 hover:text-foreground text-sm font-medium inline-flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 p-4 bg-primary/10 backdrop-blur-xl border border-primary/20 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Security Note:</strong> Password reset links expire after 1 hour for your security. If you don't receive an email, check your spam folder.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default PasswordRecoveryPage;