import React from 'react';

/**
 * FeedErrorBoundary — wraps Loops row and PostCard list so a single broken
 * post/video doesn't blank the entire home page. Emits a structured
 * console.error record that downstream logs (perfLogger, admin health page)
 * can parse.
 */
interface Props {
  section: 'loops' | 'posts' | 'post-card';
  postId?: string;
  children: React.ReactNode;
  onRetry?: () => void;
}
interface State { hasError: boolean; message: string }

export class FeedErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err?.message || 'Unknown error' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Structured log — one JSON line per failure, easy to grep / export.
    console.error('[FeedErrorBoundary]', JSON.stringify({
      section: this.props.section,
      postId: this.props.postId,
      message: error?.message,
      stack: (error?.stack || '').split('\n').slice(0, 5).join(' | '),
      componentStack: (info?.componentStack || '').split('\n').slice(0, 5).join(' | '),
      ts: new Date().toISOString(),
    }));
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: '' });
    this.props.onRetry?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
        <div className="font-medium">Couldn't render this {this.props.section} section.</div>
        <div className="opacity-80 mt-1 break-words">{this.state.message}</div>
        <button
          onClick={this.handleRetry}
          className="mt-2 rounded border border-destructive/40 px-2 py-0.5 text-[11px] hover:bg-destructive/10"
        >
          Retry this item
        </button>
      </div>
    );
  }
}
