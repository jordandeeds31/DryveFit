import { Apple } from "lucide-react";

const AppStoreBadge = () => {
  return (
    <div
      aria-disabled="true"
      className="flex items-center gap-3 rounded-xl border border-border bg-white/[0.03] px-4 py-2.5 opacity-70"
    >
      <Apple className="h-7 w-7 text-foreground" strokeWidth={1.5} />
      <div className="text-left leading-tight">
        <p className="text-[10px] uppercase tracking-wide text-muted">
          Coming soon on the
        </p>
        <p className="text-base font-semibold text-foreground">App Store</p>
      </div>
    </div>
  );
};

export default AppStoreBadge;
