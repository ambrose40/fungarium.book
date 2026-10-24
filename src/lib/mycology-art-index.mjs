const families = {
  cap: ['hemispherical', 'ovate', 'conical', 'bell', 'convex', 'flat', 'depressed', 'funnel', 'umbonate', 'umbilicate', 'lobed', 'absent'],
  surface: ['smooth', 'scaly', 'warted', 'striate', 'fibrillose', 'hairy', 'viscid'],
  hymenium: ['gills', 'pores', 'ridges', 'teeth', 'smooth', 'gleba', 'none'],
  attachment: ['free', 'adnexed', 'adnate', 'sinuate', 'decurrent', 'collarium', 'none'],
  stipe: ['cylindrical', 'clavate', 'bulbous', 'tapering', 'rooting', 'lateral', 'hollow', 'solid', 'reticulate', 'scaly', 'ribbed', 'absent'],
  veil: ['ring', 'volva', 'ring-volva', 'ringless', 'cortina'],
  body: ['coral', 'cup', 'saddle', 'bracket', 'puffball', 'earthstar', 'jelly', 'crust', 'morel', 'club', 'mould', 'sporangia'],
  ecology: ['mycorrhizal', 'saprotrophic', 'fungicolous', 'insect', 'parasitic', 'lichenized', 'moss'],
  edibility: ['choice', 'edible', 'conditional', 'inedible', 'psychoactive', 'deadly', 'poisonous'],
  flesh: ['blue', 'red', 'yellow', 'black', 'green', 'violet', 'unchanging'],
  microscopy: ['globose', 'ellipsoid', 'fusiform', 'almond', 'cylindrical', 'smooth', 'warted', 'spiny', 'reticulate'],
  maturation: ['blackening', 'inking'],
  use: ['dye'],
}
export const MYCOLOGY_ART_ICONS = [
  ...Object.entries(families).flatMap(([prefix, variants]) => variants.map(variant => `${prefix}-${variant}`)),
  ...['latex', 'juice', 'guttation'].flatMap(kind => ['', '-white', '-red', '-purple', '-orange'].map(colour => `exudate-${kind}${colour}`)),
]
