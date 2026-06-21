export const useEventGlow = (eventDate: string | null | undefined, isRecurring: boolean = true): boolean => {
  if (!eventDate) return false;
  
  const today = new Date();
  const event = new Date(eventDate);
  
  if (isRecurring) {
    return today.getMonth() === event.getMonth() && today.getDate() === event.getDate();
  } else {
    const todayStr = today.toISOString().split('T')[0];
    return eventDate === todayStr;
  }
};

export const getAvatarGlowClass = (hasEvent: boolean, status?: string) => {
  if (!hasEvent && (!status || status === 'none')) return '';
  
  if (hasEvent && status && status !== 'none') {
    // Both event and status - create alternating animation
    const statusColor = status === 'online' ? 'ring-status-online' : 
                       status === 'away' ? 'ring-status-away' : 
                       status === 'transit' ? 'ring-status-transit' :
                       status === 'offline' ? 'ring-status-offline' : '';
    return `ring-2 ${statusColor} animate-pulse shadow-[0_0_15px_var(--status-event)]`;
  }
  
  if (hasEvent) {
    return 'ring-2 ring-status-event shadow-[0_0_20px_rgba(255,255,255,0.8)]';
  }
  
  // Status only
  const statusColor = status === 'online' ? 'ring-status-online' : 
                     status === 'away' ? 'ring-status-away' : 
                     status === 'transit' ? 'ring-status-transit' :
                     status === 'offline' ? 'ring-status-offline' : '';
  return `ring-2 ${statusColor} shadow-[0_0_10px_currentColor]`;
};
