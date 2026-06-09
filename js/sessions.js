// Trainingsschema. Een krachtsessie bestaat uit `slots`. Elk slot heeft een
// spiergroep-`category` en een `default` oefening (een id uit exercises.js),
// plus de set/rep- en rustconfiguratie. Binnen een slot kan Peter wisselen
// (swap) tussen oefeningen in dezelfde categorie; de actieve keuze leeft in
// state.slotChoices / state.slotDefaults (zie helpers.activeExId).
//
// De `default` id's zijn exact de id's die al gelogd worden in
// state.sets[exId] — zo blijft alle bestaande progressie behouden zonder
// migratie. De slot-`id` is positie-stabiel: voltooiing wordt nog steeds per
// index opgeslagen als state.completed[dag]['ex'+i].

export const SESSIONS = {
  K1: {
    type: 'training', title: 'Kracht — Push-accent', subtitle: 'Full body, push focus',
    slots: [
      { id: 'k1_s1', category: 'push_horizontal',  default: 'bench',       sr: '4 × 6-8',    rest: '2-3 min' },
      { id: 'k1_s2', category: 'hinge',             default: 'rdl',         sr: '4 × 8-10',   rest: '2 min' },
      { id: 'k1_s3', category: 'push_vertical',     default: 'ohp',         sr: '3 × 8-10',   rest: '90 sec' },
      { id: 'k1_s4', category: 'pull_vertical',     default: 'pulldown_k1', sr: '3 × 8-10',   rest: '90 sec' },
      { id: 'k1_s5', category: 'push_assistance',   default: 'dips_fly',    sr: '3 × 10-12',  rest: '60-90 sec' },
      { id: 'k1_s6', category: 'triceps',           default: 'triceps',     sr: '3 × 12',     rest: '60 sec' },
      { id: 'k1_s7', category: 'shoulder_lateral',  default: 'lateral',     sr: '3 × 15',     rest: '45-60 sec' },
      { id: 'k1_s8', category: 'core',              default: 'pallof',      sr: '3 × 10/zijde', rest: '45 sec' }
    ]
  },
  K3: {
    type: 'training', title: 'Kracht — Pull-accent', subtitle: 'Full body, pull focus',
    slots: [
      { id: 'k3_s1', category: 'pull_horizontal',   default: 'row',         sr: '4 × 8-10',   rest: '2 min' },
      { id: 'k3_s2', category: 'quad',              default: 'legpress',    sr: '4 × 10-12',  rest: '2 min' },
      { id: 'k3_s3', category: 'pull_vertical',     default: 'pulldown_k3', sr: '4 × 8',      rest: '90 sec' },
      { id: 'k3_s4', category: 'push_horizontal',   default: 'incline_db',  sr: '3 × 10',     rest: '90 sec' },
      { id: 'k3_s5', category: 'hamstring',         default: 'ham_curl',    sr: '3 × 12',     rest: '60-90 sec' },
      { id: 'k3_s6', category: 'biceps',            default: 'biceps',      sr: '3 × 12',     rest: '60 sec' },
      { id: 'k3_s7', category: 'shoulder_rear',     default: 'face_pull',   sr: '3 × 15',     rest: '45-60 sec' },
      { id: 'k3_s8', category: 'core',              default: 'core_k3',     sr: '3 × 10-12',  rest: '45 sec' }
    ]
  },
  K5: {
    type: 'training', title: 'Kracht — Benen + Calisthenics', subtitle: 'Glutes, kuiten, bodyweight bovenlichaam',
    slots: [
      { id: 'k5_s1', category: 'glute',             default: 'hipthrust',   sr: '4 × 10-12',  rest: '90-120 sec' },
      { id: 'k5_s2', category: 'calf',              default: 'calf',        sr: '4 × 15',     rest: '60 sec' },
      { id: 'k5_s3', category: 'pull_vertical',     default: 'pullup_k5',   sr: '4 × submax', rest: '90 sec' },
      { id: 'k5_s4', category: 'push_assistance',   default: 'pushup_k5',   sr: '4 × submax', rest: '60-90 sec' },
      { id: 'k5_s5', category: 'push_assistance',   default: 'dips_k5',     sr: '3 × submax', rest: '90 sec' },
      { id: 'k5_s6', category: 'core',              default: 'leg_raise',   sr: '3 × 12',     rest: '60 sec' },
      { id: 'k5_s7', category: 'carry',             default: 'carry',       sr: '3 × ~30 m',  rest: '60-90 sec' },
      { id: 'k5_s8', category: 'cardio_finisher',   default: 'walk_k5',     sr: '15 min',     rest: '—' }
    ]
  },
  CI: {
    type: 'cardio', title: 'Cardio — Intervals', subtitle: 'Hoge intensiteit, ~25-30 min',
    body: 'Na warming-up: <strong>8-10× (1 min hard / 1,5 min rustig)</strong>.',
    options: 'Standaard: <strong>assault bike, roeier of fietsintervals</strong> — knievriendelijk. Hardlopen alleen als knie meewerkt.'
  },
  CZ: {
    type: 'cardio', title: 'Cardio — Zone 2', subtitle: '35-45 min rustig tempo',
    body: 'Tempo waarbij je nog kunt praten. <strong>Lage gewrichtsbelasting.</strong>',
    options: 'Wandelen op helling, fietsen, roeien of rustig hardlopen.'
  },
  R: {
    type: 'rest', title: 'Rustdag', subtitle: 'Herstel = onderdeel van het plan',
    body: 'Optioneel: rustige wandeling. Mik op <strong>8-10k stappen</strong>. Slaap 7,5-9 u. Geen alcohol.'
  }
};

export function sessionFor(date) {
  const wd = (date.getDay() + 6) % 7;
  return ['K1', 'CI', 'R', 'K3', 'CZ', 'K5', 'R'][wd];
}
