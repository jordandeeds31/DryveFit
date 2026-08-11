"use client";

import { Dumbbell, HeartPulse, Apple, Bot, BellRing } from "lucide-react";
import FeatureRow from "./FeatureRow";
import {
  ProgramsVisual,
  CardioVisual,
  NutritionVisual,
  CoachVisual,
  RemindersVisual,
} from "./FeatureVisuals";

const Features = () => {
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-28 px-6 py-32 md:px-10 md:py-40">
      <FeatureRow
        icon={Dumbbell}
        eyebrow="Programs & logging"
        title="Programs built for you, logged in seconds"
        description="Generate a training split around your schedule and equipment, then log every set and rep as you go — with weight recommendations that adjust as you progress."
        visual={<ProgramsVisual />}
      />
      <FeatureRow
        icon={HeartPulse}
        eyebrow="Cardio"
        title="Every run and ride, automatically tracked"
        description="GPS routes, pace, heart rate, and step counts sync straight from Apple Health — plus a live leaderboard to keep you honest against your friends."
        reversed
        visual={<CardioVisual />}
      />
      <FeatureRow
        icon={Apple}
        eyebrow="Nutrition"
        title="Calories and macros, dialed in"
        description="A personalized calorie and macro target based on your body and goal — lose fat, build muscle, or recomp — with a diary as fast as searching and tapping."
        visual={<NutritionVisual />}
      />
      <FeatureRow
        icon={Bot}
        eyebrow="AI coach"
        title="A coach in your pocket, all day"
        description="Ask about your programming, your nutrition, or what today's numbers say about tomorrow's session — Dryve's coach knows your full training history."
        reversed
        visual={<CoachVisual />}
      />
      <FeatureRow
        icon={BellRing}
        eyebrow="Reminders"
        title="Never miss a scheduled session"
        description="If today's workout is still sitting unlogged by evening, Dryve nudges you — a quiet push at the right time instead of a guilt trip the next morning."
        visual={<RemindersVisual />}
      />
    </section>
  );
};

export default Features;
