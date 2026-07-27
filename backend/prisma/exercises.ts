const exercises = [
  // Chest
  {
    name: "Barbell Bench Press",
    muscleGroup: "chest",
    equipment: "barbell",
    isCompound: true,
  },
  {
    name: "Incline Barbell Bench Press",
    muscleGroup: "chest",
    equipment: "barbell",
    isCompound: true,
  },
  {
    name: "Decline Barbell Bench Press",
    muscleGroup: "chest",
    equipment: "barbell",
    isCompound: true,
  },
  {
    name: "Dumbbell Bench Press",
    muscleGroup: "chest",
    equipment: "dumbbell",
    isCompound: true,
  },
  {
    name: "Incline Dumbbell Press",
    muscleGroup: "chest",
    equipment: "dumbbell",
    isCompound: true,
  },
  {
    name: "Dumbbell Flyes",
    muscleGroup: "chest",
    equipment: "dumbbell",
    isCompound: false,
  },
  {
    name: "Incline Dumbbell Flyes",
    muscleGroup: "chest",
    equipment: "dumbbell",
    isCompound: false,
  },
  {
    name: "Cable Crossover",
    muscleGroup: "chest",
    equipment: "cable",
    isCompound: false,
  },
  {
    name: "Push-Ups",
    muscleGroup: "chest",
    equipment: "bodyweight",
    isCompound: true,
  },
  {
    name: "Chest Dips",
    muscleGroup: "chest",
    equipment: "bodyweight",
    isCompound: true,
  },
  {
    name: "Pec Deck Machine",
    muscleGroup: "chest",
    equipment: "machine",
    isCompound: false,
  },
  {
    name: "Smith Machine Bench Press",
    muscleGroup: "chest",
    equipment: "machine",
    isCompound: true,
  },

  // Back
  {
    name: "Deadlift",
    muscleGroup: "back",
    equipment: "barbell",
    isCompound: true,
  },
  {
    name: "Dumbbell Bent Over Row",
    muscleGroup: "back",
    equipment: "dumbbell",
    isCompound: true,
  },
  {
    name: "Barbell Bent Over Row",
    muscleGroup: "back",
    equipment: "barbell",
    isCompound: true,
  },
  {
    name: "T-Bar Row",
    muscleGroup: "back",
    equipment: "barbell",
    isCompound: true,
  },
  {
    name: "Pull-Ups",
    muscleGroup: "back",
    equipment: "bodyweight",
    isCompound: true,
  },
  {
    name: "Chin-Ups",
    muscleGroup: "back",
    equipment: "bodyweight",
    isCompound: true,
  },
  {
    name: "Lat Pulldown",
    muscleGroup: "lats",
    equipment: "cable",
    isCompound: true,
  },
  {
    name: "Seated Cable Row",
    muscleGroup: "back",
    equipment: "cable",
    isCompound: true,
  },
  {
    name: "One-Arm Dumbbell Row",
    muscleGroup: "back",
    equipment: "dumbbell",
    isCompound: true,
  },
  {
    name: "Straight Arm Pulldown",
    muscleGroup: "lats",
    equipment: "cable",
    isCompound: false,
  },
  {
    name: "Face Pulls",
    muscleGroup: "traps",
    equipment: "cable",
    isCompound: false,
  },
  {
    name: "Hyperextensions",
    muscleGroup: "lower back",
    equipment: "bodyweight",
    isCompound: false,
  },
  {
    name: "Good Mornings",
    muscleGroup: "lower back",
    equipment: "barbell",
    isCompound: true,
  },

  // Shoulders
  {
    name: "Barbell Overhead Press",
    muscleGroup: "shoulders",
    equipment: "barbell",
    isCompound: true,
  },
  {
    name: "Dumbbell Shoulder Press",
    muscleGroup: "shoulders",
    equipment: "dumbbell",
    isCompound: true,
  },
  {
    name: "Arnold Press",
    muscleGroup: "shoulders",
    equipment: "dumbbell",
    isCompound: true,
  },
  {
    name: "Lateral Raises",
    muscleGroup: "shoulders",
    equipment: "dumbbell",
    isCompound: false,
  },
  {
    name: "Front Raises",
    muscleGroup: "shoulders",
    equipment: "dumbbell",
    isCompound: false,
  },
  {
    name: "Rear Delt Flyes",
    muscleGroup: "shoulders",
    equipment: "dumbbell",
    isCompound: false,
  },
  {
    name: "Cable Lateral Raise",
    muscleGroup: "shoulders",
    equipment: "cable",
    isCompound: false,
  },
  {
    name: "Barbell Shrugs",
    muscleGroup: "traps",
    equipment: "barbell",
    isCompound: false,
  },
  {
    name: "Dumbbell Shrugs",
    muscleGroup: "traps",
    equipment: "dumbbell",
    isCompound: false,
  },
  {
    name: "Upright Rows",
    muscleGroup: "traps",
    equipment: "barbell",
    isCompound: false,
  },

  // Biceps
  {
    name: "Barbell Bicep Curl",
    muscleGroup: "biceps",
    equipment: "barbell",
    isCompound: false,
  },
  {
    name: "Dumbbell Bicep Curl",
    muscleGroup: "biceps",
    equipment: "dumbbell",
    isCompound: false,
  },
  {
    name: "Hammer Curls",
    muscleGroup: "biceps",
    equipment: "dumbbell",
    isCompound: false,
  },
  {
    name: "Preacher Curl",
    muscleGroup: "biceps",
    equipment: "barbell",
    isCompound: false,
  },
  {
    name: "Concentration Curl",
    muscleGroup: "biceps",
    equipment: "dumbbell",
    isCompound: false,
  },
  {
    name: "Cable Curl",
    muscleGroup: "biceps",
    equipment: "cable",
    isCompound: false,
  },
  {
    name: "EZ-Bar Curl",
    muscleGroup: "biceps",
    equipment: "barbell",
    isCompound: false,
  },

  // Triceps
  {
    name: "Close-Grip Bench Press",
    muscleGroup: "triceps",
    equipment: "barbell",
    isCompound: true,
  },
  {
    name: "Tricep Pushdown",
    muscleGroup: "triceps",
    equipment: "cable",
    isCompound: false,
  },
  {
    name: "Overhead Tricep Extension",
    muscleGroup: "triceps",
    equipment: "dumbbell",
    isCompound: false,
  },
  {
    name: "Skull Crushers",
    muscleGroup: "triceps",
    equipment: "barbell",
    isCompound: false,
  },
  {
    name: "Tricep Dips",
    muscleGroup: "triceps",
    equipment: "bodyweight",
    isCompound: true,
  },
  {
    name: "Diamond Push-Ups",
    muscleGroup: "triceps",
    equipment: "bodyweight",
    isCompound: true,
  },
  {
    name: "Cable Overhead Tricep Extension",
    muscleGroup: "triceps",
    equipment: "cable",
    isCompound: false,
  },

  // Forearms
  {
    name: "Wrist Curls",
    muscleGroup: "forearms",
    equipment: "dumbbell",
    isCompound: false,
  },
  {
    name: "Reverse Wrist Curls",
    muscleGroup: "forearms",
    equipment: "dumbbell",
    isCompound: false,
  },
  {
    name: "Farmer's Carry",
    muscleGroup: "forearms",
    equipment: "dumbbell",
    isCompound: true,
  },
  {
    name: "Reverse Curl",
    muscleGroup: "forearms",
    equipment: "barbell",
    isCompound: false,
  },

  // Legs — Quads
  {
    name: "Barbell Back Squat",
    muscleGroup: "quads",
    equipment: "barbell",
    isCompound: true,
  },
  {
    name: "Barbell Front Squat",
    muscleGroup: "quads",
    equipment: "barbell",
    isCompound: true,
  },
  {
    name: "Leg Press",
    muscleGroup: "quads",
    equipment: "machine",
    isCompound: true,
  },
  {
    name: "Leg Extension",
    muscleGroup: "quads",
    equipment: "machine",
    isCompound: false,
  },
  {
    name: "Walking Lunges",
    muscleGroup: "quads",
    equipment: "dumbbell",
    isCompound: true,
  },
  {
    name: "Bulgarian Split Squat",
    muscleGroup: "quads",
    equipment: "dumbbell",
    isCompound: true,
  },
  {
    name: "Goblet Squat",
    muscleGroup: "quads",
    equipment: "dumbbell",
    isCompound: true,
  },
  {
    name: "Hack Squat",
    muscleGroup: "quads",
    equipment: "machine",
    isCompound: true,
  },

  // Legs — Hamstrings/Glutes
  {
    name: "Romanian Deadlift",
    muscleGroup: "hamstrings",
    equipment: "barbell",
    isCompound: true,
  },
  {
    name: "Leg Curl",
    muscleGroup: "hamstrings",
    equipment: "machine",
    isCompound: false,
  },
  {
    name: "Hip Thrust",
    muscleGroup: "glutes",
    equipment: "barbell",
    isCompound: true,
  },
  {
    name: "Glute Bridge",
    muscleGroup: "glutes",
    equipment: "bodyweight",
    isCompound: true,
  },
  {
    name: "Cable Kickback",
    muscleGroup: "glutes",
    equipment: "cable",
    isCompound: false,
  },
  {
    name: "Sumo Deadlift",
    muscleGroup: "glutes",
    equipment: "barbell",
    isCompound: true,
  },
  {
    name: "Step-Ups",
    muscleGroup: "glutes",
    equipment: "dumbbell",
    isCompound: true,
  },

  // Calves
  {
    name: "Standing Calf Raise",
    muscleGroup: "calves",
    equipment: "machine",
    isCompound: false,
  },
  {
    name: "Seated Calf Raise",
    muscleGroup: "calves",
    equipment: "machine",
    isCompound: false,
  },
  {
    name: "Donkey Calf Raise",
    muscleGroup: "calves",
    equipment: "machine",
    isCompound: false,
  },

  // Core
  {
    name: "Plank",
    muscleGroup: "abs",
    equipment: "bodyweight",
    isCompound: false,
  },
  {
    name: "Crunches",
    muscleGroup: "abs",
    equipment: "bodyweight",
    isCompound: false,
  },
  {
    name: "Hanging Leg Raise",
    muscleGroup: "abs",
    equipment: "bodyweight",
    isCompound: false,
  },
  {
    name: "Cable Crunch",
    muscleGroup: "abs",
    equipment: "cable",
    isCompound: false,
  },
  {
    name: "Russian Twists",
    muscleGroup: "obliques",
    equipment: "bodyweight",
    isCompound: false,
  },
  {
    name: "Bicycle Crunches",
    muscleGroup: "abs",
    equipment: "bodyweight",
    isCompound: false,
  },
  {
    name: "Ab Wheel Rollout",
    muscleGroup: "abs",
    equipment: "bodyweight",
    isCompound: false,
  },
  {
    name: "Side Plank",
    muscleGroup: "obliques",
    equipment: "bodyweight",
    isCompound: false,
  },
  {
    name: "Weighted Sit-Ups",
    muscleGroup: "abs",
    equipment: "dumbbell",
    isCompound: false,
  },
];

export default exercises;
