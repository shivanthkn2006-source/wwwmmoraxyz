import React, { useEffect, useRef } from 'react';
import { useFeatureAnnouncements } from '@/hooks/useFeatureAnnouncements';
import { APP_FEATURES } from '@/data/appFeatures';

interface FeatureAnnouncementWrapperProps {
  featureId: string;
  children: React.ReactNode;
  customAnnouncement?: string;
  delay?: number; // Delay in milliseconds before announcing
}

/**
 * Wrapper component that announces a feature to first-time users via Lisa AI
 * Usage: Wrap any feature component with this to enable voice announcements
 * 
 * Example:
 * <FeatureAnnouncementWrapper featureId="direct-messages">
 *   <MessagesComponent />
 * </FeatureAnnouncementWrapper>
 */
export const FeatureAnnouncementWrapper: React.FC<FeatureAnnouncementWrapperProps> = ({
  featureId,
  children,
  customAnnouncement,
  delay = 1500 // Default 1.5 second delay
}) => {
  const { announceFeature, hasBeenAnnounced, isLoading } = useFeatureAnnouncements();
  const hasAnnounced = useRef(false);

  useEffect(() => {
    // Don't announce if already done, still loading, or already triggered
    if (isLoading || hasAnnounced.current || hasBeenAnnounced(featureId)) {
      return;
    }

    const feature = APP_FEATURES.find(f => f.id === featureId);
    if (!feature) {
      console.warn(`Feature ${featureId} not found in APP_FEATURES`);
      return;
    }

    const announcementText = customAnnouncement || feature.announcement;
    if (!announcementText) {
      console.warn(`No announcement text for feature ${featureId}`);
      return;
    }

    // Mark as triggered to prevent double announcements
    hasAnnounced.current = true;

    // Delay the announcement slightly so the UI can settle
    const timer = setTimeout(() => {
      announceFeature(featureId, feature.name, announcementText);
    }, delay);

    return () => clearTimeout(timer);
  }, [featureId, isLoading, hasBeenAnnounced, announceFeature, customAnnouncement, delay]);

  return <>{children}</>;
};

export default FeatureAnnouncementWrapper;