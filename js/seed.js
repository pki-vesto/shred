// Startbibliotheek voor de productbibliotheek. Macro's per 100g.
// `slug` levert een deterministisch product-id ('seed:<slug>') zodat twee
// devices die los seeden niet dupliceren — LWW-sync dedupt op id.
// `unit` (optioneel): { name, grams } voor producten die je natuurlijker per
// stuk/schep/eetlepel logt dan per gram.

export const SEED_PRODUCTS = [
  // Eiwit
  { slug: 'kipfilet',        group: 'Eiwit',  name: 'Kipfilet (gegrild)',        kcal: 165, p: 31,  c: 0,   f: 3.6 },
  { slug: 'kalkoenfilet',    group: 'Eiwit',  name: 'Kalkoenfilet',              kcal: 135, p: 30,  c: 0,   f: 1 },
  { slug: 'rundergehakt5',   group: 'Eiwit',  name: 'Mager rundergehakt (5%)',   kcal: 155, p: 21,  c: 0,   f: 7 },
  { slug: 'biefstuk',        group: 'Eiwit',  name: 'Biefstuk',                  kcal: 175, p: 27,  c: 0,   f: 7 },
  { slug: 'zalmfilet',       group: 'Eiwit',  name: 'Zalmfilet',                 kcal: 208, p: 20,  c: 0,   f: 13 },
  { slug: 'kabeljauw',       group: 'Eiwit',  name: 'Witvis (kabeljauw)',        kcal: 82,  p: 18,  c: 0,   f: 0.7 },
  { slug: 'tonijn-water',    group: 'Eiwit',  name: 'Tonijn in water (uitgelekt)', kcal: 116, p: 26, c: 0,  f: 1 },
  { slug: 'garnalen',        group: 'Eiwit',  name: 'Garnalen',                  kcal: 85,  p: 18,  c: 0,   f: 1 },
  { slug: 'ei-heel',         group: 'Eiwit',  name: 'Ei (heel)',                 kcal: 143, p: 13,  c: 1,   f: 10,  unit: { name: 'ei',     grams: 50 } },
  { slug: 'eiwit',           group: 'Eiwit',  name: 'Eiwit (alleen)',            kcal: 52,  p: 11,  c: 0.7, f: 0,   unit: { name: 'eiwit',  grams: 33 } },
  { slug: 'whey',            group: 'Eiwit',  name: 'Whey-eiwit poeder',         kcal: 380, p: 75,  c: 8,   f: 5,   unit: { name: 'schep',  grams: 30 } },

  // Zuivel
  { slug: 'skyr',            group: 'Zuivel', name: 'Magere skyr',               kcal: 57,  p: 11,  c: 4,   f: 0.2 },
  { slug: 'kwark-mager',     group: 'Zuivel', name: 'Magere kwark',              kcal: 48,  p: 8,   c: 4,   f: 0.1 },
  { slug: 'huttenkase',      group: 'Zuivel', name: 'Hüttenkäse',                kcal: 98,  p: 12,  c: 3,   f: 4 },
  { slug: 'griekse-yoghurt', group: 'Zuivel', name: 'Griekse yoghurt 2%',        kcal: 59,  p: 10,  c: 4,   f: 2 },
  { slug: 'melk-halfvol',    group: 'Zuivel', name: 'Halfvolle melk',            kcal: 46,  p: 3.4, c: 4.6, f: 1.5 },
  { slug: 'kaas-30plus',     group: 'Zuivel', name: '30+ kaas',                  kcal: 312, p: 28,  c: 0,   f: 22,  unit: { name: 'plak',   grams: 20 } },

  // Koolhydraten
  { slug: 'witte-rijst',     group: 'Koolhydraten', name: 'Witte rijst (gekookt)',      kcal: 130, p: 2.7, c: 28, f: 0.3 },
  { slug: 'zilvervliesrijst',group: 'Koolhydraten', name: 'Zilvervliesrijst (gekookt)', kcal: 123, p: 2.6, c: 26, f: 1 },
  { slug: 'aardappel',       group: 'Koolhydraten', name: 'Aardappel (gekookt)',        kcal: 87,  p: 1.9, c: 20, f: 0.1 },
  { slug: 'zoete-aardappel', group: 'Koolhydraten', name: 'Zoete aardappel (gekookt)',  kcal: 90,  p: 2,   c: 21, f: 0.1 },
  { slug: 'volkoren-pasta',  group: 'Koolhydraten', name: 'Volkoren pasta (gekookt)',   kcal: 124, p: 5,   c: 25, f: 0.9 },
  { slug: 'volkoren-brood',  group: 'Koolhydraten', name: 'Volkoren brood',             kcal: 247, p: 9,   c: 41, f: 4,   unit: { name: 'snee', grams: 35 } },

  // Groente
  { slug: 'broccoli',        group: 'Groente', name: 'Broccoli',         kcal: 34, p: 2.8, c: 7,   f: 0.4 },
  { slug: 'spinazie',        group: 'Groente', name: 'Spinazie',         kcal: 23, p: 2.9, c: 3.6, f: 0.4 },
  { slug: 'paprika-rood',    group: 'Groente', name: 'Paprika rood',     kcal: 31, p: 1,   c: 6,   f: 0.3 },
  { slug: 'courgette',       group: 'Groente', name: 'Courgette',        kcal: 17, p: 1.2, c: 3.1, f: 0.3 },
  { slug: 'champignons',     group: 'Groente', name: 'Champignons',      kcal: 22, p: 3.1, c: 3.3, f: 0.3 },
  { slug: 'sperziebonen',    group: 'Groente', name: 'Sperziebonen',     kcal: 31, p: 1.8, c: 7,   f: 0.2 },
  { slug: 'komkommer',       group: 'Groente', name: 'Komkommer',        kcal: 16, p: 0.7, c: 3.6, f: 0.1 },

  // Fruit
  { slug: 'banaan',          group: 'Fruit', name: 'Banaan',          kcal: 89, p: 1.1, c: 23,  f: 0.3, unit: { name: 'banaan', grams: 120 } },
  { slug: 'appel',           group: 'Fruit', name: 'Appel',           kcal: 52, p: 0.3, c: 14,  f: 0.2, unit: { name: 'appel',  grams: 150 } },
  { slug: 'blauwe-bessen',   group: 'Fruit', name: 'Blauwe bessen',   kcal: 57, p: 0.7, c: 14,  f: 0.3 },
  { slug: 'aardbeien',       group: 'Fruit', name: 'Aardbeien',       kcal: 32, p: 0.7, c: 7.7, f: 0.3 },

  // Vetten
  { slug: 'olijfolie',       group: 'Vetten', name: 'Olijfolie',              kcal: 884, p: 0,  c: 0,  f: 100, unit: { name: 'eetlepel', grams: 10 } },
  { slug: 'avocado',         group: 'Vetten', name: 'Avocado',                kcal: 160, p: 2,  c: 9,  f: 15,  unit: { name: 'halve',    grams: 100 } },
  { slug: 'amandelen',       group: 'Vetten', name: 'Amandelen',              kcal: 579, p: 21, c: 22, f: 50,  unit: { name: 'handje',   grams: 25 } },
  { slug: 'walnoten',        group: 'Vetten', name: 'Walnoten',               kcal: 654, p: 15, c: 14, f: 65,  unit: { name: 'handje',   grams: 25 } },
  { slug: 'pindakaas',       group: 'Vetten', name: 'Pindakaas (100% pinda)', kcal: 588, p: 25, c: 20, f: 50,  unit: { name: 'eetlepel', grams: 15 } },
  { slug: 'lijnzaad',        group: 'Vetten', name: 'Lijnzaad',               kcal: 534, p: 18, c: 29, f: 42,  unit: { name: 'eetlepel', grams: 10 } }
];

export const MEAL_CATEGORIES = [
  { key: 'ontbijt', label: 'Ontbijt' },
  { key: 'lunch',   label: 'Lunch' },
  { key: 'snack',   label: 'Snack' },
  { key: 'diner',   label: 'Diner' }
];
