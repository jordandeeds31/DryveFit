const exercises = [
  // Chest
  {
    name: "Barbell Bench Press",
    muscleGroup: "chest",
    equipment: "barbell",
    isCompound: true,
    description:
      "Lie flat on a bench, grip the bar slightly wider than shoulder-width, lower it to your mid-chest with control, then press up until arms are fully extended.",
  },
  {
    name: "Incline Barbell Bench Press",
    muscleGroup: "chest",
    equipment: "barbell",
    isCompound: true,
    description:
      "On a bench set to a 30-45 degree incline, grip the bar slightly wider than shoulder-width, lower it to your upper chest, then press up until arms are fully extended.",
  },
  {
    name: "Decline Barbell Bench Press",
    muscleGroup: "chest",
    equipment: "barbell",
    isCompound: true,
    description:
      "On a bench set to a slight decline, grip the bar shoulder-width apart, lower it to your lower chest, then press up until arms are fully extended.",
  },
  {
    name: "Dumbbell Bench Press",
    muscleGroup: "chest",
    equipment: "dumbbell",
    isCompound: true,
    description:
      "Lie flat on a bench holding a dumbbell in each hand at chest level, press them up until arms are extended, then lower with control back to chest height.",
  },
  {
    name: "Incline Dumbbell Press",
    muscleGroup: "chest",
    equipment: "dumbbell",
    isCompound: true,
    description:
      "On an incline bench, hold a dumbbell in each hand at shoulder level, press them up until arms are extended, then lower with control.",
  },
  {
    name: "Dumbbell Flyes",
    muscleGroup: "chest",
    equipment: "dumbbell",
    isCompound: false,
    description:
      "Lie on a flat bench holding dumbbells above your chest with a slight elbow bend, lower them out to the sides in an arc until you feel a stretch, then bring them back together over your chest.",
  },
  {
    name: "Incline Dumbbell Flyes",
    muscleGroup: "chest",
    equipment: "dumbbell",
    isCompound: false,
    description:
      "On an incline bench, hold dumbbells above your upper chest with a slight elbow bend, lower them out to the sides in an arc, then bring them back together at the top.",
  },
  {
    name: "Cable Crossover",
    muscleGroup: "chest",
    equipment: "cable",
    isCompound: false,
    description:
      "Stand centered between two high cable pulleys, grip a handle in each hand, and pull both down and across your body in an arc until your hands meet in front of your hips, then return with control.",
  },
  {
    name: "Push-Ups",
    muscleGroup: "chest",
    equipment: "bodyweight",
    isCompound: true,
    description:
      "Start in a plank position with hands slightly wider than shoulder-width, lower your chest toward the floor keeping your body straight, then push back up to full arm extension.",
  },
  {
    name: "Chest Dips",
    muscleGroup: "chest",
    equipment: "bodyweight",
    isCompound: true,
    description:
      "Support yourself on parallel bars with a slight forward lean, lower your body by bending your elbows until you feel a stretch in your chest, then press back up to full extension.",
  },
  {
    name: "Pec Deck Machine",
    muscleGroup: "chest",
    equipment: "machine",
    isCompound: false,
    description:
      "Sit in the machine with your back against the pad and forearms on the levers, bring your arms together in front of your chest, then return slowly to the starting position.",
  },
  {
    name: "Smith Machine Bench Press",
    muscleGroup: "chest",
    equipment: "machine",
    isCompound: true,
    description:
      "Lie on a bench under the Smith machine bar, unrack it, lower it to your mid-chest with control, then press up until arms are fully extended.",
  },

  // Back
  {
    name: "Deadlift",
    muscleGroup: "back",
    equipment: "barbell",
    isCompound: true,
    description:
      "Stand with feet hip-width apart, grip the bar just outside your knees, keep your back flat and chest up, then drive through your heels to stand up fully, extending hips and knees together.",
  },
  {
    name: "Dumbbell Bent Over Row",
    muscleGroup: "back",
    equipment: "dumbbell",
    isCompound: true,
    description:
      "Hinge forward at the hips with a flat back holding a dumbbell in each hand, pull the dumbbells toward your ribs squeezing your shoulder blades together, then lower with control.",
  },
  {
    name: "Barbell Bent Over Row",
    muscleGroup: "back",
    equipment: "barbell",
    isCompound: true,
    description:
      "Hinge forward at the hips with a flat back gripping the bar, pull it toward your lower ribs squeezing your shoulder blades together, then lower with control.",
  },
  {
    name: "T-Bar Row",
    muscleGroup: "back",
    equipment: "barbell",
    isCompound: true,
    description:
      "Straddle the bar with a flat back and slight forward lean, grip the handles, pull the weight up toward your chest squeezing your shoulder blades, then lower with control.",
  },
  {
    name: "Pull-Ups",
    muscleGroup: "back",
    equipment: "bodyweight",
    isCompound: true,
    description:
      "Hang from a bar with an overhand grip wider than shoulder-width, pull your body up until your chin clears the bar, then lower with control to full arm extension.",
  },
  {
    name: "Chin-Ups",
    muscleGroup: "back",
    equipment: "bodyweight",
    isCompound: true,
    description:
      "Hang from a bar with an underhand, shoulder-width grip, pull your body up until your chin clears the bar, then lower with control to full arm extension.",
  },
  {
    name: "Lat Pulldown",
    muscleGroup: "lats",
    equipment: "cable",
    isCompound: true,
    description:
      "Sit at the machine gripping the bar wider than shoulder-width, pull it down to your upper chest while keeping your torso upright, then let it rise back with control.",
  },
  {
    name: "Seated Cable Row",
    muscleGroup: "back",
    equipment: "cable",
    isCompound: true,
    description:
      "Sit with knees slightly bent and grip the handle, pull it toward your torso keeping your back straight and elbows close, then extend your arms back out with control.",
  },
  {
    name: "One-Arm Dumbbell Row",
    muscleGroup: "back",
    equipment: "dumbbell",
    isCompound: true,
    description:
      "Support yourself with one hand and knee on a bench, hold a dumbbell in the other hand, pull it up toward your hip keeping your elbow close, then lower with control.",
  },
  {
    name: "Straight Arm Pulldown",
    muscleGroup: "lats",
    equipment: "cable",
    isCompound: false,
    description:
      "Stand facing a high cable pulley with arms extended, keeping elbows nearly straight, pull the bar down toward your thighs using your lats, then let it rise back with control.",
  },
  {
    name: "Face Pulls",
    muscleGroup: "traps",
    equipment: "cable",
    isCompound: false,
    description:
      "Set a cable at head height with a rope attachment, pull it toward your face flaring your elbows out and squeezing your shoulder blades, then return with control.",
  },
  {
    name: "Hyperextensions",
    muscleGroup: "lower back",
    equipment: "bodyweight",
    isCompound: false,
    description:
      "Position your hips on the hyperextension bench with feet secured, lower your torso forward with a flat back, then raise back up until your body forms a straight line.",
  },
  {
    name: "Good Mornings",
    muscleGroup: "lower back",
    equipment: "barbell",
    isCompound: true,
    description:
      "With the bar across your upper back, hinge forward at the hips keeping a flat back and slight knee bend until your torso is near parallel to the floor, then return to standing.",
  },

  // Shoulders
  {
    name: "Barbell Overhead Press",
    muscleGroup: "shoulders",
    equipment: "barbell",
    isCompound: true,
    description:
      "Stand with the bar racked at shoulder height, press it straight overhead until arms are fully extended, then lower it back to shoulder level with control.",
  },
  {
    name: "Dumbbell Shoulder Press",
    muscleGroup: "shoulders",
    equipment: "dumbbell",
    isCompound: true,
    description:
      "Sit or stand holding a dumbbell in each hand at shoulder height, press them overhead until arms are extended, then lower back to shoulder level with control.",
  },
  {
    name: "Arnold Press",
    muscleGroup: "shoulders",
    equipment: "dumbbell",
    isCompound: true,
    description:
      "Start with dumbbells at shoulder height, palms facing you, press them overhead while rotating your palms to face forward, then reverse the motion on the way down.",
  },
  {
    name: "Lateral Raises",
    muscleGroup: "shoulders",
    equipment: "dumbbell",
    isCompound: false,
    description:
      "Stand holding a dumbbell in each hand at your sides, raise them out to shoulder height with a slight elbow bend, then lower with control.",
  },
  {
    name: "Front Raises",
    muscleGroup: "shoulders",
    equipment: "dumbbell",
    isCompound: false,
    description:
      "Stand holding a dumbbell in each hand in front of your thighs, raise them straight out in front to shoulder height, then lower with control.",
  },
  {
    name: "Rear Delt Flyes",
    muscleGroup: "shoulders",
    equipment: "dumbbell",
    isCompound: false,
    description:
      "Hinge forward at the hips holding a dumbbell in each hand, raise them out to the sides squeezing your shoulder blades together, then lower with control.",
  },
  {
    name: "Cable Lateral Raise",
    muscleGroup: "shoulders",
    equipment: "cable",
    isCompound: false,
    description:
      "Stand beside a low cable pulley, grip the handle across your body, raise your arm out to shoulder height, then lower with control.",
  },
  {
    name: "Barbell Shrugs",
    muscleGroup: "traps",
    equipment: "barbell",
    isCompound: false,
    description:
      "Stand holding the bar in front of your thighs, shrug your shoulders straight up toward your ears, then lower with control without rolling your shoulders.",
  },
  {
    name: "Dumbbell Shrugs",
    muscleGroup: "traps",
    equipment: "dumbbell",
    isCompound: false,
    description:
      "Stand holding a dumbbell at each side, shrug your shoulders straight up toward your ears, then lower with control without rolling your shoulders.",
  },
  {
    name: "Upright Rows",
    muscleGroup: "traps",
    equipment: "barbell",
    isCompound: false,
    description:
      "Stand holding the bar in front of your thighs with a shoulder-width grip, pull it straight up along your body to chest height leading with your elbows, then lower with control.",
  },

  // Biceps
  {
    name: "Barbell Bicep Curl",
    muscleGroup: "biceps",
    equipment: "barbell",
    isCompound: false,
    description:
      "Stand holding the bar with an underhand shoulder-width grip, curl it up toward your shoulders keeping elbows fixed at your sides, then lower with control.",
  },
  {
    name: "Dumbbell Bicep Curl",
    muscleGroup: "biceps",
    equipment: "dumbbell",
    isCompound: false,
    description:
      "Stand holding a dumbbell in each hand with palms facing forward, curl them up toward your shoulders keeping elbows fixed at your sides, then lower with control.",
  },
  {
    name: "Hammer Curls",
    muscleGroup: "biceps",
    equipment: "dumbbell",
    isCompound: false,
    description:
      "Stand holding a dumbbell in each hand with palms facing your body, curl them up toward your shoulders keeping your wrists neutral, then lower with control.",
  },
  {
    name: "Preacher Curl",
    muscleGroup: "biceps",
    equipment: "barbell",
    isCompound: false,
    description:
      "Rest your upper arms on a preacher bench pad gripping the bar underhand, curl it up toward your shoulders, then lower with control until your arms are nearly straight.",
  },
  {
    name: "Concentration Curl",
    muscleGroup: "biceps",
    equipment: "dumbbell",
    isCompound: false,
    description:
      "Sit with your elbow braced against your inner thigh holding a dumbbell, curl it up toward your shoulder, then lower with control.",
  },
  {
    name: "Cable Curl",
    muscleGroup: "biceps",
    equipment: "cable",
    isCompound: false,
    description:
      "Stand facing a low cable pulley holding the bar attachment underhand, curl it up toward your shoulders keeping elbows fixed at your sides, then lower with control.",
  },
  {
    name: "EZ-Bar Curl",
    muscleGroup: "biceps",
    equipment: "barbell",
    isCompound: false,
    description:
      "Stand holding the EZ-bar with an underhand grip on the angled handles, curl it up toward your shoulders keeping elbows fixed at your sides, then lower with control.",
  },

  // Triceps
  {
    name: "Close-Grip Bench Press",
    muscleGroup: "triceps",
    equipment: "barbell",
    isCompound: true,
    description:
      "Lie on a bench gripping the bar with hands shoulder-width apart, lower it to your lower chest keeping elbows close to your body, then press up until arms are fully extended.",
  },
  {
    name: "Tricep Pushdown",
    muscleGroup: "triceps",
    equipment: "cable",
    isCompound: false,
    description:
      "Stand facing a high cable pulley gripping the bar attachment, keeping elbows fixed at your sides, push it down until arms are extended, then let it rise back with control.",
  },
  {
    name: "Overhead Tricep Extension",
    muscleGroup: "triceps",
    equipment: "dumbbell",
    isCompound: false,
    description:
      "Hold a dumbbell overhead with both hands, lower it behind your head by bending your elbows, then extend your arms back to full overhead extension.",
  },
  {
    name: "Skull Crushers",
    muscleGroup: "triceps",
    equipment: "barbell",
    isCompound: false,
    description:
      "Lie on a bench holding the bar above your chest, lower it toward your forehead by bending your elbows, then extend your arms back to the starting position.",
  },
  {
    name: "Tricep Dips",
    muscleGroup: "triceps",
    equipment: "bodyweight",
    isCompound: true,
    description:
      "Support yourself on parallel bars or a bench with your body upright, lower yourself by bending your elbows, then press back up to full arm extension.",
  },
  {
    name: "Diamond Push-Ups",
    muscleGroup: "triceps",
    equipment: "bodyweight",
    isCompound: true,
    description:
      "Start in a plank position with hands together under your chest forming a diamond shape, lower your chest toward your hands, then push back up to full extension.",
  },
  {
    name: "Cable Overhead Tricep Extension",
    muscleGroup: "triceps",
    equipment: "cable",
    isCompound: false,
    description:
      "Face away from a low cable pulley holding the rope overhead, lower it behind your head by bending your elbows, then extend your arms back to full overhead extension.",
  },

  // Forearms
  {
    name: "Wrist Curls",
    muscleGroup: "forearms",
    equipment: "dumbbell",
    isCompound: false,
    description:
      "Rest your forearms on your thighs or a bench with wrists hanging off the edge, palms up, curl the dumbbells up using only your wrists, then lower with control.",
  },
  {
    name: "Reverse Wrist Curls",
    muscleGroup: "forearms",
    equipment: "dumbbell",
    isCompound: false,
    description:
      "Rest your forearms on your thighs or a bench with wrists hanging off the edge, palms down, raise the dumbbells up using only your wrists, then lower with control.",
  },
  {
    name: "Farmer's Carry",
    muscleGroup: "forearms",
    equipment: "dumbbell",
    isCompound: true,
    description:
      "Hold a heavy dumbbell in each hand at your sides with a firm grip, stand tall, and walk forward for a set distance or time while keeping your core braced.",
  },
  {
    name: "Reverse Curl",
    muscleGroup: "forearms",
    equipment: "barbell",
    isCompound: false,
    description:
      "Stand holding the bar with an overhand shoulder-width grip, curl it up toward your shoulders keeping elbows fixed at your sides, then lower with control.",
  },

  // Legs — Quads
  {
    name: "Barbell Back Squat",
    muscleGroup: "quads",
    equipment: "barbell",
    isCompound: true,
    description:
      "Rest the bar across your upper back, feet shoulder-width apart, lower your hips down and back until thighs are at least parallel to the floor, then drive through your heels to stand back up.",
  },
  {
    name: "Barbell Front Squat",
    muscleGroup: "quads",
    equipment: "barbell",
    isCompound: true,
    description:
      "Rest the bar across the front of your shoulders with elbows high, lower your hips down until thighs are at least parallel to the floor, then drive through your heels to stand back up.",
  },
  {
    name: "Leg Press",
    muscleGroup: "quads",
    equipment: "machine",
    isCompound: true,
    description:
      "Sit in the machine with feet shoulder-width apart on the platform, lower the weight by bending your knees toward your chest, then press through your heels to extend your legs without locking your knees.",
  },
  {
    name: "Leg Extension",
    muscleGroup: "quads",
    equipment: "machine",
    isCompound: false,
    description:
      "Sit in the machine with your shins behind the pad, extend your legs straight out until fully extended, then lower with control back to the starting position.",
  },
  {
    name: "Walking Lunges",
    muscleGroup: "quads",
    equipment: "dumbbell",
    isCompound: true,
    description:
      "Hold a dumbbell in each hand, step forward into a lunge lowering your back knee toward the floor, then drive up and step forward into the next lunge with the opposite leg.",
  },
  {
    name: "Bulgarian Split Squat",
    muscleGroup: "quads",
    equipment: "dumbbell",
    isCompound: true,
    description:
      "Stand a couple feet in front of a bench with one foot resting behind you on it, holding dumbbells at your sides, lower your back knee toward the floor, then drive through your front heel to stand back up.",
  },
  {
    name: "Goblet Squat",
    muscleGroup: "quads",
    equipment: "dumbbell",
    isCompound: true,
    description:
      "Hold a dumbbell vertically against your chest with both hands, lower your hips down between your knees keeping your chest upright, then drive through your heels to stand back up.",
  },
  {
    name: "Hack Squat",
    muscleGroup: "quads",
    equipment: "machine",
    isCompound: true,
    description:
      "Position yourself in the machine with shoulders and back against the pads, feet shoulder-width apart, lower into a squat until thighs are at least parallel, then press through your heels to stand back up.",
  },

  // Legs — Hamstrings/Glutes
  {
    name: "Romanian Deadlift",
    muscleGroup: "hamstrings",
    equipment: "barbell",
    isCompound: true,
    description:
      "Hold the bar in front of your thighs, hinge at the hips with a flat back and slight knee bend, lower the bar along your legs until you feel a hamstring stretch, then drive your hips forward to stand back up.",
  },
  {
    name: "Leg Curl",
    muscleGroup: "hamstrings",
    equipment: "machine",
    isCompound: false,
    description:
      "Lie face down on the machine with your ankles behind the pad, curl your heels up toward your glutes, then lower with control back to the starting position.",
  },
  {
    name: "Hip Thrust",
    muscleGroup: "glutes",
    equipment: "barbell",
    isCompound: true,
    description:
      "Sit with your upper back against a bench and a barbell across your hips, drive through your heels to lift your hips until your body forms a straight line, then lower with control.",
  },
  {
    name: "Glute Bridge",
    muscleGroup: "glutes",
    equipment: "bodyweight",
    isCompound: true,
    description:
      "Lie on your back with knees bent and feet flat on the floor, drive through your heels to raise your hips until your body forms a straight line, then lower with control.",
  },
  {
    name: "Cable Kickback",
    muscleGroup: "glutes",
    equipment: "cable",
    isCompound: false,
    description:
      "Attach an ankle cuff to a low cable pulley, hinge forward slightly holding onto the machine for support, kick your leg straight back and up, then return with control.",
  },
  {
    name: "Sumo Deadlift",
    muscleGroup: "glutes",
    equipment: "barbell",
    isCompound: true,
    description:
      "Stand with a wide stance and toes pointed out, grip the bar inside your knees, keep your back flat and chest up, then drive through your heels to stand up fully.",
  },
  {
    name: "Step-Ups",
    muscleGroup: "glutes",
    equipment: "dumbbell",
    isCompound: true,
    description:
      "Hold a dumbbell in each hand and step up onto a bench or box with one foot, driving through that heel to stand fully on top, then step back down with control and alternate legs.",
  },

  // Calves
  {
    name: "Standing Calf Raise",
    muscleGroup: "calves",
    equipment: "machine",
    isCompound: false,
    description:
      "Stand on the machine platform with the balls of your feet on the edge, rise up onto your toes as high as possible, then lower your heels below the platform for a full stretch.",
  },
  {
    name: "Seated Calf Raise",
    muscleGroup: "calves",
    equipment: "machine",
    isCompound: false,
    description:
      "Sit at the machine with the balls of your feet on the platform and pads resting on your thighs, raise your heels as high as possible, then lower for a full stretch.",
  },
  {
    name: "Donkey Calf Raise",
    muscleGroup: "calves",
    equipment: "machine",
    isCompound: false,
    description:
      "Bend forward at the hips with the balls of your feet on the platform and the pad across your lower back, raise your heels as high as possible, then lower for a full stretch.",
  },

  // Core
  {
    name: "Plank",
    muscleGroup: "abs",
    equipment: "bodyweight",
    isCompound: false,
    description:
      "Support yourself on your forearms and toes with your body in a straight line from head to heels, brace your core, and hold the position without letting your hips sag.",
  },
  {
    name: "Crunches",
    muscleGroup: "abs",
    equipment: "bodyweight",
    isCompound: false,
    description:
      "Lie on your back with knees bent and hands behind your head, curl your shoulders up off the floor by contracting your abs, then lower back down with control.",
  },
  {
    name: "Hanging Leg Raise",
    muscleGroup: "abs",
    equipment: "bodyweight",
    isCompound: false,
    description:
      "Hang from a pull-up bar with arms fully extended, raise your legs straight up until they're parallel to the floor or higher, then lower with control.",
  },
  {
    name: "Cable Crunch",
    muscleGroup: "abs",
    equipment: "cable",
    isCompound: false,
    description:
      "Kneel below a high cable pulley holding the rope by your head, crunch down by curling your torso toward your hips, then return with control.",
  },
  {
    name: "Russian Twists",
    muscleGroup: "obliques",
    equipment: "bodyweight",
    isCompound: false,
    description:
      "Sit with knees bent and feet slightly off the floor, lean back slightly and rotate your torso side to side, tapping the floor beside your hip each time.",
  },
  {
    name: "Bicycle Crunches",
    muscleGroup: "abs",
    equipment: "bodyweight",
    isCompound: false,
    description:
      "Lie on your back with hands behind your head, bring one knee toward your chest while rotating your opposite elbow to meet it, then alternate sides in a pedaling motion.",
  },
  {
    name: "Ab Wheel Rollout",
    muscleGroup: "abs",
    equipment: "bodyweight",
    isCompound: false,
    description:
      "Kneel holding the ab wheel with both hands, brace your core and roll it forward as far as you can control, then pull it back to the starting position.",
  },
  {
    name: "Side Plank",
    muscleGroup: "obliques",
    equipment: "bodyweight",
    isCompound: false,
    description:
      "Lie on your side supported by one forearm and the side of your foot, raise your hips so your body forms a straight line, and hold the position without sagging.",
  },
  {
    name: "Weighted Sit-Ups",
    muscleGroup: "abs",
    equipment: "dumbbell",
    isCompound: false,
    description:
      "Lie on your back with knees bent holding a dumbbell against your chest, sit all the way up by contracting your abs, then lower back down with control.",
  },
];

export default exercises;
