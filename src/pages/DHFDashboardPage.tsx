// ═══════════════════════════════════════════════════════════════════════════════
// DHF DASHBOARD PAGE - Digital Human Fingerprint Management
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import DHFUploadDashboard from '@/components/DHFUploadDashboard';
import NeuralCoreUplink from '@/components/NeuralCoreUplink';
import ZoeMemoryStatusPanel from '@/components/zoe-infinity/ZoeMemoryStatusPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Upload, Database } from 'lucide-react';
import PageSeo from '@/components/seo/PageSeo';

const DHFDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('neural');

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageSeo
        title="M'mora DHF — Digital Human Fingerprint & Memory"
        description="Manage your M'mora Digital Human Fingerprint, neural uplink and Zoe persistent memory (sovereign + TencentDB gateway)."
      />
      <div className="container mx-auto py-6 px-4">
        <header className="mb-4">
          <h1 className="text-xl font-semibold text-foreground">M'mora DHF</h1>
          <p className="text-sm text-muted-foreground">
            Digital Human Fingerprint, neural uplink and persistent memory for M'mora.
          </p>
        </header>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-card/50 border border-primary/20">
            <TabsTrigger value="neural" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Brain className="w-4 h-4 mr-2" />
              Neural Uplink
            </TabsTrigger>
            <TabsTrigger value="classic" className="data-[state=active]:bg-accent/20 data-[state=active]:text-accent">
              <Upload className="w-4 h-4 mr-2" />
              Classic Upload
            </TabsTrigger>
            <TabsTrigger value="memory" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Database className="w-4 h-4 mr-2" />
              Memory
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

          <TabsContent value="memory" className="mt-0">
            <ZoeMemoryStatusPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DHFDashboardPage;
