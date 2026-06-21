import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2, FileJson, RefreshCw } from "lucide-react";

export const AIAuditPanel = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [auditData, setAuditData] = useState<any>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string>("");

  const requestAudit = async (analyze: boolean = false) => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast({
          title: "Authentication Required",
          description: "You must be logged in as admin",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(
        `https://gpxuuydvlnuajqkroobp.supabase.co/functions/v1/request-ai-audit`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ analyze })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Request failed');
      }

      const result = await response.json();
      setJobId(result.job_id);
      setJobStatus('PENDING');
      
      toast({
        title: "Job Queued",
        description: `Analysis queued successfully (ID: ${result.job_id.slice(0, 8)}...)`,
      });

      // Start polling for job completion
      pollJobStatus(result.job_id);

    } catch (error: any) {
      console.error('Audit request error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to request audit",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const pollJobStatus = async (id: string) => {
    const maxAttempts = 60;
    let attempts = 0;

    const poll = setInterval(async () => {
      attempts++;
      
      try {
        const { data: job } = await supabase
          .from('job_queue')
          .select('status')
          .eq('id', id)
          .single();

        if (job) {
          setJobStatus(job.status);

          if (job.status === 'COMPLETED') {
            clearInterval(poll);
            await fetchJobReport(id);
            toast({
              title: "Analysis Complete",
              description: "Your audit report is ready",
            });
          } else if (job.status === 'FAILED') {
            clearInterval(poll);
            toast({
              title: "Analysis Failed",
              description: "The audit job encountered an error",
              variant: "destructive",
            });
          }
        }

        if (attempts >= maxAttempts) {
          clearInterval(poll);
          toast({
            title: "Polling Timeout",
            description: "Check status manually",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 1000);
  };

  const fetchJobReport = async (id: string) => {
    try {
      const { data: report } = await supabase
        .from('audit_reports')
        .select('report_data')
        .eq('job_id', id)
        .single();

      if (report?.report_data) {
        const reportData = report.report_data as any;
        setAuditData(reportData.auditData);
        setAiAnalysis(reportData.aiAnalysis || "");
      }
    } catch (error) {
      console.error('Error fetching report:', error);
    }
  };


  return (
    <Card className="p-6 bg-background/60 backdrop-blur-xl border-primary/20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-400" />
            AI Platform Audit (Async Queue)
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Jobs run asynchronously, powered by Gemini 3 Pro
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => requestAudit(false)}
            disabled={loading}
            className="gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileJson className="w-4 h-4" />}
            Raw Data
          </Button>
          
          <Button
            onClick={() => requestAudit(true)}
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Run AI Analysis
              </>
            )}
          </Button>
        </div>
      </div>

      {jobId && (
        <div className="mb-4 p-4 bg-muted/50 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium">Job Status</div>
              <div className="text-xs text-muted-foreground">
                ID: {jobId.slice(0, 8)}...
              </div>
            </div>
            <div className={`px-3 py-1 rounded text-sm font-medium ${
              jobStatus === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
              jobStatus === 'FAILED' ? 'bg-red-500/20 text-red-400' :
              jobStatus === 'RUNNING' ? 'bg-blue-500/20 text-blue-400' :
              'bg-yellow-500/20 text-yellow-400'
            }`}>
              {jobStatus === 'RUNNING' && <RefreshCw className="w-3 h-3 inline mr-1 animate-spin" />}
              {jobStatus}
            </div>
          </div>
        </div>
      )}

      {(auditData || aiAnalysis) ? (
        <Tabs defaultValue={aiAnalysis ? "analysis" : "data"} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="analysis" disabled={!aiAnalysis}>
              AI Analysis
            </TabsTrigger>
            <TabsTrigger value="data" disabled={!auditData}>
              Audit Data
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analysis" className="mt-4">
            {aiAnalysis && (
              <ScrollArea className="h-[600px] w-full rounded-lg border border-primary/20 bg-black/40 p-4">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {aiAnalysis}
                </pre>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="data" className="mt-4">
            {auditData && (
              <ScrollArea className="h-[600px] w-full rounded-lg border border-primary/20 bg-black/40 p-4">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {JSON.stringify(auditData, null, 2)}
                </pre>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="mb-2">Request an audit to begin analysis</p>
          <p className="text-xs">• Jobs run asynchronously to prevent timeouts</p>
          <p className="text-xs">• Status updates automatically via polling</p>
          <p className="text-xs">• Results persist in database</p>
        </div>
      )}
    </Card>
  );
};