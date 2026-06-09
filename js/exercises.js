// Centrale oefeningenbibliotheek. Vervangt de vroegere vrije-tekst `variants`
// strings in sessions.js door gestructureerde records met een eigen id, zodat
// we per concrete oefening kunnen loggen én tussen varianten in dezelfde
// categorie kunnen wisselen (swap).
//
// BELANGRIJK — data-veiligheid:
//   De id's van de oefeningen die nu al gelogd worden (bench, rdl, ohp, row,
//   …) blijven exact gelijk. Een sessie-slot kiest zo'n bestaande id als
//   `default`, waardoor `state.sets[exId]` 1-op-1 blijft werken zonder
//   migratie. Alleen NIEUWE varianten krijgen een vers id.
//
// `knee_safe: false` markeert oefeningen die Peter's rechterknie belasten
// (lunges, diepe/pistol squats, jumps, hoge step-ups). De swap-UI sorteert
// knievriendelijke oefeningen bovenaan en markeert de rest.

export const CATEGORIES = {
  push_horizontal:  { label: 'Horizontale druk',            group: 'Push' },
  push_vertical:    { label: 'Verticale druk',              group: 'Push' },
  push_assistance:  { label: 'Push assistance',             group: 'Push' },
  triceps:          { label: 'Triceps',                     group: 'Push' },
  shoulder_lateral: { label: 'Zijdelingse schouder',        group: 'Push' },
  shoulder_rear:    { label: 'Achterste schouder',          group: 'Pull' },
  pull_horizontal:  { label: 'Horizontale trek',            group: 'Pull' },
  pull_vertical:    { label: 'Verticale trek',              group: 'Pull' },
  biceps:           { label: 'Biceps',                      group: 'Pull' },
  hinge:            { label: 'Heupscharnier',               group: 'Legs' },
  quad:             { label: 'Quad/Glute (knievriendelijk)', group: 'Legs' },
  hamstring:        { label: 'Hamstring isolatie',          group: 'Legs' },
  glute:            { label: 'Glute focus',                 group: 'Legs' },
  calf:             { label: 'Kuiten',                      group: 'Legs' },
  core:             { label: 'Core',                        group: 'Core' },
  carry:            { label: 'Carry',                       group: 'Core' },
  cardio_finisher:  { label: 'Cardio finisher',             group: 'Cardio' }
};

// Helper om de definitie compact te houden: ex(id, name, category, opts).
// `equipment` is optioneel: leeg laten betekent dat equipmentFor() het uit de
// naam afleidt; expliciet zetten overschrijft die inferentie.
function ex(id, name, category, { knee_safe = true, notes = '', equipment = '' } = {}) {
  return { id, name, category, knee_safe, notes, equipment };
}

const LIST = [
  // ---- Horizontale druk (borst) ------------------------------------------
  ex('bench',               'Barbell bankdrukken',        'push_horizontal', { notes: 'Hoofdlift — schouderbladen ingetrokken' }),
  ex('bench_dumbbell',      'Dumbbell bench press',       'push_horizontal', { notes: 'Schoudervriendelijker dan barbell' }),
  ex('incline_barbell',     'Incline barbell bankdrukken','push_horizontal', { notes: 'Bovenborst-accent' }),
  ex('incline_db',          'Incline dumbbell press',     'push_horizontal', { notes: 'Bovenborst, grote ROM' }),
  ex('machine_chest_press', 'Machine chest press',        'push_horizontal', { notes: 'Stabiel, makkelijk te doseren' }),
  ex('machine_incline_press','Machine incline press',     'push_horizontal'),

  // ---- Verticale druk (schouders) ----------------------------------------
  ex('ohp',                 'Overhead press',             'push_vertical',   { notes: 'Staand, strakke buik' }),
  ex('ohp_seated_db',       'Seated dumbbell shoulder press','push_vertical',{ notes: 'Rugsteun, minder lagerug-belasting' }),
  ex('arnold_press',        'Arnold press',               'push_vertical'),
  ex('machine_shoulder_press','Machine shoulder press',   'push_vertical'),
  ex('landmine_press',      'Landmine press',             'push_vertical',   { notes: 'Schoudervriendelijk pershoek' }),

  // ---- Push assistance (dips / fly / push-ups) ---------------------------
  ex('dips_fly',            'Dips of cable fly',          'push_assistance', { notes: 'Borst-isolatie of dips' }),
  ex('pec_deck',            'Pec deck',                   'push_assistance'),
  ex('db_fly',              'Dumbbell fly op bank',       'push_assistance'),
  ex('machine_fly',         'Machine fly',                'push_assistance'),
  ex('pushup_k5',           'Push-ups (submax)',          'push_assistance', { notes: 'Calisthenics — 1-2 reps in tank' }),
  ex('decline_pushup',      'Decline push-up',            'push_assistance'),
  ex('weighted_pushup',     'Weighted push-up',           'push_assistance'),
  ex('archer_pushup',       'Archer push-up',             'push_assistance'),
  ex('dips_k5',             'Dips (submax)',              'push_assistance', { notes: 'Calisthenics' }),
  ex('bench_dips',          'Bench dips',                 'push_assistance'),
  ex('ring_dips',           'Ring dips',                  'push_assistance'),
  ex('weighted_dips',       'Weighted dips',              'push_assistance'),

  // ---- Triceps ------------------------------------------------------------
  ex('triceps',             'Triceps pushdown',           'triceps'),
  ex('overhead_ext',        'Overhead extension',         'triceps'),
  ex('skull_crusher',       'Skull crusher',              'triceps'),
  ex('close_grip_bench',    'Close-grip bankdrukken',     'triceps'),
  ex('diamond_pushup',      'Diamond push-ups',           'triceps'),

  // ---- Zijdelingse schouder ----------------------------------------------
  ex('lateral',             'Lateral raises',             'shoulder_lateral'),
  ex('cable_lateral',       'Cable lateral raise',        'shoulder_lateral'),
  ex('machine_lateral',     'Machine lateral raise',      'shoulder_lateral'),
  ex('upright_row',         'Upright row (licht)',        'shoulder_lateral'),

  // ---- Achterste schouder -------------------------------------------------
  ex('face_pull',          'Face pulls',                  'shoulder_rear'),
  ex('rear_delt_fly',      'Rear delt fly',               'shoulder_rear'),
  ex('band_pull_apart',    'Band pull-apart',             'shoulder_rear'),
  ex('reverse_pec_deck',   'Reverse pec deck',            'shoulder_rear'),

  // ---- Horizontale trek (rug) --------------------------------------------
  ex('row',                'Barbell row',                 'pull_horizontal', { notes: 'Romp stabiel, niet swingen' }),
  ex('chest_supported_row','Chest-supported row',         'pull_horizontal', { notes: 'Borststeun — geen lagerug-belasting' }),
  ex('tbar_row',           'T-bar row',                   'pull_horizontal'),
  ex('seal_row',           'Seal row',                    'pull_horizontal'),
  ex('cable_row',          'Cable row',                   'pull_horizontal'),
  ex('one_arm_db_row',     '1-arm dumbbell row',          'pull_horizontal'),

  // ---- Verticale trek (lats) ---------------------------------------------
  ex('pulldown_k1',        'Lat pulldown',                'pull_vertical'),
  ex('pulldown_k3',        'Pull-up / lat pulldown',      'pull_vertical'),
  ex('pullup_k5',          'Pull-ups (submax)',           'pull_vertical',   { notes: 'Calisthenics — 1-2 reps in tank' }),
  ex('chin_up',            'Chin-up',                     'pull_vertical'),
  ex('neutral_pullup',     'Neutral-grip pull-up',        'pull_vertical'),
  ex('assisted_pullup',    'Assisted pull-up',            'pull_vertical'),
  ex('wide_pulldown',      'Wide-grip pulldown',          'pull_vertical'),

  // ---- Biceps -------------------------------------------------------------
  ex('biceps',             'Biceps curl',                 'biceps'),
  ex('barbell_curl',       'Barbell curl',                'biceps'),
  ex('hammer_curl',        'Hammer curl',                 'biceps'),
  ex('cable_curl',         'Cable curl',                  'biceps'),
  ex('preacher_curl',      'Preacher curl',               'biceps'),

  // ---- Heupscharnier (hinge) ---------------------------------------------
  ex('rdl',                'Romanian deadlift',           'hinge',           { notes: 'Heupscharnier, rug neutraal' }),
  ex('trapbar_deadlift',   'Trap-bar deadlift',           'hinge',           { notes: 'Rugvriendelijker dan conventioneel' }),
  ex('single_leg_rdl',     'Single-leg RDL',              'hinge'),
  ex('good_morning',       'Good morning (licht)',        'hinge'),
  ex('kb_swing',           'Kettlebell swing',            'hinge'),

  // ---- Quad / Glute (knievriendelijk waar mogelijk) ----------------------
  ex('legpress',           'Leg press (beperkte ROM)',    'quad',            { notes: 'Beperk ROM — knievriendelijk' }),
  ex('belt_squat',         'Belt squat',                  'quad',            { notes: 'Geen axiale belasting, knievriendelijk' }),
  ex('hack_squat',         'Hack squat (beperkte ROM)',   'quad',            { notes: 'Beperk ROM voor de knie' }),
  ex('leg_extension',      'Leg extension (lichte ROM)',  'quad',            { notes: 'Rustig opbouwen, geen pijnpunt' }),
  ex('step_up_low',        'Step-up laag',                'quad',            { knee_safe: false, notes: 'Knie testen — laag beginnen' }),
  ex('bulgarian_split',    'Bulgarian split squat',       'quad',            { knee_safe: false, notes: 'Belast de rechterknie' }),
  ex('walking_lunge',      'Walking lunge',               'quad',            { knee_safe: false, notes: 'Lunge — knie-onvriendelijk' }),

  // ---- Hamstring isolatie -------------------------------------------------
  ex('ham_curl',           'Hamstring curl',              'hamstring'),
  ex('seated_ham_curl',    'Seated hamstring curl',       'hamstring'),
  ex('nordic_curl',        'Nordic curl',                 'hamstring'),
  ex('ghr',                'Glute-ham raise',             'hamstring'),
  ex('stiff_leg_dl',       'Stiff-leg deadlift',          'hamstring'),

  // ---- Glute focus --------------------------------------------------------
  ex('hipthrust',          'Hip thrust / glute bridge',   'glute'),
  ex('single_leg_hipthrust','Single-leg hip thrust',      'glute'),
  ex('machine_hipthrust',  'Machine hip thrust',          'glute'),
  ex('db_glute_bridge',    'Dumbbell glute bridge',       'glute'),
  ex('cable_kickback',     'Cable kickback',              'glute'),

  // ---- Kuiten -------------------------------------------------------------
  ex('calf',               'Staand kuitverhogen',         'calf'),
  ex('seated_calf',        'Zittend kuitverhogen',        'calf'),
  ex('single_leg_calf',    'Single-leg calf raise',       'calf'),
  ex('legpress_calf',      'Leg-press calf raise',        'calf'),

  // ---- Core ---------------------------------------------------------------
  ex('pallof',             'Pallof press',                'core'),
  ex('core_k3',            'Ab wheel / cable rotation',   'core'),
  ex('leg_raise',          'Hanging leg raises',          'core'),
  ex('ab_wheel',           'Ab wheel rollout',            'core'),
  ex('cable_woodchop',     'Cable woodchop',              'core'),
  ex('side_plank',         'Side plank',                  'core'),
  ex('plank',              'Plank-varianten',             'core'),
  ex('knee_raise',         'Knee raises',                 'core'),
  ex('toes_to_bar',        'Toes-to-bar',                 'core'),
  ex('lsit',               'L-sit hold',                  'core'),

  // ---- Carry --------------------------------------------------------------
  ex('carry',              "Farmer's carry",              'carry'),
  ex('suitcase_carry',     'Suitcase carry',              'carry'),
  ex('overhead_carry',     'Overhead carry',              'carry'),
  ex('trapbar_carry',      'Trap-bar carry',              'carry'),

  // ---- Cardio finisher ----------------------------------------------------
  ex('walk_k5',            'Stevig wandelen',             'cardio_finisher', { notes: 'Op gevoel, geen sprintwerk' })
];

export const EXERCISES = Object.fromEntries(LIST.map(e => [e.id, e]));

// ---- Lookups ---------------------------------------------------------------

export function getExercise(id) {
  return EXERCISES[id] || null;
}

// Naam voor een id; valt terug op het id zelf als de catalog het (nog) niet
// kent — zo crasht een onbekende gelogde id nooit de UI.
export function exName(id) {
  return EXERCISES[id]?.name || id;
}

export function categoryLabel(category) {
  return CATEGORIES[category]?.label || category;
}

// Equipmenttype voor een oefening (#14). Expliciet `ex.equipment` wint; anders
// afgeleid uit de naam met geordende regels (specifiek → algemeen), met een
// lege string als er niets matcht (dan toont de UI geen chip).
const EQUIP_RULES = [
  [/kettlebell|\bkb\b/,                                          'Kettlebell'],
  [/\bband\b|pull-apart/,                                        'Band'],
  [/\bring\b/,                                                   'Ring'],
  [/cable|pushdown|face pull|kickback|woodchop|pallof/,          'Kabel'],
  [/machine|pec deck|leg press|hack squat|leg extension|smith|landmine|pulldown|ham curl|hamstring curl|seated ham/, 'Machine'],
  [/dumbbell|\bdb\b|arnold|hammer curl|seal row|one-arm|1-arm/,  'Dumbbell'],
  [/barbell|bankdruk|deadlift|\brdl\b|\brow\b|good morning|skull|close-grip|upright row|overhead press|hip thrust|stiff-leg|preacher|barbell curl/, 'Barbell'],
  [/push-?up|pull-?up|chin-up|\bdips\b|plank|l-sit|lunge|split squat|step-up|nordic|toes-to-bar|leg raise|knee raise|ab wheel|side plank|ghr|glute-ham|bridge/, 'Lichaamsgewicht']
];

export function equipmentFor(exo) {
  if (!exo) return '';
  if (exo.equipment) return exo.equipment;
  if (exo.category === 'cardio_finisher') return 'Cardio';
  const n = String(exo.name || '').toLowerCase();
  for (const [re, label] of EQUIP_RULES) if (re.test(n)) return label;
  return '';
}

// Alle oefeningen in een categorie, knievriendelijk eerst, daarna op naam.
export function variantsFor(category) {
  return LIST
    .filter(e => e.category === category)
    .sort((a, b) => (b.knee_safe - a.knee_safe) || a.name.localeCompare(b.name, 'nl'));
}
