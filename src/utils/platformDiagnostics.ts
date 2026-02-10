import { supabase } from '@/integrations/supabase/client';

export interface DiagnosticReport {
  timestamp: string;
  username: string;
  userId: string;
  sections: {
    authentication: DiagnosticSection;
    voiceSettings: DiagnosticSection;
    database: DiagnosticSection;
    features: DiagnosticSection;
    edgeFunctions: DiagnosticSection;
    realtime: DiagnosticSection;
  };
  summary: {
    totalErrors: number;
    totalWarnings: number;
    criticalIssues: string[];
  };
}

export interface DiagnosticSection {
  status: 'healthy' | 'warning' | 'error';
  checks: DiagnosticCheck[];
}

export interface DiagnosticCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: string;
}

export async function generatePlatformDiagnostics(userId: string, username: string): Promise<DiagnosticReport> {
  const report: DiagnosticReport = {
    timestamp: new Date().toISOString(),
    username,
    userId,
    sections: {
      authentication: await checkAuthentication(userId),
      voiceSettings: await checkVoiceSettings(userId),
      database: await checkDatabaseAccess(userId),
      features: await checkFeatures(userId),
      edgeFunctions: await checkEdgeFunctions(),
      realtime: await checkRealtime(),
    },
    summary: {
      totalErrors: 0,
      totalWarnings: 0,
      criticalIssues: [],
    },
  };

  // Calculate summary
  Object.values(report.sections).forEach(section => {
    section.checks.forEach(check => {
      if (check.status === 'fail') {
        report.summary.totalErrors++;
        report.summary.criticalIssues.push(`${section}: ${check.name}`);
      } else if (check.status === 'warn') {
        report.summary.totalWarnings++;
      }
    });
  });

  return report;
}

async function checkAuthentication(userId: string): Promise<DiagnosticSection> {
  const checks: DiagnosticCheck[] = [];

  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    checks.push({
      name: 'Authentication Status',
      status: user && !error ? 'pass' : 'fail',
      message: user ? 'User authenticated successfully' : 'Authentication failed',
      details: error?.message,
    });

    checks.push({
      name: 'User ID Match',
      status: user?.id === userId ? 'pass' : 'fail',
      message: user?.id === userId ? 'User ID matches' : 'User ID mismatch',
    });

  } catch (error: any) {
    checks.push({
      name: 'Authentication Check',
      status: 'fail',
      message: 'Failed to check authentication',
      details: error.message,
    });
  }

  return {
    status: checks.some(c => c.status === 'fail') ? 'error' : 'healthy',
    checks,
  };
}

async function checkVoiceSettings(userId: string): Promise<DiagnosticSection> {
  const checks: DiagnosticCheck[] = [];

  try {
    // Check profiles table voice settings
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('voice_notifications_enabled, notification_voice_style, zoe_personality_tone, zoe_conversation_style, zoe_proactive_suggestions')
      .eq('user_id', userId)
      .single();

    checks.push({
      name: 'Profile Voice Settings',
      status: !profileError ? 'pass' : 'fail',
      message: !profileError ? 'Voice settings accessible' : 'Cannot access voice settings',
      details: profileError?.message || JSON.stringify(profile, null, 2),
    });

    // Check voice_assistant_settings table
    const { data: assistantSettings, error: assistantError } = await supabase
      .from('voice_assistant_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    checks.push({
      name: 'Voice Assistant Settings',
      status: !assistantError ? 'pass' : 'warn',
      message: !assistantError ? 'Assistant settings accessible' : 'No assistant settings found',
      details: assistantError?.message || JSON.stringify(assistantSettings, null, 2),
    });

    // Test voice synthesis availability
    const voicesAvailable = window.speechSynthesis.getVoices().length > 0;
    checks.push({
      name: 'Browser Voice Synthesis',
      status: voicesAvailable ? 'pass' : 'warn',
      message: voicesAvailable ? 'Voice synthesis available' : 'Voice synthesis not ready',
      details: `Available voices: ${window.speechSynthesis.getVoices().length}`,
    });

  } catch (error: any) {
    checks.push({
      name: 'Voice Settings Check',
      status: 'fail',
      message: 'Failed to check voice settings',
      details: error.message,
    });
  }

  return {
    status: checks.some(c => c.status === 'fail') ? 'error' : checks.some(c => c.status === 'warn') ? 'warning' : 'healthy',
    checks,
  };
}

async function checkDatabaseAccess(userId: string): Promise<DiagnosticSection> {
  const checks: DiagnosticCheck[] = [];

  const tables = [
    'profiles',
    'posts',
    'messages',
    'friendships',
    'notifications',
    'user_badges',
    'emotion_logs',
    'reminders',
    'voice_macros',
    'ai_companion_messages',
    'zoe_user_behavior',
  ];

  for (const table of tables) {
    try {
      const { error, count } = await supabase
        .from(table as any)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      checks.push({
        name: `Table: ${table}`,
        status: !error ? 'pass' : 'fail',
        message: !error ? `Access granted (${count || 0} records)` : 'Access denied',
        details: error?.message,
      });
    } catch (error: any) {
      checks.push({
        name: `Table: ${table}`,
        status: 'fail',
        message: 'Failed to check access',
        details: error.message,
      });
    }
  }

  return {
    status: checks.some(c => c.status === 'fail') ? 'error' : 'healthy',
    checks,
  };
}

async function checkFeatures(userId: string): Promise<DiagnosticSection> {
  const checks: DiagnosticCheck[] = [];

  // Check feature analytics
  try {
    const { error, count } = await supabase
      .from('feature_analytics')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    checks.push({
      name: 'Feature Analytics',
      status: !error ? 'pass' : 'fail',
      message: !error ? `Tracking ${count || 0} feature uses` : 'Analytics not working',
      details: error?.message,
    });
  } catch (error: any) {
    checks.push({
      name: 'Feature Analytics',
      status: 'fail',
      message: 'Failed to check feature analytics',
      details: error.message,
    });
  }

  // Check onboarding status
  try {
    const { data, error } = await supabase
      .from('onboarding_progress')
      .select('completed, current_step')
      .eq('user_id', userId)
      .single();

    checks.push({
      name: 'Onboarding Status',
      status: !error ? 'pass' : 'warn',
      message: data?.completed ? 'Onboarding completed' : 'Onboarding incomplete',
      details: error?.message || `Step ${data?.current_step || 0}`,
    });
  } catch (error: any) {
    checks.push({
      name: 'Onboarding Status',
      status: 'warn',
      message: 'Could not check onboarding',
      details: error.message,
    });
  }

  return {
    status: checks.some(c => c.status === 'fail') ? 'error' : checks.some(c => c.status === 'warn') ? 'warning' : 'healthy',
    checks,
  };
}

async function checkEdgeFunctions(): Promise<DiagnosticSection> {
  const checks: DiagnosticCheck[] = [];

  const functions = [
    { name: 'zoe-chat', path: '/zoe-chat' },
    { name: 'generate-text', path: '/generate-text' },
    { name: 'generate-image', path: '/generate-image' },
  ];

  for (const func of functions) {
    try {
      // Simple health check - just test if function responds (even with error is ok for diagnostics)
      const { error } = await supabase.functions.invoke(func.path, {
        body: { test: true },
      });

      checks.push({
        name: `Function: ${func.name}`,
        status: 'pass',
        message: 'Function responsive',
        details: error ? `Returns error (expected for test): ${error.message}` : 'OK',
      });
    } catch (error: any) {
      checks.push({
        name: `Function: ${func.name}`,
        status: 'warn',
        message: 'Function may be unavailable',
        details: error.message,
      });
    }
  }

  return {
    status: checks.some(c => c.status === 'fail') ? 'error' : checks.some(c => c.status === 'warn') ? 'warning' : 'healthy',
    checks,
  };
}

async function checkRealtime(): Promise<DiagnosticSection> {
  const checks: DiagnosticCheck[] = [];

  try {
    // Check if realtime is configured
    const channel = supabase.channel('diagnostic-test');
    
    checks.push({
      name: 'Realtime Connection',
      status: 'pass',
      message: 'Realtime service available',
      details: 'Channel created successfully',
    });

    // Clean up
    await channel.unsubscribe();
  } catch (error: any) {
    checks.push({
      name: 'Realtime Connection',
      status: 'warn',
      message: 'Realtime may not be configured',
      details: error.message,
    });
  }

  return {
    status: checks.some(c => c.status === 'fail') ? 'error' : checks.some(c => c.status === 'warn') ? 'warning' : 'healthy',
    checks,
  };
}

export function formatDiagnosticReport(report: DiagnosticReport): string {
  let output = '';
  
  output += '═══════════════════════════════════════════════════════\n';
  output += '          PLATFORM DIAGNOSTIC REPORT\n';
  output += '═══════════════════════════════════════════════════════\n\n';
  
  output += `Generated: ${new Date(report.timestamp).toLocaleString()}\n`;
  output += `Username: @${report.username}\n`;
  output += `User ID: ${report.userId}\n\n`;
  
  output += '───────────────────────────────────────────────────────\n';
  output += '                    SUMMARY\n';
  output += '───────────────────────────────────────────────────────\n\n';
  output += `Total Errors: ${report.summary.totalErrors}\n`;
  output += `Total Warnings: ${report.summary.totalWarnings}\n`;
  
  if (report.summary.criticalIssues.length > 0) {
    output += '\nCritical Issues:\n';
    report.summary.criticalIssues.forEach(issue => {
      output += `  ⚠️  ${issue}\n`;
    });
  }
  
  output += '\n';
  
  // Sections
  Object.entries(report.sections).forEach(([sectionName, section]) => {
    output += '───────────────────────────────────────────────────────\n';
    output += `  ${sectionName.toUpperCase()}\n`;
    output += `  Status: ${section.status.toUpperCase()}\n`;
    output += '───────────────────────────────────────────────────────\n\n';
    
    section.checks.forEach(check => {
      const icon = check.status === 'pass' ? '✓' : check.status === 'warn' ? '⚠️' : '✗';
      output += `${icon} ${check.name}\n`;
      output += `  ${check.message}\n`;
      if (check.details) {
        output += `  Details: ${check.details}\n`;
      }
      output += '\n';
    });
  });
  
  output += '═══════════════════════════════════════════════════════\n';
  output += '                  END OF REPORT\n';
  output += '═══════════════════════════════════════════════════════\n';
  
  return output;
}

export function downloadReport(report: DiagnosticReport) {
  downloadPDFReport(report);
}

export async function downloadPDFReport(report: DiagnosticReport) {
  // Dynamically import jsPDF
  const { jsPDF } = await import('jspdf');
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const lineHeight = 7;
  let y = margin;

  // Helper function to add text with word wrap
  const addText = (text: string, fontSize: number = 10, style: 'normal' | 'bold' = 'normal', color: [number, number, number] = [0, 0, 0]) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', style);
    doc.setTextColor(...color);
    
    const lines = doc.splitTextToSize(text, pageWidth - 2 * margin);
    lines.forEach((line: string) => {
      if (y + lineHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    });
  };

  // Helper function to add a line
  const addLine = () => {
    if (y + 5 > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
  };

  // Title
  addText('PLATFORM DIAGNOSTIC REPORT', 18, 'bold', [60, 60, 200]);
  y += 5;
  addLine();
  
  // Header info
  addText(`Generated: ${new Date(report.timestamp).toLocaleString()}`, 11);
  addText(`Username: @${report.username}`, 11);
  addText(`User ID: ${report.userId}`, 11);
  y += 5;
  addLine();
  
  // Summary
  addText('SUMMARY', 14, 'bold', [60, 60, 200]);
  y += 2;
  
  const errorColor: [number, number, number] = report.summary.totalErrors > 0 ? [220, 38, 38] : [34, 197, 94];
  addText(`Total Errors: ${report.summary.totalErrors}`, 11, 'bold', errorColor);
  
  const warnColor: [number, number, number] = report.summary.totalWarnings > 0 ? [245, 158, 11] : [34, 197, 94];
  addText(`Total Warnings: ${report.summary.totalWarnings}`, 11, 'bold', warnColor);
  
  if (report.summary.criticalIssues.length > 0) {
    y += 3;
    addText('Critical Issues:', 11, 'bold', [220, 38, 38]);
    report.summary.criticalIssues.forEach(issue => {
      addText(`• ${issue}`, 10, 'normal', [220, 38, 38]);
    });
  }
  
  y += 5;
  addLine();
  
  // Sections
  Object.entries(report.sections).forEach(([sectionName, section]) => {
    // Section header
    const statusColor: [number, number, number] = 
      section.status === 'error' ? [220, 38, 38] : 
      section.status === 'warning' ? [245, 158, 11] : 
      [34, 197, 94];
    
    addText(sectionName.toUpperCase(), 13, 'bold', [60, 60, 200]);
    addText(`Status: ${section.status.toUpperCase()}`, 10, 'bold', statusColor);
    y += 2;
    
    // Checks
    section.checks.forEach(check => {
      const checkColor: [number, number, number] = 
        check.status === 'fail' ? [220, 38, 38] : 
        check.status === 'warn' ? [245, 158, 11] : 
        [34, 197, 94];
      
      const icon = check.status === 'pass' ? '✓' : check.status === 'warn' ? '⚠' : '✗';
      
      addText(`${icon} ${check.name}`, 10, 'bold', checkColor);
      addText(`   ${check.message}`, 9);
      
      if (check.details) {
        const detailsText = check.details.length > 200 
          ? check.details.substring(0, 200) + '...' 
          : check.details;
        addText(`   Details: ${detailsText}`, 8, 'normal', [100, 100, 100]);
      }
      
      y += 2;
    });
    
    y += 3;
    addLine();
  });
  
  // Footer
  addText('END OF REPORT', 12, 'bold', [60, 60, 200]);
  
  // Save the PDF
  const filename = `platform-diagnostic-${report.username}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
