"use client";

import * as React from "react";
import { vi } from "@/i18n/vi";

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error using a production logging framework or console.error in dev
    console.error("ErrorBoundary caught an uncaught error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-6">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl text-center">
            {/* Danger alert icon */}
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-8 h-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            </div>

            {/* Headers and labels */}
            <h1 className="text-2xl font-bold mb-3 tracking-tight">
              {vi.ui.error.title}
            </h1>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              {vi.ui.error.message}
            </p>

            {/* Error detail (collapsed by default/subtle) */}
            {this.state.error && (
              <div className="mb-6 p-4 bg-slate-950 border border-slate-800 rounded-lg text-left text-xs font-mono text-red-400 max-h-36 overflow-auto">
                <span className="font-semibold">{this.state.error.name}:</span>{" "}
                {this.state.error.message}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleRetry}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors cursor-pointer"
              >
                {vi.ui.error.retry}
              </button>
              <a
                href="/"
                className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-300 font-medium rounded-lg text-sm transition-colors text-center"
              >
                {vi.ui.error.backToHome}
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
