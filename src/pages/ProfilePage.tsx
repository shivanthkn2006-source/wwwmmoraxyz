import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Settings, Download, Loader2, MessageSquare, Mic } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { toast } from 'sonner';
import ProfileContent from '@/components/ProfileContent';
import VoiceCommandsSettings from '@/components/VoiceCommandsSettings';
import FeedbackCollectionPanel from '@/components/FeedbackCollectionPanel';
import { supabase } from '@/integrations/supabase/client';
import { generatePlatformDiagnostics, downloadReport } from '@/utils/platformDiagnostics';
import { SettingsSearchCommand } from '@/components/SettingsSearchCommand';

const ProfilePage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [username, setUsername] = useState<string>('');

  // Fetch username
  useEffect(() => {
    const fetchUsername = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data) {
        setUsername(data.username);
      }
    };
    
    fetchUsername();
  }, [user]);

  // Check if user needs onboarding
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) return;

      try {
        const { data: progress } = await supabase
          .from('onboarding_progress')
          .select('completed')
          .eq('user_id', user.id)
          .maybeSingle();

        // Show onboarding if not completed
        if (!progress || !progress.completed) {
          setShowOnboarding(true);
        }
      } catch (error) {
        console.error('Error checking onboarding:', error);
      } finally {
        setCheckingOnboarding(false);
      }
    };

    checkOnboardingStatus();
  }, [user]);

  // Listen for voice command to open settings
  React.useEffect(() => {
    const handleOpenSettings = () => {
      setShowSettings(true);
    };
    
    window.addEventListener('open-voice-settings', handleOpenSettings);
    
    return () => {
      window.removeEventListener('open-voice-settings', handleOpenSettings);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Logged out successfully');
      navigate('/auth');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  const handleDownloadReport = async () => {
    if (!user) return;
    
    setGeneratingReport(true);
    try {
      toast.info('Generating diagnostic report...', { duration: 2000 });
      const report = await generatePlatformDiagnostics(user.id, username);
      downloadReport(report);
      toast.success('Diagnostic report downloaded successfully');
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate diagnostic report');
    } finally {
      setGeneratingReport(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-2xl mx-auto">
        {/* Top Header with Settings Search & Actions */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-xl border-b border-border/50 z-50">
          <SettingsSearchCommand 
            onOpenProfileEdit={() => {
              // Trigger profile edit modal in ProfileContent
              const editButton = document.querySelector('[data-profile-edit]') as HTMLElement;
              editButton?.click();
            }}
            onOpenVoiceSettings={() => setShowSettings(true)}
          />
          
          {/* Action Buttons Row */}
          <div className="px-4 pb-3 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/voice-commands')}
              className="gap-2"
              title='Say "Zoe help" anytime to open this'
            >
              <Mic className="w-4 h-4" />
              <span className="text-xs">Voice Commands</span>
            </Button>
            <Sheet open={showFeedback} onOpenChange={setShowFeedback}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-xs">Beta Feedback</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto bg-background/80 backdrop-blur-xl border-l border-border/50">
                <SheetHeader>
                  <SheetTitle className="text-foreground">Beta Testing Feedback</SheetTitle>
                  <SheetDescription className="text-muted-foreground">
                    Share your experience and help us improve
                  </SheetDescription>
                </SheetHeader>
                <FeedbackCollectionPanel />
              </SheetContent>
            </Sheet>
            {username && username.toLowerCase() === 'moksh50' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDownloadReport}
                disabled={generatingReport}
                className="gap-2"
              >
                {generatingReport ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span className="text-xs">Diagnostic Report</span>
              </Button>
            )}
            <Sheet open={showSettings} onOpenChange={setShowSettings}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto bg-background/80 backdrop-blur-xl border-l border-border/50">
                <SheetHeader>
                  <SheetTitle className="text-foreground">Zoe Voice Settings</SheetTitle>
                  <SheetDescription className="text-muted-foreground">
                    Customize Zoe AI companion voice, commands, and behavior
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  <VoiceCommandsSettings />
                </div>
              </SheetContent>
            </Sheet>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <LogOut className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Logout</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to logout? You'll need to sign in again to access your account.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLogout}>
                    Logout
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <ProfileContent />
      </div>
    </div>
  );
};

export default ProfilePage;
