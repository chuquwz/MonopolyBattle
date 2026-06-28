"use client";

import * as React from "react";
import { vi } from "@/i18n/vi";
import { Button } from "@/components/ui/button";

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
    // Log the error
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
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 shadow-2xl text-center animate-fade-in">
            {/* Danger alert icon */}
            <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-6 border border-destructive/20">
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
            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
              {vi.ui.error.message}
            </p>

            {/* Error detail */}
            {this.state.error && (
              <div className="mb-6 p-4 bg-background border border-border rounded-lg text-left text-xs font-mono text-destructive max-h-36 overflow-auto">
                <span className="font-semibold">{this.state.error.name}:</span>{" "}
                {this.state.error.message}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={this.handleRetry}
                className="flex-1 font-semibold"
              >
                {vi.ui.error.retry}
              </Button>
              <Button
                asChild
                variant="outline"
                className="flex-1 font-semibold border-border"
              >
                <a href="/">
                  {vi.ui.error.backToHome}
                </a>
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
