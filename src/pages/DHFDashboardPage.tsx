// ═══════════════════════════════════════════════════════════════════════════════
// DHF DASHBOARD PAGE - Digital Human Fingerprint Management
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import DHFUploadDashboard from '@/components/DHFUploadDashboard';
import NeuralCoreUplink from '@/components/NeuralCoreUplink';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Upload } from 'lucide-react';

const DHFDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('neural');

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto py-6 px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-card/50 border border-primary/20">
            <TabsTrigger value="neural" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Brain className="w-4 h-4 mr-2" />
              Neural Uplink
            </TabsTrigger>
            <TabsTrigger value="classic" className="data-[state=active]:bg-accent/20 data-[state=active]:text-accent">
              <Upload className="w-4 h-4 mr-2" />
              Classic Upload
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="neural" className="mt-0">
            <NeuralCoreUplink 
              onUploadComplete={() => {}}
              className="mb-6"
            />
          </TabsContent>
          
          <TabsContent value="classic" className="mt-0">
            <DHFUploadDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DHFDashboardPage;
