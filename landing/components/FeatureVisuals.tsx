"use client";

import { motion } from "framer-motion";

const CardShell = ({ children }: { children: React.ReactNode }) => (
  <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-white/[0.06] to-white/[0.01] p-6">
    {children}
  </div>
);

export const ProgramsVisual = () => {
  const rows = [
    { label: "Barbell Squat", sets: "4×8", done: true },
    { label: "Romanian Deadlift", sets: "3×10", done: true },
    { label: "Walking Lunge", sets: "3×12", done: false },
    { label: "Leg Press", sets: "4×10", done: false },
  ];
  return (
    <CardShell>
      <div className="flex h-full flex-col justify-center gap-3">
        {rows.map((row, i) => (
          <motion.div
            key={row.label}
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 + i * 0.1, duration: 0.5 }}
            className="flex items-center justify-between rounded-xl border border-border bg-white/[0.03] px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
                  row.done
                    ? "border-neon-green bg-neon-green/20 text-neon-green"
                    : "border-border text-muted"
                }`}
              >
                {row.done ? "✓" : ""}
              </span>
              <span className="text-sm font-medium text-foreground">
                {row.label}
              </span>
            </div>
            <span className="text-sm text-muted">{row.sets}</span>
          </motion.div>
        ))}
      </div>
    </CardShell>
  );
};

export const CardioVisual = () => {
  const bars = [40, 65, 30, 80, 55, 90, 45, 70, 60, 95, 50, 75];
  return (
    <CardShell>
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">
              This week
            </p>
            <p className="text-2xl font-semibold text-foreground">
              18.4 <span className="text-sm font-normal text-muted">mi</span>
            </p>
          </div>
          <span className="rounded-full border border-neon-green/30 bg-neon-green/10 px-3 py-1 text-xs font-medium text-neon-green">
            #2 leaderboard
          </span>
        </div>
        <div className="flex h-28 items-end gap-2">
          {bars.map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              whileInView={{ height: `${h}%` }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.6, ease: "easeOut" }}
              className="flex-1 rounded-t-sm bg-gradient-to-t from-primary-blue-bright/40 to-primary-blue-bright"
            />
          ))}
        </div>
      </div>
    </CardShell>
  );
};

export const NutritionVisual = () => {
  const macros = [
    { label: "Protein", value: 182, goal: 190, color: "var(--neon-green)" },
    { label: "Carbs", value: 210, goal: 260, color: "var(--primary-blue-bright)" },
    { label: "Fat", value: 58, goal: 70, color: "#c084fc" },
  ];
  return (
    <CardShell>
      <div className="flex h-full flex-col justify-center gap-5">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">
            Calories today
          </p>
          <p className="text-2xl font-semibold text-foreground">
            2,140{" "}
            <span className="text-sm font-normal text-muted">/ 2,450</span>
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {macros.map((m, i) => (
            <div key={m.label}>
              <div className="mb-1.5 flex justify-between text-xs text-muted">
                <span>{m.label}</span>
                <span>
                  {m.value}g / {m.goal}g
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${(m.value / m.goal) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 + i * 0.12, duration: 0.7, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ background: m.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </CardShell>
  );
};

export const CoachVisual = () => {
  return (
    <CardShell>
      <div className="flex h-full flex-col justify-end gap-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="max-w-[75%] self-start rounded-2xl rounded-bl-sm border border-border bg-white/[0.05] px-4 py-2.5 text-sm text-foreground"
        >
          You crushed today&apos;s protein goal — nice work on leg day too.
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="max-w-[70%] self-end rounded-2xl rounded-br-sm bg-primary-blue-bright px-4 py-2.5 text-sm text-white"
        >
          What should I eat before tomorrow&apos;s run?
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="flex max-w-[55%] items-center gap-1.5 self-start rounded-2xl rounded-bl-sm border border-border bg-white/[0.05] px-4 py-3"
        >
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" />
        </motion.div>
      </div>
    </CardShell>
  );
};

export const RemindersVisual = () => {
  return (
    <CardShell>
      <div className="flex h-full items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-xs rounded-2xl border border-border bg-white/[0.06] p-4 shadow-2xl backdrop-blur-md"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-blue-bright">
              <span className="text-sm font-bold text-white">D</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Dryve</p>
              <p className="text-xs text-muted">now</p>
            </div>
          </div>
          <p className="mt-2.5 text-sm text-foreground">
            You haven&apos;t logged today&apos;s pull session yet — tap to
            finish strong 💪
          </p>
        </motion.div>
      </div>
    </CardShell>
  );
};
