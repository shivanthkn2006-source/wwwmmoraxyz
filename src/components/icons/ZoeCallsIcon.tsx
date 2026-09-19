import { forwardRef, type SVGProps } from 'react';

/** Distinct audio/video call mark: handset, live lens, and signal link. */
const ZoeCallsIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(({ className, ...props }, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M6.3 3.6 9 3l1.45 4.35-1.9 1.3a14.4 14.4 0 0 0 6.8 6.8l1.3-1.9L21 15l-.6 2.7a3.4 3.4 0 0 1-3.75 2.62C9.95 19.5 4.5 14.05 3.68 7.35A3.4 3.4 0 0 1 6.3 3.6Z" />
      <circle cx="17.25" cy="6.75" r="2.35" />
      <path d="m19.6 6 2-1.15v3.8l-2-1.15" />
      <path d="M12.9 3.35c.62-.23 1.29-.35 1.99-.35" opacity=".65" />
    </svg>
));

ZoeCallsIcon.displayName = 'ZoeCallsIcon';

export default ZoeCallsIcon;