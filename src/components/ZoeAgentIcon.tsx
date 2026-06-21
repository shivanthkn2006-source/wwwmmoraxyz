import React, { useState, useEffect, useRef } from 'react';
import { Bot } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';

export const ZoeAgentIcon = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // Dragging state - positioned near Zoe avatar but offset
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('zoe-agent-position');
    return saved ? JSON.parse(saved) : { x: 20, y: window.innerHeight - 200 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const iconRef = useRef<HTMLDivElement>(null);
  
  // Agent mode notification count
  const [agentNotifications, setAgentNotifications] = useState(0);

  useEffect(() => {
    // Check for agent notifications
    const checkAgentNotifications = () => {
      const agentTasks = localStorage.getItem('zoe-agent-tasks');
      if (agentTasks) {
        const tasks = JSON.parse(agentTasks);
        setAgentNotifications(tasks.filter((t: any) => !t.seen).length);
      } else {
        // Show promotional notification for new users
        setAgentNotifications(1);
      }
    };
    
    checkAgentNotifications();
    window.addEventListener('zoe-agent-update', checkAgentNotifications);
    return () => window.removeEventListener('zoe-agent-update', checkAgentNotifications);
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        x: Math.min(prev.x, window.innerWidth - 60),
        y: Math.min(prev.y, window.innerHeight - 60)
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Save position to localStorage
  useEffect(() => {
    localStorage.setItem('zoe-agent-position', JSON.stringify(position));
  }, [position]);

  // Dragging handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (iconRef.current) {
      setIsDragging(true);
      const rect = iconRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (iconRef.current && e.touches.length === 1) {
      setIsDragging(true);
      const rect = iconRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - 60));
        const newY = Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - 60));
        setPosition({ x: newX, y: newY });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches.length === 1) {
        const newX = Math.max(0, Math.min(e.touches[0].clientX - dragOffset.x, window.innerWidth - 60));
        const newY = Math.max(0, Math.min(e.touches[0].clientY - dragOffset.y, window.innerHeight - 60));
        setPosition({ x: newX, y: newY });
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleEnd);
      };
    }
  }, [isDragging, dragOffset]);

  // Only show on home page and when user is authenticated
  if (location.pathname !== '/home' || !user) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Mark notifications as seen
    localStorage.setItem('zoe-agent-tasks', JSON.stringify([{ seen: true }]));
    setAgentNotifications(0);
    navigate('/zoe-ai');
  };

  return (
    <div 
      ref={iconRef}
      className="fixed z-[9998] flex flex-col items-center gap-0.5 touch-none select-none"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div className="relative">
        <button
          onClick={handleClick}
          className="relative w-7 h-7 rounded-full flex items-center justify-center focus:outline-none hover:scale-105 transition-all shadow-md"
          style={{
            background: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 50%, #C084FC 100%)',
            boxShadow: '0 0 10px rgba(139, 92, 246, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2)'
          }}
          aria-label="Zoe Agent - True Agentic AI"
          title="Zoe Agent - True Agentic AI (Drag to move)"
        >
          <Bot className="w-3.5 h-3.5 text-white" />
        </button>
        
        {/* Notification badge */}
        {agentNotifications > 0 && (
          <Badge 
            className="absolute -top-0.5 -right-0.5 h-3 w-3 flex items-center justify-center p-0 text-[8px] bg-white text-purple-600 border border-purple-400 font-bold"
          >
            {agentNotifications > 9 ? '9+' : agentNotifications}
          </Badge>
        )}
      </div>
      
      <span className="text-[7px] text-purple-300 font-medium px-1 py-0.5 bg-purple-500/20 rounded-full backdrop-blur-sm">
        Agent
      </span>
    </div>
  );
};
