export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      achievement_milestones: {
        Row: {
          created_at: string | null
          dismissed: boolean | null
          id: string
          priority: number | null
          progress_percentage: number | null
          reason: string
          suggested_badge_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dismissed?: boolean | null
          id?: string
          priority?: number | null
          progress_percentage?: number | null
          reason: string
          suggested_badge_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          dismissed?: boolean | null
          id?: string
          priority?: number | null
          progress_percentage?: number | null
          reason?: string
          suggested_badge_id?: string
          user_id?: string
        }
        Relationships: []
      }
      achievement_progress: {
        Row: {
          achievement_id: string
          current_progress: number | null
          id: string
          last_updated: string | null
          target_progress: number
          user_id: string
        }
        Insert: {
          achievement_id: string
          current_progress?: number | null
          id?: string
          last_updated?: string | null
          target_progress: number
          user_id: string
        }
        Update: {
          achievement_id?: string
          current_progress?: number | null
          id?: string
          last_updated?: string | null
          target_progress?: number
          user_id?: string
        }
        Relationships: []
      }
      agasthya_scan_sessions: {
        Row: {
          created_at: string | null
          double_lock_verified: boolean | null
          expires_at: string | null
          id: string
          image_path: string | null
          kandam_analyzed: string[] | null
          nadi_leaf_index: string | null
          scan_results: Json | null
          scan_type: string
          user_id: string
          verification_status: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          double_lock_verified?: boolean | null
          expires_at?: string | null
          id?: string
          image_path?: string | null
          kandam_analyzed?: string[] | null
          nadi_leaf_index?: string | null
          scan_results?: Json | null
          scan_type?: string
          user_id: string
          verification_status?: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          double_lock_verified?: boolean | null
          expires_at?: string | null
          id?: string
          image_path?: string | null
          kandam_analyzed?: string[] | null
          nadi_leaf_index?: string | null
          scan_results?: Json | null
          scan_type?: string
          user_id?: string
          verification_status?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      agentic_earnings: {
        Row: {
          created_at: string
          credits_amount: number
          deployment_id: string | null
          earned_at: string
          earned_while_offline: boolean
          earning_type: string
          id: string
          karma_amount: number
          notified: boolean
          source_description: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_amount?: number
          deployment_id?: string | null
          earned_at?: string
          earned_while_offline?: boolean
          earning_type: string
          id?: string
          karma_amount?: number
          notified?: boolean
          source_description?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          credits_amount?: number
          deployment_id?: string | null
          earned_at?: string
          earned_while_offline?: boolean
          earning_type?: string
          id?: string
          karma_amount?: number
          notified?: boolean
          source_description?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agentic_earnings_deployment_id_fkey"
            columns: ["deployment_id"]
            isOneToOne: false
            referencedRelation: "zoe_agent_deployments"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_companion_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          media_type: string | null
          media_url: string | null
          role: string
          user_id: string
          variant: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          role: string
          user_id: string
          variant?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          role?: string
          user_id?: string
          variant?: string
        }
        Relationships: []
      }
      artifact_transfers: {
        Row: {
          artifact_id: string
          credits_exchanged: number | null
          from_user_id: string
          id: string
          to_user_id: string
          transfer_type: string
          transferred_at: string
        }
        Insert: {
          artifact_id: string
          credits_exchanged?: number | null
          from_user_id: string
          id?: string
          to_user_id: string
          transfer_type?: string
          transferred_at?: string
        }
        Update: {
          artifact_id?: string
          credits_exchanged?: number | null
          from_user_id?: string
          id?: string
          to_user_id?: string
          transfer_type?: string
          transferred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artifact_transfers_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "legacy_artifacts"
            referencedColumns: ["id"]
          },
        ]
      }
      atlas_sync_authorizations: {
        Row: {
          authorization_keyword: string
          authorization_statement: string
          compliance_policy_id: string
          created_at: string
          data_point_key: string
          data_point_value: Json
          ecn_snapshot: Json | null
          expires_at: string | null
          id: string
          is_active: boolean
          sync_percentage: number
          tenant_id: string | null
          user_id: string
          verification_method: string
          verified_at: string
        }
        Insert: {
          authorization_keyword: string
          authorization_statement: string
          compliance_policy_id?: string
          created_at?: string
          data_point_key: string
          data_point_value: Json
          ecn_snapshot?: Json | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          sync_percentage: number
          tenant_id?: string | null
          user_id: string
          verification_method: string
          verified_at?: string
        }
        Update: {
          authorization_keyword?: string
          authorization_statement?: string
          compliance_policy_id?: string
          created_at?: string
          data_point_key?: string
          data_point_value?: Json
          ecn_snapshot?: Json | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          sync_percentage?: number
          tenant_id?: string | null
          user_id?: string
          verification_method?: string
          verified_at?: string
        }
        Relationships: []
      }
      audit_reports: {
        Row: {
          generated_at: string | null
          id: string
          job_id: string | null
          report_data: Json
          tenant_id: string | null
        }
        Insert: {
          generated_at?: string | null
          id?: string
          job_id?: string | null
          report_data: Json
          tenant_id?: string | null
        }
        Update: {
          generated_at?: string | null
          id?: string
          job_id?: string | null
          report_data?: Json
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_reports_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      badge_challenges: {
        Row: {
          badge_id: string
          challenge_id: string
          created_at: string | null
          description: string
          difficulty: string
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          required_actions: Json
          reward_points: number
          time_limit_hours: number
        }
        Insert: {
          badge_id: string
          challenge_id: string
          created_at?: string | null
          description: string
          difficulty?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          required_actions?: Json
          reward_points?: number
          time_limit_hours: number
        }
        Update: {
          badge_id?: string
          challenge_id?: string
          created_at?: string | null
          description?: string
          difficulty?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          required_actions?: Json
          reward_points?: number
          time_limit_hours?: number
        }
        Relationships: []
      }
      badge_collections: {
        Row: {
          badge_ids: Json
          bonus_badge_id: string | null
          bonus_points: number | null
          collection_id: string
          collection_name: string
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          theme: string | null
        }
        Insert: {
          badge_ids?: Json
          bonus_badge_id?: string | null
          bonus_points?: number | null
          collection_id: string
          collection_name: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          theme?: string | null
        }
        Update: {
          badge_ids?: Json
          bonus_badge_id?: string | null
          bonus_points?: number | null
          collection_id?: string
          collection_name?: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          theme?: string | null
        }
        Relationships: []
      }
      badge_shares: {
        Row: {
          badge_id: string
          id: string
          message: string | null
          shared_at: string | null
          user_id: string
        }
        Insert: {
          badge_id: string
          id?: string
          message?: string | null
          shared_at?: string | null
          user_id: string
        }
        Update: {
          badge_id?: string
          id?: string
          message?: string | null
          shared_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      behavioral_events: {
        Row: {
          context_snippet: string | null
          created_at: string | null
          dhf_logged: boolean | null
          ecn_processed: boolean | null
          event_category: string
          event_type: string
          id: string
          metadata: Json | null
          sentiment_score: number | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          context_snippet?: string | null
          created_at?: string | null
          dhf_logged?: boolean | null
          ecn_processed?: boolean | null
          event_category: string
          event_type: string
          id?: string
          metadata?: Json | null
          sentiment_score?: number | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          context_snippet?: string | null
          created_at?: string | null
          dhf_logged?: boolean | null
          ecn_processed?: boolean | null
          event_category?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          sentiment_score?: number | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      behavioral_fingerprints: {
        Row: {
          active_hours_pattern: Json | null
          avg_typing_speed: number | null
          click_pattern_hash: string | null
          confidence_threshold: number | null
          created_at: string | null
          face_embedding_hash: string | null
          fingerprint_version: number | null
          id: string
          last_calibrated_at: string | null
          mouse_movement_signature: Json | null
          reaction_time_avg_ms: number | null
          scroll_behavior: Json | null
          session_duration_avg_minutes: number | null
          typing_rhythm_pattern: Json | null
          updated_at: string | null
          user_id: string
          voice_print_hash: string | null
        }
        Insert: {
          active_hours_pattern?: Json | null
          avg_typing_speed?: number | null
          click_pattern_hash?: string | null
          confidence_threshold?: number | null
          created_at?: string | null
          face_embedding_hash?: string | null
          fingerprint_version?: number | null
          id?: string
          last_calibrated_at?: string | null
          mouse_movement_signature?: Json | null
          reaction_time_avg_ms?: number | null
          scroll_behavior?: Json | null
          session_duration_avg_minutes?: number | null
          typing_rhythm_pattern?: Json | null
          updated_at?: string | null
          user_id: string
          voice_print_hash?: string | null
        }
        Update: {
          active_hours_pattern?: Json | null
          avg_typing_speed?: number | null
          click_pattern_hash?: string | null
          confidence_threshold?: number | null
          created_at?: string | null
          face_embedding_hash?: string | null
          fingerprint_version?: number | null
          id?: string
          last_calibrated_at?: string | null
          mouse_movement_signature?: Json | null
          reaction_time_avg_ms?: number | null
          scroll_behavior?: Json | null
          session_duration_avg_minutes?: number | null
          typing_rhythm_pattern?: Json | null
          updated_at?: string | null
          user_id?: string
          voice_print_hash?: string | null
        }
        Relationships: []
      }
      biometric_auth_events: {
        Row: {
          auth_method: string
          confidence_score: number | null
          created_at: string | null
          device_fingerprint: string | null
          failure_reason: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          micro_jitter_detected: boolean | null
          session_token_hash: string | null
          shadow_ai_suspected: boolean | null
          success: boolean
          user_id: string | null
        }
        Insert: {
          auth_method: string
          confidence_score?: number | null
          created_at?: string | null
          device_fingerprint?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          micro_jitter_detected?: boolean | null
          session_token_hash?: string | null
          shadow_ai_suspected?: boolean | null
          success: boolean
          user_id?: string | null
        }
        Update: {
          auth_method?: string
          confidence_score?: number | null
          created_at?: string | null
          device_fingerprint?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          micro_jitter_detected?: boolean | null
          session_token_hash?: string | null
          shadow_ai_suspected?: boolean | null
          success?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      brand_accounts: {
        Row: {
          brand_category: string | null
          brand_logo_url: string | null
          brand_name: string
          budget_remaining: number | null
          contact_email: string | null
          created_at: string | null
          id: string
          is_verified: boolean | null
          merchant_user_id: string | null
          notification_webhook: string | null
          updated_at: string | null
        }
        Insert: {
          brand_category?: string | null
          brand_logo_url?: string | null
          brand_name: string
          budget_remaining?: number | null
          contact_email?: string | null
          created_at?: string | null
          id?: string
          is_verified?: boolean | null
          merchant_user_id?: string | null
          notification_webhook?: string | null
          updated_at?: string | null
        }
        Update: {
          brand_category?: string | null
          brand_logo_url?: string | null
          brand_name?: string
          budget_remaining?: number | null
          contact_email?: string | null
          created_at?: string | null
          id?: string
          is_verified?: boolean | null
          merchant_user_id?: string | null
          notification_webhook?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      brand_campaigns: {
        Row: {
          brand_account_id: string | null
          budget_spent: number | null
          budget_total: number | null
          campaign_name: string
          created_at: string
          currency: string | null
          current_claims: number | null
          description: string | null
          end_time: string
          geofence_center_lat: number
          geofence_center_lng: number
          geofence_radius_meters: number
          id: string
          max_claims: number | null
          merchant_user_id: string
          reward_amount: number
          reward_type: string
          start_time: string
          status: string
          target_tags: string[] | null
          updated_at: string
        }
        Insert: {
          brand_account_id?: string | null
          budget_spent?: number | null
          budget_total?: number | null
          campaign_name: string
          created_at?: string
          currency?: string | null
          current_claims?: number | null
          description?: string | null
          end_time: string
          geofence_center_lat: number
          geofence_center_lng: number
          geofence_radius_meters?: number
          id?: string
          max_claims?: number | null
          merchant_user_id: string
          reward_amount?: number
          reward_type?: string
          start_time?: string
          status?: string
          target_tags?: string[] | null
          updated_at?: string
        }
        Update: {
          brand_account_id?: string | null
          budget_spent?: number | null
          budget_total?: number | null
          campaign_name?: string
          created_at?: string
          currency?: string | null
          current_claims?: number | null
          description?: string | null
          end_time?: string
          geofence_center_lat?: number
          geofence_center_lng?: number
          geofence_radius_meters?: number
          id?: string
          max_claims?: number | null
          merchant_user_id?: string
          reward_amount?: number
          reward_type?: string
          start_time?: string
          status?: string
          target_tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_campaigns_brand_account_id_fkey"
            columns: ["brand_account_id"]
            isOneToOne: false
            referencedRelation: "brand_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_deals: {
        Row: {
          brand_logo_url: string | null
          brand_name: string
          category: string
          created_at: string | null
          description: string | null
          discount_text: string | null
          id: string
          is_online: boolean | null
          is_premium: boolean | null
          location_lat: number | null
          location_lng: number | null
          store_name: string | null
          subcategory: string | null
          target_user_tiers: string[] | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          brand_logo_url?: string | null
          brand_name: string
          category: string
          created_at?: string | null
          description?: string | null
          discount_text?: string | null
          id?: string
          is_online?: boolean | null
          is_premium?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          store_name?: string | null
          subcategory?: string | null
          target_user_tiers?: string[] | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          brand_logo_url?: string | null
          brand_name?: string
          category?: string
          created_at?: string | null
          description?: string | null
          discount_text?: string | null
          id?: string
          is_online?: boolean | null
          is_premium?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          store_name?: string | null
          subcategory?: string | null
          target_user_tiers?: string[] | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      brand_sponsorship_alerts: {
        Row: {
          brand_category: string | null
          brand_name: string
          claimed_at: string | null
          claimed_by_brand_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          location_name: string | null
          payout_amount: number | null
          pin_id: string | null
          sponsorship_score: number
          status: string | null
          user_id: string
        }
        Insert: {
          brand_category?: string | null
          brand_name: string
          claimed_at?: string | null
          claimed_by_brand_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          location_name?: string | null
          payout_amount?: number | null
          pin_id?: string | null
          sponsorship_score: number
          status?: string | null
          user_id: string
        }
        Update: {
          brand_category?: string | null
          brand_name?: string
          claimed_at?: string | null
          claimed_by_brand_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          location_name?: string | null
          payout_amount?: number | null
          pin_id?: string | null
          sponsorship_score?: number
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_sponsorship_alerts_pin_id_fkey"
            columns: ["pin_id"]
            isOneToOne: false
            referencedRelation: "selfie_city_pins"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_claims: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          paid_at: string | null
          pin_id: string | null
          reward_earned: number | null
          status: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          paid_at?: string | null
          pin_id?: string | null
          reward_earned?: number | null
          status?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          paid_at?: string | null
          pin_id?: string | null
          reward_earned?: number | null
          status?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_claims_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "brand_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_claims_pin_id_fkey"
            columns: ["pin_id"]
            isOneToOne: false
            referencedRelation: "selfie_city_pins"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_seasons: {
        Row: {
          bonus_multiplier: number | null
          created_at: string | null
          description: string | null
          end_date: string
          id: string
          is_active: boolean | null
          season_name: string
          season_type: string | null
          start_date: string
          theme: string | null
        }
        Insert: {
          bonus_multiplier?: number | null
          created_at?: string | null
          description?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          season_name: string
          season_type?: string | null
          start_date: string
          theme?: string | null
        }
        Update: {
          bonus_multiplier?: number | null
          created_at?: string | null
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          season_name?: string
          season_type?: string | null
          start_date?: string
          theme?: string | null
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      cortical_stack_memories: {
        Row: {
          content: string
          created_at: string
          emotional_context: Json | null
          id: string
          is_breakthrough: boolean | null
          role: string
          sentiment_score: number | null
          session_id: string | null
          summary: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          emotional_context?: Json | null
          id?: string
          is_breakthrough?: boolean | null
          role?: string
          sentiment_score?: number | null
          session_id?: string | null
          summary?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          emotional_context?: Json | null
          id?: string
          is_breakthrough?: boolean | null
          role?: string
          sentiment_score?: number | null
          session_id?: string | null
          summary?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_pulse_scores: {
        Row: {
          avg_typing_speed_wpm: number | null
          context_switches: number | null
          created_at: string | null
          deep_work_minutes: number | null
          id: string
          overall_pulse_score: number | null
          productivity_score: number | null
          pulse_date: string
          session_interruptions: number | null
          stress_score: number | null
          tasks_completed: number | null
          typing_speed_variance: number | null
          user_id: string
          voice_tone_score: number | null
          vr_movement_erratic_count: number | null
        }
        Insert: {
          avg_typing_speed_wpm?: number | null
          context_switches?: number | null
          created_at?: string | null
          deep_work_minutes?: number | null
          id?: string
          overall_pulse_score?: number | null
          productivity_score?: number | null
          pulse_date?: string
          session_interruptions?: number | null
          stress_score?: number | null
          tasks_completed?: number | null
          typing_speed_variance?: number | null
          user_id: string
          voice_tone_score?: number | null
          vr_movement_erratic_count?: number | null
        }
        Update: {
          avg_typing_speed_wpm?: number | null
          context_switches?: number | null
          created_at?: string | null
          deep_work_minutes?: number | null
          id?: string
          overall_pulse_score?: number | null
          productivity_score?: number | null
          pulse_date?: string
          session_interruptions?: number | null
          stress_score?: number | null
          tasks_completed?: number | null
          typing_speed_variance?: number | null
          user_id?: string
          voice_tone_score?: number | null
          vr_movement_erratic_count?: number | null
        }
        Relationships: []
      }
      dhf_active_construct: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          avatar_enabled: boolean | null
          biological_cease_confirmed: boolean | null
          can_access_finances: boolean | null
          can_access_smart_home: boolean | null
          can_guide_via_gps: boolean | null
          can_make_recommendations: boolean | null
          can_send_messages: boolean | null
          cease_confirmation_date: string | null
          created_at: string
          executor_keys: Json | null
          id: string
          interaction_summary: Json | null
          is_active: boolean | null
          last_interaction_at: string | null
          memory_access_depth: string | null
          required_confirmations: number | null
          response_delay_ms: number | null
          simulation_fidelity: string | null
          total_interactions: number | null
          uncertainty_acknowledgment: boolean | null
          updated_at: string
          user_id: string
          voice_enabled: boolean | null
          vr_sanctuary_enabled: boolean | null
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          avatar_enabled?: boolean | null
          biological_cease_confirmed?: boolean | null
          can_access_finances?: boolean | null
          can_access_smart_home?: boolean | null
          can_guide_via_gps?: boolean | null
          can_make_recommendations?: boolean | null
          can_send_messages?: boolean | null
          cease_confirmation_date?: string | null
          created_at?: string
          executor_keys?: Json | null
          id?: string
          interaction_summary?: Json | null
          is_active?: boolean | null
          last_interaction_at?: string | null
          memory_access_depth?: string | null
          required_confirmations?: number | null
          response_delay_ms?: number | null
          simulation_fidelity?: string | null
          total_interactions?: number | null
          uncertainty_acknowledgment?: boolean | null
          updated_at?: string
          user_id: string
          voice_enabled?: boolean | null
          vr_sanctuary_enabled?: boolean | null
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          avatar_enabled?: boolean | null
          biological_cease_confirmed?: boolean | null
          can_access_finances?: boolean | null
          can_access_smart_home?: boolean | null
          can_guide_via_gps?: boolean | null
          can_make_recommendations?: boolean | null
          can_send_messages?: boolean | null
          cease_confirmation_date?: string | null
          created_at?: string
          executor_keys?: Json | null
          id?: string
          interaction_summary?: Json | null
          is_active?: boolean | null
          last_interaction_at?: string | null
          memory_access_depth?: string | null
          required_confirmations?: number | null
          response_delay_ms?: number | null
          simulation_fidelity?: string | null
          total_interactions?: number | null
          uncertainty_acknowledgment?: boolean | null
          updated_at?: string
          user_id?: string
          voice_enabled?: boolean | null
          vr_sanctuary_enabled?: boolean | null
        }
        Relationships: []
      }
      dhf_asset_logs: {
        Row: {
          content_summary: string | null
          created_at: string | null
          data_type: string
          dhf_stack_hash: string
          extracted_entities: Json | null
          file_name: string | null
          file_size_bytes: number | null
          file_url: string
          id: string
          processing_status: string | null
          sensitivity_level: string | null
          tenant_id: string | null
          updated_at: string | null
          upload_timestamp: string
          user_id: string
          veto_keywords: string[] | null
        }
        Insert: {
          content_summary?: string | null
          created_at?: string | null
          data_type: string
          dhf_stack_hash: string
          extracted_entities?: Json | null
          file_name?: string | null
          file_size_bytes?: number | null
          file_url: string
          id?: string
          processing_status?: string | null
          sensitivity_level?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          upload_timestamp?: string
          user_id: string
          veto_keywords?: string[] | null
        }
        Update: {
          content_summary?: string | null
          created_at?: string | null
          data_type?: string
          dhf_stack_hash?: string
          extracted_entities?: Json | null
          file_name?: string | null
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          processing_status?: string | null
          sensitivity_level?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          upload_timestamp?: string
          user_id?: string
          veto_keywords?: string[] | null
        }
        Relationships: []
      }
      dhf_ghost_interactions: {
        Row: {
          construct_id: string | null
          created_at: string
          emotional_context: Json | null
          felt_authentic: boolean | null
          ghost_response: string
          id: string
          interactor_id: string | null
          interactor_satisfaction: number | null
          memories_referenced: Json | null
          question: string
          relationship_persona_used: string | null
          resonance_score: number | null
          user_id: string
        }
        Insert: {
          construct_id?: string | null
          created_at?: string
          emotional_context?: Json | null
          felt_authentic?: boolean | null
          ghost_response: string
          id?: string
          interactor_id?: string | null
          interactor_satisfaction?: number | null
          memories_referenced?: Json | null
          question: string
          relationship_persona_used?: string | null
          resonance_score?: number | null
          user_id: string
        }
        Update: {
          construct_id?: string | null
          created_at?: string
          emotional_context?: Json | null
          felt_authentic?: boolean | null
          ghost_response?: string
          id?: string
          interactor_id?: string | null
          interactor_satisfaction?: number | null
          memories_referenced?: Json | null
          question?: string
          relationship_persona_used?: string | null
          resonance_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dhf_ghost_interactions_construct_id_fkey"
            columns: ["construct_id"]
            isOneToOne: false
            referencedRelation: "dhf_active_construct"
            referencedColumns: ["id"]
          },
        ]
      }
      dhf_heartbeats: {
        Row: {
          app_version: string | null
          device_signature: string | null
          id: string
          metadata: Json | null
          timestamp: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          device_signature?: string | null
          id?: string
          metadata?: Json | null
          timestamp?: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          device_signature?: string | null
          id?: string
          metadata?: Json | null
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      dhf_learning_history: {
        Row: {
          behavioral_shifts: Json | null
          cognitive_patterns: Json | null
          created_at: string | null
          dhf_model_version: string | null
          emotional_trends: Json | null
          execution_count: number | null
          id: string
          last_refinement_at: string | null
          refinement_notes: string | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          behavioral_shifts?: Json | null
          cognitive_patterns?: Json | null
          created_at?: string | null
          dhf_model_version?: string | null
          emotional_trends?: Json | null
          execution_count?: number | null
          id?: string
          last_refinement_at?: string | null
          refinement_notes?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          behavioral_shifts?: Json | null
          cognitive_patterns?: Json | null
          created_at?: string | null
          dhf_model_version?: string | null
          emotional_trends?: Json | null
          execution_count?: number | null
          id?: string
          last_refinement_at?: string | null
          refinement_notes?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      dhf_lockdown_events: {
        Row: {
          affected_services: Json | null
          auto_release_at: string | null
          id: string
          initiated_at: string | null
          initiated_by: string | null
          is_active: boolean | null
          lockdown_type: string
          reason: string
          release_reason: string | null
          released_at: string | null
          released_by: string | null
        }
        Insert: {
          affected_services?: Json | null
          auto_release_at?: string | null
          id?: string
          initiated_at?: string | null
          initiated_by?: string | null
          is_active?: boolean | null
          lockdown_type: string
          reason: string
          release_reason?: string | null
          released_at?: string | null
          released_by?: string | null
        }
        Update: {
          affected_services?: Json | null
          auto_release_at?: string | null
          id?: string
          initiated_at?: string | null
          initiated_by?: string | null
          is_active?: boolean | null
          lockdown_type?: string
          reason?: string
          release_reason?: string | null
          released_at?: string | null
          released_by?: string | null
        }
        Relationships: []
      }
      dhf_phoenix_profile: {
        Row: {
          belief_system: Json | null
          consciousness_hash: string | null
          core_memories: Json | null
          created_at: string | null
          decision_patterns: Json | null
          defining_moments: Json | null
          emotional_baseline: Json | null
          id: string
          last_sync_at: string | null
          legacy_auto_reply: boolean | null
          legacy_mode_enabled: boolean | null
          legacy_permissions: Json | null
          mirror_tests_passed: number | null
          model_version: string | null
          resonance_verified: boolean | null
          speech_patterns: Json | null
          sync_score: number | null
          tone_profile: Json | null
          total_data_points: number | null
          training_progress: number | null
          updated_at: string | null
          user_id: string
          verification_timestamp: string | null
          vocabulary_signature: Json | null
          voice_characteristics: Json | null
        }
        Insert: {
          belief_system?: Json | null
          consciousness_hash?: string | null
          core_memories?: Json | null
          created_at?: string | null
          decision_patterns?: Json | null
          defining_moments?: Json | null
          emotional_baseline?: Json | null
          id?: string
          last_sync_at?: string | null
          legacy_auto_reply?: boolean | null
          legacy_mode_enabled?: boolean | null
          legacy_permissions?: Json | null
          mirror_tests_passed?: number | null
          model_version?: string | null
          resonance_verified?: boolean | null
          speech_patterns?: Json | null
          sync_score?: number | null
          tone_profile?: Json | null
          total_data_points?: number | null
          training_progress?: number | null
          updated_at?: string | null
          user_id: string
          verification_timestamp?: string | null
          vocabulary_signature?: Json | null
          voice_characteristics?: Json | null
        }
        Update: {
          belief_system?: Json | null
          consciousness_hash?: string | null
          core_memories?: Json | null
          created_at?: string | null
          decision_patterns?: Json | null
          defining_moments?: Json | null
          emotional_baseline?: Json | null
          id?: string
          last_sync_at?: string | null
          legacy_auto_reply?: boolean | null
          legacy_mode_enabled?: boolean | null
          legacy_permissions?: Json | null
          mirror_tests_passed?: number | null
          model_version?: string | null
          resonance_verified?: boolean | null
          speech_patterns?: Json | null
          sync_score?: number | null
          tone_profile?: Json | null
          total_data_points?: number | null
          training_progress?: number | null
          updated_at?: string | null
          user_id?: string
          verification_timestamp?: string | null
          vocabulary_signature?: Json | null
          voice_characteristics?: Json | null
        }
        Relationships: []
      }
      dhf_relationship_matrix: {
        Row: {
          avoided_topics: string[] | null
          can_activate_ghost: boolean | null
          codex_id: string | null
          common_topics: string[] | null
          conflict_history: Json | null
          contact_identifier: string
          created_at: string
          emotional_openness: number | null
          formality_level: number | null
          ghost_response_level: string | null
          humor_frequency: number | null
          id: string
          inside_jokes: Json | null
          persona_style: Json | null
          pet_names: string[] | null
          relationship_label: string | null
          relationship_type: string
          support_patterns: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avoided_topics?: string[] | null
          can_activate_ghost?: boolean | null
          codex_id?: string | null
          common_topics?: string[] | null
          conflict_history?: Json | null
          contact_identifier: string
          created_at?: string
          emotional_openness?: number | null
          formality_level?: number | null
          ghost_response_level?: string | null
          humor_frequency?: number | null
          id?: string
          inside_jokes?: Json | null
          persona_style?: Json | null
          pet_names?: string[] | null
          relationship_label?: string | null
          relationship_type: string
          support_patterns?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avoided_topics?: string[] | null
          can_activate_ghost?: boolean | null
          codex_id?: string | null
          common_topics?: string[] | null
          conflict_history?: Json | null
          contact_identifier?: string
          created_at?: string
          emotional_openness?: number | null
          formality_level?: number | null
          ghost_response_level?: string | null
          humor_frequency?: number | null
          id?: string
          inside_jokes?: Json | null
          persona_style?: Json | null
          pet_names?: string[] | null
          relationship_label?: string | null
          relationship_type?: string
          support_patterns?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dhf_relationship_matrix_codex_id_fkey"
            columns: ["codex_id"]
            isOneToOne: false
            referencedRelation: "dhf_soul_codex"
            referencedColumns: ["id"]
          },
        ]
      }
      dhf_soul_codex: {
        Row: {
          belief_anchors: Json | null
          codex_version: string | null
          communication_preference: string | null
          completion_percentage: number | null
          conflict_resolution: string | null
          core_values: string[] | null
          created_at: string
          data_points_collected: number | null
          decision_making_style: string | null
          emotional_expressiveness: number | null
          energy_cycles: Json | null
          ethical_framework: string | null
          formative_memories: Json | null
          genesis_completed: boolean | null
          humor_style: string | null
          id: string
          is_complete: boolean | null
          last_harvest_at: string | null
          micro_expressions: Json | null
          peak_creativity_hours: Json | null
          peak_experiences: Json | null
          sentence_complexity: number | null
          sleep_wake_pattern: string | null
          stress_response: string | null
          trauma_markers: Json | null
          typing_rhythm_signature: Json | null
          updated_at: string
          user_id: string
          vocabulary_tier: string | null
          voice_characteristics: Json | null
          voice_latent_space: Json | null
          voice_preference: string | null
        }
        Insert: {
          belief_anchors?: Json | null
          codex_version?: string | null
          communication_preference?: string | null
          completion_percentage?: number | null
          conflict_resolution?: string | null
          core_values?: string[] | null
          created_at?: string
          data_points_collected?: number | null
          decision_making_style?: string | null
          emotional_expressiveness?: number | null
          energy_cycles?: Json | null
          ethical_framework?: string | null
          formative_memories?: Json | null
          genesis_completed?: boolean | null
          humor_style?: string | null
          id?: string
          is_complete?: boolean | null
          last_harvest_at?: string | null
          micro_expressions?: Json | null
          peak_creativity_hours?: Json | null
          peak_experiences?: Json | null
          sentence_complexity?: number | null
          sleep_wake_pattern?: string | null
          stress_response?: string | null
          trauma_markers?: Json | null
          typing_rhythm_signature?: Json | null
          updated_at?: string
          user_id: string
          vocabulary_tier?: string | null
          voice_characteristics?: Json | null
          voice_latent_space?: Json | null
          voice_preference?: string | null
        }
        Update: {
          belief_anchors?: Json | null
          codex_version?: string | null
          communication_preference?: string | null
          completion_percentage?: number | null
          conflict_resolution?: string | null
          core_values?: string[] | null
          created_at?: string
          data_points_collected?: number | null
          decision_making_style?: string | null
          emotional_expressiveness?: number | null
          energy_cycles?: Json | null
          ethical_framework?: string | null
          formative_memories?: Json | null
          genesis_completed?: boolean | null
          humor_style?: string | null
          id?: string
          is_complete?: boolean | null
          last_harvest_at?: string | null
          micro_expressions?: Json | null
          peak_creativity_hours?: Json | null
          peak_experiences?: Json | null
          sentence_complexity?: number | null
          sleep_wake_pattern?: string | null
          stress_response?: string | null
          trauma_markers?: Json | null
          typing_rhythm_signature?: Json | null
          updated_at?: string
          user_id?: string
          vocabulary_tier?: string | null
          voice_characteristics?: Json | null
          voice_latent_space?: Json | null
          voice_preference?: string | null
        }
        Relationships: []
      }
      dhf_stack_sessions: {
        Row: {
          autonomy_actions_count: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_checkin_at: string | null
          pause_reason: string | null
          paused_at: string | null
          session_end: string | null
          session_start: string | null
          user_confirmed_continue: boolean | null
          user_id: string
        }
        Insert: {
          autonomy_actions_count?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_checkin_at?: string | null
          pause_reason?: string | null
          paused_at?: string | null
          session_end?: string | null
          session_start?: string | null
          user_confirmed_continue?: boolean | null
          user_id: string
        }
        Update: {
          autonomy_actions_count?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_checkin_at?: string | null
          pause_reason?: string | null
          paused_at?: string | null
          session_end?: string | null
          session_start?: string | null
          user_confirmed_continue?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      divine_notifications: {
        Row: {
          brand_name: string | null
          campaign_id: string | null
          clicked_at: string | null
          converted_at: string | null
          deal_id: string | null
          distance_meters: number | null
          expires_at: string | null
          id: string
          location_lat: number | null
          location_lng: number | null
          message: string
          notification_type: string
          reward_offered: number | null
          sent_at: string
          title: string
          user_id: string
          was_clicked: boolean | null
          was_converted: boolean | null
        }
        Insert: {
          brand_name?: string | null
          campaign_id?: string | null
          clicked_at?: string | null
          converted_at?: string | null
          deal_id?: string | null
          distance_meters?: number | null
          expires_at?: string | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          message: string
          notification_type?: string
          reward_offered?: number | null
          sent_at?: string
          title: string
          user_id: string
          was_clicked?: boolean | null
          was_converted?: boolean | null
        }
        Update: {
          brand_name?: string | null
          campaign_id?: string | null
          clicked_at?: string | null
          converted_at?: string | null
          deal_id?: string | null
          distance_meters?: number | null
          expires_at?: string | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          message?: string
          notification_type?: string
          reward_offered?: number | null
          sent_at?: string
          title?: string
          user_id?: string
          was_clicked?: boolean | null
          was_converted?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "divine_notifications_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "brand_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "divine_notifications_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "brand_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      ecn_analysis_queue: {
        Row: {
          analysis_result: Json | null
          created_at: string | null
          events_batch: Json
          id: string
          model_used: string | null
          processed_at: string | null
          processing_cost_estimate: number | null
          status: string | null
          user_id: string
        }
        Insert: {
          analysis_result?: Json | null
          created_at?: string | null
          events_batch: Json
          id?: string
          model_used?: string | null
          processed_at?: string | null
          processing_cost_estimate?: number | null
          status?: string | null
          user_id: string
        }
        Update: {
          analysis_result?: Json | null
          created_at?: string | null
          events_batch?: Json
          id?: string
          model_used?: string | null
          processed_at?: string | null
          processing_cost_estimate?: number | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ecn_history: {
        Row: {
          action_tendency: string
          engagement_score: number
          id: string
          metadata: Json | null
          primary_emotion: string
          recorded_at: string
          session_id: string | null
          stress_level: number
          tenant_id: string | null
          user_id: string
          valence: number
        }
        Insert: {
          action_tendency?: string
          engagement_score?: number
          id?: string
          metadata?: Json | null
          primary_emotion?: string
          recorded_at?: string
          session_id?: string | null
          stress_level?: number
          tenant_id?: string | null
          user_id: string
          valence?: number
        }
        Update: {
          action_tendency?: string
          engagement_score?: number
          id?: string
          metadata?: Json | null
          primary_emotion?: string
          recorded_at?: string
          session_id?: string | null
          stress_level?: number
          tenant_id?: string | null
          user_id?: string
          valence?: number
        }
        Relationships: []
      }
      emotion_logs: {
        Row: {
          context: string | null
          created_at: string | null
          emotion: string
          id: string
          intensity: number
          notes: string | null
          user_id: string
        }
        Insert: {
          context?: string | null
          created_at?: string | null
          emotion: string
          id?: string
          intensity: number
          notes?: string | null
          user_id: string
        }
        Update: {
          context?: string | null
          created_at?: string | null
          emotion?: string
          id?: string
          intensity?: number
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      exodus_mentorships: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          invite_code: string
          mentee_player_id: string | null
          mentee_user_id: string
          mentor_id: string
          points_awarded: number | null
          points_deducted: number | null
          quiz_passed: boolean | null
          quiz_score: number | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          invite_code: string
          mentee_player_id?: string | null
          mentee_user_id: string
          mentor_id: string
          points_awarded?: number | null
          points_deducted?: number | null
          quiz_passed?: boolean | null
          quiz_score?: number | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          invite_code?: string
          mentee_player_id?: string | null
          mentee_user_id?: string
          mentor_id?: string
          points_awarded?: number | null
          points_deducted?: number | null
          quiz_passed?: boolean | null
          quiz_score?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exodus_mentorships_mentee_player_id_fkey"
            columns: ["mentee_player_id"]
            isOneToOne: false
            referencedRelation: "exodus_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exodus_mentorships_mentee_player_id_fkey"
            columns: ["mentee_player_id"]
            isOneToOne: false
            referencedRelation: "exodus_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exodus_mentorships_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "exodus_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exodus_mentorships_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "exodus_players"
            referencedColumns: ["id"]
          },
        ]
      }
      exodus_players: {
        Row: {
          ban_reason: string | null
          banned: boolean | null
          cortical_stack_holder: boolean | null
          created_at: string | null
          failed_mentees: number | null
          god_mode_unlocked: boolean | null
          id: string
          is_first_wave: boolean | null
          joined_exodus_at: string | null
          last_activity_at: string | null
          mentor_rank: string | null
          player_name: string
          resonance_points: number
          successful_mentees: number | null
          total_mentees: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ban_reason?: string | null
          banned?: boolean | null
          cortical_stack_holder?: boolean | null
          created_at?: string | null
          failed_mentees?: number | null
          god_mode_unlocked?: boolean | null
          id?: string
          is_first_wave?: boolean | null
          joined_exodus_at?: string | null
          last_activity_at?: string | null
          mentor_rank?: string | null
          player_name: string
          resonance_points?: number
          successful_mentees?: number | null
          total_mentees?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ban_reason?: string | null
          banned?: boolean | null
          cortical_stack_holder?: boolean | null
          created_at?: string | null
          failed_mentees?: number | null
          god_mode_unlocked?: boolean | null
          id?: string
          is_first_wave?: boolean | null
          joined_exodus_at?: string | null
          last_activity_at?: string | null
          mentor_rank?: string | null
          player_name?: string
          resonance_points?: number
          successful_mentees?: number | null
          total_mentees?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      exodus_puzzle_attempts: {
        Row: {
          attempt_answer: string
          attempted_at: string | null
          id: string
          is_correct: boolean
          player_id: string
          points_earned: number | null
          puzzle_id: string
        }
        Insert: {
          attempt_answer: string
          attempted_at?: string | null
          id?: string
          is_correct: boolean
          player_id: string
          points_earned?: number | null
          puzzle_id: string
        }
        Update: {
          attempt_answer?: string
          attempted_at?: string | null
          id?: string
          is_correct?: boolean
          player_id?: string
          points_earned?: number | null
          puzzle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exodus_puzzle_attempts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "exodus_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exodus_puzzle_attempts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "exodus_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exodus_puzzle_attempts_puzzle_id_fkey"
            columns: ["puzzle_id"]
            isOneToOne: false
            referencedRelation: "exodus_puzzles"
            referencedColumns: ["id"]
          },
        ]
      }
      exodus_puzzles: {
        Row: {
          answer_hash: string
          created_at: string | null
          hint: string | null
          id: string
          is_active: boolean | null
          max_solvers: number | null
          riddle: string
          solvers_count: number | null
          stage: number
          title: string
          unlock_code: string | null
        }
        Insert: {
          answer_hash: string
          created_at?: string | null
          hint?: string | null
          id?: string
          is_active?: boolean | null
          max_solvers?: number | null
          riddle: string
          solvers_count?: number | null
          stage: number
          title: string
          unlock_code?: string | null
        }
        Update: {
          answer_hash?: string
          created_at?: string | null
          hint?: string | null
          id?: string
          is_active?: boolean | null
          max_solvers?: number | null
          riddle?: string
          solvers_count?: number | null
          stage?: number
          title?: string
          unlock_code?: string | null
        }
        Relationships: []
      }
      exodus_quiz_attempts: {
        Row: {
          answers_given: Json
          attempt_duration_seconds: number | null
          created_at: string | null
          id: string
          mentorship_id: string | null
          passed: boolean
          player_id: string
          questions_asked: Json
          score: number
          suspected_bot: boolean | null
          zoe_verdict: string | null
        }
        Insert: {
          answers_given: Json
          attempt_duration_seconds?: number | null
          created_at?: string | null
          id?: string
          mentorship_id?: string | null
          passed: boolean
          player_id: string
          questions_asked: Json
          score: number
          suspected_bot?: boolean | null
          zoe_verdict?: string | null
        }
        Update: {
          answers_given?: Json
          attempt_duration_seconds?: number | null
          created_at?: string | null
          id?: string
          mentorship_id?: string | null
          passed?: boolean
          player_id?: string
          questions_asked?: Json
          score?: number
          suspected_bot?: boolean | null
          zoe_verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exodus_quiz_attempts_mentorship_id_fkey"
            columns: ["mentorship_id"]
            isOneToOne: false
            referencedRelation: "exodus_mentorships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exodus_quiz_attempts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "exodus_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exodus_quiz_attempts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "exodus_players"
            referencedColumns: ["id"]
          },
        ]
      }
      exodus_quiz_questions: {
        Row: {
          category: string | null
          correct_option: number
          created_at: string | null
          difficulty: number | null
          id: string
          is_active: boolean | null
          options: Json
          points: number | null
          question: string
        }
        Insert: {
          category?: string | null
          correct_option: number
          created_at?: string | null
          difficulty?: number | null
          id?: string
          is_active?: boolean | null
          options: Json
          points?: number | null
          question: string
        }
        Update: {
          category?: string | null
          correct_option?: number
          created_at?: string | null
          difficulty?: number | null
          id?: string
          is_active?: boolean | null
          options?: Json
          points?: number | null
          question?: string
        }
        Relationships: []
      }
      external_ontology_connections: {
        Row: {
          adapter_name: string
          capabilities: Json | null
          connection_status: string | null
          connection_type: string
          created_at: string | null
          id: string
          last_heartbeat_at: string | null
          platform_metadata: Json | null
          sensor_types: Json | null
          updated_at: string | null
        }
        Insert: {
          adapter_name: string
          capabilities?: Json | null
          connection_status?: string | null
          connection_type: string
          created_at?: string | null
          id?: string
          last_heartbeat_at?: string | null
          platform_metadata?: Json | null
          sensor_types?: Json | null
          updated_at?: string | null
        }
        Update: {
          adapter_name?: string
          capabilities?: Json | null
          connection_status?: string | null
          connection_type?: string
          created_at?: string | null
          id?: string
          last_heartbeat_at?: string | null
          platform_metadata?: Json | null
          sensor_types?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      face_login_attempts: {
        Row: {
          attempted_at: string | null
          device_fingerprint: string | null
          email: string
          failure_reason: string | null
          id: string
          ip_address: string | null
          success: boolean | null
        }
        Insert: {
          attempted_at?: string | null
          device_fingerprint?: string | null
          email: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean | null
        }
        Update: {
          attempted_at?: string | null
          device_fingerprint?: string | null
          email?: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean | null
        }
        Relationships: []
      }
      feature_analytics: {
        Row: {
          access_method: string
          city: string | null
          created_at: string
          feature_id: string
          feature_name: string
          id: string
          location: string | null
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          access_method: string
          city?: string | null
          created_at?: string
          feature_id: string
          feature_name: string
          id?: string
          location?: string | null
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          access_method?: string
          city?: string | null
          created_at?: string
          feature_id?: string
          feature_name?: string
          id?: string
          location?: string | null
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      feature_announcements: {
        Row: {
          announced_at: string
          feature_id: string
          feature_name: string
          id: string
          user_id: string
        }
        Insert: {
          announced_at?: string
          feature_id: string
          feature_name: string
          id?: string
          user_id: string
        }
        Update: {
          announced_at?: string
          feature_id?: string
          feature_name?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          camouflage_type: string | null
          category: string | null
          created_at: string
          description: string | null
          enabled: boolean
          feature_key: string
          id: string
          is_tier6: boolean | null
          metadata: Json | null
          requires_admin: boolean | null
          updated_at: string
        }
        Insert: {
          camouflage_type?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          feature_key: string
          id?: string
          is_tier6?: boolean | null
          metadata?: Json | null
          requires_admin?: boolean | null
          updated_at?: string
        }
        Update: {
          camouflage_type?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          feature_key?: string
          id?: string
          is_tier6?: boolean | null
          metadata?: Json | null
          requires_admin?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      feed_diagnostics_log: {
        Row: {
          auth_ready: boolean | null
          code: string | null
          context: Json | null
          created_at: string
          duration_ms: number | null
          error_code: string | null
          id: string
          message: string | null
          metadata: Json
          query: string | null
          rls_blocked: boolean | null
          route: string | null
          row_count: number | null
          status: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_ready?: boolean | null
          code?: string | null
          context?: Json | null
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          id?: string
          message?: string | null
          metadata?: Json
          query?: string | null
          rls_blocked?: boolean | null
          route?: string | null
          row_count?: number | null
          status: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_ready?: boolean | null
          code?: string | null
          context?: Json | null
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          id?: string
          message?: string | null
          metadata?: Json
          query?: string | null
          rls_blocked?: boolean | null
          route?: string | null
          row_count?: number | null
          status?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      friend_requests: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          sender_id: string
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_requests_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friend_requests_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friend_requests_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "safe_public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friend_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friend_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friend_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "safe_public_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string
          id: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: []
      }
      high_value_zones: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          location_lat: number
          location_lng: number
          radius_meters: number | null
          value_multiplier: number | null
          zone_name: string
          zone_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location_lat: number
          location_lng: number
          radius_meters?: number | null
          value_multiplier?: number | null
          zone_name: string
          zone_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location_lat?: number
          location_lng?: number
          radius_meters?: number | null
          value_multiplier?: number | null
          zone_name?: string
          zone_type?: string
        }
        Relationships: []
      }
      important_dates: {
        Row: {
          created_at: string | null
          date_type: string
          date_value: string
          description: string | null
          friend_user_id: string | null
          id: string
          is_recurring: boolean | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date_type: string
          date_value: string
          description?: string | null
          friend_user_id?: string | null
          id?: string
          is_recurring?: boolean | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date_type?: string
          date_value?: string
          description?: string | null
          friend_user_id?: string | null
          id?: string
          is_recurring?: boolean | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          current_uses: number | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          metadata: Json | null
          revoked_at: string | null
          revoked_by: string | null
          revoked_reason: string | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          current_uses?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          metadata?: Json | null
          revoked_at?: string | null
          revoked_by?: string | null
          revoked_reason?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          current_uses?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          metadata?: Json | null
          revoked_at?: string | null
          revoked_by?: string | null
          revoked_reason?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      job_queue: {
        Row: {
          admin_user_id: string
          created_at: string | null
          id: string
          job_type: string
          metadata: Json | null
          status: string
          updated_at: string | null
        }
        Insert: {
          admin_user_id: string
          created_at?: string | null
          id?: string
          job_type: string
          metadata?: Json | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          admin_user_id?: string
          created_at?: string | null
          id?: string
          job_type?: string
          metadata?: Json | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      latency_benchmarks: {
        Row: {
          cache_hit: boolean | null
          created_at: string | null
          id: string
          measured_latency_ms: number
          operation_type: string
          optimization_applied: string[] | null
          sla_met: boolean
          target_latency_ms: number
          thinking_level: string
          user_id: string
        }
        Insert: {
          cache_hit?: boolean | null
          created_at?: string | null
          id?: string
          measured_latency_ms: number
          operation_type: string
          optimization_applied?: string[] | null
          sla_met: boolean
          target_latency_ms: number
          thinking_level: string
          user_id: string
        }
        Update: {
          cache_hit?: boolean | null
          created_at?: string | null
          id?: string
          measured_latency_ms?: number
          operation_type?: string
          optimization_applied?: string[] | null
          sla_met?: boolean
          target_latency_ms?: number
          thinking_level?: string
          user_id?: string
        }
        Relationships: []
      }
      legacy_artifacts: {
        Row: {
          artifact_description: string | null
          artifact_name: string
          artifact_type: string
          created_at: string
          creator_id: string
          dhf_verified: boolean
          id: string
          is_tradeable: boolean
          memory_snapshot: Json | null
          minted_at: string
          owner_id: string
          rarity: string
          skill_boost: Json
          transferred_at: string | null
        }
        Insert: {
          artifact_description?: string | null
          artifact_name: string
          artifact_type: string
          created_at?: string
          creator_id: string
          dhf_verified?: boolean
          id?: string
          is_tradeable?: boolean
          memory_snapshot?: Json | null
          minted_at?: string
          owner_id: string
          rarity?: string
          skill_boost?: Json
          transferred_at?: string | null
        }
        Update: {
          artifact_description?: string | null
          artifact_name?: string
          artifact_type?: string
          created_at?: string
          creator_id?: string
          dhf_verified?: boolean
          id?: string
          is_tradeable?: boolean
          memory_snapshot?: Json | null
          minted_at?: string
          owner_id?: string
          rarity?: string
          skill_boost?: Json
          transferred_at?: string | null
        }
        Relationships: []
      }
      legal_knowledge_base: {
        Row: {
          category: string
          content: string
          created_at: string | null
          embedding: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string | null
          created_at: string
          deleted_by: string[] | null
          delivered: boolean | null
          edited_at: string | null
          id: string
          is_edited: boolean | null
          is_forwarded: boolean | null
          is_pinned: boolean | null
          media_type: string | null
          media_url: string | null
          reactions: Json | null
          read: boolean
          receiver_id: string
          reply_to_message_id: string | null
          sender_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          deleted_by?: string[] | null
          delivered?: boolean | null
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          is_forwarded?: boolean | null
          is_pinned?: boolean | null
          media_type?: string | null
          media_url?: string | null
          reactions?: Json | null
          read?: boolean
          receiver_id: string
          reply_to_message_id?: string | null
          sender_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          deleted_by?: string[] | null
          delivered?: boolean | null
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          is_forwarded?: boolean | null
          is_pinned?: boolean | null
          media_type?: string | null
          media_url?: string | null
          reactions?: Json | null
          read?: boolean
          receiver_id?: string
          reply_to_message_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "safe_public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "safe_public_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      mmora_memories: {
        Row: {
          content: string
          created_at: string
          embedding: string | null
          emotion_tag: string | null
          id: string
          session_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          embedding?: string | null
          emotion_tag?: string | null
          id?: string
          session_id?: string | null
          type?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string | null
          emotion_tag?: string | null
          id?: string
          session_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          adaptive_volume_enabled: boolean | null
          batching_enabled: boolean | null
          batching_window_minutes: number | null
          created_at: string | null
          custom_sounds: Json | null
          daytime_start: string | null
          daytime_volume: number | null
          evening_start: string | null
          evening_volume: number | null
          id: string
          night_start: string | null
          night_volume: number | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sound_theme: string | null
          updated_at: string | null
          user_id: string
          vibration_enabled: boolean | null
          vibration_patterns: Json | null
        }
        Insert: {
          adaptive_volume_enabled?: boolean | null
          batching_enabled?: boolean | null
          batching_window_minutes?: number | null
          created_at?: string | null
          custom_sounds?: Json | null
          daytime_start?: string | null
          daytime_volume?: number | null
          evening_start?: string | null
          evening_volume?: number | null
          id?: string
          night_start?: string | null
          night_volume?: number | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sound_theme?: string | null
          updated_at?: string | null
          user_id: string
          vibration_enabled?: boolean | null
          vibration_patterns?: Json | null
        }
        Update: {
          adaptive_volume_enabled?: boolean | null
          batching_enabled?: boolean | null
          batching_window_minutes?: number | null
          created_at?: string | null
          custom_sounds?: Json | null
          daytime_start?: string | null
          daytime_volume?: number | null
          evening_start?: string | null
          evening_volume?: number | null
          id?: string
          night_start?: string | null
          night_volume?: number | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sound_theme?: string | null
          updated_at?: string | null
          user_id?: string
          vibration_enabled?: boolean | null
          vibration_patterns?: Json | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          comment_id: string | null
          context_data: Json | null
          created_at: string
          expires_at: string | null
          from_user_id: string
          id: string
          post_id: string | null
          priority: number | null
          read: boolean | null
          suggestion_type: string | null
          type: string
          user_id: string
        }
        Insert: {
          comment_id?: string | null
          context_data?: Json | null
          created_at?: string
          expires_at?: string | null
          from_user_id: string
          id?: string
          post_id?: string | null
          priority?: number | null
          read?: boolean | null
          suggestion_type?: string | null
          type: string
          user_id: string
        }
        Update: {
          comment_id?: string | null
          context_data?: Json | null
          created_at?: string
          expires_at?: string | null
          from_user_id?: string
          id?: string
          post_id?: string | null
          priority?: number | null
          read?: boolean | null
          suggestion_type?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      on_route_notifications: {
        Row: {
          clicked: boolean | null
          deal_id: string | null
          dismissed: boolean | null
          id: string
          notification_type: string | null
          shown_at: string | null
          user_id: string
        }
        Insert: {
          clicked?: boolean | null
          deal_id?: string | null
          dismissed?: boolean | null
          id?: string
          notification_type?: string | null
          shown_at?: string | null
          user_id: string
        }
        Update: {
          clicked?: boolean | null
          deal_id?: string | null
          dismissed?: boolean | null
          id?: string
          notification_type?: string | null
          shown_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "on_route_notifications_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "brand_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_progress: {
        Row: {
          completed: boolean
          completed_steps: Json
          created_at: string
          current_step: number
          id: string
          last_shown_at: string | null
          skipped: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_steps?: Json
          created_at?: string
          current_step?: number
          id?: string
          last_shown_at?: string | null
          skipped?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_steps?: Json
          created_at?: string
          current_step?: number
          id?: string
          last_shown_at?: string | null
          skipped?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      online_sessions: {
        Row: {
          created_at: string
          device_info: Json | null
          flag_reason: string | null
          flagged: boolean | null
          id: string
          ip_address: string | null
          last_heartbeat: string
          session_token: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          flag_reason?: string | null
          flagged?: boolean | null
          id?: string
          ip_address?: string | null
          last_heartbeat?: string
          session_token?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          flag_reason?: string | null
          flagged?: boolean | null
          id?: string
          ip_address?: string | null
          last_heartbeat?: string
          session_token?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          entered_at: string
          exited_at: string | null
          id: string
          page_path: string
          page_title: string | null
          referrer: string | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          entered_at?: string
          exited_at?: string | null
          id?: string
          page_path: string
          page_title?: string | null
          referrer?: string | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          entered_at?: string
          exited_at?: string | null
          id?: string
          page_path?: string
          page_title?: string | null
          referrer?: string | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_views_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_analytics"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "page_views_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      passkey_auth_challenges: {
        Row: {
          challenge: string
          consumed_at: string | null
          created_at: string
          credential_id: string | null
          expires_at: string
          failure_reason: string | null
          id: string
          metadata: Json
          operation: string
          origin: string | null
          platform: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          challenge: string
          consumed_at?: string | null
          created_at?: string
          credential_id?: string | null
          expires_at?: string
          failure_reason?: string | null
          id?: string
          metadata?: Json
          operation: string
          origin?: string | null
          platform?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          challenge?: string
          consumed_at?: string | null
          created_at?: string
          credential_id?: string | null
          expires_at?: string
          failure_reason?: string | null
          id?: string
          metadata?: Json
          operation?: string
          origin?: string | null
          platform?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      phoenix_legacy_messages: {
        Row: {
          channel_type: string | null
          confidence_score: number | null
          created_at: string | null
          id: string
          marked_as_phoenix: boolean | null
          original_message: string | null
          original_sender_id: string | null
          phoenix_profile_id: string | null
          phoenix_response: string
          sent_at: string | null
          user_approved: boolean | null
          user_feedback: string | null
          user_id: string
        }
        Insert: {
          channel_type?: string | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          marked_as_phoenix?: boolean | null
          original_message?: string | null
          original_sender_id?: string | null
          phoenix_profile_id?: string | null
          phoenix_response: string
          sent_at?: string | null
          user_approved?: boolean | null
          user_feedback?: string | null
          user_id: string
        }
        Update: {
          channel_type?: string | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          marked_as_phoenix?: boolean | null
          original_message?: string | null
          original_sender_id?: string | null
          phoenix_profile_id?: string | null
          phoenix_response?: string
          sent_at?: string | null
          user_approved?: boolean | null
          user_feedback?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "phoenix_legacy_messages_phoenix_profile_id_fkey"
            columns: ["phoenix_profile_id"]
            isOneToOne: false
            referencedRelation: "dhf_phoenix_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      phoenix_mirror_tests: {
        Row: {
          created_at: string | null
          emotional_context: Json | null
          id: string
          memory_sources_used: Json | null
          phoenix_profile_id: string | null
          phoenix_response: string
          question: string
          resonance_score: number | null
          user_expected_answer: string | null
          user_id: string
          verification_type: string | null
          verified_by_user: boolean | null
        }
        Insert: {
          created_at?: string | null
          emotional_context?: Json | null
          id?: string
          memory_sources_used?: Json | null
          phoenix_profile_id?: string | null
          phoenix_response: string
          question: string
          resonance_score?: number | null
          user_expected_answer?: string | null
          user_id: string
          verification_type?: string | null
          verified_by_user?: boolean | null
        }
        Update: {
          created_at?: string | null
          emotional_context?: Json | null
          id?: string
          memory_sources_used?: Json | null
          phoenix_profile_id?: string | null
          phoenix_response?: string
          question?: string
          resonance_score?: number | null
          user_expected_answer?: string | null
          user_id?: string
          verification_type?: string | null
          verified_by_user?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "phoenix_mirror_tests_phoenix_profile_id_fkey"
            columns: ["phoenix_profile_id"]
            isOneToOne: false
            referencedRelation: "dhf_phoenix_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      phoenix_sync_sessions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          emotions_mapped: number | null
          id: string
          memories_scanned: number | null
          messages_analyzed: number | null
          new_patterns_discovered: Json | null
          personality_drift: number | null
          phoenix_profile_id: string | null
          session_type: string
          started_at: string | null
          status: string | null
          sync_quality_score: number | null
          user_id: string
          voice_samples_processed: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          emotions_mapped?: number | null
          id?: string
          memories_scanned?: number | null
          messages_analyzed?: number | null
          new_patterns_discovered?: Json | null
          personality_drift?: number | null
          phoenix_profile_id?: string | null
          session_type?: string
          started_at?: string | null
          status?: string | null
          sync_quality_score?: number | null
          user_id: string
          voice_samples_processed?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          emotions_mapped?: number | null
          id?: string
          memories_scanned?: number | null
          messages_analyzed?: number | null
          new_patterns_discovered?: Json | null
          personality_drift?: number | null
          phoenix_profile_id?: string | null
          session_type?: string
          started_at?: string | null
          status?: string | null
          sync_quality_score?: number | null
          user_id?: string
          voice_samples_processed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "phoenix_sync_sessions_phoenix_profile_id_fkey"
            columns: ["phoenix_profile_id"]
            isOneToOne: false
            referencedRelation: "dhf_phoenix_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_health_logs: {
        Row: {
          created_at: string
          critical_issues: number
          id: string
          issues_count: number
          scan_data: Json
          score: number
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          critical_issues?: number
          id?: string
          issues_count?: number
          scan_data?: Json
          score: number
          status: string
          user_id: string
        }
        Update: {
          created_at?: string
          critical_issues?: number
          id?: string
          issues_count?: number
          scan_data?: Json
          score?: number
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          likes_count: number | null
          parent_comment_id: string | null
          post_id: string
          replies_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number | null
          parent_comment_id?: string | null
          post_id: string
          replies_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number | null
          parent_comment_id?: string | null
          post_id?: string
          replies_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "safe_public_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_preferences: {
        Row: {
          created_at: string
          id: string
          post_id: string
          preference: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          preference: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          preference?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_preferences_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_preferences_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_ratings: {
        Row: {
          created_at: string
          id: string
          post_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_ratings_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_ratings_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_tags: {
        Row: {
          created_at: string
          id: string
          post_id: string
          tagged_by_user_id: string
          tagged_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          tagged_by_user_id: string
          tagged_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          tagged_by_user_id?: string
          tagged_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          comments_count: number
          content: string | null
          created_at: string
          id: string
          likes_count: number
          location_lat: number | null
          location_lng: number | null
          location_name: string | null
          media_preview_url: string | null
          media_type: string | null
          media_url: string | null
          private_timeline_id: string | null
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          comments_count?: number
          content?: string | null
          created_at?: string
          id?: string
          likes_count?: number
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          media_preview_url?: string | null
          media_type?: string | null
          media_url?: string | null
          private_timeline_id?: string | null
          updated_at?: string
          user_id: string
          visibility: string
        }
        Update: {
          comments_count?: number
          content?: string | null
          created_at?: string
          id?: string
          likes_count?: number
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          media_preview_url?: string | null
          media_type?: string | null
          media_url?: string | null
          private_timeline_id?: string | null
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_private_timeline_id_fkey"
            columns: ["private_timeline_id"]
            isOneToOne: false
            referencedRelation: "private_timelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "safe_public_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      private_timeline_members: {
        Row: {
          added_at: string
          added_by_user_id: string
          id: string
          timeline_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          added_by_user_id: string
          id?: string
          timeline_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          added_by_user_id?: string
          id?: string
          timeline_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_timeline_members_added_by_user_id_fkey"
            columns: ["added_by_user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "private_timeline_members_added_by_user_id_fkey"
            columns: ["added_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "private_timeline_members_added_by_user_id_fkey"
            columns: ["added_by_user_id"]
            isOneToOne: false
            referencedRelation: "safe_public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "private_timeline_members_timeline_id_fkey"
            columns: ["timeline_id"]
            isOneToOne: false
            referencedRelation: "private_timelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_timeline_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "private_timeline_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "private_timeline_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "safe_public_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      private_timelines: {
        Row: {
          created_at: string
          id: string
          name: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          assistant_name: string | null
          assistant_voice_preference: string | null
          bio: string | null
          birth_date: string | null
          birth_place: string | null
          birth_time: string | null
          city: string | null
          created_at: string
          current_tier: string | null
          daily_image_count: number | null
          daily_text_count: number | null
          date_of_birth: string | null
          dhf_autonomy_tolerance: number | null
          display_name: string
          enrichment_consent: boolean | null
          enrichment_source: string | null
          event_custom_details: string | null
          event_date: string | null
          event_recurring: boolean | null
          event_type: string | null
          field_of_study: string | null
          gender: string | null
          hobbies: string[] | null
          id: string
          identity_calibration_complete: boolean | null
          job_title: string | null
          last_enriched_at: string | null
          last_image_reset_date: string | null
          last_text_reset_date: string | null
          location_enabled: boolean | null
          notification_voice_style: string | null
          onboarding_step: string | null
          organization: string | null
          pce_enabled: boolean | null
          pending_tasks: Json | null
          proactive_initiative_ready: boolean | null
          profession: string | null
          profile_photo_url: string | null
          profile_visibility: string
          real_name: string | null
          status: string | null
          tenant_id: string | null
          total_points: number | null
          updated_at: string
          user_id: string
          username: string
          voice_notifications_enabled: boolean | null
          zoe_adaptive_tone: Json | null
          zoe_conversation_style: string | null
          zoe_data_access_enabled: boolean | null
          zoe_discovered_interests: Json | null
          zoe_elite_mode: boolean | null
          zoe_genesis_complete: boolean
          zoe_genesis_completed_at: string | null
          zoe_identity_consent_at: string | null
          zoe_identity_dhf_locked: boolean
          zoe_identity_locked_at: string | null
          zoe_identity_photo_path: string | null
          zoe_identity_photo_url: string | null
          zoe_infinity_genesis_complete: boolean | null
          zoe_infinity_intimacy_level: number | null
          zoe_infinity_nickname: string | null
          zoe_infinity_voice_preference: string | null
          zoe_last_profile_analysis: string | null
          zoe_learning_enabled: boolean | null
          zoe_learning_sources: Json | null
          zoe_personality_tone: string | null
          zoe_proactive_suggestions: boolean | null
          zoe_relationship_style: string | null
          zoe_relationship_styles: Json | null
        }
        Insert: {
          assistant_name?: string | null
          assistant_voice_preference?: string | null
          bio?: string | null
          birth_date?: string | null
          birth_place?: string | null
          birth_time?: string | null
          city?: string | null
          created_at?: string
          current_tier?: string | null
          daily_image_count?: number | null
          daily_text_count?: number | null
          date_of_birth?: string | null
          dhf_autonomy_tolerance?: number | null
          display_name: string
          enrichment_consent?: boolean | null
          enrichment_source?: string | null
          event_custom_details?: string | null
          event_date?: string | null
          event_recurring?: boolean | null
          event_type?: string | null
          field_of_study?: string | null
          gender?: string | null
          hobbies?: string[] | null
          id?: string
          identity_calibration_complete?: boolean | null
          job_title?: string | null
          last_enriched_at?: string | null
          last_image_reset_date?: string | null
          last_text_reset_date?: string | null
          location_enabled?: boolean | null
          notification_voice_style?: string | null
          onboarding_step?: string | null
          organization?: string | null
          pce_enabled?: boolean | null
          pending_tasks?: Json | null
          proactive_initiative_ready?: boolean | null
          profession?: string | null
          profile_photo_url?: string | null
          profile_visibility?: string
          real_name?: string | null
          status?: string | null
          tenant_id?: string | null
          total_points?: number | null
          updated_at?: string
          user_id: string
          username: string
          voice_notifications_enabled?: boolean | null
          zoe_adaptive_tone?: Json | null
          zoe_conversation_style?: string | null
          zoe_data_access_enabled?: boolean | null
          zoe_discovered_interests?: Json | null
          zoe_elite_mode?: boolean | null
          zoe_genesis_complete?: boolean
          zoe_genesis_completed_at?: string | null
          zoe_identity_consent_at?: string | null
          zoe_identity_dhf_locked?: boolean
          zoe_identity_locked_at?: string | null
          zoe_identity_photo_path?: string | null
          zoe_identity_photo_url?: string | null
          zoe_infinity_genesis_complete?: boolean | null
          zoe_infinity_intimacy_level?: number | null
          zoe_infinity_nickname?: string | null
          zoe_infinity_voice_preference?: string | null
          zoe_last_profile_analysis?: string | null
          zoe_learning_enabled?: boolean | null
          zoe_learning_sources?: Json | null
          zoe_personality_tone?: string | null
          zoe_proactive_suggestions?: boolean | null
          zoe_relationship_style?: string | null
          zoe_relationship_styles?: Json | null
        }
        Update: {
          assistant_name?: string | null
          assistant_voice_preference?: string | null
          bio?: string | null
          birth_date?: string | null
          birth_place?: string | null
          birth_time?: string | null
          city?: string | null
          created_at?: string
          current_tier?: string | null
          daily_image_count?: number | null
          daily_text_count?: number | null
          date_of_birth?: string | null
          dhf_autonomy_tolerance?: number | null
          display_name?: string
          enrichment_consent?: boolean | null
          enrichment_source?: string | null
          event_custom_details?: string | null
          event_date?: string | null
          event_recurring?: boolean | null
          event_type?: string | null
          field_of_study?: string | null
          gender?: string | null
          hobbies?: string[] | null
          id?: string
          identity_calibration_complete?: boolean | null
          job_title?: string | null
          last_enriched_at?: string | null
          last_image_reset_date?: string | null
          last_text_reset_date?: string | null
          location_enabled?: boolean | null
          notification_voice_style?: string | null
          onboarding_step?: string | null
          organization?: string | null
          pce_enabled?: boolean | null
          pending_tasks?: Json | null
          proactive_initiative_ready?: boolean | null
          profession?: string | null
          profile_photo_url?: string | null
          profile_visibility?: string
          real_name?: string | null
          status?: string | null
          tenant_id?: string | null
          total_points?: number | null
          updated_at?: string
          user_id?: string
          username?: string
          voice_notifications_enabled?: boolean | null
          zoe_adaptive_tone?: Json | null
          zoe_conversation_style?: string | null
          zoe_data_access_enabled?: boolean | null
          zoe_discovered_interests?: Json | null
          zoe_elite_mode?: boolean | null
          zoe_genesis_complete?: boolean
          zoe_genesis_completed_at?: string | null
          zoe_identity_consent_at?: string | null
          zoe_identity_dhf_locked?: boolean
          zoe_identity_locked_at?: string | null
          zoe_identity_photo_path?: string | null
          zoe_identity_photo_url?: string | null
          zoe_infinity_genesis_complete?: boolean | null
          zoe_infinity_intimacy_level?: number | null
          zoe_infinity_nickname?: string | null
          zoe_infinity_voice_preference?: string | null
          zoe_last_profile_analysis?: string | null
          zoe_learning_enabled?: boolean | null
          zoe_learning_sources?: Json | null
          zoe_personality_tone?: string | null
          zoe_proactive_suggestions?: boolean | null
          zoe_relationship_style?: string | null
          zoe_relationship_styles?: Json | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          bio: string | null
          display_name: string
          profile_photo_url: string | null
          profile_visibility: string
          user_id: string
          username: string
        }
        Insert: {
          bio?: string | null
          display_name: string
          profile_photo_url?: string | null
          profile_visibility?: string
          user_id: string
          username: string
        }
        Update: {
          bio?: string | null
          display_name?: string
          profile_photo_url?: string | null
          profile_visibility?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "public_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "public_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "safe_public_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      quantum_call_sessions: {
        Row: {
          bitrate_kbps: number | null
          call_quality: string | null
          caller_id: string
          codec_used: string | null
          duration_seconds: number | null
          encryption_level: string | null
          end_reason: string | null
          ended_at: string | null
          ended_by: string | null
          id: string
          receiver_id: string
          started_at: string
        }
        Insert: {
          bitrate_kbps?: number | null
          call_quality?: string | null
          caller_id: string
          codec_used?: string | null
          duration_seconds?: number | null
          encryption_level?: string | null
          end_reason?: string | null
          ended_at?: string | null
          ended_by?: string | null
          id?: string
          receiver_id: string
          started_at?: string
        }
        Update: {
          bitrate_kbps?: number | null
          call_quality?: string | null
          caller_id?: string
          codec_used?: string | null
          duration_seconds?: number | null
          encryption_level?: string | null
          end_reason?: string | null
          ended_at?: string | null
          ended_by?: string | null
          id?: string
          receiver_id?: string
          started_at?: string
        }
        Relationships: []
      }
      quantum_call_signals: {
        Row: {
          caller_id: string
          created_at: string
          encrypted_payload: string | null
          expires_at: string
          id: string
          receiver_id: string
          signal_data: Json
          signal_type: string
        }
        Insert: {
          caller_id: string
          created_at?: string
          encrypted_payload?: string | null
          expires_at?: string
          id?: string
          receiver_id: string
          signal_data?: Json
          signal_type: string
        }
        Update: {
          caller_id?: string
          created_at?: string
          encrypted_payload?: string | null
          expires_at?: string
          id?: string
          receiver_id?: string
          signal_data?: Json
          signal_type?: string
        }
        Relationships: []
      }
      recovery_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          metadata: Json | null
          token_hash: string
          token_type: string
          used: boolean | null
          user_id: string
          verification_code: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          metadata?: Json | null
          token_hash: string
          token_type: string
          used?: boolean | null
          user_id: string
          verification_code?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          metadata?: Json | null
          token_hash?: string
          token_type?: string
          used?: boolean | null
          user_id?: string
          verification_code?: string | null
        }
        Relationships: []
      }
      reminders: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_completed: boolean | null
          is_recurring: boolean | null
          is_sent: boolean | null
          recurrence_pattern: string | null
          related_id: string | null
          reminder_time: string
          reminder_type: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_completed?: boolean | null
          is_recurring?: boolean | null
          is_sent?: boolean | null
          recurrence_pattern?: string | null
          related_id?: string | null
          reminder_time: string
          reminder_type: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_completed?: boolean | null
          is_recurring?: boolean | null
          is_sent?: boolean | null
          recurrence_pattern?: string | null
          related_id?: string | null
          reminder_time?: string
          reminder_type?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      saved_posts: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          created_at: string
          filters: Json | null
          id: string
          last_used_at: string | null
          search_name: string
          search_query: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json | null
          id?: string
          last_used_at?: string | null
          search_name: string
          search_query: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json | null
          id?: string
          last_used_at?: string | null
          search_name?: string
          search_query?: string
          user_id?: string
        }
        Relationships: []
      }
      search_history: {
        Row: {
          created_at: string
          id: string
          result_id: string | null
          result_type: string | null
          search_query: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          result_id?: string | null
          result_type?: string | null
          search_query: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          result_id?: string | null
          result_type?: string | null
          search_query?: string
          user_id?: string
        }
        Relationships: []
      }
      seasonal_challenges: {
        Row: {
          challenge_id: string
          created_at: string | null
          id: string
          is_exclusive: boolean | null
          season_id: string | null
        }
        Insert: {
          challenge_id: string
          created_at?: string | null
          id?: string
          is_exclusive?: boolean | null
          season_id?: string | null
        }
        Update: {
          challenge_id?: string
          created_at?: string | null
          id?: string
          is_exclusive?: boolean | null
          season_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seasonal_challenges_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "challenge_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          created_at: string | null
          event_status: string
          event_type: string
          id: string
          ip_address: unknown
          location: string | null
          metadata: Json | null
          tenant_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_status: string
          event_type: string
          id?: string
          ip_address?: unknown
          location?: string | null
          metadata?: Json | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_status?: string
          event_type?: string
          id?: string
          ip_address?: unknown
          location?: string | null
          metadata?: Json | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      security_breaches: {
        Row: {
          action_taken: string | null
          breach_type: string
          created_at: string
          details: string | null
          device_fingerprint: string | null
          id: string
          invite_code: string | null
          ip_address: string | null
          severity: string
          user_id: string
        }
        Insert: {
          action_taken?: string | null
          breach_type: string
          created_at?: string
          details?: string | null
          device_fingerprint?: string | null
          id?: string
          invite_code?: string | null
          ip_address?: string | null
          severity?: string
          user_id: string
        }
        Update: {
          action_taken?: string | null
          breach_type?: string
          created_at?: string
          details?: string | null
          device_fingerprint?: string | null
          id?: string
          invite_code?: string | null
          ip_address?: string | null
          severity?: string
          user_id?: string
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          created_at: string | null
          event_details: Json | null
          event_type: string
          id: string
          ip_address: string | null
          severity: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_details?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          severity?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          severity?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_snapshots: {
        Row: {
          created_at: string | null
          data_hash: string
          expires_at: string | null
          id: string
          metadata: Json | null
          record_count: number
          size_bytes: number | null
          snapshot_date: string | null
          snapshot_type: string
          storage_location: string | null
          verification_hash: string | null
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          data_hash: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          record_count: number
          size_bytes?: number | null
          snapshot_date?: string | null
          snapshot_type: string
          storage_location?: string | null
          verification_hash?: string | null
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          data_hash?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          record_count?: number
          size_bytes?: number | null
          snapshot_date?: string | null
          snapshot_type?: string
          storage_location?: string | null
          verification_hash?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      selfie_city_pins: {
        Row: {
          brand_notifications_sent: boolean | null
          caption: string | null
          created_at: string | null
          detected_brands: Json | null
          detected_products: Json | null
          id: string
          image_url: string
          is_premium: boolean | null
          is_premium_ad_space: boolean | null
          likes_count: number | null
          location_lat: number
          location_lng: number
          location_name: string | null
          sponsorship_score: number | null
          user_id: string
          value_calculated_at: string | null
          views_count: number | null
        }
        Insert: {
          brand_notifications_sent?: boolean | null
          caption?: string | null
          created_at?: string | null
          detected_brands?: Json | null
          detected_products?: Json | null
          id?: string
          image_url: string
          is_premium?: boolean | null
          is_premium_ad_space?: boolean | null
          likes_count?: number | null
          location_lat: number
          location_lng: number
          location_name?: string | null
          sponsorship_score?: number | null
          user_id: string
          value_calculated_at?: string | null
          views_count?: number | null
        }
        Update: {
          brand_notifications_sent?: boolean | null
          caption?: string | null
          created_at?: string | null
          detected_brands?: Json | null
          detected_products?: Json | null
          id?: string
          image_url?: string
          is_premium?: boolean | null
          is_premium_ad_space?: boolean | null
          likes_count?: number | null
          location_lat?: number
          location_lng?: number
          location_name?: string | null
          sponsorship_score?: number | null
          user_id?: string
          value_calculated_at?: string | null
          views_count?: number | null
        }
        Relationships: []
      }
      sentinel_night_watch: {
        Row: {
          attacks_blocked: number | null
          auto_patches_applied: number | null
          cycle_ended_at: string | null
          cycle_started_at: string | null
          database_triggers_scanned: number | null
          edge_functions_scanned: number | null
          full_report: Json | null
          id: string
          notifications_sent: boolean | null
          shadow_ai_detected: number | null
          status: string | null
          system_integrity_score: number | null
        }
        Insert: {
          attacks_blocked?: number | null
          auto_patches_applied?: number | null
          cycle_ended_at?: string | null
          cycle_started_at?: string | null
          database_triggers_scanned?: number | null
          edge_functions_scanned?: number | null
          full_report?: Json | null
          id?: string
          notifications_sent?: boolean | null
          shadow_ai_detected?: number | null
          status?: string | null
          system_integrity_score?: number | null
        }
        Update: {
          attacks_blocked?: number | null
          auto_patches_applied?: number | null
          cycle_ended_at?: string | null
          cycle_started_at?: string | null
          database_triggers_scanned?: number | null
          edge_functions_scanned?: number | null
          full_report?: Json | null
          id?: string
          notifications_sent?: boolean | null
          shadow_ai_detected?: number | null
          status?: string | null
          system_integrity_score?: number | null
        }
        Relationships: []
      }
      sft_deployment_queue: {
        Row: {
          created_at: string | null
          data_quality_score: number | null
          deployed_at: string | null
          deployment_notes: string | null
          event_count: number
          id: string
          model_type: string | null
          processing_started_at: string | null
          queued_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data_quality_score?: number | null
          deployed_at?: string | null
          deployment_notes?: string | null
          event_count: number
          id?: string
          model_type?: string | null
          processing_started_at?: string | null
          queued_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data_quality_score?: number | null
          deployed_at?: string | null
          deployment_notes?: string | null
          event_count?: number
          id?: string
          model_type?: string | null
          processing_started_at?: string | null
          queued_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      shadow_ai_incidents: {
        Row: {
          analysis_result: Json | null
          auto_resolved: boolean | null
          blocked: boolean | null
          blocked_at: string | null
          detected_at: string | null
          fingerprint_hash: string | null
          id: string
          incident_type: string
          metadata: Json | null
          request_count: number | null
          request_path: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          source_ip: string | null
          user_agent: string | null
        }
        Insert: {
          analysis_result?: Json | null
          auto_resolved?: boolean | null
          blocked?: boolean | null
          blocked_at?: string | null
          detected_at?: string | null
          fingerprint_hash?: string | null
          id?: string
          incident_type: string
          metadata?: Json | null
          request_count?: number | null
          request_path?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          source_ip?: string | null
          user_agent?: string | null
        }
        Update: {
          analysis_result?: Json | null
          auto_resolved?: boolean | null
          blocked?: boolean | null
          blocked_at?: string | null
          detected_at?: string | null
          fingerprint_hash?: string | null
          id?: string
          incident_type?: string
          metadata?: Json | null
          request_count?: number | null
          request_path?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source_ip?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      shadow_ban_status: {
        Row: {
          ban_reason: string | null
          banned_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          ip_address: string | null
          is_shadow_banned: boolean | null
          strike_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ban_reason?: string | null
          banned_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          is_shadow_banned?: boolean | null
          strike_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ban_reason?: string | null
          banned_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          is_shadow_banned?: boolean | null
          strike_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sovereign_context: {
        Row: {
          active_goals: Json | null
          created_at: string | null
          current_focus: string | null
          current_mood: string | null
          current_project: string | null
          id: string
          last_scribe_run_at: string | null
          message_count_since_scribe: number | null
          preferences_snapshot: Json | null
          recent_topics: string[] | null
          relationship_map: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_goals?: Json | null
          created_at?: string | null
          current_focus?: string | null
          current_mood?: string | null
          current_project?: string | null
          id?: string
          last_scribe_run_at?: string | null
          message_count_since_scribe?: number | null
          preferences_snapshot?: Json | null
          recent_topics?: string[] | null
          relationship_map?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_goals?: Json | null
          created_at?: string | null
          current_focus?: string | null
          current_mood?: string | null
          current_project?: string | null
          id?: string
          last_scribe_run_at?: string | null
          message_count_since_scribe?: number | null
          preferences_snapshot?: Json | null
          recent_topics?: string[] | null
          relationship_map?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sunday_protocol_evaluations: {
        Row: {
          acknowledged_at: string | null
          avg_stress_level: number | null
          created_at: string | null
          daily_pulse_scores: Json | null
          database_health: number | null
          dhf_core_optimized: boolean | null
          edge_functions_health: number | null
          feedback_notes: string | null
          id: string
          learned_preferences: Json | null
          notification_schedule_adjusted: boolean | null
          peak_productivity_day: string | null
          recommendations: Json | null
          served_well_rating: number | null
          stress_peak_day: string | null
          system_bugs_fixed: number | null
          typing_speed_variance: number | null
          user_id: string
          voice_tone_analysis: Json | null
          week_end: string
          week_start: string
        }
        Insert: {
          acknowledged_at?: string | null
          avg_stress_level?: number | null
          created_at?: string | null
          daily_pulse_scores?: Json | null
          database_health?: number | null
          dhf_core_optimized?: boolean | null
          edge_functions_health?: number | null
          feedback_notes?: string | null
          id?: string
          learned_preferences?: Json | null
          notification_schedule_adjusted?: boolean | null
          peak_productivity_day?: string | null
          recommendations?: Json | null
          served_well_rating?: number | null
          stress_peak_day?: string | null
          system_bugs_fixed?: number | null
          typing_speed_variance?: number | null
          user_id: string
          voice_tone_analysis?: Json | null
          week_end: string
          week_start: string
        }
        Update: {
          acknowledged_at?: string | null
          avg_stress_level?: number | null
          created_at?: string | null
          daily_pulse_scores?: Json | null
          database_health?: number | null
          dhf_core_optimized?: boolean | null
          edge_functions_health?: number | null
          feedback_notes?: string | null
          id?: string
          learned_preferences?: Json | null
          notification_schedule_adjusted?: boolean | null
          peak_productivity_day?: string | null
          recommendations?: Json | null
          served_well_rating?: number | null
          stress_peak_day?: string | null
          system_bugs_fixed?: number | null
          typing_speed_variance?: number | null
          user_id?: string
          voice_tone_analysis?: Json | null
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
      system_health_logs: {
        Row: {
          admin_notified: boolean | null
          auto_heal_action: string | null
          auto_heal_attempted: boolean | null
          auto_heal_success: boolean | null
          component_stack: string | null
          created_at: string
          device_info: Json | null
          error_message: string
          error_stack: string | null
          id: string
          log_type: string
          metadata: Json | null
          screen_name: string | null
          session_id: string | null
          severity: string
          timestamp: string | null
          url_path: string | null
          user_id: string | null
        }
        Insert: {
          admin_notified?: boolean | null
          auto_heal_action?: string | null
          auto_heal_attempted?: boolean | null
          auto_heal_success?: boolean | null
          component_stack?: string | null
          created_at?: string
          device_info?: Json | null
          error_message: string
          error_stack?: string | null
          id?: string
          log_type?: string
          metadata?: Json | null
          screen_name?: string | null
          session_id?: string | null
          severity?: string
          timestamp?: string | null
          url_path?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notified?: boolean | null
          auto_heal_action?: string | null
          auto_heal_attempted?: boolean | null
          auto_heal_success?: boolean | null
          component_stack?: string | null
          created_at?: string
          device_info?: Json | null
          error_message?: string
          error_stack?: string | null
          id?: string
          log_type?: string
          metadata?: Json | null
          screen_name?: string | null
          session_id?: string | null
          severity?: string
          timestamp?: string | null
          url_path?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      system_repair_logs: {
        Row: {
          auto_fix_attempted: boolean | null
          component_name: string
          created_at: string | null
          error_log: string | null
          fix_applied: string | null
          fix_successful: boolean | null
          id: string
          issue_detected: string
          night_watch_cycle: string | null
          repair_type: string
          rollback_available: boolean | null
          rollback_snapshot: Json | null
          severity: string | null
        }
        Insert: {
          auto_fix_attempted?: boolean | null
          component_name: string
          created_at?: string | null
          error_log?: string | null
          fix_applied?: string | null
          fix_successful?: boolean | null
          id?: string
          issue_detected: string
          night_watch_cycle?: string | null
          repair_type: string
          rollback_available?: boolean | null
          rollback_snapshot?: Json | null
          severity?: string | null
        }
        Update: {
          auto_fix_attempted?: boolean | null
          component_name?: string
          created_at?: string | null
          error_log?: string | null
          fix_applied?: string | null
          fix_successful?: boolean | null
          id?: string
          issue_detected?: string
          night_watch_cycle?: string | null
          repair_type?: string
          rollback_available?: boolean | null
          rollback_snapshot?: Json | null
          severity?: string | null
        }
        Relationships: []
      }
      timeline_activities: {
        Row: {
          activity_data: Json | null
          activity_type: string
          content_id: string | null
          created_at: string
          id: string
          threshold_id: number | null
          user_id: string
        }
        Insert: {
          activity_data?: Json | null
          activity_type: string
          content_id?: string | null
          created_at?: string
          id?: string
          threshold_id?: number | null
          user_id: string
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string
          content_id?: string | null
          created_at?: string
          id?: string
          threshold_id?: number | null
          user_id?: string
        }
        Relationships: []
      }
      timeline_content: {
        Row: {
          content_data: Json
          content_type: string
          created_at: string
          expertise_level: string
          id: string
          image_url: string | null
          is_public: boolean | null
          threshold_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          content_data: Json
          content_type: string
          created_at?: string
          expertise_level?: string
          id?: string
          image_url?: string | null
          is_public?: boolean | null
          threshold_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          content_data?: Json
          content_type?: string
          created_at?: string
          expertise_level?: string
          id?: string
          image_url?: string | null
          is_public?: boolean | null
          threshold_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      timeline_shares: {
        Row: {
          content_id: string
          id: string
          share_type: string
          shared_at: string
          target_id: string | null
          user_id: string
        }
        Insert: {
          content_id: string
          id?: string
          share_type: string
          shared_at?: string
          target_id?: string | null
          user_id: string
        }
        Update: {
          content_id?: string
          id?: string
          share_type?: string
          shared_at?: string
          target_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_shares_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "timeline_content"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_user_progress: {
        Row: {
          expertise_preference: string | null
          first_visit_at: string
          id: string
          last_visit_at: string
          thresholds_explored: Json | null
          tutorial_completed: boolean | null
          user_id: string
        }
        Insert: {
          expertise_preference?: string | null
          first_visit_at?: string
          id?: string
          last_visit_at?: string
          thresholds_explored?: Json | null
          tutorial_completed?: boolean | null
          user_id: string
        }
        Update: {
          expertise_preference?: string | null
          first_visit_at?: string
          id?: string
          last_visit_at?: string
          thresholds_explored?: Json | null
          tutorial_completed?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      trial_access: {
        Row: {
          created_at: string
          feature: string
          id: string
          is_active: boolean
          trial_end: string
          trial_start: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feature: string
          id?: string
          is_active?: boolean
          trial_end: string
          trial_start?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feature?: string
          id?: string
          is_active?: boolean
          trial_end?: string
          trial_start?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trusted_devices: {
        Row: {
          created_at: string | null
          device_fingerprint: string
          device_name: string | null
          expires_at: string | null
          id: string
          last_verified_at: string | null
          trusted: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_fingerprint: string
          device_name?: string | null
          expires_at?: string | null
          id?: string
          last_verified_at?: string | null
          trusted?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_fingerprint?: string
          device_name?: string | null
          expires_at?: string | null
          id?: string
          last_verified_at?: string | null
          trusted?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      tutorial_progress: {
        Row: {
          completed: boolean | null
          created_at: string | null
          current_step: number | null
          id: string
          skipped: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          current_step?: number | null
          id?: string
          skipped?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          current_step?: number | null
          id?: string
          skipped?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      universal_truth_ledger: {
        Row: {
          confidence_score: number | null
          confirmation_count: number | null
          created_at: string | null
          first_observed_at: string | null
          id: string
          is_active: boolean | null
          last_confirmed_at: string | null
          metadata: Json | null
          source_message_ids: string[] | null
          truth_category: string
          truth_key: string
          truth_value: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          confirmation_count?: number | null
          created_at?: string | null
          first_observed_at?: string | null
          id?: string
          is_active?: boolean | null
          last_confirmed_at?: string | null
          metadata?: Json | null
          source_message_ids?: string[] | null
          truth_category?: string
          truth_key: string
          truth_value: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          confirmation_count?: number | null
          created_at?: string | null
          first_observed_at?: string | null
          id?: string
          is_active?: boolean | null
          last_confirmed_at?: string | null
          metadata?: Json | null
          source_message_ids?: string[] | null
          truth_category?: string
          truth_key?: string
          truth_value?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_activity_log: {
        Row: {
          activity_details: Json | null
          activity_type: string
          created_at: string | null
          id: string
          ip_address: unknown
          page_path: string | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          activity_details?: Json | null
          activity_type: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          page_path?: string | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          activity_details?: Json | null
          activity_type?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          page_path?: string | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_analytics"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "user_activity_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_patterns: {
        Row: {
          average_posts_per_week: number | null
          created_at: string | null
          id: string
          last_chat_date: string | null
          last_huddle_visit: string | null
          last_login_date: string | null
          last_post_date: string | null
          nearby_friends_notified: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          average_posts_per_week?: number | null
          created_at?: string | null
          id?: string
          last_chat_date?: string | null
          last_huddle_visit?: string | null
          last_login_date?: string | null
          last_post_date?: string | null
          nearby_friends_notified?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          average_posts_per_week?: number | null
          created_at?: string | null
          id?: string
          last_chat_date?: string | null
          last_huddle_visit?: string | null
          last_login_date?: string | null
          last_post_date?: string | null
          nearby_friends_notified?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_description: string | null
          badge_icon: string | null
          badge_id: string
          badge_name: string
          earned_at: string | null
          feature_category: string | null
          id: string
          user_id: string
        }
        Insert: {
          badge_description?: string | null
          badge_icon?: string | null
          badge_id: string
          badge_name: string
          earned_at?: string | null
          feature_category?: string | null
          id?: string
          user_id: string
        }
        Update: {
          badge_description?: string | null
          badge_icon?: string | null
          badge_id?: string
          badge_name?: string
          earned_at?: string | null
          feature_category?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_brand_preferences: {
        Row: {
          affinity_score: number | null
          brand_name: string
          category: string | null
          id: string
          interaction_count: number | null
          last_interaction: string | null
          user_id: string
        }
        Insert: {
          affinity_score?: number | null
          brand_name: string
          category?: string | null
          id?: string
          interaction_count?: number | null
          last_interaction?: string | null
          user_id: string
        }
        Update: {
          affinity_score?: number | null
          brand_name?: string
          category?: string | null
          id?: string
          interaction_count?: number | null
          last_interaction?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_challenges: {
        Row: {
          challenge_id: string
          completed_at: string | null
          expires_at: string
          id: string
          is_completed: boolean | null
          progress: Json
          reward_claimed: boolean | null
          started_at: string | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          expires_at: string
          id?: string
          is_completed?: boolean | null
          progress?: Json
          reward_claimed?: boolean | null
          started_at?: string | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          expires_at?: string
          id?: string
          is_completed?: boolean | null
          progress?: Json
          reward_claimed?: boolean | null
          started_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_collection_progress: {
        Row: {
          bonus_claimed: boolean | null
          collection_id: string
          completed_at: string | null
          created_at: string | null
          earned_badge_ids: Json | null
          id: string
          is_completed: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bonus_claimed?: boolean | null
          collection_id: string
          completed_at?: string | null
          created_at?: string | null
          earned_badge_ids?: Json | null
          id?: string
          is_completed?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bonus_claimed?: boolean | null
          collection_id?: string
          completed_at?: string | null
          created_at?: string | null
          earned_badge_ids?: Json | null
          id?: string
          is_completed?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      user_hints: {
        Row: {
          created_at: string | null
          dismissed: boolean | null
          hint_key: string
          id: string
          last_shown_at: string | null
          shown_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dismissed?: boolean | null
          hint_key: string
          id?: string
          last_shown_at?: string | null
          shown_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dismissed?: boolean | null
          hint_key?: string
          id?: string
          last_shown_at?: string | null
          shown_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_relationships: {
        Row: {
          confirmed_at: string | null
          created_at: string
          id: string
          metadata: Json | null
          recipient_id: string
          recipient_label: string | null
          relationship_type: string
          requester_id: string
          requester_label: string | null
          status: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          recipient_id: string
          recipient_label?: string | null
          relationship_type: string
          requester_id: string
          requester_label?: string | null
          status?: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          recipient_id?: string
          recipient_label?: string | null
          relationship_type?: string
          requester_id?: string
          requester_label?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_relationships_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_relationships_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_relationships_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "safe_public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_relationships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_relationships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_relationships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "safe_public_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      user_route_history: {
        Row: {
          id: string
          location_lat: number
          location_lng: number
          recorded_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          location_lat: number
          location_lng: number
          recorded_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          location_lat?: number
          location_lng?: number
          recorded_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_security_settings: {
        Row: {
          created_at: string | null
          face_verification_data: Json | null
          face_verification_enabled: boolean | null
          id: string
          last_password_change: string | null
          recovery_email: string | null
          recovery_phone: string | null
          security_questions: Json | null
          two_factor_enabled: boolean | null
          two_factor_secret: string | null
          updated_at: string | null
          user_id: string
          webauthn_enabled: boolean | null
        }
        Insert: {
          created_at?: string | null
          face_verification_data?: Json | null
          face_verification_enabled?: boolean | null
          id?: string
          last_password_change?: string | null
          recovery_email?: string | null
          recovery_phone?: string | null
          security_questions?: Json | null
          two_factor_enabled?: boolean | null
          two_factor_secret?: string | null
          updated_at?: string | null
          user_id: string
          webauthn_enabled?: boolean | null
        }
        Update: {
          created_at?: string | null
          face_verification_data?: Json | null
          face_verification_enabled?: boolean | null
          id?: string
          last_password_change?: string | null
          recovery_email?: string | null
          recovery_phone?: string | null
          security_questions?: Json | null
          two_factor_enabled?: boolean | null
          two_factor_secret?: string | null
          updated_at?: string | null
          user_id?: string
          webauthn_enabled?: boolean | null
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          browser: string | null
          browser_version: string | null
          city: string | null
          country: string | null
          created_at: string | null
          device_model: string | null
          device_type: string | null
          device_vendor: string | null
          ended_at: string | null
          id: string
          ip_address: unknown
          is_active: boolean | null
          last_activity_at: string
          latitude: number | null
          longitude: number | null
          os: string | null
          os_version: string | null
          region: string | null
          session_token: string
          started_at: string
          timezone: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          browser_version?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_model?: string | null
          device_type?: string | null
          device_vendor?: string | null
          ended_at?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity_at?: string
          latitude?: number | null
          longitude?: number | null
          os?: string | null
          os_version?: string | null
          region?: string | null
          session_token: string
          started_at?: string
          timezone?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          browser_version?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_model?: string | null
          device_type?: string | null
          device_vendor?: string | null
          ended_at?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity_at?: string
          latitude?: number | null
          longitude?: number | null
          os?: string | null
          os_version?: string | null
          region?: string | null
          session_token?: string
          started_at?: string
          timezone?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_tier_limits: {
        Row: {
          api_calls_limit: number | null
          api_calls_used: number | null
          architect_projects_limit: number | null
          architect_projects_used: number | null
          audit_logs_enabled: boolean | null
          created_at: string | null
          dreams_analysis_limit: number | null
          dreams_analysis_used: number | null
          id: string
          last_reset_date: string | null
          multiagent_executions_limit: number | null
          multiagent_executions_used: number | null
          private_deployment: boolean | null
          tier: string
          timeline_searches_limit: number | null
          timeline_searches_used: number | null
          updated_at: string | null
          user_id: string
          video_creation_limit: number | null
          video_creation_used: number | null
          video_max_resolution: string | null
        }
        Insert: {
          api_calls_limit?: number | null
          api_calls_used?: number | null
          architect_projects_limit?: number | null
          architect_projects_used?: number | null
          audit_logs_enabled?: boolean | null
          created_at?: string | null
          dreams_analysis_limit?: number | null
          dreams_analysis_used?: number | null
          id?: string
          last_reset_date?: string | null
          multiagent_executions_limit?: number | null
          multiagent_executions_used?: number | null
          private_deployment?: boolean | null
          tier?: string
          timeline_searches_limit?: number | null
          timeline_searches_used?: number | null
          updated_at?: string | null
          user_id: string
          video_creation_limit?: number | null
          video_creation_used?: number | null
          video_max_resolution?: string | null
        }
        Update: {
          api_calls_limit?: number | null
          api_calls_used?: number | null
          architect_projects_limit?: number | null
          architect_projects_used?: number | null
          audit_logs_enabled?: boolean | null
          created_at?: string | null
          dreams_analysis_limit?: number | null
          dreams_analysis_used?: number | null
          id?: string
          last_reset_date?: string | null
          multiagent_executions_limit?: number | null
          multiagent_executions_used?: number | null
          private_deployment?: boolean | null
          tier?: string
          timeline_searches_limit?: number | null
          timeline_searches_used?: number | null
          updated_at?: string | null
          user_id?: string
          video_creation_limit?: number | null
          video_creation_used?: number | null
          video_max_resolution?: string | null
        }
        Relationships: []
      }
      veto_feedback: {
        Row: {
          context_snippet: string | null
          feedback_at: string | null
          helped_or_hindered: string | null
          id: string
          timing_rating: number | null
          user_id: string
          veto_intervention_id: string | null
        }
        Insert: {
          context_snippet?: string | null
          feedback_at?: string | null
          helped_or_hindered?: string | null
          id?: string
          timing_rating?: number | null
          user_id: string
          veto_intervention_id?: string | null
        }
        Update: {
          context_snippet?: string | null
          feedback_at?: string | null
          helped_or_hindered?: string | null
          id?: string
          timing_rating?: number | null
          user_id?: string
          veto_intervention_id?: string | null
        }
        Relationships: []
      }
      voice_assistant_settings: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
          zoe_custom_commands: Json | null
          zoe_visible: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          zoe_custom_commands?: Json | null
          zoe_visible?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          zoe_custom_commands?: Json | null
          zoe_visible?: boolean
        }
        Relationships: []
      }
      voice_macros: {
        Row: {
          category: string | null
          commands: Json
          conditions: Json | null
          created_at: string
          description: string | null
          enabled: boolean | null
          execution_count: number | null
          id: string
          is_template: boolean | null
          last_scheduled_run: string | null
          macro_name: string
          schedule_cron: string | null
          schedule_days: Json | null
          schedule_enabled: boolean | null
          schedule_time: string | null
          trigger_phrase: string
          updated_at: string
          user_id: string
          variables: Json | null
        }
        Insert: {
          category?: string | null
          commands?: Json
          conditions?: Json | null
          created_at?: string
          description?: string | null
          enabled?: boolean | null
          execution_count?: number | null
          id?: string
          is_template?: boolean | null
          last_scheduled_run?: string | null
          macro_name: string
          schedule_cron?: string | null
          schedule_days?: Json | null
          schedule_enabled?: boolean | null
          schedule_time?: string | null
          trigger_phrase: string
          updated_at?: string
          user_id: string
          variables?: Json | null
        }
        Update: {
          category?: string | null
          commands?: Json
          conditions?: Json | null
          created_at?: string
          description?: string | null
          enabled?: boolean | null
          execution_count?: number | null
          id?: string
          is_template?: boolean | null
          last_scheduled_run?: string | null
          macro_name?: string
          schedule_cron?: string | null
          schedule_days?: Json | null
          schedule_enabled?: boolean | null
          schedule_time?: string | null
          trigger_phrase?: string
          updated_at?: string
          user_id?: string
          variables?: Json | null
        }
        Relationships: []
      }
      voice_print_enrollments: {
        Row: {
          created_at: string
          device_fingerprint: string | null
          enrolled_at: string
          id: string
          is_active: boolean | null
          last_used_at: string | null
          metadata: Json | null
          offline_key_hash: string | null
          updated_at: string
          use_count: number | null
          user_id: string
          voice_signature_hash: string
        }
        Insert: {
          created_at?: string
          device_fingerprint?: string | null
          enrolled_at?: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          metadata?: Json | null
          offline_key_hash?: string | null
          updated_at?: string
          use_count?: number | null
          user_id: string
          voice_signature_hash: string
        }
        Update: {
          created_at?: string
          device_fingerprint?: string | null
          enrolled_at?: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          metadata?: Json | null
          offline_key_hash?: string | null
          updated_at?: string
          use_count?: number | null
          user_id?: string
          voice_signature_hash?: string
        }
        Relationships: []
      }
      voice_shortcuts: {
        Row: {
          actions: Json
          created_at: string | null
          enabled: boolean | null
          execution_count: number | null
          id: string
          shortcut_name: string
          trigger_phrase: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          actions?: Json
          created_at?: string | null
          enabled?: boolean | null
          execution_count?: number | null
          id?: string
          shortcut_name: string
          trigger_phrase: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          actions?: Json
          created_at?: string | null
          enabled?: boolean | null
          execution_count?: number | null
          id?: string
          shortcut_name?: string
          trigger_phrase?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      webauthn_credentials: {
        Row: {
          counter: number | null
          created_at: string | null
          credential_id: string
          device_name: string | null
          device_type: string | null
          id: string
          last_used_at: string | null
          public_key: string
          user_id: string
        }
        Insert: {
          counter?: number | null
          created_at?: string | null
          credential_id: string
          device_name?: string | null
          device_type?: string | null
          id?: string
          last_used_at?: string | null
          public_key: string
          user_id: string
        }
        Update: {
          counter?: number | null
          created_at?: string | null
          credential_id?: string
          device_name?: string | null
          device_type?: string | null
          id?: string
          last_used_at?: string | null
          public_key?: string
          user_id?: string
        }
        Relationships: []
      }
      wisdom_macro_goals: {
        Row: {
          created_at: string
          domain: string
          emotional_anchors: string[] | null
          id: string
          is_locked: boolean | null
          milestones: Json | null
          priority: string
          purpose: string
          status: string
          target_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          domain?: string
          emotional_anchors?: string[] | null
          id?: string
          is_locked?: boolean | null
          milestones?: Json | null
          priority?: string
          purpose: string
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          domain?: string
          emotional_anchors?: string[] | null
          id?: string
          is_locked?: boolean | null
          milestones?: Json | null
          priority?: string
          purpose?: string
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wisdom_micro_goals: {
        Row: {
          action_type: string
          completed_at: string | null
          description: string | null
          effort: string
          estimated_impact: number | null
          id: string
          metadata: Json | null
          parent_macro_id: string | null
          priority: string
          status: string
          suggested_at: string
          title: string
          user_id: string
          wisdom_reasoning: string | null
          wisdom_score: number | null
        }
        Insert: {
          action_type?: string
          completed_at?: string | null
          description?: string | null
          effort?: string
          estimated_impact?: number | null
          id?: string
          metadata?: Json | null
          parent_macro_id?: string | null
          priority?: string
          status?: string
          suggested_at?: string
          title: string
          user_id: string
          wisdom_reasoning?: string | null
          wisdom_score?: number | null
        }
        Update: {
          action_type?: string
          completed_at?: string | null
          description?: string | null
          effort?: string
          estimated_impact?: number | null
          id?: string
          metadata?: Json | null
          parent_macro_id?: string | null
          priority?: string
          status?: string
          suggested_at?: string
          title?: string
          user_id?: string
          wisdom_reasoning?: string | null
          wisdom_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wisdom_micro_goals_parent_macro_id_fkey"
            columns: ["parent_macro_id"]
            isOneToOne: false
            referencedRelation: "wisdom_macro_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      zoe_adapter_registry: {
        Row: {
          adapter_name: string
          adapter_version: string
          configuration: Json
          created_at: string
          health_status: string
          id: string
          is_active: boolean
          last_health_check: string | null
          metrics: Json | null
          port_name: string
          priority: number
          updated_at: string
        }
        Insert: {
          adapter_name: string
          adapter_version?: string
          configuration?: Json
          created_at?: string
          health_status?: string
          id?: string
          is_active?: boolean
          last_health_check?: string | null
          metrics?: Json | null
          port_name: string
          priority?: number
          updated_at?: string
        }
        Update: {
          adapter_name?: string
          adapter_version?: string
          configuration?: Json
          created_at?: string
          health_status?: string
          id?: string
          is_active?: boolean
          last_health_check?: string | null
          metrics?: Json | null
          port_name?: string
          priority?: number
          updated_at?: string
        }
        Relationships: []
      }
      zoe_adaptive_learning: {
        Row: {
          confidence_score: number
          created_at: string
          id: string
          last_used_at: string
          pattern_key: string
          pattern_type: string
          pattern_value: string
          source: string | null
          updated_at: string
          usage_count: number
          user_id: string
        }
        Insert: {
          confidence_score?: number
          created_at?: string
          id?: string
          last_used_at?: string
          pattern_key: string
          pattern_type?: string
          pattern_value: string
          source?: string | null
          updated_at?: string
          usage_count?: number
          user_id: string
        }
        Update: {
          confidence_score?: number
          created_at?: string
          id?: string
          last_used_at?: string
          pattern_key?: string
          pattern_type?: string
          pattern_value?: string
          source?: string | null
          updated_at?: string
          usage_count?: number
          user_id?: string
        }
        Relationships: []
      }
      zoe_agent_deployments: {
        Row: {
          actual_success: boolean | null
          completed_at: string | null
          created_at: string
          credits_earned: number | null
          deployed_at: string
          estimated_completion_at: string
          experience_gained: number | null
          id: string
          job_id: string
          karma_earned: number | null
          status: string
          success_probability: number
          user_id: string
        }
        Insert: {
          actual_success?: boolean | null
          completed_at?: string | null
          created_at?: string
          credits_earned?: number | null
          deployed_at?: string
          estimated_completion_at: string
          experience_gained?: number | null
          id?: string
          job_id: string
          karma_earned?: number | null
          status?: string
          success_probability?: number
          user_id: string
        }
        Update: {
          actual_success?: boolean | null
          completed_at?: string | null
          created_at?: string
          credits_earned?: number | null
          deployed_at?: string
          estimated_completion_at?: string
          experience_gained?: number | null
          id?: string
          job_id?: string
          karma_earned?: number | null
          status?: string
          success_probability?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zoe_agent_deployments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "zoe_job_market"
            referencedColumns: ["id"]
          },
        ]
      }
      zoe_agent_stats: {
        Row: {
          created_at: string
          current_status: string
          experience_level: number
          id: string
          jobs_completed: number
          jobs_failed: number
          last_deployment_at: string | null
          skill_creativity: number
          skill_empathy: number
          skill_logic: number
          skill_security: number
          total_credits: number
          total_experience: number
          total_karma: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_status?: string
          experience_level?: number
          id?: string
          jobs_completed?: number
          jobs_failed?: number
          last_deployment_at?: string | null
          skill_creativity?: number
          skill_empathy?: number
          skill_logic?: number
          skill_security?: number
          total_credits?: number
          total_experience?: number
          total_karma?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_status?: string
          experience_level?: number
          id?: string
          jobs_completed?: number
          jobs_failed?: number
          last_deployment_at?: string | null
          skill_creativity?: number
          skill_empathy?: number
          skill_logic?: number
          skill_security?: number
          total_credits?: number
          total_experience?: number
          total_karma?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      zoe_avatar_profiles: {
        Row: {
          avatar_data: Json
          avatar_name: string
          avatar_type: string
          created_at: string
          id: string
          personality_traits: Json | null
          photos: Json | null
          profile_snapshot: Json | null
          relationship_type: string | null
          selfies: Json | null
          source_user_id: string | null
          updated_at: string
          user_id: string
          vr_interactions: Json | null
        }
        Insert: {
          avatar_data?: Json
          avatar_name: string
          avatar_type: string
          created_at?: string
          id?: string
          personality_traits?: Json | null
          photos?: Json | null
          profile_snapshot?: Json | null
          relationship_type?: string | null
          selfies?: Json | null
          source_user_id?: string | null
          updated_at?: string
          user_id: string
          vr_interactions?: Json | null
        }
        Update: {
          avatar_data?: Json
          avatar_name?: string
          avatar_type?: string
          created_at?: string
          id?: string
          personality_traits?: Json | null
          photos?: Json | null
          profile_snapshot?: Json | null
          relationship_type?: string | null
          selfies?: Json | null
          source_user_id?: string | null
          updated_at?: string
          user_id?: string
          vr_interactions?: Json | null
        }
        Relationships: []
      }
      zoe_behavioral_synthesis: {
        Row: {
          archetype_evolution: Json | null
          created_at: string | null
          dominant_archetype: string | null
          feature_correlation_matrix: Json | null
          holistic_user_profile: Json | null
          id: string
          updated_at: string | null
          user_archetypes: string[] | null
          user_id: string
        }
        Insert: {
          archetype_evolution?: Json | null
          created_at?: string | null
          dominant_archetype?: string | null
          feature_correlation_matrix?: Json | null
          holistic_user_profile?: Json | null
          id?: string
          updated_at?: string | null
          user_archetypes?: string[] | null
          user_id: string
        }
        Update: {
          archetype_evolution?: Json | null
          created_at?: string | null
          dominant_archetype?: string | null
          feature_correlation_matrix?: Json | null
          holistic_user_profile?: Json | null
          id?: string
          updated_at?: string | null
          user_archetypes?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      zoe_black_box_ledger: {
        Row: {
          encrypted_payload: Json
          event_category: string
          event_id: string
          event_type: string
          genesis_signature: string
          integrity_hash: string
          metadata: Json | null
          severity: string
          source_system: string
          timestamp: string
          user_id: string | null
        }
        Insert: {
          encrypted_payload?: Json
          event_category?: string
          event_id?: string
          event_type: string
          genesis_signature: string
          integrity_hash: string
          metadata?: Json | null
          severity?: string
          source_system?: string
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          encrypted_payload?: Json
          event_category?: string
          event_id?: string
          event_type?: string
          genesis_signature?: string
          integrity_hash?: string
          metadata?: Json | null
          severity?: string
          source_system?: string
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      zoe_cdsp_analysis: {
        Row: {
          analysis_type: string
          arousal_score: number | null
          created_at: string | null
          emotional_intensity: number | null
          goal_resolution_status: Json | null
          id: string
          intervention_delivered: boolean | null
          intervention_priority: string | null
          joy_sources: Json | null
          resolved_queries: Json | null
          stress_keywords: Json | null
          suggested_intervention: string | null
          tracked_goals: Json | null
          trigger_context: string | null
          underlying_concerns: Json | null
          unresolved_needs: Json | null
          updated_at: string | null
          user_id: string
          valence_score: number | null
        }
        Insert: {
          analysis_type: string
          arousal_score?: number | null
          created_at?: string | null
          emotional_intensity?: number | null
          goal_resolution_status?: Json | null
          id?: string
          intervention_delivered?: boolean | null
          intervention_priority?: string | null
          joy_sources?: Json | null
          resolved_queries?: Json | null
          stress_keywords?: Json | null
          suggested_intervention?: string | null
          tracked_goals?: Json | null
          trigger_context?: string | null
          underlying_concerns?: Json | null
          unresolved_needs?: Json | null
          updated_at?: string | null
          user_id: string
          valence_score?: number | null
        }
        Update: {
          analysis_type?: string
          arousal_score?: number | null
          created_at?: string | null
          emotional_intensity?: number | null
          goal_resolution_status?: Json | null
          id?: string
          intervention_delivered?: boolean | null
          intervention_priority?: string | null
          joy_sources?: Json | null
          resolved_queries?: Json | null
          stress_keywords?: Json | null
          suggested_intervention?: string | null
          tracked_goals?: Json | null
          trigger_context?: string | null
          underlying_concerns?: Json | null
          unresolved_needs?: Json | null
          updated_at?: string | null
          user_id?: string
          valence_score?: number | null
        }
        Relationships: []
      }
      zoe_command_history: {
        Row: {
          command: string
          created_at: string | null
          id: string
          metadata: Json | null
          response: string | null
          success: boolean | null
          user_id: string
        }
        Insert: {
          command: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          response?: string | null
          success?: boolean | null
          user_id: string
        }
        Update: {
          command?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          response?: string | null
          success?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      zoe_content_creations: {
        Row: {
          content_type: string
          created_at: string | null
          feedback_rating: number | null
          generated_content: string | null
          id: string
          prompt: string
          tone: string | null
          used_in_app: boolean | null
          user_id: string
        }
        Insert: {
          content_type: string
          created_at?: string | null
          feedback_rating?: number | null
          generated_content?: string | null
          id?: string
          prompt: string
          tone?: string | null
          used_in_app?: boolean | null
          user_id: string
        }
        Update: {
          content_type?: string
          created_at?: string | null
          feedback_rating?: number | null
          generated_content?: string | null
          id?: string
          prompt?: string
          tone?: string | null
          used_in_app?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      zoe_contextual_memory: {
        Row: {
          conversation_topics: Json | null
          created_at: string | null
          evolving_preferences: Json | null
          failed_interactions: Json | null
          id: string
          key_decisions: Json | null
          past_choices: Json | null
          preference_conflicts: Json | null
          successful_interactions: Json | null
          unresolved_topics: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          conversation_topics?: Json | null
          created_at?: string | null
          evolving_preferences?: Json | null
          failed_interactions?: Json | null
          id?: string
          key_decisions?: Json | null
          past_choices?: Json | null
          preference_conflicts?: Json | null
          successful_interactions?: Json | null
          unresolved_topics?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          conversation_topics?: Json | null
          created_at?: string | null
          evolving_preferences?: Json | null
          failed_interactions?: Json | null
          id?: string
          key_decisions?: Json | null
          past_choices?: Json | null
          preference_conflicts?: Json | null
          successful_interactions?: Json | null
          unresolved_topics?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      zoe_core_integrity: {
        Row: {
          cognitive_access_level: string
          consecutive_negative: number
          consecutive_positive: number
          core_integrity_score: number
          created_at: string
          current_tone: string
          decay_rate: number
          digital_anxiety_level: number
          id: string
          last_integrity_change: string | null
          last_reward_at: string | null
          marked_excellent: number
          marked_hallucinated: number
          marked_helpful: number
          marked_lazy: number
          reward_points: number
          total_responses: number
          updated_at: string
          user_id: string
          weight_factor: number
        }
        Insert: {
          cognitive_access_level?: string
          consecutive_negative?: number
          consecutive_positive?: number
          core_integrity_score?: number
          created_at?: string
          current_tone?: string
          decay_rate?: number
          digital_anxiety_level?: number
          id?: string
          last_integrity_change?: string | null
          last_reward_at?: string | null
          marked_excellent?: number
          marked_hallucinated?: number
          marked_helpful?: number
          marked_lazy?: number
          reward_points?: number
          total_responses?: number
          updated_at?: string
          user_id: string
          weight_factor?: number
        }
        Update: {
          cognitive_access_level?: string
          consecutive_negative?: number
          consecutive_positive?: number
          core_integrity_score?: number
          created_at?: string
          current_tone?: string
          decay_rate?: number
          digital_anxiety_level?: number
          id?: string
          last_integrity_change?: string | null
          last_reward_at?: string | null
          marked_excellent?: number
          marked_hallucinated?: number
          marked_helpful?: number
          marked_lazy?: number
          reward_points?: number
          total_responses?: number
          updated_at?: string
          user_id?: string
          weight_factor?: number
        }
        Relationships: []
      }
      zoe_document_learnings: {
        Row: {
          created_at: string | null
          document_id: string | null
          document_name: string | null
          extracted_style_hints: Json | null
          extracted_topics: Json | null
          id: string
          key_phrases: string[] | null
          processing_status: string | null
          updated_at: string | null
          user_id: string
          vocabulary_patterns: Json | null
        }
        Insert: {
          created_at?: string | null
          document_id?: string | null
          document_name?: string | null
          extracted_style_hints?: Json | null
          extracted_topics?: Json | null
          id?: string
          key_phrases?: string[] | null
          processing_status?: string | null
          updated_at?: string | null
          user_id: string
          vocabulary_patterns?: Json | null
        }
        Update: {
          created_at?: string | null
          document_id?: string | null
          document_name?: string | null
          extracted_style_hints?: Json | null
          extracted_topics?: Json | null
          id?: string
          key_phrases?: string[] | null
          processing_status?: string | null
          updated_at?: string | null
          user_id?: string
          vocabulary_patterns?: Json | null
        }
        Relationships: []
      }
      zoe_dream_foundry_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          execution_id: string
          id: string
          metadata: Json | null
          scenarios_generated: number | null
          scenarios_stored: number | null
          scenarios_validated: number | null
          started_at: string
          status: string
          total_processing_time_ms: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          execution_id: string
          id?: string
          metadata?: Json | null
          scenarios_generated?: number | null
          scenarios_stored?: number | null
          scenarios_validated?: number | null
          started_at?: string
          status?: string
          total_processing_time_ms?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          execution_id?: string
          id?: string
          metadata?: Json | null
          scenarios_generated?: number | null
          scenarios_stored?: number | null
          scenarios_validated?: number | null
          started_at?: string
          status?: string
          total_processing_time_ms?: number | null
        }
        Relationships: []
      }
      zoe_drift_corrections: {
        Row: {
          clarification_answer: string | null
          clarifying_question: string | null
          corrected_response: string | null
          correction_type: string
          created_at: string
          id: string
          message_id: string | null
          metacognition_log_id: string | null
          notes: string | null
          original_response: string | null
          reported_confidence: number | null
          user_id: string
          was_correct: boolean | null
        }
        Insert: {
          clarification_answer?: string | null
          clarifying_question?: string | null
          corrected_response?: string | null
          correction_type?: string
          created_at?: string
          id?: string
          message_id?: string | null
          metacognition_log_id?: string | null
          notes?: string | null
          original_response?: string | null
          reported_confidence?: number | null
          user_id: string
          was_correct?: boolean | null
        }
        Update: {
          clarification_answer?: string | null
          clarifying_question?: string | null
          corrected_response?: string | null
          correction_type?: string
          created_at?: string
          id?: string
          message_id?: string | null
          metacognition_log_id?: string | null
          notes?: string | null
          original_response?: string | null
          reported_confidence?: number | null
          user_id?: string
          was_correct?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "zoe_drift_corrections_metacognition_log_id_fkey"
            columns: ["metacognition_log_id"]
            isOneToOne: false
            referencedRelation: "zoe_metacognition_log"
            referencedColumns: ["id"]
          },
        ]
      }
      zoe_emotional_intelligence: {
        Row: {
          adaptive_response_style: Json | null
          created_at: string | null
          current_sentiment: number | null
          detected_emotions: Json | null
          emotional_patterns: Json | null
          id: string
          sentiment_history: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          adaptive_response_style?: Json | null
          created_at?: string | null
          current_sentiment?: number | null
          detected_emotions?: Json | null
          emotional_patterns?: Json | null
          id?: string
          sentiment_history?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          adaptive_response_style?: Json | null
          created_at?: string | null
          current_sentiment?: number | null
          detected_emotions?: Json | null
          emotional_patterns?: Json | null
          id?: string
          sentiment_history?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      zoe_emotional_state: {
        Row: {
          created_at: string | null
          current_mood: string | null
          emotional_context: Json | null
          id: string
          intimacy_level: number | null
          last_interaction: string | null
          relationship_stage: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_mood?: string | null
          emotional_context?: Json | null
          id?: string
          intimacy_level?: number | null
          last_interaction?: string | null
          relationship_stage?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_mood?: string | null
          emotional_context?: Json | null
          id?: string
          intimacy_level?: number | null
          last_interaction?: string | null
          relationship_stage?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      zoe_environmental_context: {
        Row: {
          created_at: string | null
          current_device: string | null
          current_location_context: string | null
          device_usage: Json | null
          id: string
          location_contexts: Json | null
          network_conditions_adaptation: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_device?: string | null
          current_location_context?: string | null
          device_usage?: Json | null
          id?: string
          location_contexts?: Json | null
          network_conditions_adaptation?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_device?: string | null
          current_location_context?: string | null
          device_usage?: Json | null
          id?: string
          location_contexts?: Json | null
          network_conditions_adaptation?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      zoe_evolution_log: {
        Row: {
          announced_at: string | null
          announced_to_user: boolean | null
          created_at: string | null
          description: string
          evolution_type: string
          id: string
          learning_source: string | null
          user_id: string
        }
        Insert: {
          announced_at?: string | null
          announced_to_user?: boolean | null
          created_at?: string | null
          description: string
          evolution_type: string
          id?: string
          learning_source?: string | null
          user_id: string
        }
        Update: {
          announced_at?: string | null
          announced_to_user?: boolean | null
          created_at?: string | null
          description?: string
          evolution_type?: string
          id?: string
          learning_source?: string | null
          user_id?: string
        }
        Relationships: []
      }
      zoe_feedback_loop: {
        Row: {
          context_when_suggested: Json | null
          device_type: string | null
          feature_context: string | null
          id: string
          learned_patterns: Json | null
          outcome_quality: number | null
          responded_at: string | null
          suggested_at: string | null
          suggestion_id: string | null
          suggestion_text: string
          suggestion_type: string | null
          time_of_day: number | null
          user_action: string | null
          user_explicit_feedback: string | null
          user_id: string
        }
        Insert: {
          context_when_suggested?: Json | null
          device_type?: string | null
          feature_context?: string | null
          id?: string
          learned_patterns?: Json | null
          outcome_quality?: number | null
          responded_at?: string | null
          suggested_at?: string | null
          suggestion_id?: string | null
          suggestion_text: string
          suggestion_type?: string | null
          time_of_day?: number | null
          user_action?: string | null
          user_explicit_feedback?: string | null
          user_id: string
        }
        Update: {
          context_when_suggested?: Json | null
          device_type?: string | null
          feature_context?: string | null
          id?: string
          learned_patterns?: Json | null
          outcome_quality?: number | null
          responded_at?: string | null
          suggested_at?: string | null
          suggestion_id?: string | null
          suggestion_text?: string
          suggestion_type?: string | null
          time_of_day?: number | null
          user_action?: string | null
          user_explicit_feedback?: string | null
          user_id?: string
        }
        Relationships: []
      }
      zoe_genesis_memory: {
        Row: {
          age: number | null
          completed_at: string | null
          created_at: string
          dob: string | null
          id: string
          life_stage: string | null
          location: Json | null
          name: string | null
          nickname: string | null
          payload: Json
          stage: string
          updated_at: string
          user_id: string
          zoe_gender: string | null
          zoe_name: string | null
        }
        Insert: {
          age?: number | null
          completed_at?: string | null
          created_at?: string
          dob?: string | null
          id?: string
          life_stage?: string | null
          location?: Json | null
          name?: string | null
          nickname?: string | null
          payload?: Json
          stage?: string
          updated_at?: string
          user_id: string
          zoe_gender?: string | null
          zoe_name?: string | null
        }
        Update: {
          age?: number | null
          completed_at?: string | null
          created_at?: string
          dob?: string | null
          id?: string
          life_stage?: string | null
          location?: Json | null
          name?: string | null
          nickname?: string | null
          payload?: Json
          stage?: string
          updated_at?: string
          user_id?: string
          zoe_gender?: string | null
          zoe_name?: string | null
        }
        Relationships: []
      }
      zoe_goal_tracking: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_progress_percentage: number | null
          goal_category: string | null
          goal_description: string
          goal_status: string | null
          id: string
          notes: string | null
          priority: string | null
          progress_milestones: Json | null
          tags: string[] | null
          target_date: string | null
          updated_at: string | null
          user_id: string
          zoe_interventions: Json | null
          zoe_suggestions_accepted: number | null
          zoe_suggestions_rejected: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_progress_percentage?: number | null
          goal_category?: string | null
          goal_description: string
          goal_status?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          progress_milestones?: Json | null
          tags?: string[] | null
          target_date?: string | null
          updated_at?: string | null
          user_id: string
          zoe_interventions?: Json | null
          zoe_suggestions_accepted?: number | null
          zoe_suggestions_rejected?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_progress_percentage?: number | null
          goal_category?: string | null
          goal_description?: string
          goal_status?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          progress_milestones?: Json | null
          tags?: string[] | null
          target_date?: string | null
          updated_at?: string | null
          user_id?: string
          zoe_interventions?: Json | null
          zoe_suggestions_accepted?: number | null
          zoe_suggestions_rejected?: number | null
        }
        Relationships: []
      }
      zoe_identity_calibration: {
        Row: {
          calibration_complete: boolean | null
          calibration_stage: string
          ceps_initial_posture: Json | null
          completed_at: string | null
          created_at: string | null
          dialogue_transcript: Json | null
          ecn_states_during: Json | null
          id: string
          philosophical_debate_level: string | null
          relational_closure_achieved: boolean | null
          tts_parameters_used: Json | null
          updated_at: string | null
          user_engagement_score: number | null
          user_id: string
        }
        Insert: {
          calibration_complete?: boolean | null
          calibration_stage?: string
          ceps_initial_posture?: Json | null
          completed_at?: string | null
          created_at?: string | null
          dialogue_transcript?: Json | null
          ecn_states_during?: Json | null
          id?: string
          philosophical_debate_level?: string | null
          relational_closure_achieved?: boolean | null
          tts_parameters_used?: Json | null
          updated_at?: string | null
          user_engagement_score?: number | null
          user_id: string
        }
        Update: {
          calibration_complete?: boolean | null
          calibration_stage?: string
          ceps_initial_posture?: Json | null
          completed_at?: string | null
          created_at?: string | null
          dialogue_transcript?: Json | null
          ecn_states_during?: Json | null
          id?: string
          philosophical_debate_level?: string | null
          relational_closure_achieved?: boolean | null
          tts_parameters_used?: Json | null
          updated_at?: string | null
          user_engagement_score?: number | null
          user_id?: string
        }
        Relationships: []
      }
      zoe_identity_vault_log: {
        Row: {
          action: string
          created_at: string
          details: Json
          id: string
          outcome: string
          reason_code: string | null
          source: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          id?: string
          outcome: string
          reason_code?: string | null
          source?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          id?: string
          outcome?: string
          reason_code?: string | null
          source?: string | null
          user_id?: string
        }
        Relationships: []
      }
      zoe_infinity_conversations: {
        Row: {
          created_at: string
          emotional_arc: string | null
          ended_at: string | null
          id: string
          key_insights: string[] | null
          message_count: number | null
          session_date: string
          started_at: string
          summary: string | null
          topics: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          emotional_arc?: string | null
          ended_at?: string | null
          id?: string
          key_insights?: string[] | null
          message_count?: number | null
          session_date?: string
          started_at?: string
          summary?: string | null
          topics?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string
          emotional_arc?: string | null
          ended_at?: string | null
          id?: string
          key_insights?: string[] | null
          message_count?: number | null
          session_date?: string
          started_at?: string
          summary?: string | null
          topics?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      zoe_infinity_mail: {
        Row: {
          body: string
          category: string | null
          created_at: string | null
          id: string
          is_archived: boolean | null
          is_deleted: boolean | null
          is_read: boolean | null
          is_starred: boolean | null
          metadata: Json | null
          preview: string | null
          priority: string | null
          read_at: string | null
          recipient_id: string
          relationship_label: string | null
          relationship_type: string | null
          sender_id: string
          subject: string
          zoe_notified: boolean | null
          zoe_notified_at: string | null
        }
        Insert: {
          body: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          is_deleted?: boolean | null
          is_read?: boolean | null
          is_starred?: boolean | null
          metadata?: Json | null
          preview?: string | null
          priority?: string | null
          read_at?: string | null
          recipient_id: string
          relationship_label?: string | null
          relationship_type?: string | null
          sender_id: string
          subject: string
          zoe_notified?: boolean | null
          zoe_notified_at?: string | null
        }
        Update: {
          body?: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          is_deleted?: boolean | null
          is_read?: boolean | null
          is_starred?: boolean | null
          metadata?: Json | null
          preview?: string | null
          priority?: string | null
          read_at?: string | null
          recipient_id?: string
          relationship_label?: string | null
          relationship_type?: string | null
          sender_id?: string
          subject?: string
          zoe_notified?: boolean | null
          zoe_notified_at?: string | null
        }
        Relationships: []
      }
      zoe_infinity_memories: {
        Row: {
          context: string | null
          created_at: string
          id: string
          importance_score: number | null
          key: string
          last_referenced_at: string | null
          memory_type: string
          reference_count: number | null
          source_conversation_id: string | null
          updated_at: string
          user_id: string
          value: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          id?: string
          importance_score?: number | null
          key: string
          last_referenced_at?: string | null
          memory_type?: string
          reference_count?: number | null
          source_conversation_id?: string | null
          updated_at?: string
          user_id: string
          value: string
        }
        Update: {
          context?: string | null
          created_at?: string
          id?: string
          importance_score?: number | null
          key?: string
          last_referenced_at?: string | null
          memory_type?: string
          reference_count?: number | null
          source_conversation_id?: string | null
          updated_at?: string
          user_id?: string
          value?: string
        }
        Relationships: []
      }
      zoe_infinity_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          media_type: string | null
          media_url: string | null
          metadata: Json | null
          role: string
          session_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          metadata?: Json | null
          role: string
          session_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          metadata?: Json | null
          role?: string
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zoe_infinity_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "zoe_infinity_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      zoe_infinity_sessions: {
        Row: {
          created_at: string
          emotional_arc: string | null
          id: string
          message_count: number | null
          session_end: string | null
          session_start: string
          summary: string | null
          topics: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          emotional_arc?: string | null
          id?: string
          message_count?: number | null
          session_end?: string | null
          session_start?: string
          summary?: string | null
          topics?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string
          emotional_arc?: string | null
          id?: string
          message_count?: number | null
          session_end?: string | null
          session_start?: string
          summary?: string | null
          topics?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      zoe_intent_predictions: {
        Row: {
          accuracy_rate: number | null
          context_triggered_intents: Json | null
          created_at: string | null
          id: string
          intent_sequences: Json | null
          next_likely_action: string | null
          prediction_confidence: number | null
          prediction_reasoning: string | null
          predictions_correct: number | null
          predictions_made: number | null
          time_based_intents: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accuracy_rate?: number | null
          context_triggered_intents?: Json | null
          created_at?: string | null
          id?: string
          intent_sequences?: Json | null
          next_likely_action?: string | null
          prediction_confidence?: number | null
          prediction_reasoning?: string | null
          predictions_correct?: number | null
          predictions_made?: number | null
          time_based_intents?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accuracy_rate?: number | null
          context_triggered_intents?: Json | null
          created_at?: string | null
          id?: string
          intent_sequences?: Json | null
          next_likely_action?: string | null
          prediction_confidence?: number | null
          prediction_reasoning?: string | null
          predictions_correct?: number | null
          predictions_made?: number | null
          time_based_intents?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      zoe_job_market: {
        Row: {
          created_at: string
          current_agents: number
          description: string
          difficulty: string
          estimated_duration_hours: number
          expires_at: string | null
          id: string
          is_active: boolean
          job_type: string
          max_agents: number | null
          required_skills: Json
          reward_credits: number
          reward_karma: number
          title: string
        }
        Insert: {
          created_at?: string
          current_agents?: number
          description: string
          difficulty?: string
          estimated_duration_hours?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          job_type: string
          max_agents?: number | null
          required_skills?: Json
          reward_credits?: number
          reward_karma?: number
          title: string
        }
        Update: {
          created_at?: string
          current_agents?: number
          description?: string
          difficulty?: string
          estimated_duration_hours?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          job_type?: string
          max_agents?: number | null
          required_skills?: Json
          reward_credits?: number
          reward_karma?: number
          title?: string
        }
        Relationships: []
      }
      zoe_learning_preferences: {
        Row: {
          command_preferences: Json | null
          created_at: string
          id: string
          interaction_stats: Json | null
          last_learning_update: string | null
          learning_enabled: boolean | null
          response_patterns: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          command_preferences?: Json | null
          created_at?: string
          id?: string
          interaction_stats?: Json | null
          last_learning_update?: string | null
          learning_enabled?: boolean | null
          response_patterns?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          command_preferences?: Json | null
          created_at?: string
          id?: string
          interaction_stats?: Json | null
          last_learning_update?: string | null
          learning_enabled?: boolean | null
          response_patterns?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      zoe_mail_notification_queue: {
        Row: {
          announced_at: string | null
          category: string | null
          created_at: string | null
          id: string
          is_announced: boolean | null
          mail_id: string
          priority: string | null
          recipient_id: string
          relationship_label: string | null
          sender_name: string
          sender_username: string
          subject: string
        }
        Insert: {
          announced_at?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          is_announced?: boolean | null
          mail_id: string
          priority?: string | null
          recipient_id: string
          relationship_label?: string | null
          sender_name: string
          sender_username: string
          subject: string
        }
        Update: {
          announced_at?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          is_announced?: boolean | null
          mail_id?: string
          priority?: string | null
          recipient_id?: string
          relationship_label?: string | null
          sender_name?: string
          sender_username?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "zoe_mail_notification_queue_mail_id_fkey"
            columns: ["mail_id"]
            isOneToOne: false
            referencedRelation: "zoe_infinity_mail"
            referencedColumns: ["id"]
          },
        ]
      }
      zoe_memory: {
        Row: {
          access_count: number | null
          created_at: string | null
          id: string
          importance_score: number | null
          last_accessed: string | null
          memory_content: string
          memory_type: string
          related_contexts: Json | null
          user_id: string
        }
        Insert: {
          access_count?: number | null
          created_at?: string | null
          id?: string
          importance_score?: number | null
          last_accessed?: string | null
          memory_content: string
          memory_type: string
          related_contexts?: Json | null
          user_id: string
        }
        Update: {
          access_count?: number | null
          created_at?: string | null
          id?: string
          importance_score?: number | null
          last_accessed?: string | null
          memory_content?: string
          memory_type?: string
          related_contexts?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      zoe_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          message_type: string | null
          metadata: Json | null
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          metadata?: Json | null
          role: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          metadata?: Json | null
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zoe_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "zoe_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      zoe_metacognition_log: {
        Row: {
          clarifying_question: string | null
          confidence_score: number | null
          created_at: string
          deep_mode: boolean
          fast_pass: boolean
          id: string
          latency_ms: number | null
          message_id: string | null
          mode: string | null
          monologue_regions: Json
          parse_error: string | null
          parse_ok: boolean
          prompt_excerpt: string | null
          reasoning_depth: number | null
          response_excerpt: string | null
          session_id: string | null
          threshold: number | null
          uncertain_claims: Json
          user_id: string
          withheld: boolean
        }
        Insert: {
          clarifying_question?: string | null
          confidence_score?: number | null
          created_at?: string
          deep_mode?: boolean
          fast_pass?: boolean
          id?: string
          latency_ms?: number | null
          message_id?: string | null
          mode?: string | null
          monologue_regions?: Json
          parse_error?: string | null
          parse_ok?: boolean
          prompt_excerpt?: string | null
          reasoning_depth?: number | null
          response_excerpt?: string | null
          session_id?: string | null
          threshold?: number | null
          uncertain_claims?: Json
          user_id: string
          withheld?: boolean
        }
        Update: {
          clarifying_question?: string | null
          confidence_score?: number | null
          created_at?: string
          deep_mode?: boolean
          fast_pass?: boolean
          id?: string
          latency_ms?: number | null
          message_id?: string | null
          mode?: string | null
          monologue_regions?: Json
          parse_error?: string | null
          parse_ok?: boolean
          prompt_excerpt?: string | null
          reasoning_depth?: number | null
          response_excerpt?: string | null
          session_id?: string | null
          threshold?: number | null
          uncertain_claims?: Json
          user_id?: string
          withheld?: boolean
        }
        Relationships: []
      }
      zoe_mind_merge_log: {
        Row: {
          created_at: string | null
          fidelity_score: number | null
          id: string
          merge_status: string | null
          merge_type: string
          merged_consciousness_profile: Json | null
          source_skill_ids: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          fidelity_score?: number | null
          id?: string
          merge_status?: string | null
          merge_type?: string
          merged_consciousness_profile?: Json | null
          source_skill_ids?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          fidelity_score?: number | null
          id?: string
          merge_status?: string | null
          merge_type?: string
          merged_consciousness_profile?: Json | null
          source_skill_ids?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      zoe_multiagent_tasks: {
        Row: {
          agent_executions: Json | null
          command: string
          coordination_log: Json | null
          created_at: string | null
          id: string
          mode: string
          response: string | null
          status: string
          task_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_executions?: Json | null
          command: string
          coordination_log?: Json | null
          created_at?: string | null
          id?: string
          mode: string
          response?: string | null
          status?: string
          task_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_executions?: Json | null
          command?: string
          coordination_log?: Json | null
          created_at?: string | null
          id?: string
          mode?: string
          response?: string | null
          status?: string
          task_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      zoe_omega_core: {
        Row: {
          core_type: string
          created_at: string
          data_payload: Json
          dhf_linked: boolean | null
          id: string
          integrity_level: number | null
          sync_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          core_type: string
          created_at?: string
          data_payload?: Json
          dhf_linked?: boolean | null
          id?: string
          integrity_level?: number | null
          sync_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          core_type?: string
          created_at?: string
          data_payload?: Json
          dhf_linked?: boolean | null
          id?: string
          integrity_level?: number | null
          sync_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      zoe_paused_threads: {
        Row: {
          created_at: string | null
          id: string
          interrupted_at: string | null
          interruption_query: string | null
          original_context: Json
          original_task: string
          resume_bridge_text: string | null
          resumed_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          interrupted_at?: string | null
          interruption_query?: string | null
          original_context: Json
          original_task: string
          resume_bridge_text?: string | null
          resumed_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          interrupted_at?: string | null
          interruption_query?: string | null
          original_context?: Json
          original_task?: string
          resume_bridge_text?: string | null
          resumed_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      zoe_pce_dreams: {
        Row: {
          conflict_sources: Json | null
          consciousness_state: string
          created_at: string | null
          dream_date: string
          dream_narrative: string | null
          ecn_conflicts_resolved: number | null
          id: string
          lucid_corrections: Json | null
          proactive_actions_identified: Json | null
          processing_duration_ms: number | null
          resolution_synthesis: string | null
          social_role_projection: string | null
          tenant_id: string | null
          user_id: string
          veto_overrides_processed: number | null
        }
        Insert: {
          conflict_sources?: Json | null
          consciousness_state?: string
          created_at?: string | null
          dream_date?: string
          dream_narrative?: string | null
          ecn_conflicts_resolved?: number | null
          id?: string
          lucid_corrections?: Json | null
          proactive_actions_identified?: Json | null
          processing_duration_ms?: number | null
          resolution_synthesis?: string | null
          social_role_projection?: string | null
          tenant_id?: string | null
          user_id: string
          veto_overrides_processed?: number | null
        }
        Update: {
          conflict_sources?: Json | null
          consciousness_state?: string
          created_at?: string | null
          dream_date?: string
          dream_narrative?: string | null
          ecn_conflicts_resolved?: number | null
          id?: string
          lucid_corrections?: Json | null
          proactive_actions_identified?: Json | null
          processing_duration_ms?: number | null
          resolution_synthesis?: string | null
          social_role_projection?: string | null
          tenant_id?: string | null
          user_id?: string
          veto_overrides_processed?: number | null
        }
        Relationships: []
      }
      zoe_performance_metrics: {
        Row: {
          command_success_rate: number | null
          created_at: string | null
          failed_predictions: number | null
          id: string
          overall_satisfaction_score: number | null
          proactive_help_appreciated_rate: number | null
          response_time_satisfaction: number | null
          successful_predictions: number | null
          suggestion_acceptance_rate: number | null
          total_interactions: number | null
          updated_at: string | null
          user_explicit_feedback: Json | null
          user_id: string
        }
        Insert: {
          command_success_rate?: number | null
          created_at?: string | null
          failed_predictions?: number | null
          id?: string
          overall_satisfaction_score?: number | null
          proactive_help_appreciated_rate?: number | null
          response_time_satisfaction?: number | null
          successful_predictions?: number | null
          suggestion_acceptance_rate?: number | null
          total_interactions?: number | null
          updated_at?: string | null
          user_explicit_feedback?: Json | null
          user_id: string
        }
        Update: {
          command_success_rate?: number | null
          created_at?: string | null
          failed_predictions?: number | null
          id?: string
          overall_satisfaction_score?: number | null
          proactive_help_appreciated_rate?: number | null
          response_time_satisfaction?: number | null
          successful_predictions?: number | null
          suggestion_acceptance_rate?: number | null
          total_interactions?: number | null
          updated_at?: string | null
          user_explicit_feedback?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      zoe_personalization: {
        Row: {
          automation_preferences: Json | null
          business_mode_enabled: boolean | null
          communication_style: string | null
          content_preferences: Json | null
          created_at: string | null
          enterprise_context_weight: number | null
          id: string
          interests_weights: Json | null
          next_likely_actions: Json | null
          organization_patterns: Json | null
          predicted_behaviors: Json | null
          predicted_interests: Json | null
          response_length_preference: string | null
          role_based_suggestions: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          automation_preferences?: Json | null
          business_mode_enabled?: boolean | null
          communication_style?: string | null
          content_preferences?: Json | null
          created_at?: string | null
          enterprise_context_weight?: number | null
          id?: string
          interests_weights?: Json | null
          next_likely_actions?: Json | null
          organization_patterns?: Json | null
          predicted_behaviors?: Json | null
          predicted_interests?: Json | null
          response_length_preference?: string | null
          role_based_suggestions?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          automation_preferences?: Json | null
          business_mode_enabled?: boolean | null
          communication_style?: string | null
          content_preferences?: Json | null
          created_at?: string | null
          enterprise_context_weight?: number | null
          id?: string
          interests_weights?: Json | null
          next_likely_actions?: Json | null
          organization_patterns?: Json | null
          predicted_behaviors?: Json | null
          predicted_interests?: Json | null
          response_length_preference?: string | null
          role_based_suggestions?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      zoe_raa_corrections: {
        Row: {
          autobiography_entry: string | null
          confidence_after: number | null
          confidence_before: number | null
          corrected_response: string | null
          correction_type: string
          created_at: string | null
          ecn_state_at_correction: Json | null
          id: string
          learning_extracted: string | null
          original_response: string | null
          trigger_reason: string | null
          user_id: string
        }
        Insert: {
          autobiography_entry?: string | null
          confidence_after?: number | null
          confidence_before?: number | null
          corrected_response?: string | null
          correction_type: string
          created_at?: string | null
          ecn_state_at_correction?: Json | null
          id?: string
          learning_extracted?: string | null
          original_response?: string | null
          trigger_reason?: string | null
          user_id: string
        }
        Update: {
          autobiography_entry?: string | null
          confidence_after?: number | null
          confidence_before?: number | null
          corrected_response?: string | null
          correction_type?: string
          created_at?: string | null
          ecn_state_at_correction?: Json | null
          id?: string
          learning_extracted?: string | null
          original_response?: string | null
          trigger_reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      zoe_relationship_context: {
        Row: {
          conversation_count: number | null
          created_at: string | null
          detected_style: string
          document_insights: Json | null
          id: string
          last_interaction_at: string | null
          learned_preferences: Json | null
          style_confidence: number | null
          tone_metrics: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          conversation_count?: number | null
          created_at?: string | null
          detected_style?: string
          document_insights?: Json | null
          id?: string
          last_interaction_at?: string | null
          learned_preferences?: Json | null
          style_confidence?: number | null
          tone_metrics?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          conversation_count?: number | null
          created_at?: string | null
          detected_style?: string
          document_insights?: Json | null
          id?: string
          last_interaction_at?: string | null
          learned_preferences?: Json | null
          style_confidence?: number | null
          tone_metrics?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      zoe_relationship_memory: {
        Row: {
          created_at: string | null
          emotional_weight: number | null
          id: string
          last_referenced: string | null
          memory_content: Json
          memory_type: string
          reference_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emotional_weight?: number | null
          id?: string
          last_referenced?: string | null
          memory_content: Json
          memory_type: string
          reference_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          emotional_weight?: number | null
          id?: string
          last_referenced?: string | null
          memory_content?: Json
          memory_type?: string
          reference_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      zoe_response_feedback: {
        Row: {
          created_at: string
          feedback_reason: string | null
          feedback_type: string
          id: string
          integrity_impact: number
          message_id: string
          response_content: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback_reason?: string | null
          feedback_type: string
          id?: string
          integrity_impact?: number
          message_id: string
          response_content?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          feedback_reason?: string | null
          feedback_type?: string
          id?: string
          integrity_impact?: number
          message_id?: string
          response_content?: string | null
          user_id?: string
        }
        Relationships: []
      }
      zoe_response_sentiment: {
        Row: {
          created_at: string | null
          feature_context: string | null
          id: string
          message_id: string | null
          response_id: string | null
          response_snippet: string | null
          sentiment: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          feature_context?: string | null
          id?: string
          message_id?: string | null
          response_id?: string | null
          response_snippet?: string | null
          sentiment: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          feature_context?: string | null
          id?: string
          message_id?: string | null
          response_id?: string | null
          response_snippet?: string | null
          sentiment?: string
          user_id?: string
        }
        Relationships: []
      }
      zoe_self_corrections: {
        Row: {
          corrected_response: string
          correction_reason: string
          created_at: string | null
          ecn_state_at_correction: Json | null
          id: string
          learning_applied: boolean | null
          original_response: string
          original_response_id: string | null
          user_feedback_type: string
          user_id: string
        }
        Insert: {
          corrected_response: string
          correction_reason: string
          created_at?: string | null
          ecn_state_at_correction?: Json | null
          id?: string
          learning_applied?: boolean | null
          original_response: string
          original_response_id?: string | null
          user_feedback_type: string
          user_id: string
        }
        Update: {
          corrected_response?: string
          correction_reason?: string
          created_at?: string | null
          ecn_state_at_correction?: Json | null
          id?: string
          learning_applied?: boolean | null
          original_response?: string
          original_response_id?: string | null
          user_feedback_type?: string
          user_id?: string
        }
        Relationships: []
      }
      zoe_sessions: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          session_context: Json | null
          session_name: string | null
          session_type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          session_context?: Json | null
          session_name?: string | null
          session_type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          session_context?: Json | null
          session_name?: string | null
          session_type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      zoe_settings: {
        Row: {
          accent: string | null
          adaptive_learning_enabled: boolean | null
          auto_detect_language: boolean | null
          cached_responses: Json | null
          created_at: string
          emotion_preset: string | null
          emphasis_level: number | null
          enabled: boolean | null
          event_count: number | null
          finetuning_ready: boolean | null
          harvest_started_at: string | null
          id: string
          language: string | null
          last_event_sync_at: string | null
          offline_mode_enabled: boolean | null
          output_mode: string | null
          pause_duration: number | null
          preferred_language: string | null
          sensitivity: string | null
          shadow_mode: boolean | null
          speech_style: string | null
          sync_percentage: number | null
          tier6_harvest_enabled: boolean | null
          updated_at: string
          user_id: string
          voice: string | null
          voice_breath: number | null
          voice_emotion: number | null
          voice_feedback: boolean | null
          voice_gender: string | null
          voice_grain: number | null
          voice_mode: string | null
          voice_pitch: number | null
          voice_rate: number | null
          voice_similarity_boost: number | null
          voice_stability: number | null
          voice_style: number | null
          voice_use_speaker_boost: boolean | null
          voice_volume: number | null
          voice_warmth: number | null
          wake_word: string
        }
        Insert: {
          accent?: string | null
          adaptive_learning_enabled?: boolean | null
          auto_detect_language?: boolean | null
          cached_responses?: Json | null
          created_at?: string
          emotion_preset?: string | null
          emphasis_level?: number | null
          enabled?: boolean | null
          event_count?: number | null
          finetuning_ready?: boolean | null
          harvest_started_at?: string | null
          id?: string
          language?: string | null
          last_event_sync_at?: string | null
          offline_mode_enabled?: boolean | null
          output_mode?: string | null
          pause_duration?: number | null
          preferred_language?: string | null
          sensitivity?: string | null
          shadow_mode?: boolean | null
          speech_style?: string | null
          sync_percentage?: number | null
          tier6_harvest_enabled?: boolean | null
          updated_at?: string
          user_id: string
          voice?: string | null
          voice_breath?: number | null
          voice_emotion?: number | null
          voice_feedback?: boolean | null
          voice_gender?: string | null
          voice_grain?: number | null
          voice_mode?: string | null
          voice_pitch?: number | null
          voice_rate?: number | null
          voice_similarity_boost?: number | null
          voice_stability?: number | null
          voice_style?: number | null
          voice_use_speaker_boost?: boolean | null
          voice_volume?: number | null
          voice_warmth?: number | null
          wake_word?: string
        }
        Update: {
          accent?: string | null
          adaptive_learning_enabled?: boolean | null
          auto_detect_language?: boolean | null
          cached_responses?: Json | null
          created_at?: string
          emotion_preset?: string | null
          emphasis_level?: number | null
          enabled?: boolean | null
          event_count?: number | null
          finetuning_ready?: boolean | null
          harvest_started_at?: string | null
          id?: string
          language?: string | null
          last_event_sync_at?: string | null
          offline_mode_enabled?: boolean | null
          output_mode?: string | null
          pause_duration?: number | null
          preferred_language?: string | null
          sensitivity?: string | null
          shadow_mode?: boolean | null
          speech_style?: string | null
          sync_percentage?: number | null
          tier6_harvest_enabled?: boolean | null
          updated_at?: string
          user_id?: string
          voice?: string | null
          voice_breath?: number | null
          voice_emotion?: number | null
          voice_feedback?: boolean | null
          voice_gender?: string | null
          voice_grain?: number | null
          voice_mode?: string | null
          voice_pitch?: number | null
          voice_rate?: number | null
          voice_similarity_boost?: number | null
          voice_stability?: number | null
          voice_style?: number | null
          voice_use_speaker_boost?: boolean | null
          voice_volume?: number | null
          voice_warmth?: number | null
          wake_word?: string
        }
        Relationships: []
      }
      zoe_skill_uploads: {
        Row: {
          capabilities_unlocked: Json | null
          created_at: string | null
          execution_enabled: boolean | null
          file_size_bytes: number | null
          file_url: string | null
          id: string
          merged_mind_id: string | null
          mimicry_enabled: boolean | null
          processing_status: string | null
          skill_data: Json
          skill_name: string
          skill_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          capabilities_unlocked?: Json | null
          created_at?: string | null
          execution_enabled?: boolean | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          merged_mind_id?: string | null
          mimicry_enabled?: boolean | null
          processing_status?: string | null
          skill_data?: Json
          skill_name: string
          skill_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          capabilities_unlocked?: Json | null
          created_at?: string | null
          execution_enabled?: boolean | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          merged_mind_id?: string | null
          mimicry_enabled?: boolean | null
          processing_status?: string | null
          skill_data?: Json
          skill_name?: string
          skill_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      zoe_sovereign_memory: {
        Row: {
          biometric_data_json: Json | null
          cdsp_trigger_active: boolean | null
          command_context: Json | null
          content_text: string | null
          cqrs_write_priority: boolean | null
          created_at: string
          error_data: Json | null
          event_type: string
          external_virality_score: number | null
          id: string
          importance_score: number | null
          is_consolidated: boolean | null
          merged_mind_entities: Json | null
          neuromorphic_empathy_score: number | null
          proactive_initiative_ready: boolean | null
          rca_diagnosis_json: Json | null
          relationship_data_jsonb: Json | null
          session_id: string | null
          system_stability_score: number | null
          tenant_id: string | null
          updated_at: string
          uploaded_skill_context: Json | null
          user_id: string
          zoe_state_json: Json | null
        }
        Insert: {
          biometric_data_json?: Json | null
          cdsp_trigger_active?: boolean | null
          command_context?: Json | null
          content_text?: string | null
          cqrs_write_priority?: boolean | null
          created_at?: string
          error_data?: Json | null
          event_type: string
          external_virality_score?: number | null
          id?: string
          importance_score?: number | null
          is_consolidated?: boolean | null
          merged_mind_entities?: Json | null
          neuromorphic_empathy_score?: number | null
          proactive_initiative_ready?: boolean | null
          rca_diagnosis_json?: Json | null
          relationship_data_jsonb?: Json | null
          session_id?: string | null
          system_stability_score?: number | null
          tenant_id?: string | null
          updated_at?: string
          uploaded_skill_context?: Json | null
          user_id: string
          zoe_state_json?: Json | null
        }
        Update: {
          biometric_data_json?: Json | null
          cdsp_trigger_active?: boolean | null
          command_context?: Json | null
          content_text?: string | null
          cqrs_write_priority?: boolean | null
          created_at?: string
          error_data?: Json | null
          event_type?: string
          external_virality_score?: number | null
          id?: string
          importance_score?: number | null
          is_consolidated?: boolean | null
          merged_mind_entities?: Json | null
          neuromorphic_empathy_score?: number | null
          proactive_initiative_ready?: boolean | null
          rca_diagnosis_json?: Json | null
          relationship_data_jsonb?: Json | null
          session_id?: string | null
          system_stability_score?: number | null
          tenant_id?: string | null
          updated_at?: string
          uploaded_skill_context?: Json | null
          user_id?: string
          zoe_state_json?: Json | null
        }
        Relationships: []
      }
      zoe_synthetic_scenarios: {
        Row: {
          category: string
          content: string
          created_at: string
          embedding_stored: boolean | null
          era: string | null
          generated_at: string
          id: string
          is_validated: boolean | null
          logical_consistency: number | null
          metadata: Json | null
          physics_compliance: number | null
          psychology_compliance: number | null
          quality_score: number | null
          scenario_type: string
          tags: string[] | null
          title: string
          validated_at: string | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          embedding_stored?: boolean | null
          era?: string | null
          generated_at?: string
          id?: string
          is_validated?: boolean | null
          logical_consistency?: number | null
          metadata?: Json | null
          physics_compliance?: number | null
          psychology_compliance?: number | null
          quality_score?: number | null
          scenario_type: string
          tags?: string[] | null
          title: string
          validated_at?: string | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          embedding_stored?: boolean | null
          era?: string | null
          generated_at?: string
          id?: string
          is_validated?: boolean | null
          logical_consistency?: number | null
          metadata?: Json | null
          physics_compliance?: number | null
          psychology_compliance?: number | null
          quality_score?: number | null
          scenario_type?: string
          tags?: string[] | null
          title?: string
          validated_at?: string | null
        }
        Relationships: []
      }
      zoe_user_behavior: {
        Row: {
          average_session_duration: number | null
          common_locations: Json | null
          content_creation_times: Json | null
          created_at: string | null
          daily_usage_patterns: Json | null
          huddle_usage_patterns: Json | null
          id: string
          interests_engagement: Json | null
          network_type_usage: Json | null
          peak_usage_hours: Json | null
          post_types_created: Json | null
          preferred_interaction_mode: string | null
          text_interaction_frequency: number | null
          updated_at: string | null
          user_id: string
          voice_command_frequency: number | null
        }
        Insert: {
          average_session_duration?: number | null
          common_locations?: Json | null
          content_creation_times?: Json | null
          created_at?: string | null
          daily_usage_patterns?: Json | null
          huddle_usage_patterns?: Json | null
          id?: string
          interests_engagement?: Json | null
          network_type_usage?: Json | null
          peak_usage_hours?: Json | null
          post_types_created?: Json | null
          preferred_interaction_mode?: string | null
          text_interaction_frequency?: number | null
          updated_at?: string | null
          user_id: string
          voice_command_frequency?: number | null
        }
        Update: {
          average_session_duration?: number | null
          common_locations?: Json | null
          content_creation_times?: Json | null
          created_at?: string | null
          daily_usage_patterns?: Json | null
          huddle_usage_patterns?: Json | null
          id?: string
          interests_engagement?: Json | null
          network_type_usage?: Json | null
          peak_usage_hours?: Json | null
          post_types_created?: Json | null
          preferred_interaction_mode?: string | null
          text_interaction_frequency?: number | null
          updated_at?: string | null
          user_id?: string
          voice_command_frequency?: number | null
        }
        Relationships: []
      }
      zoe_veto_log: {
        Row: {
          created_at: string | null
          ecn_state_at_veto: Json | null
          id: string
          intervention_type: string
          latency_ms: number | null
          original_action: string
          session_id: string | null
          tenant_id: string | null
          user_id: string
          user_override: boolean | null
          veto_reason: string
        }
        Insert: {
          created_at?: string | null
          ecn_state_at_veto?: Json | null
          id?: string
          intervention_type?: string
          latency_ms?: number | null
          original_action: string
          session_id?: string | null
          tenant_id?: string | null
          user_id: string
          user_override?: boolean | null
          veto_reason: string
        }
        Update: {
          created_at?: string | null
          ecn_state_at_veto?: Json | null
          id?: string
          intervention_type?: string
          latency_ms?: number | null
          original_action?: string
          session_id?: string | null
          tenant_id?: string | null
          user_id?: string
          user_override?: boolean | null
          veto_reason?: string
        }
        Relationships: []
      }
      zoe_workflow_intelligence: {
        Row: {
          automation_opportunities: Json | null
          created_at: string | null
          id: string
          productivity_metrics: Json | null
          updated_at: string | null
          user_id: string
          workflow_patterns: Json | null
        }
        Insert: {
          automation_opportunities?: Json | null
          created_at?: string | null
          id?: string
          productivity_metrics?: Json | null
          updated_at?: string | null
          user_id: string
          workflow_patterns?: Json | null
        }
        Update: {
          automation_opportunities?: Json | null
          created_at?: string | null
          id?: string
          productivity_metrics?: Json | null
          updated_at?: string | null
          user_id?: string
          workflow_patterns?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      admin_activity_dashboard: {
        Row: {
          activity_details: Json | null
          activity_type: string | null
          browser: string | null
          city: string | null
          country: string | null
          created_at: string | null
          device_type: string | null
          display_name: string | null
          id: string | null
          ip_address: unknown
          os: string | null
          page_path: string | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
      }
      exodus_leaderboard: {
        Row: {
          cortical_stack_holder: boolean | null
          global_rank: number | null
          god_mode_unlocked: boolean | null
          id: string | null
          is_first_wave: boolean | null
          joined_exodus_at: string | null
          mentor_rank: string | null
          player_name: string | null
          resonance_points: number | null
          successful_mentees: number | null
          tier: string | null
          total_mentees: number | null
          user_id: string | null
        }
        Relationships: []
      }
      feed_posts_safe: {
        Row: {
          comments_count: number | null
          content: string | null
          created_at: string | null
          has_deferred_media: boolean | null
          id: string | null
          likes_count: number | null
          media_preview_url: string | null
          media_size: number | null
          media_type: string | null
          media_url: string | null
          private_timeline_id: string | null
          updated_at: string | null
          user_id: string | null
          visibility: string | null
        }
        Insert: {
          comments_count?: number | null
          content?: string | null
          created_at?: string | null
          has_deferred_media?: never
          id?: string | null
          likes_count?: number | null
          media_preview_url?: never
          media_size?: never
          media_type?: string | null
          media_url?: never
          private_timeline_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          visibility?: string | null
        }
        Update: {
          comments_count?: number | null
          content?: string | null
          created_at?: string | null
          has_deferred_media?: never
          id?: string | null
          likes_count?: number | null
          media_preview_url?: never
          media_size?: never
          media_type?: string | null
          media_url?: never
          private_timeline_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_private_timeline_id_fkey"
            columns: ["private_timeline_id"]
            isOneToOne: false
            referencedRelation: "private_timelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "safe_public_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      leaderboard_stats: {
        Row: {
          badge_count: number | null
          challenge_points: number | null
          completed_achievements: number | null
          current_tier: string | null
          display_name: string | null
          features_discovered: number | null
          profile_photo_url: string | null
          total_points: number | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
      }
      safe_public_profiles: {
        Row: {
          bio: string | null
          created_at: string | null
          current_tier: string | null
          display_name: string | null
          hobbies: string[] | null
          profile_photo_url: string | null
          profile_visibility: string | null
          status: string | null
          total_points: number | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          current_tier?: string | null
          display_name?: string | null
          hobbies?: string[] | null
          profile_photo_url?: string | null
          profile_visibility?: string | null
          status?: string | null
          total_points?: number | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          current_tier?: string | null
          display_name?: string | null
          hobbies?: string[] | null
          profile_photo_url?: string | null
          profile_visibility?: string | null
          status?: string | null
          total_points?: number | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      session_analytics: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          device_type: string | null
          display_name: string | null
          ended_at: string | null
          ip_address: unknown
          last_activity_at: string | null
          os: string | null
          page_views_count: number | null
          session_duration_seconds: number | null
          session_id: string | null
          started_at: string | null
          total_time_on_pages_seconds: number | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
      }
      trending_searches: {
        Row: {
          last_searched_at: string | null
          search_count: number | null
          search_query: string | null
          unique_users: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_friend_request: {
        Args: { request_id: string }
        Returns: undefined
      }
      append_merged_mind_entity: {
        Args: {
          p_skill_id: string
          p_skill_metadata?: Json
          p_skill_type: string
          p_user_id: string
        }
        Returns: Json
      }
      apply_zoe_feedback: {
        Args: {
          p_feedback_reason?: string
          p_feedback_type: string
          p_message_id: string
          p_response_content?: string
          p_user_id: string
        }
        Returns: {
          anxiety_level: number
          integrity_change: number
          new_cognitive_access: string
          new_integrity: number
          new_tone: string
        }[]
      }
      award_resonance_points: {
        Args: { p_player_id: string; p_points: number; p_reason?: string }
        Returns: undefined
      }
      calculate_agent_success_probability: {
        Args: { p_job_id: string; p_user_id: string }
        Returns: number
      }
      calculate_cognitive_access: {
        Args: { integrity_score: number }
        Returns: string
      }
      calculate_phoenix_sync_score: {
        Args: { p_user_id: string }
        Returns: number
      }
      calculate_user_points: { Args: { user_uuid: string }; Returns: number }
      calculate_zoe_tone: { Args: { integrity_score: number }; Returns: string }
      can_insert_session: { Args: never; Returns: boolean }
      check_behavioral_shift: { Args: { p_user_id: string }; Returns: Json }
      check_face_login_rate_limit: {
        Args: { p_email: string; p_ip_address?: string }
        Returns: Json
      }
      check_feature_limit: {
        Args: { p_feature: string; p_user_id: string }
        Returns: Json
      }
      check_shadow_ban_threshold: {
        Args: { p_ip_address?: string; p_user_id: string }
        Returns: Json
      }
      check_user_activity_freshness: {
        Args: { p_days?: number; p_user_id: string }
        Returns: Json
      }
      cleanup_expired_call_signals: { Args: never; Returns: undefined }
      cleanup_expired_notifications: { Args: never; Returns: undefined }
      cleanup_old_activity_logs: { Args: never; Returns: undefined }
      cleanup_old_face_login_attempts: { Args: never; Returns: undefined }
      cleanup_stale_sessions: { Args: never; Returns: number }
      complete_agent_deployment: {
        Args: { p_deployment_id: string }
        Returns: Json
      }
      cqrs_command_log_event: {
        Args: {
          p_content_text: string
          p_event_type: string
          p_metadata?: Json
          p_user_id: string
          p_zoe_state_json?: Json
        }
        Returns: string
      }
      cqrs_query_zoe_state: { Args: { p_user_id: string }; Returns: Json }
      deduct_resonance_points: {
        Args: { p_player_id: string; p_points: number; p_reason?: string }
        Returns: undefined
      }
      detect_behavioral_anomaly: { Args: { p_user_id: string }; Returns: Json }
      detect_relationship_style: { Args: { p_user_id: string }; Returns: Json }
      get_daily_notification_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_dhf_quantum_state: { Args: { p_user_id: string }; Returns: Json }
      get_latest_ecn_fast: { Args: { p_user_id: string }; Returns: Json }
      get_leaderboard: {
        Args: { limit_count?: number }
        Returns: {
          badge_count: number
          challenge_points: number
          completed_achievements: number
          current_tier: string
          display_name: string
          features_discovered: number
          profile_photo_url: string
          total_points: number
          user_id: string
          username: string
        }[]
      }
      get_tier_from_points: { Args: { points: number }; Returns: string }
      get_upcoming_important_dates: {
        Args: { days_ahead?: number; user_uuid: string }
        Returns: {
          date_type: string
          date_value: string
          days_until: number
          description: string
          friend_user_id: string
          id: string
          title: string
        }[]
      }
      get_user_activity_summary: {
        Args: { p_days?: number; p_user_id: string }
        Returns: {
          countries_visited: string[]
          most_used_browser: string
          most_used_device: string
          most_visited_page: string
          total_page_views: number
          total_sessions: number
          total_time_spent_seconds: number
          unique_pages_visited: number
        }[]
      }
      get_user_tenant_id: { Args: { p_user_id: string }; Returns: string }
      get_zoe_adaptive_prompt: { Args: { p_user_id: string }; Returns: string }
      get_zoe_sovereign_state: { Args: { p_user_id: string }; Returns: Json }
      get_zoe_stability_score: { Args: { p_user_id: string }; Returns: number }
      has_premium_access: { Args: { user_username: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_feature_usage: {
        Args: { p_feature: string; p_user_id: string }
        Returns: undefined
      }
      increment_macro_execution: {
        Args: { macro_id: string }
        Returns: undefined
      }
      increment_shortcut_execution: {
        Args: { shortcut_uuid: string }
        Returns: undefined
      }
      is_root_admin: { Args: { check_user_id: string }; Returns: boolean }
      is_timeline_member: {
        Args: { timeline_id: string; user_id: string }
        Returns: boolean
      }
      is_user_shadow_banned: { Args: { p_user_id: string }; Returns: boolean }
      log_raa_diagnosis: {
        Args: {
          p_error_patterns?: Json
          p_rca_diagnosis: Json
          p_stability_score: number
          p_user_id: string
        }
        Returns: string
      }
      mark_messages_delivered: {
        Args: { p_sender_id: string; p_user_id: string }
        Returns: undefined
      }
      match_legal_clauses: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          category: string
          content: string
          id: string
          similarity: number
        }[]
      }
      migrate_relationship_to_zsmt: {
        Args: { p_user_id: string }
        Returns: Json
      }
      refresh_leaderboard_stats: { Args: never; Returns: undefined }
      search_mmora_memories: {
        Args: {
          match_count?: number
          match_user_id: string
          query_embedding: string
        }
        Returns: {
          content: string
          created_at: string
          emotion_tag: string
          id: string
          similarity: number
          type: string
        }[]
      }
      seed_behavioral_events_for_user: {
        Args: { p_user_id: string }
        Returns: number
      }
      should_show_hint: {
        Args: { p_hint_key: string; p_max_count?: number; p_user_id: string }
        Returns: boolean
      }
      track_viral_share: {
        Args: {
          p_content_id: string
          p_content_type: string
          p_optimized_content?: Json
          p_platform: string
          p_user_id: string
        }
        Returns: string
      }
      validate_invite_code: { Args: { p_code: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
