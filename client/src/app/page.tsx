import * as React from "react";
import Link from "next/link";
import { vi } from "@/i18n/vi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-background text-foreground relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-30">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-primary blur-[130px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-accent blur-[120px] animate-pulse" style={{ animationDuration: '6s' }} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 z-10">
        <div className="max-w-3xl w-full text-center space-y-12">
          {/* Brand/Hero section */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-accent via-amber-200 to-accent bg-clip-text text-transparent drop-shadow-sm select-none">
              {vi.pages.landing.title}
            </h1>
            <p className="text-xl md:text-2xl font-bold text-muted-foreground tracking-wide">
              {vi.pages.landing.subtitle}
            </p>
            <p className="max-w-xl mx-auto text-muted-foreground text-sm md:text-base leading-relaxed">
              {vi.pages.landing.description}
            </p>
          </div>

          {/* Role selection cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            {/* Host CTA */}
            <Card className="border-border bg-card/60 backdrop-blur hover:border-accent/40 transition-all duration-300 group shadow-lg flex flex-col justify-between">
              <CardHeader className="space-y-2 p-6 pb-4">
                <div className="mx-auto w-12 h-12 rounded-lg bg-accent/10 text-accent flex items-center justify-center border border-accent/20 group-hover:scale-110 transition-transform">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25"
                    />
                  </svg>
                </div>
                <CardTitle className="text-xl font-bold group-hover:text-accent transition-colors">
                  {vi.layout.header.roleHost}
                </CardTitle>
                <CardDescription className="text-muted-foreground text-xs leading-relaxed">
                  {vi.pages.landing.hostDesc}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <Button asChild variant="outline" className="w-full border-border hover:border-accent hover:bg-accent hover:text-accent-foreground font-bold">
                  <Link href="/host">
                    {vi.pages.landing.hostCta}
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Player CTA */}
            <Card className="border-border bg-card/60 backdrop-blur hover:border-primary/40 transition-all duration-300 group shadow-lg flex flex-col justify-between">
              <CardHeader className="space-y-2 p-6 pb-4">
                <div className="mx-auto w-12 h-12 rounded-lg bg-primary/20 text-muted-foreground flex items-center justify-center border border-primary/30 group-hover:scale-110 transition-transform">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94-3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
                    />
                  </svg>
                </div>
                <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">
                  {vi.layout.header.rolePlayer}
                </CardTitle>
                <CardDescription className="text-muted-foreground text-xs leading-relaxed">
                  {vi.pages.landing.playerDesc}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <Button asChild variant="accent" className="w-full font-bold">
                  <Link href="/play/join">
                    {vi.pages.landing.playerCta}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="h-14 border-t border-border bg-background flex items-center justify-center text-[10px] text-muted-foreground font-medium px-6 text-center select-none z-10">
        {vi.layout.footer.copyright}
      </footer>
    </div>
  );
}
