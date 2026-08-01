import React, { Component, ErrorInfo, ReactNode } from 'react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, errorInfo: ErrorInfo, resetError: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  isHovered: boolean;
  copied: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
    isHovered: false,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    console.error('ErrorBoundary caught an unexpected error:', error, errorInfo);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      isHovered: false,
      copied: false,
    });
  };

  private toggleDetails = (): void => {
    this.setState((prevState) => ({ showDetails: !prevState.showDetails }));
  };

  private copyStackTrace = (): void => {
    const { error, errorInfo } = this.state;
    const textToCopy = `[SYSTEM RECOVERY DIAGNOSTIC]\nTimestamp: ${new Date().toISOString()}\nError: ${
      error?.name || 'Error'
    }: ${error?.message || 'Unknown'}\n\nStack Trace:\n${error?.stack || 'No stack trace'}\n\nComponent Stack:\n${
      errorInfo?.componentStack || 'No component stack'
    }`;

    navigator.clipboard.writeText(textToCopy).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    }).catch(() => {
      // Fallback in case clipboard permission is denied
    });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(
            this.state.error || new Error('Unknown error'),
            this.state.errorInfo || { componentStack: '' },
            this.handleReset
          );
        }
        return this.props.fallback;
      }

      const { error, errorInfo, showDetails, isHovered, copied } = this.state;

      return (
        <div
          style={{
            minHeight: '100vh',
            width: '100%',
            backgroundColor: '#040b16',
            color: '#e2e8f0',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            boxSizing: 'border-box',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Internal CSS for Animations & Styles */}
          <style>{`
            @keyframes ebFadeIn {
              from {
                opacity: 0;
                transform: translateY(12px) scale(0.98);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }

            @keyframes ebPulse {
              0% {
                transform: scale(0.95);
                box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7);
              }
              70% {
                transform: scale(1);
                box-shadow: 0 0 0 10px rgba(220, 38, 38, 0);
              }
              100% {
                transform: scale(0.95);
                box-shadow: 0 0 0 0 rgba(220, 38, 38, 0);
              }
            }
          `}</style>

          {/* Tactical Background Grid Atmosphere */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `
                radial-gradient(circle at 50% 30%, rgba(30, 58, 138, 0.15) 0%, transparent 70%),
                linear-gradient(rgba(15, 23, 42, 0.6) 1px, transparent 1px),
                linear-gradient(90deg, rgba(15, 23, 42, 0.6) 1px, transparent 1px)
              `,
              backgroundSize: '100% 100%, 32px 32px, 32px 32px',
              pointerEvents: 'none',
            }}
          />

          {/* Main Container Card */}
          <div
            style={{
              maxWidth: '680px',
              width: '100%',
              backgroundColor: '#0a1628',
              border: '1px solid #1e293b',
              borderRadius: '12px',
              padding: '36px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(15, 23, 42, 0.8)',
              position: 'relative',
              zIndex: 10,
              animation: 'ebFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              boxSizing: 'border-box',
            }}
          >
            {/* Top Bar Header Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px',
                paddingBottom: '16px',
                borderBottom: '1px solid #1e293b',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '10px',
                    height: '10px',
                    backgroundColor: '#dc2626',
                    borderRadius: '50%',
                    animation: 'ebPulse 2s infinite',
                  }}
                />
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    color: '#f87171',
                  }}
                >
                  SYSTEM ALERT // CRITICAL EXCEPTION
                </span>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  color: '#64748b',
                  backgroundColor: '#0f172a',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: '1px solid #1e293b',
                }}
              >
                ERR-4009-SYS
              </span>
            </div>

            {/* Warning Icon & Main Message */}
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(220, 38, 38, 0.12)',
                  border: '1px solid rgba(220, 38, 38, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px auto',
                  boxShadow: '0 0 20px rgba(220, 38, 38, 0.2)',
                }}
              >
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>

              <h1
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: '#f8fafc',
                  margin: '0 0 8px 0',
                  letterSpacing: '-0.02em',
                }}
              >
                System Recovery Required
              </h1>

              <p
                style={{
                  fontSize: '14px',
                  color: '#94a3b8',
                  margin: 0,
                  lineHeight: '1.5',
                }}
              >
                The command dashboard encountered an unexpected error
              </p>
            </div>

            {/* Action Buttons Row */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                alignItems: 'center',
                marginBottom: '24px',
              }}
            >
              <button
                onClick={this.handleReload}
                onMouseEnter={() => this.setState({ isHovered: true })}
                onMouseLeave={() => this.setState({ isHovered: false })}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                  color: '#ffffff',
                  border: '1px solid #ef4444',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '14px',
                  letterSpacing: '0.03em',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: isHovered
                    ? '0 0 25px rgba(220, 38, 38, 0.6), 0 0 10px rgba(220, 38, 38, 0.4)'
                    : '0 4px 12px rgba(220, 38, 38, 0.25)',
                  transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
                  transition: 'all 0.2s ease',
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M16 21h5v-5" />
                </svg>
                Reload Dashboard
              </button>

              <button
                onClick={this.toggleDetails}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: showDetails ? '#60a5fa' : '#64748b',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  transition: 'color 0.2s ease',
                }}
              >
                <span>{showDetails ? 'Hide Technical Details' : 'Show Technical Details'}</span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transform: showDetails ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>

            {/* Collapsible Monospace Technical Details Section */}
            {showDetails && (
              <div
                style={{
                  backgroundColor: '#040b16',
                  border: '1px solid #1e293b',
                  borderRadius: '8px',
                  padding: '16px',
                  marginTop: '4px',
                  boxSizing: 'border-box',
                  animation: 'ebFadeIn 0.3s ease-out forwards',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid #1e293b',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontWeight: 600,
                      color: '#f87171',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    STACK TRACE & DIAGNOSTICS
                  </span>
                  <button
                    onClick={this.copyStackTrace}
                    style={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      color: copied ? '#4ade80' : '#94a3b8',
                      fontSize: '11px',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {copied ? '✓ Copied' : 'Copy Diagnostics'}
                  </button>
                </div>

                <div
                  style={{
                    maxHeight: '220px',
                    overflowY: 'auto',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: '12px',
                    lineHeight: '1.6',
                    color: '#cbd5e1',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  <div style={{ color: '#f87171', fontWeight: 600, marginBottom: '8px' }}>
                    {error ? `${error.name}: ${error.message}` : 'Unknown Exception'}
                  </div>
                  {error?.stack && (
                    <div style={{ color: '#64748b', marginBottom: '8px' }}>
                      {error.stack}
                    </div>
                  )}
                  {errorInfo?.componentStack && (
                    <div style={{ color: '#475569' }}>
                      <span style={{ color: '#94a3b8', display: 'block', marginBottom: '2px' }}>
                        Component Stack:
                      </span>
                      {errorInfo.componentStack}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
