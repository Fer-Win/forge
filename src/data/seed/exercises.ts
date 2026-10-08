import type { Category, Exercise, ExerciseMode, Load } from '../types';

type Spec = {
  id: string; name: string; category: Category; muscles: string[]; load: Load;
  mode?: ExerciseMode; sets?: number; reps?: [number, number]; dur?: number; rest?: number;
  cues: [string, string, string?]; easier: string; harder: string;
};

const mk = (s: Spec): Exercise => ({
  id: s.id, name: s.name, category: s.category, muscles: s.muscles,
  equipment: s.load === 'BW' ? 'Bodyweight' : 'Dumbbells',
  mode: s.mode ?? (s.dur ? 'timed' : 'reps'),
  sets: s.sets ?? 3,
  repMin: s.reps?.[0], repMax: s.reps?.[1], durationSec: s.dur,
  restSec: s.rest ?? 60, load: s.load,
  cues: s.cues.filter((c): c is string => !!c), easier: s.easier, harder: s.harder,
});

const SPECS: Spec[] = [
  // Chest / Shoulders / Arms (push)
  { id: 'pushup', name: 'Push-up', category: 'Chest', muscles: ['chest', 'triceps', 'shoulders'], load: 'BW', reps: [8, 20], cues: ['Body in one straight line', 'Elbows ~45° from torso', 'Chest to floor, full lockout'], easier: 'Incline push-up on a wall or sofa', harder: '3-1-1 tempo or feet elevated' },
  { id: 'db-floor-press', name: 'Dumbbell floor press', category: 'Chest', muscles: ['chest', 'triceps'], load: '2x5kg', reps: [10, 16], cues: ['Elbows touch the floor, pause 1s', 'Press straight up over chest', 'Wrists stacked on forearms'], easier: 'Alternate arms', harder: 'Single-arm with the 10 kg, 3s lowering' },
  { id: 'db-fly-floor', name: 'Floor fly', category: 'Chest', muscles: ['chest'], load: '2x5kg', reps: [12, 18], cues: ['Soft elbows', 'Open wide, feel the stretch', 'Squeeze together at the top'], easier: 'Smaller range', harder: 'Slow 4s lowering' },
  { id: 'decline-pushup', name: 'Feet-elevated push-up', category: 'Chest', muscles: ['upper chest', 'shoulders'], load: 'BW', reps: [6, 15], cues: ['Feet on a chair or sofa', 'Ribs down, no sagging', 'Control the descent'], easier: 'Standard push-up', harder: 'Add 2s pause at the bottom' },
  { id: 'diamond-pushup', name: 'Close-grip push-up', category: 'Arms', muscles: ['triceps', 'chest'], load: 'BW', reps: [6, 15], cues: ['Hands under chest, thumbs close', 'Elbows brush ribs', 'Full lockout'], easier: 'Knees down', harder: '3-1-1 tempo' },
  { id: 'db-ohp', name: 'Standing overhead press', category: 'Shoulders', muscles: ['shoulders', 'triceps'], load: '2x5kg', reps: [8, 15], cues: ['Squeeze glutes, ribs down', 'Press up and slightly back', 'Biceps by ears at top'], easier: 'Seated, or alternate arms', harder: 'Single-arm with the 10 kg' },
  { id: 'pike-pushup', name: 'Pike push-up', category: 'Shoulders', muscles: ['shoulders', 'triceps'], load: 'BW', reps: [6, 14], cues: ['Hips high, head between arms', 'Lower crown toward floor', 'Press back up tall'], easier: 'Hands on raised surface', harder: 'Feet elevated, 3s lowering' },
  { id: 'lateral-raise', name: 'Lateral raise', category: 'Shoulders', muscles: ['side delts'], load: '2x5kg', reps: [12, 20], cues: ['Lead with elbows', 'Stop at shoulder height', 'Slow 3s lower'], easier: 'One arm at a time', harder: '1s hold at the top, no swinging' },
  { id: 'front-raise', name: 'Front raise', category: 'Shoulders', muscles: ['front delts'], load: '2x5kg', reps: [10, 16], cues: ['Neutral grip', 'Raise to eye level', 'No torso swing'], easier: 'Alternate arms', harder: 'Single 10 kg with both hands' },
  { id: 'tricep-ext', name: 'Overhead triceps extension', category: 'Arms', muscles: ['triceps'], load: '10kg', reps: [10, 16], cues: ['Hold the 10 kg with both hands', 'Elbows point forward', 'Full stretch behind head'], easier: 'Use 5 kg', harder: 'Single arm, 3s lowering' },
  { id: 'bench-dip', name: 'Chair dip', category: 'Arms', muscles: ['triceps'], load: 'BW', reps: [8, 18], cues: ['Hands on sturdy chair edge', 'Elbows back, not out', 'Shoulders away from ears'], easier: 'Knees bent, feet close', harder: 'Feet straight, 3s lowering' },
  { id: 'tricep-kickback', name: 'Triceps kickback', category: 'Arms', muscles: ['triceps'], load: '2x5kg', reps: [12, 20], cues: ['Upper arm pinned to torso', 'Extend and squeeze', 'Slow return'], easier: 'One arm, supported', harder: 'Hold the squeeze 2s' },
  // Back / Biceps (pull)
  { id: 'db-row', name: 'Single-arm dumbbell row', category: 'Back', muscles: ['lats', 'rhomboids', 'biceps'], load: '10kg', reps: [8, 14], cues: ['Hand and knee on a bench or sofa', 'Pull elbow to hip', 'Pause 1s, lower slowly'], easier: 'Use 5 kg', harder: '3s lowering and 2s pause' },
  { id: 'bent-row', name: 'Bent-over row', category: 'Back', muscles: ['lats', 'mid back'], load: '2x5kg', reps: [12, 18], cues: ['Hinge to ~45°, flat back', 'Row to lower ribs', 'Squeeze shoulder blades'], easier: 'Chest supported on incline', harder: '1s pause every rep' },
  { id: 'rev-fly', name: 'Reverse fly', category: 'Back', muscles: ['rear delts', 'rhomboids'], load: '2x5kg', reps: [12, 20], cues: ['Hinge forward, soft elbows', 'Open like wings', 'Pause at the top'], easier: 'Seated, slight lean', harder: '3s lowering' },
  { id: 'superman', name: 'Superman hold', category: 'Back', muscles: ['lower back', 'glutes'], load: 'BW', mode: 'timed', dur: 30, sets: 3, rest: 45, cues: ['Lift arms, chest and legs', 'Look at the floor', 'Breathe steadily'], easier: 'Alternate opposite arm and leg', harder: 'Hold 5 kg in hands' },
  { id: 'prone-y', name: 'Prone Y raise', category: 'Back', muscles: ['lower traps', 'rear delts'], load: 'BW', reps: [10, 16], cues: ['Thumbs up, arms in a Y', 'Lift from the shoulder blades', 'Slow and controlled'], easier: 'Arms lower in a T', harder: 'Hold 5 kg each' },
  { id: 'db-pullover', name: 'Floor pullover', category: 'Back', muscles: ['lats', 'chest'], load: '10kg', reps: [10, 15], cues: ['Hold 10 kg with both hands', 'Arc overhead with soft elbows', 'Ribs stay down'], easier: 'Use 5 kg', harder: '3s lowering' },
  { id: 'db-curl', name: 'Dumbbell curl', category: 'Arms', muscles: ['biceps'], load: '2x5kg', reps: [10, 16], cues: ['Elbows pinned', 'Supinate at the top', '3s lowering'], easier: 'Alternate arms', harder: 'Single arm with the 10 kg' },
  { id: 'hammer-curl', name: 'Hammer curl', category: 'Arms', muscles: ['biceps', 'forearms'], load: '2x5kg', reps: [10, 16], cues: ['Palms facing each other', 'No swinging', 'Squeeze at the top'], easier: 'Alternate arms', harder: 'Cross-body, slow tempo' },
  { id: 'conc-curl', name: 'Concentration curl', category: 'Arms', muscles: ['biceps'], load: '10kg', reps: [8, 12], cues: ['Elbow against inner thigh', 'Full stretch at the bottom', 'Squeeze 1s'], easier: 'Use 5 kg', harder: '4s lowering' },
  { id: 'towel-row', name: 'Doorway towel row', category: 'Back', muscles: ['lats', 'biceps'], load: 'BW', reps: [8, 15], cues: ['Towel looped round a sturdy handle on a closed door', 'Lean back, body straight', 'Pull chest to hands'], easier: 'Walk feet back, more upright', harder: 'Feet forward, single arm' },
  // Legs / Glutes
  { id: 'goblet-squat', name: 'Goblet squat', category: 'Legs', muscles: ['quads', 'glutes'], load: '10kg', reps: [10, 18], cues: ['Hold 10 kg at chest', 'Knees track over toes', 'Sit between your heels'], easier: 'Bodyweight to a chair', harder: '3s lowering, 1s pause at bottom' },
  { id: 'split-squat', name: 'Bulgarian split squat', category: 'Legs', muscles: ['quads', 'glutes'], load: '2x5kg', reps: [8, 14], cues: ['Rear foot on sofa', 'Torso tall, front shin vertical', 'Drive through front heel'], easier: 'Static split squat, no elevation', harder: 'Hold the 10 kg goblet-style' },
  { id: 'rdl', name: 'Romanian deadlift', category: 'Legs', muscles: ['hamstrings', 'glutes'], load: '2x5kg', reps: [10, 16], cues: ['Hips back, flat spine', 'Dumbbells slide along thighs', 'Feel the hamstring stretch'], easier: 'Bodyweight hip hinge', harder: 'Single-leg RDL with the 10 kg' },
  { id: 'reverse-lunge', name: 'Reverse lunge', category: 'Legs', muscles: ['quads', 'glutes'], load: '2x5kg', reps: [10, 16], cues: ['Step back long', 'Front knee over ankle', 'Push off the front heel'], easier: 'Bodyweight, hold a wall', harder: 'Single 10 kg goblet hold' },
  { id: 'wall-sit', name: 'Wall sit', category: 'Legs', muscles: ['quads'], load: 'BW', mode: 'timed', dur: 45, rest: 45, cues: ['Thighs parallel to the floor', 'Back flat on wall', 'Breathe, no hands on thighs'], easier: 'Shallower angle', harder: 'Hold the 10 kg at chest' },
  { id: 'calf-raise', name: 'Single-leg calf raise', category: 'Legs', muscles: ['calves'], load: 'BW', reps: [12, 20], cues: ['Full stretch at the bottom', 'Pause 1s at the top', 'Hold a wall for balance'], easier: 'Two legs', harder: 'Hold the 10 kg, 3s lowering' },
  { id: 'step-up', name: 'Step-up', category: 'Legs', muscles: ['quads', 'glutes'], load: '2x5kg', reps: [10, 14], cues: ['Whole foot on the step', 'Drive through the top leg', 'Lower slowly'], easier: 'Lower step, no weight', harder: 'Higher step, 10 kg goblet' },
  { id: 'glute-bridge', name: 'Glute bridge', category: 'Glutes', muscles: ['glutes', 'hamstrings'], load: '10kg', reps: [12, 20], cues: ['Dumbbell on hips', 'Ribs down, squeeze at top', 'Pause 2s'], easier: 'Bodyweight', harder: 'Single-leg' },
  { id: 'hip-thrust', name: 'Single-leg hip thrust', category: 'Glutes', muscles: ['glutes'], load: 'BW', reps: [8, 14], cues: ['Upper back on sofa edge', 'Drive through the heel', 'Level hips at top'], easier: 'Two-leg thrust', harder: 'Add the 10 kg on hips' },
  { id: 'sumo-squat', name: 'Sumo squat', category: 'Glutes', muscles: ['glutes', 'adductors'], load: '10kg', reps: [12, 18], cues: ['Wide stance, toes out', 'Hold 10 kg between legs', 'Squeeze glutes standing'], easier: 'Bodyweight', harder: 'Pulse at the bottom for the last 5 reps' },
  // Core
  { id: 'plank', name: 'Plank', category: 'Abs/Core', muscles: ['core'], load: 'BW', mode: 'timed', dur: 40, rest: 30, cues: ['Forearms under shoulders', 'Squeeze glutes and quads', 'Do not let hips sag'], easier: 'Knees down or incline', harder: 'Arm or leg lift' },
  { id: 'side-plank', name: 'Side plank', category: 'Abs/Core', muscles: ['obliques'], load: 'BW', mode: 'timed', dur: 30, rest: 30, cues: ['Elbow under shoulder', 'Hips stacked and lifted', 'Look forward'], easier: 'Bottom knee down', harder: 'Raise the top leg' },
  { id: 'dead-bug', name: 'Dead bug', category: 'Abs/Core', muscles: ['core'], load: 'BW', reps: [8, 14], cues: ['Low back pressed into floor', 'Opposite arm and leg lower slowly', 'Exhale as you extend'], easier: 'Legs only', harder: 'Hold 5 kg overhead' },
  { id: 'bicycle', name: 'Bicycle crunch', category: 'Abs/Core', muscles: ['abs', 'obliques'], load: 'BW', reps: [16, 30], cues: ['Hands light behind head', 'Elbow toward opposite knee', 'Slow, full rotation'], easier: 'Feet on floor, slower', harder: 'Pause 1s each side' },
  { id: 'leg-raise', name: 'Lying leg raise', category: 'Abs/Core', muscles: ['lower abs'], load: 'BW', reps: [8, 16], cues: ['Low back flat', 'Lift to vertical', 'Lower 3s, stop above floor'], easier: 'Bent knees', harder: 'Hold the 5 kg between feet' },
  { id: 'russian-twist', name: 'Russian twist', category: 'Abs/Core', muscles: ['obliques'], load: '5kg', reps: [20, 30], cues: ['Lean back, spine long', 'Rotate from the ribs', 'Tap the floor each side'], easier: 'Bodyweight, heels down', harder: 'Feet up, 10 kg' },
  { id: 'hollow-hold', name: 'Hollow hold', category: 'Abs/Core', muscles: ['core'], load: 'BW', mode: 'timed', dur: 25, rest: 30, cues: ['Lower back glued to floor', 'Arms and legs reaching', 'Shorten lever if it lifts'], easier: 'Knees tucked', harder: 'Arms overhead, legs low' },
  // Finishers
  { id: 'mountain-climber', name: 'Mountain climber', category: 'Finishers', muscles: ['core', 'cardio'], load: 'BW', mode: 'interval', dur: 40, rest: 20, cues: ['Shoulders over wrists', 'Drive knees to chest', 'Keep hips low'], easier: 'Slow, hands raised', harder: 'Cross-body' },
  { id: 'burpee', name: 'Burpee', category: 'Finishers', muscles: ['full body'], load: 'BW', mode: 'interval', dur: 40, rest: 20, cues: ['Chest to floor', 'Jump feet in under hips', 'Reach up on the jump'], easier: 'Step back, no jump', harder: 'Add a push-up and tuck jump' },
  { id: 'db-thruster', name: 'Dumbbell thruster', category: 'Finishers', muscles: ['legs', 'shoulders'], load: '2x5kg', mode: 'interval', dur: 40, rest: 20, cues: ['Squat deep', 'Use leg drive to press', 'Land softly'], easier: 'Squat then press, split', harder: '10 kg goblet thruster' },
  { id: 'jump-squat', name: 'Jump squat', category: 'Finishers', muscles: ['legs'], load: 'BW', mode: 'interval', dur: 40, rest: 20, cues: ['Sit back, explode up', 'Soft landing', 'Reset each rep'], easier: 'Fast bodyweight squat', harder: 'Tuck at the top' },
  { id: 'high-knees', name: 'High knees', category: 'Finishers', muscles: ['cardio'], load: 'BW', mode: 'interval', dur: 40, rest: 20, cues: ['Knees to hip height', 'Pump arms', 'Stay on balls of feet'], easier: 'March fast', harder: 'Add speed, bound' },
  { id: 'db-swing', name: 'Dumbbell swing', category: 'Finishers', muscles: ['glutes', 'hamstrings'], load: '10kg', mode: 'interval', dur: 40, rest: 20, cues: ['Hinge, hips snap forward', 'Arms are hooks, hips do the work', 'Stop at chest height'], easier: 'Use 5 kg', harder: 'Single-arm switching' },
  // Warm-up
  { id: 'wu-arm-circles', name: 'Arm circles', category: 'Warm-up', muscles: ['shoulders'], load: 'BW', mode: 'timed', dur: 30, sets: 1, rest: 0, cues: ['Big circles, both directions', 'Keep shoulders relaxed'], easier: 'Smaller circles', harder: 'Faster pace' },
  { id: 'wu-jacks', name: 'Jumping jacks', category: 'Warm-up', muscles: ['full body'], load: 'BW', mode: 'timed', dur: 45, sets: 1, rest: 0, cues: ['Light on feet', 'Full arm swing'], easier: 'Step jacks', harder: 'Seal jacks' },
  { id: 'wu-hip-circles', name: 'Hip circles', category: 'Warm-up', muscles: ['hips'], load: 'BW', mode: 'timed', dur: 30, sets: 1, rest: 0, cues: ['Large slow circles', 'Both directions'], easier: 'Hold a wall', harder: 'Add a lunge reach' },
  { id: 'wu-inchworm', name: 'Inchworm', category: 'Warm-up', muscles: ['hamstrings', 'core'], load: 'BW', reps: [5, 8], sets: 1, rest: 0, cues: ['Walk hands out to plank', 'Walk feet to hands', 'Soft knees ok'], easier: 'Shorter walk-out', harder: 'Add a push-up' },
  // Cooldown / Mobility
  { id: 'cd-child', name: "Child's pose", category: 'Cooldown', muscles: ['back', 'hips'], load: 'BW', mode: 'timed', dur: 45, sets: 1, rest: 0, cues: ['Sink hips to heels', 'Long exhale'], easier: 'Pillow under hips', harder: 'Walk hands to each side' },
  { id: 'cd-quad', name: 'Standing quad stretch', category: 'Cooldown', muscles: ['quads'], load: 'BW', mode: 'timed', dur: 30, sets: 1, rest: 0, cues: ['Knees together', 'Tuck pelvis', 'Both sides'], easier: 'Hold a wall', harder: 'Reach opposite arm up' },
  { id: 'cd-ham', name: 'Hamstring stretch', category: 'Cooldown', muscles: ['hamstrings'], load: 'BW', mode: 'timed', dur: 30, sets: 1, rest: 0, cues: ['Heel out, hinge at hips', 'Flat back', 'Both sides'], easier: 'Bend the knee', harder: 'Pull toes back' },
  { id: 'mob-cat-cow', name: 'Cat-cow', category: 'Mobility', muscles: ['spine'], load: 'BW', reps: [8, 12], sets: 2, rest: 0, cues: ['Move with your breath', 'Round then arch fully'], easier: 'Smaller range', harder: 'Add thread-the-needle' },
  { id: 'mob-worlds-greatest', name: "World's greatest stretch", category: 'Mobility', muscles: ['hips', 'thoracic spine'], load: 'BW', reps: [4, 6], sets: 2, rest: 0, cues: ['Deep lunge, hand inside foot', 'Rotate and reach to the ceiling', 'Both sides'], easier: 'Back knee down', harder: 'Add a hamstring rock-back' },
  { id: 'mob-hip-90', name: '90/90 hip switch', category: 'Mobility', muscles: ['hips'], load: 'BW', reps: [6, 10], sets: 2, rest: 0, cues: ['Sit tall', 'Rotate knees side to side', 'Move slowly'], easier: 'Hands behind for support', harder: 'Lift off floor between sides' },
];

export const SEED_EXERCISES: Exercise[] = SPECS.map(mk);
