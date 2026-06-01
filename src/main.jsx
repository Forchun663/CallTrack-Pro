import React, { Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Visual Error Boundary to catch React rendering crashes on the client and display diagnostic logs
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught rendering exception:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#05020f',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          <div style={{
            maxWidth: '560px',
            width: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '24px',
            padding: '32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(20px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '28px' }}>⚠️</span>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '900', letterSpacing: '-0.025em' }}>
                Application Crash Diagnostic
              </h2>
            </div>
            
            <p style={{ fontSize: '13px', color: '#a1a1aa', lineHeight: '1.6', margin: '0 0 20px 0' }}>
              CallTrack Pro encountered an unexpected runtime crash during render. Please verify your Supabase credentials or view the trace details below:
            </p>

            <div style={{
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '16px',
              overflow: 'auto',
              maxHeight: '260px',
              fontFamily: 'monospace',
              fontSize: '11px',
              color: '#f87171',
              whiteSpace: 'pre-wrap',
              marginBottom: '24px'
            }}>
              {this.state.error?.toString()}
              {"\n\n"}
              {this.state.error?.stack}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => window.location.reload()}
                style={{
                  flex: 1,
                  backgroundColor: '#ffffff',
                  color: '#05020f',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s'
                }}
                onMouseOver={(e) => e.target.style.opacity = '0.9'}
                onMouseOut={(e) => e.target.style.opacity = '1'}
              >
                Reload Application
              </button>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(this.state.error?.stack || this.state.error?.toString());
                  alert("Diagnostics copied to clipboard!");
                }}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '12px 18px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Copy Details
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
)
