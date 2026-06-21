import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Storage limits and rules
const CLEANUP_RULES = {
  STORY_MAX_AGE_DAYS: 32,        // Stories older than 32 days get deleted
  ARCHIVE_AGE_DAYS: 50,          // High-res media archived after 50 days for free tier
  STORAGE_WARNING_THRESHOLD: 0.95, // 95% of limit triggers alert
  FREE_TIER_LIMIT_MB: 950,       // ~950MB free tier limit
  STORAGE_BUCKETS: ['stories', 'status', 'avatars', 'uploads', 'soul-codex-media'],
  TEMP_PREFIXES: ['temp_', 'story_', 'status_'],
};

interface CleanupResult {
  deletedFiles: number;
  freedBytes: number;
  archivedFiles: number;
  storageUsedMB: number;
  storagePercentage: number;
  alertSent: boolean;
  errors: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const result: CleanupResult = {
    deletedFiles: 0,
    freedBytes: 0,
    archivedFiles: 0,
    storageUsedMB: 0,
    storagePercentage: 0,
    alertSent: false,
    errors: [],
  };

  try {
    console.log('[Storage Cleaner] Starting cleanup cycle...');
    const now = new Date();
    const storyExpiryDate = new Date(now.getTime() - CLEANUP_RULES.STORY_MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
    const archiveDate = new Date(now.getTime() - CLEANUP_RULES.ARCHIVE_AGE_DAYS * 24 * 60 * 60 * 1000);

    // 1. Calculate current storage usage
    let totalStorageBytes = 0;
    for (const bucket of CLEANUP_RULES.STORAGE_BUCKETS) {
      try {
        const { data: files, error } = await supabase.storage.from(bucket).list('', {
          limit: 10000,
          sortBy: { column: 'created_at', order: 'asc' },
        });

        if (error) {
          console.log(`[Storage Cleaner] Bucket '${bucket}' may not exist: ${error.message}`);
          continue;
        }

        if (files) {
          for (const file of files) {
            if (file.metadata?.size) {
              totalStorageBytes += file.metadata.size;
            }
          }
        }
      } catch (e) {
        console.log(`[Storage Cleaner] Error accessing bucket '${bucket}': ${e}`);
      }
    }

    result.storageUsedMB = Math.round(totalStorageBytes / (1024 * 1024) * 100) / 100;
    result.storagePercentage = Math.round((result.storageUsedMB / CLEANUP_RULES.FREE_TIER_LIMIT_MB) * 100);

    console.log(`[Storage Cleaner] Current storage: ${result.storageUsedMB}MB (${result.storagePercentage}%)`);

    // 2. Clean up old stories and status media (32-day rule)
    for (const bucket of ['stories', 'status']) {
      try {
        const { data: files, error } = await supabase.storage.from(bucket).list('', {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'asc' },
        });

        if (error || !files) continue;

        const filesToDelete: string[] = [];
        for (const file of files) {
          const fileDate = new Date(file.created_at || 0);
          if (fileDate < storyExpiryDate) {
            filesToDelete.push(file.name);
            result.freedBytes += file.metadata?.size || 0;
          }
        }

        if (filesToDelete.length > 0) {
          const { error: deleteError } = await supabase.storage.from(bucket).remove(filesToDelete);
          if (deleteError) {
            result.errors.push(`Failed to delete from ${bucket}: ${deleteError.message}`);
          } else {
            result.deletedFiles += filesToDelete.length;
            console.log(`[Storage Cleaner] Deleted ${filesToDelete.length} files from '${bucket}'`);
          }
        }
      } catch (e) {
        result.errors.push(`Error cleaning ${bucket}: ${String(e)}`);
      }
    }

    // 3. Archive/delete high-res media for free tier users (50-day rule)
    try {
      const { data: freeUsers } = await supabase
        .from('profiles')
        .select('id')
        .or('subscription_tier.is.null,subscription_tier.eq.free');

      if (freeUsers && freeUsers.length > 0) {
        const freeUserIds = new Set(freeUsers.map(u => u.id));

        // Check soul-codex-media bucket for old high-res files
        const { data: mediaFiles } = await supabase.storage.from('soul-codex-media').list('', {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'asc' },
        });

        if (mediaFiles) {
          const filesToArchive: string[] = [];
          for (const file of mediaFiles) {
            const fileDate = new Date(file.created_at || 0);
            // Extract user ID from file path if stored in user folders
            const pathParts = file.name.split('/');
            const userId = pathParts[0];
            
            if (fileDate < archiveDate && freeUserIds.has(userId)) {
              // Check if it's a high-res file (> 500KB)
              if ((file.metadata?.size || 0) > 500 * 1024) {
                filesToArchive.push(file.name);
                result.freedBytes += file.metadata?.size || 0;
              }
            }
          }

          if (filesToArchive.length > 0) {
            const { error: archiveError } = await supabase.storage.from('soul-codex-media').remove(filesToArchive);
            if (archiveError) {
              result.errors.push(`Failed to archive media: ${archiveError.message}`);
            } else {
              result.archivedFiles += filesToArchive.length;
              console.log(`[Storage Cleaner] Archived ${filesToArchive.length} high-res files`);
            }
          }
        }
      }
    } catch (e) {
      result.errors.push(`Error archiving media: ${String(e)}`);
    }

    // 4. Storage warning alert (95% threshold)
    if (result.storagePercentage >= 95) {
      console.log('[Storage Cleaner] CRITICAL: Storage at 95%+ - sending admin alert');
      
      // Get admin users
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin');

      if (admins && admins.length > 0) {
        const notifications = admins.map(admin => ({
          user_id: admin.id,
          type: 'system_alert',
          title: '🚨 CRITICAL: Storage Limit Warning',
          message: `Storage usage is at ${result.storagePercentage}% (${result.storageUsedMB}MB / ${CLEANUP_RULES.FREE_TIER_LIMIT_MB}MB). Immediate action required to prevent service disruption.`,
          priority: 5,
          metadata: {
            alert_type: 'storage_critical',
            storage_used_mb: result.storageUsedMB,
            storage_percentage: result.storagePercentage,
          },
        }));

        const { error: notifyError } = await supabase.from('notifications').insert(notifications);
        if (notifyError) {
          result.errors.push(`Failed to send admin alert: ${notifyError.message}`);
        } else {
          result.alertSent = true;
          console.log('[Storage Cleaner] Admin alert sent successfully');
        }
      }
    }

    // 5. Log cleanup event to behavioral_events for Zoe Core
    await supabase.from('behavioral_events').insert({
      user_id: '00000000-0000-0000-0000-000000000000', // System user
      event_type: 'storage_cleanup_completed',
      event_category: 'system_maintenance',
      metadata: {
        deleted_files: result.deletedFiles,
        freed_bytes: result.freedBytes,
        freed_mb: Math.round(result.freedBytes / (1024 * 1024) * 100) / 100,
        archived_files: result.archivedFiles,
        storage_used_mb: result.storageUsedMB,
        storage_percentage: result.storagePercentage,
        alert_sent: result.alertSent,
        errors_count: result.errors.length,
        timestamp: now.toISOString(),
      },
    });

    console.log('[Storage Cleaner] Cleanup cycle completed:', result);

    return new Response(JSON.stringify({
      success: true,
      ...result,
      freedMB: Math.round(result.freedBytes / (1024 * 1024) * 100) / 100,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Storage Cleaner] Critical error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      ...result,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
