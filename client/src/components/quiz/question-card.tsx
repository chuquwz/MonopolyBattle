"use client";

import * as React from "react";
import { HelpCircle, Sparkles } from "lucide-react";
import { vi } from "@/i18n/vi";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

// Maps concept keys to Vietnamese names
const CONCEPT_NAMES: Record<string, string> = {
  CAPITAL_CONCENTRATION: "Tập trung tư bản",
  CAPITAL_CENTRALIZATION: "Tích tụ tư bản",
  STATE_MONOPOLY_CAPITALISM: "CNTB độc quyền nhà nước",
  EXPORT_OF_CAPITAL: "Xuất khẩu tư bản",
  CAPITALIST_CONTRADICTIONS: "Mâu thuẫn tư bản",
  STATE_REGULATION: "Điều tiết của Nhà nước",
  TECHNOLOGICAL_PROGRESS: "Tiến bộ công nghệ",
  MONOPOLY_FORMATION: "Hình thành độc quyền",
  MONOPOLY_PRICING: "Giá cả độc quyền",
  COMPETITION_ELIMINATION: "Hạn chế cạnh tranh",
};

interface QuestionCardProps {
  question: string;
  category?: string;
  relatedConcept?: string;
}

export function QuestionCard({ question, category, relatedConcept }: QuestionCardProps): React.JSX.Element {
  const conceptName = relatedConcept ? CONCEPT_NAMES[relatedConcept] || relatedConcept : null;

  return (
    <Card className="border-border/50 bg-slate-950/40 shadow-lg overflow-hidden select-none">
      <CardHeader className="pb-3 border-b border-border/20 flex flex-row items-center justify-between gap-4">
        {/* Category / Concept Badges */}
        <div className="flex flex-wrap gap-2">
          {category && (
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest bg-primary/20 text-blue-300 border border-primary/30 uppercase">
              {category}
            </span>
          )}
          {conceptName && (
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              {conceptName}
            </span>
          )}
        </div>
        
        {/* Icon */}
        <div className="p-1.5 rounded bg-slate-900 border border-border text-accent">
          <HelpCircle className="w-4 h-4" />
        </div>
      </CardHeader>
      
      <CardContent className="pt-5">
        <CardTitle className="text-base md:text-lg font-extrabold text-foreground leading-relaxed">
          {question}
        </CardTitle>
      </CardContent>
    </Card>
  );
}
