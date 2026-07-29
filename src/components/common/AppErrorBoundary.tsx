/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 顶层错误边界：捕获渲染期异常，避免整页白屏，并展示可定位的错误信息。
 */

import React from 'react';

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[AppErrorBoundary]', error, info.componentStack);
  }

  private handleReset = () => {
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
    location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: '#fafafa',
          fontFamily: 'system-ui, sans-serif',
          color: '#171717',
        }}
      >
        <div
          style={{
            maxWidth: 640,
            width: '100%',
            background: '#fff',
            border: '1px solid #e5e5e5',
            borderRadius: 12,
            padding: 24,
            boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
          }}
        >
          <h1 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>页面渲染出错</h1>
          <p style={{ fontSize: 13, color: '#737373', margin: '0 0 12px', lineHeight: 1.6 }}>
            应用在渲染时抛出异常。下面是错误详情，可截图反馈；也可点击「清除数据并重载」尝试自动恢复。
          </p>
          <pre
            style={{
              fontSize: 12,
              background: '#f5f5f5',
              border: '1px solid #eee',
              borderRadius: 8,
              padding: 12,
              overflow: 'auto',
              maxHeight: 260,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              margin: '0 0 16px',
            }}
          >
            {error.message}
            {error.stack ? `\n\n${error.stack}` : ''}
          </pre>
          <button
            type="button"
            onClick={this.handleReset}
            style={{
              height: 32,
              padding: '0 16px',
              borderRadius: 8,
              border: 'none',
              background: '#171717',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            清除数据并重载
          </button>
        </div>
      </div>
    );
  }
}
