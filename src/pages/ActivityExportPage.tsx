import React from 'react';
import { ComprehensiveActivityExport } from '@/components/ComprehensiveActivityExport';
import { AdminNoticePanel } from '@/components/AdminNoticePanel';
import { UserActivityDashboard } from '@/components/UserActivityDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Bell, Activity } from 'lucide-react';
import { FeatureAnnouncementWrapper } from '@/components/FeatureAnnouncementWrapper';

const ActivityExportPage = () => {
  return (
    <FeatureAnnouncementWrapper featureId="activity-export">
      <div className="min-h-screen bg-background pb-24">
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Download className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Activity Center</h1>
              <p className="text-muted-foreground">
                Export your data, view activity, and manage notifications
              </p>
            </div>
          </div>

          <Tabs defaultValue="export" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="export" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export
              </TabsTrigger>
              <TabsTrigger value="notices" className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Notices
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="export" className="mt-6">
              <ComprehensiveActivityExport />
            </TabsContent>

            <TabsContent value="notices" className="mt-6">
              <AdminNoticePanel />
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              <UserActivityDashboard />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </FeatureAnnouncementWrapper>
  );
};

export default ActivityExportPage;