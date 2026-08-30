// Mirrors backend/src/modules/dailyAnalysis/dailyAnalysis.service.ts's
// DailyAnalysisDto — the verdict fields are deterministic (never set by
// the LLM), only headline/explanation/adjustments text is LLM-generated,
// and only to explain a verdict it can't itself change.
export interface DailyAnalysis {
  id: string;
  date: string;
  dayType: "analyzed" | "no_data";
  nutritionStatus: "on_target" | "over" | "under" | "no_data" | null;
  proteinStatus: "met" | "under" | "no_data" | null;
  workoutStatus:
    | "completed"
    | "partial"
    | "skipped"
    | "unplanned_extra"
    | "rest_day_as_scheduled"
    | "no_data"
    | null;
  netContribution: "positive" | "negative" | "neutral" | null;
  headline: string;
  explanation: string;
  adjustments: string[];
  viewedAt: string | null;
  createdAt: string;
}
