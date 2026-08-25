import { Exercise } from "@/types/exercise.types";

// Static snapshot of the backend 'exercises' table (see
// backend/prisma/exercises.ts for the seed source and
// backend/src/modules/exercises/exercises.service.ts for the live
// endpoint this mirrors). The catalog is small (~80 rows) and doesn't
// change at runtime, so useExercises() reads straight from this instead
// of hitting the network — no loading state, no 'no exercises found'
// from a slow/flaky mobile connection, works offline. imageUrl is the
// same authenticated-proxy relative path the backend already returns
// (see WorkoutDetail.tsx for how callers prefix it with
// EXPO_PUBLIC_API_URL); the /api/exercises/image proxy endpoint itself
// still lives on the backend and still serves these on demand.
//
// Re-generate by re-running the dump+transform this was built from
// against the live DB if the catalog ever actually changes (new
// exercise added, description edited, etc.) — see git history for
// commit introducing this file for the exact script.
export const EXERCISES: Exercise[] = [
  {
    id: "8324af68-6c03-4bea-91a6-11c52da5a252",
    name: "Ab Wheel Rollout",
    muscleGroup: "abs",
    equipment: "bodyweight",
    description:
      "Kneel holding the ab wheel with both hands, brace your core and roll it forward as far as you can control, then pull it back to the starting position.",
    imageUrl: "/api/exercises/image?name=Ab%20Wheel%20Rollout&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "5dac9157-bbc5-4cd5-8585-3324df167295",
    name: "Arnold Press",
    muscleGroup: "shoulders",
    equipment: "dumbbell",
    description:
      "Start with dumbbells at shoulder height, palms facing you, press them overhead while rotating your palms to face forward, then reverse the motion on the way down.",
    imageUrl: "/api/exercises/image?name=Arnold%20Press&v=2",
    isCompound: true,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "2dfc24a9-60ca-4e9c-a81f-2ce0f0d2f0bc",
    name: "Barbell Back Squat",
    muscleGroup: "quads",
    equipment: "barbell",
    description:
      "Rest the bar across your upper back, feet shoulder-width apart, lower your hips down and back until thighs are at least parallel to the floor, then drive through your heels to stand back up.",
    imageUrl: "/api/exercises/image?name=Barbell%20Back%20Squat&v=2",
    isCompound: true,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "cca36c3e-609d-4775-957e-054a9651b208",
    name: "Barbell Bench Press",
    muscleGroup: "chest",
    equipment: "barbell",
    description:
      "Lie flat on a bench, grip the bar slightly wider than shoulder-width, lower it to your mid-chest with control, then press up until arms are fully extended.",
    imageUrl: "/api/exercises/image?name=Barbell%20Bench%20Press&v=2",
    isCompound: true,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "899603b2-34df-4431-b00e-9a0df469a862",
    name: "Barbell Bent Over Row",
    muscleGroup: "back",
    equipment: "barbell",
    description:
      "Hinge forward at the hips with a flat back gripping the bar, pull it toward your lower ribs squeezing your shoulder blades together, then lower with control.",
    imageUrl: "/api/exercises/image?name=Barbell%20Bent%20Over%20Row&v=2",
    isCompound: true,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "ea8fedc6-7890-4116-b9ba-465ce6fd71c1",
    name: "Barbell Bicep Curl",
    muscleGroup: "biceps",
    equipment: "barbell",
    description:
      "Stand holding the bar with an underhand shoulder-width grip, curl it up toward your shoulders keeping elbows fixed at your sides, then lower with control.",
    imageUrl: "/api/exercises/image?name=Barbell%20Bicep%20Curl&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "144726ff-9807-4188-ba99-35140ea2014e",
    name: "Barbell Front Squat",
    muscleGroup: "quads",
    equipment: "barbell",
    description:
      "Rest the bar across the front of your shoulders with elbows high, lower your hips down until thighs are at least parallel to the floor, then drive through your heels to stand back up.",
    imageUrl: "/api/exercises/image?name=Barbell%20Front%20Squat&v=2",
    isCompound: true,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "58860652-3046-4b24-ac7b-a76545cc6504",
    name: "Barbell Overhead Press",
    muscleGroup: "shoulders",
    equipment: "barbell",
    description:
      "Stand with the bar racked at shoulder height, press it straight overhead until arms are fully extended, then lower it back to shoulder level with control.",
    imageUrl: "/api/exercises/image?name=Barbell%20Overhead%20Press&v=2",
    isCompound: true,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "85ae30c6-e19d-4772-a67e-e7b6b6d44fa9",
    name: "Barbell Shrugs",
    muscleGroup: "traps",
    equipment: "barbell",
    description:
      "Stand holding the bar in front of your thighs, shrug your shoulders straight up toward your ears, then lower with control without rolling your shoulders.",
    imageUrl: "/api/exercises/image?name=Barbell%20Shrugs&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "30658175-62ea-4948-8692-a7185ab647bb",
    name: "Bicycle Crunches",
    muscleGroup: "abs",
    equipment: "bodyweight",
    description:
      "Lie on your back with hands behind your head, bring one knee toward your chest while rotating your opposite elbow to meet it, then alternate sides in a pedaling motion.",
    imageUrl: "/api/exercises/image?name=Bicycle%20Crunches&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "5e4e6f10-a773-4790-a0e4-f31f3d600339",
    name: "Bulgarian Split Squat",
    muscleGroup: "quads",
    equipment: "dumbbell",
    description:
      "Stand a couple feet in front of a bench with one foot resting behind you on it, holding dumbbells at your sides, lower your back knee toward the floor, then drive through your front heel to stand back up.",
    imageUrl: "/api/exercises/image?name=Bulgarian%20Split%20Squat&v=2",
    isCompound: true,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "4c53182d-48b3-46ec-bb4e-0c9e84c41281",
    name: "Cable Crunch",
    muscleGroup: "abs",
    equipment: "cable",
    description:
      "Kneel below a high cable pulley holding the rope by your head, crunch down by curling your torso toward your hips, then return with control.",
    imageUrl: "/api/exercises/image?name=Cable%20Crunch&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "ef315c3d-ba02-423d-815e-20f6dd1fd014",
    name: "Cable Curl",
    muscleGroup: "biceps",
    equipment: "cable",
    description:
      "Stand facing a low cable pulley holding the bar attachment underhand, curl it up toward your shoulders keeping elbows fixed at your sides, then lower with control.",
    imageUrl: "/api/exercises/image?name=Cable%20Curl&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "05528bc9-dea1-47c4-b8c9-a663f2bcb4c9",
    name: "Cable Kickback",
    muscleGroup: "glutes",
    equipment: "cable",
    description:
      "Attach an ankle cuff to a low cable pulley, hinge forward slightly holding onto the machine for support, kick your leg straight back and up, then return with control.",
    imageUrl: "/api/exercises/image?name=Cable%20Kickback&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "9c70170c-8423-4acb-8e73-2f7b71127378",
    name: "Cable Lateral Raise",
    muscleGroup: "shoulders",
    equipment: "cable",
    description:
      "Stand beside a low cable pulley, grip the handle across your body, raise your arm out to shoulder height, then lower with control.",
    imageUrl: "/api/exercises/image?name=Cable%20Lateral%20Raise&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "851e80d4-d731-4eea-968d-0868f500602e",
    name: "Cable Overhead Tricep Extension",
    muscleGroup: "triceps",
    equipment: "cable",
    description:
      "Face away from a low cable pulley holding the rope overhead, lower it behind your head by bending your elbows, then extend your arms back to full overhead extension.",
    imageUrl:
      "/api/exercises/image?name=Cable%20Overhead%20Tricep%20Extension&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "f691d8a7-4481-4e7d-ad1f-04834ae3ee61",
    name: "Cable Pulldown (Pro Lat Bar)",
    muscleGroup: "lats",
    equipment: "cable",
    description:
      "Sit at the machine gripping the bar wider than shoulder-width, pull it down to your upper chest while keeping your torso upright, then let it rise back with control.",
    imageUrl:
      "/api/exercises/image?name=Cable%20Pulldown%20(Pro%20Lat%20Bar)&v=2",
    isCompound: true,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "dc0bcd65-014b-4c36-8240-f2f817dcca21",
    name: "Cable Standing Up Straight Crossovers",
    muscleGroup: "chest",
    equipment: "cable",
    description:
      "Stand centered between two high cable pulleys, grip a handle in each hand, and pull both down and across your body in an arc until your hands meet in front of your hips, then return with control.",
    imageUrl:
      "/api/exercises/image?name=Cable%20Standing%20Up%20Straight%20Crossovers&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "e19963bf-1bbd-414a-8d15-87998ffc2da9",
    name: "Chest Dips",
    muscleGroup: "chest",
    equipment: "bodyweight",
    description:
      "Support yourself on parallel bars with a slight forward lean, lower your body by bending your elbows until you feel a stretch in your chest, then press back up to full extension.",
    imageUrl: "/api/exercises/image?name=Chest%20Dips&v=2",
    isCompound: true,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "b0594fbc-3f63-4f9f-85e2-ee7e1e222d3b",
    name: "Chin-Ups",
    muscleGroup: "back",
    equipment: "bodyweight",
    description:
      "Hang from a bar with an underhand, shoulder-width grip, pull your body up until your chin clears the bar, then lower with control to full arm extension.",
    imageUrl: "/api/exercises/image?name=Chin-Ups&v=2",
    isCompound: true,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "adf653b7-7cc0-4f13-9e54-c00f740ae698",
    name: "Close-Grip Bench Press",
    muscleGroup: "triceps",
    equipment: "barbell",
    description:
      "Lie on a bench gripping the bar with hands shoulder-width apart, lower it to your lower chest keeping elbows close to your body, then press up until arms are fully extended.",
    imageUrl: "/api/exercises/image?name=Close-Grip%20Bench%20Press&v=2",
    isCompound: true,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "97f7b875-3061-4beb-815d-066e5486d203",
    name: "Concentration Curl",
    muscleGroup: "biceps",
    equipment: "dumbbell",
    description:
      "Sit with your elbow braced against your inner thigh holding a dumbbell, curl it up toward your shoulder, then lower with control.",
    imageUrl: "/api/exercises/image?name=Concentration%20Curl&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "df8b3af1-c47a-4c5c-a601-a13f069313fb",
    name: "Crunches",
    muscleGroup: "abs",
    equipment: "bodyweight",
    description:
      "Lie on your back with knees bent and hands behind your head, curl your shoulders up off the floor by contracting your abs, then lower back down with control.",
    imageUrl: "/api/exercises/image?name=Crunches&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "20e16301-534f-4803-a69f-39013252a004",
    name: "Deadlift",
    muscleGroup: "back",
    equipment: "barbell",
    description:
      "Stand with feet hip-width apart, grip the bar just outside your knees, keep your back flat and chest up, then drive through your heels to stand up fully, extending hips and knees together.",
    imageUrl: "/api/exercises/image?name=Deadlift&v=2",
    isCompound: true,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "8145960c-ac81-4344-9e18-2dd7017730ef",
    name: "Decline Barbell Bench Press",
    muscleGroup: "chest",
    equipment: "barbell",
    description:
      "On a bench set to a slight decline, grip the bar shoulder-width apart, lower it to your lower chest, then press up until arms are fully extended.",
    imageUrl: "/api/exercises/image?name=Decline%20Barbell%20Bench%20Press&v=2",
    isCompound: true,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "7703120a-3c12-4aca-9c5a-5a6ae99cfff2",
    name: "Diamond Push-Ups",
    muscleGroup: "triceps",
    equipment: "bodyweight",
    description:
      "Start in a plank position with hands together under your chest forming a diamond shape, lower your chest toward your hands, then push back up to full extension.",
    imageUrl: "/api/exercises/image?name=Diamond%20Push-Ups&v=2",
    isCompound: true,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "f0778d06-48a8-4991-8642-99da6da31fea",
    name: "Donkey Calf Raise",
    muscleGroup: "calves",
    equipment: "machine",
    description:
      "Bend forward at the hips with the balls of your feet on the platform and the pad across your lower back, raise your heels as high as possible, then lower for a full stretch.",
    imageUrl: "/api/exercises/image?name=Donkey%20Calf%20Raise&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "908ab143-8509-4b76-a599-6256d7042f18",
    name: "Dumbbell Bench Press",
    muscleGroup: "chest",
    equipment: "dumbbell",
    description:
      "Lie flat on a bench holding a dumbbell in each hand at chest level, press them up until arms are extended, then lower with control back to chest height.",
    imageUrl: "/api/exercises/image?name=Dumbbell%20Bench%20Press&v=2",
    isCompound: true,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "425a318d-b9b6-4f18-b555-075c8080fd85",
    name: "Dumbbell Bent Over Row",
    muscleGroup: "back",
    equipment: "dumbbell",
    description:
      "Hinge forward at the hips with a flat back holding a dumbbell in each hand, pull the dumbbells toward your ribs squeezing your shoulder blades together, then lower with control.",
    imageUrl: "/api/exercises/image?name=Dumbbell%20Bent%20Over%20Row&v=2",
    isCompound: true,
    createdAt: "2026-07-27T21:01:25.529Z",
  },
  {
    id: "176cda74-1173-4bb7-ac2a-445a043ea761",
    name: "Dumbbell Bicep Curl",
    muscleGroup: "biceps",
    equipment: "dumbbell",
    description:
      "Stand holding a dumbbell in each hand with palms facing forward, curl them up toward your shoulders keeping elbows fixed at your sides, then lower with control.",
    imageUrl: "/api/exercises/image?name=Dumbbell%20Bicep%20Curl&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "12c7ac63-b7fe-4cf9-9a59-7fa6d13868b1",
    name: "Dumbbell Flyes",
    muscleGroup: "chest",
    equipment: "dumbbell",
    description:
      "Lie on a flat bench holding dumbbells above your chest with a slight elbow bend, lower them out to the sides in an arc until you feel a stretch, then bring them back together over your chest.",
    imageUrl: "/api/exercises/image?name=Dumbbell%20Flyes&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "93e7bd7a-112b-4317-98fc-15776457e66e",
    name: "Dumbbell Incline Bench Press",
    muscleGroup: "chest",
    equipment: "dumbbell",
    description:
      "On an incline bench, hold a dumbbell in each hand at shoulder level, press them up until arms are extended, then lower with control.",
    imageUrl:
      "/api/exercises/image?name=Dumbbell%20Incline%20Bench%20Press&v=2",
    isCompound: true,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "756573fd-fe36-4c30-8436-81c0cdd8d646",
    name: "Dumbbell Shoulder Press",
    muscleGroup: "shoulders",
    equipment: "dumbbell",
    description:
      "Sit or stand holding a dumbbell in each hand at shoulder height, press them overhead until arms are extended, then lower back to shoulder level with control.",
    imageUrl: "/api/exercises/image?name=Dumbbell%20Shoulder%20Press&v=2",
    isCompound: true,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "ee2ae930-96c8-43bf-b97f-c5f782e90489",
    name: "Dumbbell Shrugs",
    muscleGroup: "traps",
    equipment: "dumbbell",
    description:
      "Stand holding a dumbbell at each side, shrug your shoulders straight up toward your ears, then lower with control without rolling your shoulders.",
    imageUrl: "/api/exercises/image?name=Dumbbell%20Shrugs&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "287dcae7-a449-4342-9743-d4fd861ea6fb",
    name: "EZ-Bar Curl",
    muscleGroup: "biceps",
    equipment: "barbell",
    description:
      "Stand holding the EZ-bar with an underhand grip on the angled handles, curl it up toward your shoulders keeping elbows fixed at your sides, then lower with control.",
    imageUrl: "/api/exercises/image?name=EZ-Bar%20Curl&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "cce57b1f-2b45-46a2-af9f-564f5455fb10",
    name: "Face Pulls",
    muscleGroup: "traps",
    equipment: "cable",
    description:
      "Set a cable at head height with a rope attachment, pull it toward your face flaring your elbows out and squeezing your shoulder blades, then return with control.",
    imageUrl: "/api/exercises/image?name=Face%20Pulls&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "2d792470-0b89-4eba-ac1a-6b36179dd7e4",
    name: "Farmer's Carry",
    muscleGroup: "forearms",
    equipment: "dumbbell",
    description:
      "Hold a heavy dumbbell in each hand at your sides with a firm grip, stand tall, and walk forward for a set distance or time while keeping your core braced.",
    imageUrl: "/api/exercises/image?name=Farmer's%20Carry&v=2",
    isCompound: true,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "a5cb570d-842b-4a12-b32f-2281db71cf36",
    name: "Front Raises",
    muscleGroup: "shoulders",
    equipment: "dumbbell",
    description:
      "Stand holding a dumbbell in each hand in front of your thighs, raise them straight out in front to shoulder height, then lower with control.",
    imageUrl: "/api/exercises/image?name=Front%20Raises&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "6bae9b8e-b742-4363-bee4-97e6b430a26e",
    name: "Glute Bridge",
    muscleGroup: "glutes",
    equipment: "bodyweight",
    description:
      "Lie on your back with knees bent and feet flat on the floor, drive through your heels to raise your hips until your body forms a straight line, then lower with control.",
    imageUrl: "/api/exercises/image?name=Glute%20Bridge&v=2",
    isCompound: true,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "bde83991-d9b3-4b06-8b0b-a0b0c94ca785",
    name: "Goblet Squat",
    muscleGroup: "quads",
    equipment: "dumbbell",
    description:
      "Hold a dumbbell vertically against your chest with both hands, lower your hips down between your knees keeping your chest upright, then drive through your heels to stand back up.",
    imageUrl: "/api/exercises/image?name=Goblet%20Squat&v=2",
    isCompound: true,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "848fdf2f-6706-4b64-827b-ad1891764a4e",
    name: "Good Mornings",
    muscleGroup: "lower back",
    equipment: "barbell",
    description:
      "With the bar across your upper back, hinge forward at the hips keeping a flat back and slight knee bend until your torso is near parallel to the floor, then return to standing.",
    imageUrl: "/api/exercises/image?name=Good%20Mornings&v=2",
    isCompound: true,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "3b437a0a-a737-4ed7-839d-91cdf5f8c381",
    name: "Hack Squat",
    muscleGroup: "quads",
    equipment: "machine",
    description:
      "Position yourself in the machine with shoulders and back against the pads, feet shoulder-width apart, lower into a squat until thighs are at least parallel, then press through your heels to stand back up.",
    imageUrl: "/api/exercises/image?name=Hack%20Squat&v=2",
    isCompound: true,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "74e85feb-a680-4c9e-9bcd-de8ac0f33341",
    name: "Hammer Curls",
    muscleGroup: "biceps",
    equipment: "dumbbell",
    description:
      "Stand holding a dumbbell in each hand with palms facing your body, curl them up toward your shoulders keeping your wrists neutral, then lower with control.",
    imageUrl: "/api/exercises/image?name=Hammer%20Curls&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "bcb11585-c218-46d6-ae93-c5f0fa62c497",
    name: "Hanging Leg Raise",
    muscleGroup: "abs",
    equipment: "bodyweight",
    description:
      "Hang from a pull-up bar with arms fully extended, raise your legs straight up until they're parallel to the floor or higher, then lower with control.",
    imageUrl: "/api/exercises/image?name=Hanging%20Leg%20Raise&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "aff64a83-bdf3-4278-9275-d875ff85f17f",
    name: "Hip Thrust",
    muscleGroup: "glutes",
    equipment: "barbell",
    description:
      "Sit with your upper back against a bench and a barbell across your hips, drive through your heels to lift your hips until your body forms a straight line, then lower with control.",
    imageUrl: "/api/exercises/image?name=Hip%20Thrust&v=2",
    isCompound: true,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "1a9dd0ab-cc37-43c1-bc0a-c4d3979ce95b",
    name: "Hyperextensions",
    muscleGroup: "lower back",
    equipment: "bodyweight",
    description:
      "Position your hips on the hyperextension bench with feet secured, lower your torso forward with a flat back, then raise back up until your body forms a straight line.",
    imageUrl: "/api/exercises/image?name=Hyperextensions&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "80da9bef-7227-4ecc-b512-431725667f82",
    name: "Incline Barbell Bench Press",
    muscleGroup: "chest",
    equipment: "barbell",
    description:
      "On a bench set to a 30-45 degree incline, grip the bar slightly wider than shoulder-width, lower it to your upper chest, then press up until arms are fully extended.",
    imageUrl: "/api/exercises/image?name=Incline%20Barbell%20Bench%20Press&v=2",
    isCompound: true,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "2b887c30-4553-4147-aac4-01d9f4a4d55e",
    name: "Incline Dumbbell Flyes",
    muscleGroup: "chest",
    equipment: "dumbbell",
    description:
      "On an incline bench, hold dumbbells above your upper chest with a slight elbow bend, lower them out to the sides in an arc, then bring them back together at the top.",
    imageUrl: "/api/exercises/image?name=Incline%20Dumbbell%20Flyes&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "9acfd4cc-e0d9-4f94-b567-ad6de6564f9c",
    name: "Lateral Raises",
    muscleGroup: "shoulders",
    equipment: "dumbbell",
    description:
      "Stand holding a dumbbell in each hand at your sides, raise them out to shoulder height with a slight elbow bend, then lower with control.",
    imageUrl: "/api/exercises/image?name=Lateral%20Raises&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "8ff951f0-8629-498e-88cc-5cf4a24929cb",
    name: "Leg Curl",
    muscleGroup: "hamstrings",
    equipment: "machine",
    description:
      "Lie face down on the machine with your ankles behind the pad, curl your heels up toward your glutes, then lower with control back to the starting position.",
    imageUrl: "/api/exercises/image?name=Leg%20Curl&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "306ba5db-e176-4fa2-b215-702d81bde567",
    name: "Leg Extension",
    muscleGroup: "quads",
    equipment: "machine",
    description:
      "Sit in the machine with your shins behind the pad, extend your legs straight out until fully extended, then lower with control back to the starting position.",
    imageUrl: "/api/exercises/image?name=Leg%20Extension&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "c83e5285-c6f7-4d2e-a189-12918d3e5077",
    name: "Leg Press",
    muscleGroup: "quads",
    equipment: "machine",
    description:
      "Sit in the machine with feet shoulder-width apart on the platform, lower the weight by bending your knees toward your chest, then press through your heels to extend your legs without locking your knees.",
    imageUrl: "/api/exercises/image?name=Leg%20Press&v=2",
    isCompound: true,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "7f18f1fe-3c2f-4a1c-87e7-36a52e46153b",
    name: "One-Arm Dumbbell Row",
    muscleGroup: "back",
    equipment: "dumbbell",
    description:
      "Support yourself with one hand and knee on a bench, hold a dumbbell in the other hand, pull it up toward your hip keeping your elbow close, then lower with control.",
    imageUrl: "/api/exercises/image?name=One-Arm%20Dumbbell%20Row&v=2",
    isCompound: true,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "292e1d66-3c9c-4971-8d82-de2e82c7d219",
    name: "Overhead Tricep Extension",
    muscleGroup: "triceps",
    equipment: "dumbbell",
    description:
      "Hold a dumbbell overhead with both hands, lower it behind your head by bending your elbows, then extend your arms back to full overhead extension.",
    imageUrl: "/api/exercises/image?name=Overhead%20Tricep%20Extension&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "41b7a6d8-23a8-4aed-a51e-bc2fe34cdd6c",
    name: "Pec Deck Machine",
    muscleGroup: "chest",
    equipment: "machine",
    description:
      "Sit in the machine with your back against the pad and forearms on the levers, bring your arms together in front of your chest, then return slowly to the starting position.",
    imageUrl: null,
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "c1e94243-7846-4ac9-81db-515e4fb1a73f",
    name: "Plank",
    muscleGroup: "abs",
    equipment: "bodyweight",
    description:
      "Support yourself on your forearms and toes with your body in a straight line from head to heels, brace your core, and hold the position without letting your hips sag.",
    imageUrl: "/api/exercises/image?name=Plank&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "bf27c076-71eb-457e-9470-b54ee1add3ae",
    name: "Preacher Curl",
    muscleGroup: "biceps",
    equipment: "barbell",
    description:
      "Rest your upper arms on a preacher bench pad gripping the bar underhand, curl it up toward your shoulders, then lower with control until your arms are nearly straight.",
    imageUrl: "/api/exercises/image?name=Preacher%20Curl&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "dfffe1df-1b75-458a-831f-380eff2b1316",
    name: "Pull-Ups",
    muscleGroup: "back",
    equipment: "bodyweight",
    description:
      "Hang from a bar with an overhand grip wider than shoulder-width, pull your body up until your chin clears the bar, then lower with control to full arm extension.",
    imageUrl: "/api/exercises/image?name=Pull-Ups&v=2",
    isCompound: true,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "1d71049c-7cfe-4b50-98b5-b7d9a14f993f",
    name: "Push-Ups",
    muscleGroup: "chest",
    equipment: "bodyweight",
    description:
      "Start in a plank position with hands slightly wider than shoulder-width, lower your chest toward the floor keeping your body straight, then push back up to full arm extension.",
    imageUrl: "/api/exercises/image?name=Push-Ups&v=2",
    isCompound: true,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "e4ffbde0-c803-482a-900b-68ac97c1398d",
    name: "Rear Delt Flyes",
    muscleGroup: "shoulders",
    equipment: "dumbbell",
    description:
      "Hinge forward at the hips holding a dumbbell in each hand, raise them out to the sides squeezing your shoulder blades together, then lower with control.",
    imageUrl: "/api/exercises/image?name=Rear%20Delt%20Flyes&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "4ec8ceb3-ba0c-4ceb-891d-2c898871b39f",
    name: "Reverse Curl",
    muscleGroup: "forearms",
    equipment: "barbell",
    description:
      "Stand holding the bar with an overhand shoulder-width grip, curl it up toward your shoulders keeping elbows fixed at your sides, then lower with control.",
    imageUrl: "/api/exercises/image?name=Reverse%20Curl&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "0d92f6d1-04b6-43c3-b83b-47d8c121323a",
    name: "Reverse Wrist Curls",
    muscleGroup: "forearms",
    equipment: "dumbbell",
    description:
      "Rest your forearms on your thighs or a bench with wrists hanging off the edge, palms down, raise the dumbbells up using only your wrists, then lower with control.",
    imageUrl: "/api/exercises/image?name=Reverse%20Wrist%20Curls&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "7c4993fc-7f45-4c68-abb0-78411eee0421",
    name: "Romanian Deadlift",
    muscleGroup: "hamstrings",
    equipment: "barbell",
    description:
      "Hold the bar in front of your thighs, hinge at the hips with a flat back and slight knee bend, lower the bar along your legs until you feel a hamstring stretch, then drive your hips forward to stand back up.",
    imageUrl: "/api/exercises/image?name=Romanian%20Deadlift&v=2",
    isCompound: true,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "7bc6b986-8df7-4fc5-9b59-8d9edd20c369",
    name: "Russian Twists",
    muscleGroup: "obliques",
    equipment: "bodyweight",
    description:
      "Sit with knees bent and feet slightly off the floor, lean back slightly and rotate your torso side to side, tapping the floor beside your hip each time.",
    imageUrl: "/api/exercises/image?name=Russian%20Twists&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "c59a1654-b76b-48df-bcc5-46fe6e28c9d8",
    name: "Seated Cable Row",
    muscleGroup: "back",
    equipment: "cable",
    description:
      "Sit with knees slightly bent and grip the handle, pull it toward your torso keeping your back straight and elbows close, then extend your arms back out with control.",
    imageUrl: "/api/exercises/image?name=Seated%20Cable%20Row&v=2",
    isCompound: true,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "497180c9-e9d0-4576-89c1-71094e1d347f",
    name: "Seated Calf Raise",
    muscleGroup: "calves",
    equipment: "machine",
    description:
      "Sit at the machine with the balls of your feet on the platform and pads resting on your thighs, raise your heels as high as possible, then lower for a full stretch.",
    imageUrl: "/api/exercises/image?name=Seated%20Calf%20Raise&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "efff0a70-94ef-4002-84ad-f07df9b0e085",
    name: "Side Plank",
    muscleGroup: "obliques",
    equipment: "bodyweight",
    description:
      "Lie on your side supported by one forearm and the side of your foot, raise your hips so your body forms a straight line, and hold the position without sagging.",
    imageUrl: "/api/exercises/image?name=Side%20Plank&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "7ba1ea45-4aff-42d8-a4ae-33ec4ac389cd",
    name: "Skull Crushers",
    muscleGroup: "triceps",
    equipment: "barbell",
    description:
      "Lie on a bench holding the bar above your chest, lower it toward your forehead by bending your elbows, then extend your arms back to the starting position.",
    imageUrl: "/api/exercises/image?name=Skull%20Crushers&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "7ae1fca1-397a-458d-8a5b-2c624da06c97",
    name: "Smith Machine Bench Press",
    muscleGroup: "chest",
    equipment: "machine",
    description:
      "Lie on a bench under the Smith machine bar, unrack it, lower it to your mid-chest with control, then press up until arms are fully extended.",
    imageUrl: "/api/exercises/image?name=Smith%20Machine%20Bench%20Press&v=2",
    isCompound: true,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "e5646532-eeb8-464d-8a40-369172d67c15",
    name: "Standing Calf Raise",
    muscleGroup: "calves",
    equipment: "machine",
    description:
      "Stand on the machine platform with the balls of your feet on the edge, rise up onto your toes as high as possible, then lower your heels below the platform for a full stretch.",
    imageUrl: "/api/exercises/image?name=Standing%20Calf%20Raise&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "58a6a7ce-a4eb-42d3-a8d3-557dac77adde",
    name: "Step-Ups",
    muscleGroup: "glutes",
    equipment: "dumbbell",
    description:
      "Hold a dumbbell in each hand and step up onto a bench or box with one foot, driving through that heel to stand fully on top, then step back down with control and alternate legs.",
    imageUrl: "/api/exercises/image?name=Step-Ups&v=2",
    isCompound: true,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "4d23bef7-7648-4e43-ba0c-0a29cad8d9a9",
    name: "Straight Arm Pulldown",
    muscleGroup: "lats",
    equipment: "cable",
    description:
      "Stand facing a high cable pulley with arms extended, keeping elbows nearly straight, pull the bar down toward your thighs using your lats, then let it rise back with control.",
    imageUrl: "/api/exercises/image?name=Straight%20Arm%20Pulldown&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "fbc1ca51-5b02-41c8-a275-4a7fd44a3119",
    name: "Sumo Deadlift",
    muscleGroup: "glutes",
    equipment: "barbell",
    description:
      "Stand with a wide stance and toes pointed out, grip the bar inside your knees, keep your back flat and chest up, then drive through your heels to stand up fully.",
    imageUrl: "/api/exercises/image?name=Sumo%20Deadlift&v=2",
    isCompound: true,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "3946ebdc-d0f6-454e-b331-ba3d4a66060f",
    name: "T-Bar Row",
    muscleGroup: "back",
    equipment: "barbell",
    description:
      "Straddle the bar with a flat back and slight forward lean, grip the handles, pull the weight up toward your chest squeezing your shoulder blades, then lower with control.",
    imageUrl: "/api/exercises/image?name=T-Bar%20Row&v=2",
    isCompound: true,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "ede46e50-511e-423f-bff2-edbecdb9cd93",
    name: "Tricep Dips",
    muscleGroup: "triceps",
    equipment: "bodyweight",
    description:
      "Support yourself on parallel bars or a bench with your body upright, lower yourself by bending your elbows, then press back up to full arm extension.",
    imageUrl: "/api/exercises/image?name=Tricep%20Dips&v=2",
    isCompound: true,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "e5169ae1-766c-49e1-ace5-5944df981115",
    name: "Tricep Pushdown",
    muscleGroup: "triceps",
    equipment: "cable",
    description:
      "Stand facing a high cable pulley gripping the bar attachment, keeping elbows fixed at your sides, push it down until arms are extended, then let it rise back with control.",
    imageUrl: "/api/exercises/image?name=Tricep%20Pushdown&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "a42b8628-dc6c-49fa-838a-d4c0034f2153",
    name: "Upright Rows",
    muscleGroup: "traps",
    equipment: "barbell",
    description:
      "Stand holding the bar in front of your thighs with a shoulder-width grip, pull it straight up along your body to chest height leading with your elbows, then lower with control.",
    imageUrl: "/api/exercises/image?name=Upright%20Rows&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "b64f82f6-f13e-491f-91e9-f882a6f0c6f7",
    name: "Walking Lunge",
    muscleGroup: "quads",
    equipment: "dumbbell",
    description:
      "Hold a dumbbell in each hand, step forward into a lunge lowering your back knee toward the floor, then drive up and step forward into the next lunge with the opposite leg.",
    imageUrl: "/api/exercises/image?name=Walking%20Lunge&v=2",
    isCompound: true,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "13df2e66-65c0-4072-b68e-183954321d91",
    name: "Weighted Sit-Ups",
    muscleGroup: "abs",
    equipment: "dumbbell",
    description:
      "Lie on your back with knees bent holding a dumbbell against your chest, sit all the way up by contracting your abs, then lower back down with control.",
    imageUrl: "/api/exercises/image?name=Weighted%20Sit-Ups&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
  {
    id: "d54e843e-8f3d-4201-9b1d-eeff3b16de75",
    name: "Wrist Curls",
    muscleGroup: "forearms",
    equipment: "dumbbell",
    description:
      "Rest your forearms on your thighs or a bench with wrists hanging off the edge, palms up, curl the dumbbells up using only your wrists, then lower with control.",
    imageUrl: "/api/exercises/image?name=Wrist%20Curls&v=2",
    isCompound: false,
    createdAt: "2026-07-27T15:56:10.513Z",
  },
];
