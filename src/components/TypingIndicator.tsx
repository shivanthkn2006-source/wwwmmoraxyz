import React from 'react';

interface TypingIndicatorProps {
  userName: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ userName }) => {
  return (
    <div className="flex items-center space-x-2 px-4 py-2 bg-muted/50 rounded-2xl max-w-fit">
      <span className="text-sm text-muted-foreground">{userName} is typing</span>
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
};

export default TypingIndicator;
