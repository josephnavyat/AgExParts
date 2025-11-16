import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // You can log error to a service here
    console.error('ErrorBoundary caught', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, textAlign: 'center' }}>
          <h2>Something went wrong.</h2>
          <pre style={{ textAlign: 'left', display: 'inline-block', maxWidth: '80%', whiteSpace: 'pre-wrap' }}>{String(this.state.error)}</pre>
          <div style={{ marginTop: 16 }}>
            <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>Reload</button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
