"use client";

import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface FeatureRowProps {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  reversed?: boolean;
  visual: ReactNode;
}

const FeatureRow = ({
  icon: Icon,
  eyebrow,
  title,
  description,
  reversed,
  visual,
}: FeatureRowProps) => {
  return (
    <div
      className={`grid items-center gap-12 md:grid-cols-2 md:gap-16 ${
        reversed ? "md:[&>*:first-child]:order-2" : ""
      }`}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-white/[0.04]">
          <Icon className="h-5 w-5 text-primary-blue-bright" strokeWidth={1.75} />
        </div>
        <p className="mb-2 text-sm font-medium uppercase tracking-wide text-primary-blue-bright">
          {eyebrow}
        </p>
        <h3 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          {title}
        </h3>
        <p className="mt-4 max-w-md text-lg text-muted">{description}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {visual}
      </motion.div>
    </div>
  );
};

export default FeatureRow;
