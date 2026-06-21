/**
 * VIRTUALIZED NAVIGATION GROUP
 * Protocol: Menu Virtualization
 * Only renders sub-menus when parent is expanded
 * Unmounts children when collapsed to free memory
 */

import React, { useState, useCallback, memo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NavItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
  badge?: number | string;
  children?: NavItem[];
  isActive?: boolean;
}

interface VirtualizedNavGroupProps {
  item: NavItem;
  depth?: number;
  onNavigate?: (item: NavItem) => void;
  renderItem?: (item: NavItem, depth: number) => ReactNode;
  defaultExpanded?: boolean;
}

const VirtualizedNavGroup: React.FC<VirtualizedNavGroupProps> = memo(({
  item,
  depth = 0,
  onNavigate,
  renderItem,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const hasChildren = item.children && item.children.length > 0;
  const IconComponent = item.icon;

  const handleToggle = useCallback(() => {
    if (hasChildren) {
      setIsExpanded(prev => !prev);
    } else if (item.onClick) {
      item.onClick();
    } else {
      onNavigate?.(item);
    }
  }, [hasChildren, item, onNavigate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  }, [handleToggle]);

  // Custom render if provided
  if (renderItem) {
    return (
      <>
        <div onClick={handleToggle} className="cursor-pointer">
          {renderItem(item, depth)}
        </div>
        {/* VIRTUALIZATION: Only render children when expanded */}
        <AnimatePresence mode="wait">
          {isExpanded && hasChildren && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {item.children!.map(child => (
                <VirtualizedNavGroup
                  key={child.id}
                  item={child}
                  depth={depth + 1}
                  onNavigate={onNavigate}
                  renderItem={renderItem}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Default render
  return (
    <div className="w-full">
      <button
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200',
          'text-left hover:bg-white/10',
          item.isActive && 'bg-white/15 text-white font-medium',
          !item.isActive && 'text-white/70'
        )}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        role="button"
        tabIndex={0}
        aria-expanded={hasChildren ? isExpanded : undefined}
      >
        {/* Expand/Collapse indicator for groups */}
        {hasChildren && (
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0"
          >
            <ChevronRight className="w-4 h-4 text-white/40" />
          </motion.div>
        )}

        {/* Icon */}
        {IconComponent && (
          <IconComponent className="w-4 h-4 flex-shrink-0" />
        )}

        {/* Label */}
        <span className="flex-1 truncate text-sm">{item.label}</span>

        {/* Badge */}
        {item.badge && (
          <span className="ml-auto px-1.5 py-0.5 text-[10px] bg-primary/20 text-primary rounded-full">
            {item.badge}
          </span>
        )}
      </button>

      {/* VIRTUALIZATION: Children are NULL until expanded */}
      <AnimatePresence mode="wait">
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {item.children!.map(child => (
              <VirtualizedNavGroup
                key={child.id}
                item={child}
                depth={depth + 1}
                onNavigate={onNavigate}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

VirtualizedNavGroup.displayName = 'VirtualizedNavGroup';

export { VirtualizedNavGroup };
export default VirtualizedNavGroup;
