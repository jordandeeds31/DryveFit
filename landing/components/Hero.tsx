"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import WaitlistForm from "./WaitlistForm";
import AppStoreBadge from "./AppStoreBadge";

const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      delay: i * 0.12,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  }),
};

const Hero = () => {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden pt-20">
      <div className="absolute inset-0 -z-10">
        <HeroScene />
      </div>
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(55% 45% at 50% 32%, rgba(5,7,15,0.35), var(--background) 78%)",
        }}
      />

      <div className="mx-auto flex max-w-6xl flex-col items-center px-6 text-center md:px-10">
        <motion.div
          custom={0}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-white/[0.04] px-4 py-1.5 text-xs font-medium text-muted backdrop-blur-md"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-neon-green" />
          Launching soon
        </motion.div>

        <motion.h1
          custom={1}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="text-balance text-5xl font-semibold tracking-tight text-foreground sm:text-6xl md:text-7xl"
        >
          Train harder.
          <br />
          <span className="bg-gradient-to-r from-primary-blue-bright to-neon-green bg-clip-text text-transparent">
            Track everything.
          </span>
        </motion.h1>

        <motion.p
          custom={2}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="mt-6 max-w-xl text-balance text-lg text-muted md:text-xl"
        >
          Dryve is the all-in-one training app — programs, lifts, cardio,
          nutrition, and an AI coach that keeps you accountable, in one place.
        </motion.p>

        <motion.div
          custom={3}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          id="waitlist"
          className="mt-10 flex w-full flex-col items-center gap-6"
        >
          <WaitlistForm />
          <AppStoreBadge />
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
