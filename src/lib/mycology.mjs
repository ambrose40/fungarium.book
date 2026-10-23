// A conservative visual index of the latest scientific JSON, not a taxonomic lookup.
// Every classification carries its source wording; omitted features are never assumed absent.
const definition = (id, label, pattern, icon = id) => ({ id, label, pattern, icon })
function isAbsent(text, structure) {
  if (/^\s*(?:n\/?a\b|not applicable\b|absent\b|not distinctly separate\b)/iu.test(text)) return true
  const part = structure === 'stipe' ? '(?:stipe|stem|stripe)' : structure === 'attachment' ? '(?:attachment)' : structure
  return new RegExp(`\\b(?:no (?:distinct |typical |true |separate |exposed macroscopic )?${part}|lacks? (?:a )?${part}|${part} (?:is |are )?(?:absent|not present|not applicable))\\b`, 'iu').test(text)
}

function evidence(science, test) {
  return (science?.traits || []).filter(row => test(row)).map(row => ({ label: row.label, text: row.text, raw: row.raw || '' }))
}

function matching(text, pattern) {
  const regex = new RegExp(pattern.source, [...new Set(pattern.flags.replace('g', '') + 'g')].join(''))
  for (const match of text.matchAll(regex)) {
    const before = text.slice(Math.max(0, match.index - 65), match.index).split(/[.;,\n]|\b(?:but|however|yet)\b/iu).at(-1)
    const after = text.slice(match.index + match[0].length)
    if (/\b(?:no|not|without|lacks?|lacking|neither|rather than)\b[^.;,]{0,45}$/iu.test(before)) continue
    if (/^\s*(?:(?:is|are)\s+)?(?:absent|lacking|not present|not applicable)\b/iu.test(after)) continue
    return { tentative: /\b(?:possibly|probably|presumably|apparently|perhaps|sometimes|occasionally|may be|weakly)\b/iu.test(before) }
  }
  return null
}

function select(definitions, text) {
  return definitions.flatMap(({ pattern, ...item }) => {
    const match = matching(text, pattern)
    return match ? [{ ...item, ...match }] : []
  })
}

function category(id, title, rows, items, core = false) {
  if (!rows.length && !core) return null
  return {
    id, title, evidence: rows.map(({ label, text }) => ({ label, text })),
    items: items.length ? items : [{ id: 'unknown', label: rows.length ? 'See description' : 'Not recorded', icon: 'unknown', tentative: false }],
  }
}

const caps = [
  definition('hemispherical', 'Hemispherical', /\bhemispher(?:ical|ic)\b/iu, 'cap-hemispherical'),
  definition('ovate', 'Ovate', /\b(?:ovate|egg[- ]shaped)\b/iu, 'cap-ovate'),
  definition('conical', 'Conical', /\bconic(?:al)?\b/iu, 'cap-conical'),
  definition('bell', 'Bell-shaped', /\b(?:campanulate|bell[- ]shaped)\b/iu, 'cap-bell'),
  definition('convex', 'Convex', /\bconvex\b/iu, 'cap-convex'),
  definition('flat', 'Flat', /\b(?:flat|flatten(?:ed|ing)?|plane|planar|applanate)\b/iu, 'cap-flat'),
  definition('depressed', 'Depressed', /\bdepressed\b/iu, 'cap-depressed'),
  definition('funnel', 'Funnel-shaped', /\b(?:funnel[- ]shaped|infundibuliform|funnel)\b/iu, 'cap-funnel'),
  definition('umbonate', 'Umbonate', /\b(?:umbonate|umbo)\b/iu, 'cap-umbonate'),
  definition('umbilicate', 'Umbilicate', /\b(?:umbilicate|umbilicus|central dimple)\b/iu, 'cap-umbilicate'),
  definition('lobed', 'Lobed / irregular', /\b(?:lobed|irregular|wavy)\b/iu, 'cap-lobed'),
]

const surfaces = [
  definition('smooth', 'Smooth', /\bsmooth\b/iu, 'surface-smooth'),
  definition('scaly', 'Scaly', /\b(?:scaly|scales|squamulose|squamose)\b/iu, 'surface-scaly'),
  definition('warted', 'Veil warts', /\b(?:wart[sy]?|warty)\b/iu, 'surface-warted'),
  definition('striate', 'Striate margin', /\b(?:striate|striated|grooved margin|margin[^.;]{0,15}grooved)\b/iu, 'surface-striate'),
  definition('fibrillose', 'Fibrillose', /\b(?:fibrillose|fibrils|fibrillous)\b/iu, 'surface-fibrillose'),
  definition('hairy', 'Hairy / velvety', /\b(?:hairy|velvety|tomentose|pubescent)\b/iu, 'surface-hairy'),
  definition('viscid', 'Viscid / sticky', /\b(?:viscid|sticky|slimy|glutinous)\b/iu, 'surface-viscid'),
]

const attachments = [
  definition('free', 'Free', /\bfree\b/iu, 'attachment-free'),
  definition('adnexed', 'Adnexed', /\badnexed\b/iu, 'attachment-adnexed'),
  definition('adnate', 'Adnate', /\badnate\b/iu, 'attachment-adnate'),
  definition('sinuate', 'Sinuate / notched', /\b(?:sinuate|emarginate|notched)\b/iu, 'attachment-sinuate'),
  definition('decurrent', 'Decurrent', /\b(?:(?:sub)?decurrent|run(?:s|ning)? down (?:the )?(?:stipe|stem))\b/iu, 'attachment-decurrent'),
  definition('collarium', 'Collarium', /\bcollarium\b/iu, 'attachment-collarium'),
]

const stipes = [
  definition('cylindrical', 'Cylindrical', /\b(?:cylindrical|equal|cylindric)\b/iu, 'stipe-cylindrical'),
  definition('clavate', 'Clavate', /\b(?:clavate|club[- ]shaped)\b/iu, 'stipe-clavate'),
  definition('bulbous', 'Bulbous base', /\b(?:bulbous|bulb|bulbose)\b/iu, 'stipe-bulbous'),
  definition('tapering', 'Tapering', /\b(?:taper(?:ing|s|ed)?|attenuate)\b/iu, 'stipe-tapering'),
  definition('rooting', 'Rooting', /\b(?:rooting|root[- ]like|radicating|pseudorhiza)\b/iu, 'stipe-rooting'),
  definition('lateral', 'Lateral / eccentric', /\b(?:lateral|eccentric|off[- ]cent(?:er|re))\b/iu, 'stipe-lateral'),
  definition('hollow', 'Hollow', /\b(?:hollow|fistulose|chambered)\b/iu, 'stipe-hollow'),
  definition('solid', 'Solid', /\bsolid\b/iu, 'stipe-solid'),
  definition('reticulate', 'Reticulate', /\b(?:reticulat(?:e|ed|ion)|network pattern|net[- ]like)\b/iu, 'stipe-reticulate'),
  definition('scaly', 'Scaly', /\b(?:scaly|scales|scabers|scabrous)\b/iu, 'stipe-scaly'),
  definition('ribbed', 'Ribbed / fluted', /\b(?:ribbed|fluted|ribs)\b/iu, 'stipe-ribbed'),
]

const colours = [
  { id: 'purple-brown', label: 'Purple-brown', pattern: /\b(?:purpl(?:e|ish)[- ]brown|purple[- ]black|violaceous[- ]brown)\b/iu, color: '#56404e' },
  { id: 'olive-brown', label: 'Olive-brown', pattern: /\b(?:olive[- ]brown|brownish[- ]olive)\b/iu, color: '#777344' },
  { id: 'rust-brown', label: 'Rust-brown', pattern: /\b(?:rust(?:y)?[- ]brown|rust[- ]colou?red|rusty|rust)\b/iu, color: '#a45d36' },
  { id: 'chocolate-brown', label: 'Chocolate-brown', pattern: /\bchocolate(?:[- ]brown)?\b/iu, color: '#614234' },
  { id: 'dark-brown', label: 'Dark brown', pattern: /\bdark[- ]brown\b/iu, color: '#55463b' },
  { id: 'ochre', label: 'Ochre', pattern: /\b(?:ochr(?:e|aceous|eous)|ocher|ochre[- ]yellow)\b/iu, color: '#bd964e' },
  { id: 'cream', label: 'Cream', pattern: /\bcream(?:y)?(?:[- ]white)?\b/iu, color: '#ece0ba' },
  { id: 'white', label: 'White', pattern: /\bwhit(?:e|ish)\b/iu, color: '#faf9ef' },
  { id: 'yellow', label: 'Yellow', pattern: /\byellow(?:ish)?\b/iu, color: '#dfbb43' },
  { id: 'pink', label: 'Pink', pattern: /\bpink(?:ish)?\b/iu, color: '#d69c9e' },
  { id: 'salmon', label: 'Salmon', pattern: /\bsalmon\b/iu, color: '#d79179' },
  { id: 'orange', label: 'Orange', pattern: /\borang(?:e|ish)\b/iu, color: '#cd8547' },
  { id: 'olive', label: 'Olive', pattern: /\bolive\b/iu, color: '#989957' },
  { id: 'brown', label: 'Brown', pattern: /\bbrown(?:ish)?\b/iu, color: '#956e4f' },
  { id: 'black', label: 'Black', pattern: /\bblack(?:ish)?\b/iu, color: '#383936' },
  { id: 'grey', label: 'Grey', pattern: /\bgr[ae]y(?:ish)?\b/iu, color: '#a2a49b' },
  { id: 'green', label: 'Green', pattern: /\bgreen(?:ish)?\b/iu, color: '#739367' },
  { id: 'violet', label: 'Violet', pattern: /\b(?:violet|purple|lilac)\b/iu, color: '#8a6c98' },
]

function sporeColours(rows) {
  let text = rows.map(row => row.text.split(';')[0]).join('; ')
  const items = []
  for (const { pattern, ...colour } of colours) {
    const match = matching(text, pattern)
    if (!match) continue
    items.push({ ...colour, ...match, icon: 'spore-print' })
    // A compound colour is a single swatch, not also an unrelated brown/olive swatch.
    if (['purple-brown', 'olive-brown', 'rust-brown', 'chocolate-brown', 'dark-brown', 'ochre', 'cream'].includes(colour.id)) {
      text = text.replace(new RegExp(pattern.source, 'giu'), ' ')
    }
  }
  return items
}

function edibilityItems(text) {
  const item = (id, label, icon = `edibility-${id}`) => ({ id, label, icon, tentative: false })
  const items = []
  const deadly = matching(text, /\b(?:deadly|lethal|fatal|potentially fatal)\b/iu)
  const toxic = matching(text, /\b(?:poisonous|toxic|toxicity|toxin[sy]?)\b/iu)
  const unknown = /\b(?:uncertain|unknown|unresolved|not established|not well[- ]known|insufficiently known)\b/iu.test(text)
  const edible = matching(text, /\bedible\b/iu)
  const preparation = /\b(?:conditionally|after (?:thorough )?(?:cooking|boiling)|only when (?:cooked|boiled|prepared)|only after (?:cooking|boiling|preparation)|must be (?:cooked|boiled)|requires? (?:cooking|boiling))\b/iu.test(text)
  if (deadly) items.push(item('deadly', 'Deadly poisonous'))
  else if (toxic) {
    items.push(item('poisonous', edible && preparation && /\b(?:raw|uncooked)\b/iu.test(text) ? 'Poisonous raw' : 'Poisonous'))
    if (edible && preparation) items.push(item('conditional', 'Conditionally edible'))
  }
  else if (unknown) items.push(item('unknown', 'Edibility uncertain'))
  else if (/\b(?:inedible|not edible|not (?:normally |typically |usually )?(?:eaten|consumed)|not recommended|do not (?:eat|consume)|no culinary value|too .{0,35}culinary value)\b/iu.test(text)) {
    items.push(item('inedible', 'Inedible / not consumed'))
  } else if (edible) {
    if (preparation) items.push(item('conditional', 'Conditionally edible'))
    else if (matching(text, /\b(?:choice|prized|excellent|highly valued)\b/iu)) items.push(item('choice', 'Choice edible'))
    else items.push(item('edible', /\b(?:poor culinary value|not[^.;]{0,24}(?:valued|prized))\b/iu.test(text) ? 'Edible · poor quality' : 'Edible'))
  }
  if (matching(text, /\b(?:psychoactive|hallucinogenic)\b/iu)) items.push(item('psychoactive', 'Psychoactive'))
  return items
}

export function getMycologicalCharacteristics(science) {
  const traits = science?.traits || []
  if (!traits.length) return []
  const find = pattern => evidence(science, row => pattern.test(row.label))
  const join = rows => rows.map(row => row.text).join('; ')
  const capRows = find(/^cap$/iu)
  const capText = join(capRows)
  const hymeniumRows = find(/^hymenium$/iu)
  const hymeniumText = join(hymeniumRows)
  const attachmentRows = find(/hymenium attachment|^attachment$/iu)
  const stipeRows = find(/^(?:stipe|stem)$/iu)
  const stipeText = join(stipeRows)
  const ecologyRows = evidence(science, row => /ecology|habitat/iu.test(row.label) || /^(?:🌲|🌳|🍂|🪵|🌿|🌷|🍄)/u.test(row.raw || ''))
  const ecologyText = join(ecologyRows)
  const sporeRows = evidence(science, row => /spore (?:print|mass|colou?r)/iu.test(`${row.label} ${row.text}`))
  const sporeText = join(sporeRows)
  const edibilityRows = evidence(science, row => /edibility/iu.test(row.label) || /^(?:😵|🤢|👑|🍴|😐|😑|😒|😖|💩|🤐|⚠)/u.test(row.raw || '') && /edib|poison|toxic|consum|culinary|eat|prized/iu.test(row.text))
  const bodyRows = evidence(science, row => /^(?:cap|body|fruit(?:ing)? bod(?:y|ies)|apothecium|sporangium|overview)$/iu.test(row.label))
  const bodyText = join(bodyRows)

  const bodyItems = select([
    definition('coral', 'Coral / branched', /\b(?:coral[- ]?(?:like|shaped)?|dichotomously branched)\b/iu, 'body-coral'),
    definition('cup', 'Cup / ear-shaped', /\b(?:cup[- ]shaped|cup[- ]like|ear[- ]shaped|cupulate|discoid)\b/iu, 'body-cup'),
    definition('saddle', 'Saddle-shaped', /\bsaddle(?:[- ]shaped)?\b/iu, 'body-saddle'),
    definition('bracket', 'Bracket / shelf', /\b(?:bracket|shelf[- ]like|shelf[- ]shaped|fan[- ]shaped|hoof[- ]shaped)\b/iu, 'body-bracket'),
    definition('puffball', 'Puffball', /\bpuffball\b/iu, 'body-puffball'),
    definition('earthstar', 'Earthstar', /\b(?:earthstar|star[- ]like rays|star[- ]shaped)\b/iu, 'body-earthstar'),
    definition('jelly', 'Jelly-like', /\b(?:gelatinous|jelly[- ]like|jelly fungus)\b/iu, 'body-jelly'),
    definition('crust', 'Crust / resupinate', /\b(?:resupinate|crust[- ]like|crust[- ]shaped|crusts?|effused)\b/iu, 'body-crust'),
    definition('morel', 'Honeycombed', /\b(?:honeycomb(?:ed|[- ]like)?|deeply pitted)\b/iu, 'body-morel'),
    definition('club', 'Club-shaped body', /\b(?:club[- ]shaped (?:fruit|body)|unbranched club)\b/iu, 'body-club'),
    definition('mould', 'Mould / mildew', /\b(?:powdery mildew|mould|mold|superficial colonies|conidial.{0,20}fungus)\b/iu, 'body-mould'),
    definition('sporangia', 'Sporangia', /\b(?:sporangia|sporangium|sporophores)\b/iu, 'body-sporangia'),
  ], bodyText)

  let hymeniumItems = []
  if (hymeniumRows.length && isAbsent(hymeniumText, 'hymenium')) {
    hymeniumItems = [{ id: 'not-applicable', label: 'No typical hymenium', icon: 'hymenium-none' }]
  } else {
    hymeniumItems = select([
      definition('ridges', /false gills/iu.test(hymeniumText) ? 'Ridges / false gills' : 'Ridges / folds', /\b(?:false gills|ridges|folds|folded|wrinkled)\b/iu, 'hymenium-ridges'),
      definition('pores', 'Pores / tubes', /\b(?:pores?|tubes?|tubular|poroid)\b/iu, 'hymenium-pores'),
      definition('teeth', 'Teeth / spines', /\b(?:teeth|spines?|toothed|hydnoid)\b/iu, 'hymenium-teeth'),
      definition('smooth', 'Smooth surface', /\bsmooth\b/iu, 'hymenium-smooth'),
      definition('gleba', 'Internal gleba', /\bgleba\b/iu, 'hymenium-gleba'),
    ], hymeniumText)
    if (!/\b(?:false gills|not true (?:gills|lamellae)|rather than (?:true )?gills)\b/iu.test(hymeniumText)) {
      hymeniumItems.push(...select([definition('gills', 'Gills', /\b(?:gills?|lamellae|lamellate)\b/iu, 'hymenium-gills')], hymeniumText))
    }
  }

  const stipeItems = isAbsent(stipeText, 'stipe')
    ? [{ id: 'absent', label: 'Stipe absent / reduced', icon: 'stipe-absent' }]
    : select(stipes, stipeText)
  const veilItems = []
  if (!isAbsent(stipeText, 'stipe')) {
    const ring = matching(stipeText.replace(/\b(?:volval|concentric|basal) rings?\b/giu, ' '), /\b(?:ring|annulus|cortina)\b/iu)
    const volva = matching(stipeText, /\b(?:volva|volval)\b/iu)
    const cortina = matching(stipeText, /\bcortina\b/iu)
    if (ring && volva) veilItems.push({ id: 'ring-volva', label: 'Ring & volva / remnants', icon: 'veil-ring-volva' })
    else if (cortina) veilItems.push({ id: 'cortina', label: 'Cortina', icon: 'veil-cortina' })
    else if (ring) veilItems.push({ id: 'ring', label: 'Ring present', icon: 'veil-ring' })
    else if (volva) veilItems.push({ id: 'volva', label: 'Volva / remnants', icon: 'veil-volva' })
    if (/\b(?:no ring|ring (?:is )?absent|ringless|without (?:a )?ring|annulus absent)\b/iu.test(stipeText)) veilItems.push({ id: 'ringless', label: 'Ring absent', icon: 'veil-ringless' })
  }

  const ecologyItems = select([
    definition('mycorrhizal', 'Mycorrhizal', /\b(?:ecto)?mycorrhizal\b/iu, 'ecology-mycorrhizal'),
    definition('saprotrophic', 'Saprotrophic', /\b(?:saprobic|saprotrophic|saprophytic|decomposer)\b/iu, 'ecology-saprotrophic'),
    definition('parasitic', 'Parasitic', /\b(?:parasitic|parasite|pathogen|biotrophic)\b/iu, 'ecology-parasitic'),
    definition('lichenized', 'Lichenized', /\b(?:lichenized|lichenised|lichen[- ]forming|symbiosis with algae)\b/iu, 'ecology-lichenized'),
    definition('moss', 'Among / on moss', /\b(?:on|among|with) (?:living )?(?:moss|mosses)|\bbryophilous\b/iu, 'ecology-moss'),
  ], ecologyText)
  const parasite = ecologyItems.find(item => item.id === 'parasitic')
  if (parasite && /\b(?:mushrooms?|fungi|fruit bodies|slime mou?lds?)\b/iu.test(ecologyText)) parasite.icon = 'ecology-fungicolous'
  else if (parasite && /\b(?:insects?|larvae|pupae|caterpillars?)\b/iu.test(ecologyText)) parasite.icon = 'ecology-insect'
  if (!ecologyItems.length && /\b(?:logs?|stumps?|decay(?:ing|ed) wood|deadwood|woody debris)\b/iu.test(ecologyText)) {
    ecologyItems.push({ id: 'wood', label: 'On deadwood', icon: 'ecology-saprotrophic' })
  }

  let sporeItems
  if (sporeRows.some(row => /^\s*[❌🚫]/u.test(row.raw)) || /\b(?:n\/?a|not applicable|not (?:typically )?obtained|not produced|no spore print)\b/iu.test(sporeText)) {
    sporeItems = [{ id: 'not-applicable', label: 'Print not available', icon: 'spore-none' }]
  } else sporeItems = sporeColours(sporeRows)
  const sporeMass = /spore mass/iu.test(sporeText) && !/spore print/iu.test(sporeText)
  if (sporeMass) sporeItems = sporeItems.map(item => item.color ? { ...item, icon: 'spore-mass' } : item)

  const fleshRows = find(/^flesh$/iu)
  const fleshItems = select([
    definition('blue', 'Blue staining', /\b(?:bluing|blues|blue staining|(?:turn(?:s|ing)?|stain(?:s|ing)?|becom(?:es|ing)) (?:\w+ ){0,3}blue)\b/iu, 'flesh-blue'),
    definition('red', 'Red / pink staining', /\b(?:redden(?:s|ing)?|(?:turn(?:s|ing)?|stain(?:s|ing)?|becom(?:es|ing)) (?:\w+ ){0,3}(?:red|pink(?:ish)?|reddish))\b/iu, 'flesh-red'),
    definition('yellow', 'Yellow staining', /\b(?:yellowing|turn(?:s|ing)? yellow|stain(?:s|ing)? yellow)\b/iu, 'flesh-yellow'),
    definition('black', 'Blackening', /\b(?:blacken(?:s|ing)?|turn(?:s|ing)? black)\b/iu, 'flesh-black'),
    definition('green', 'Green staining', /\b(?:green(?:s|ing)|turn(?:s|ing)? green)\b/iu, 'flesh-green'),
    definition('unchanging', 'Unchanging', /\b(?:unchanging|unchanged|does not (?:change|stain)|no (?:colou?r change|staining))\b/iu, 'flesh-unchanging'),
  ], join(fleshRows))
  // A flesh colour by itself does not establish a bruising reaction.
  const reactionText = join(fleshRows)
  const filteredFlesh = /\b(?:cut|bruis|stain|turn|redden|bluing|blacken|yellowing|green(?:s|ing)|unchang)/iu.test(reactionText) ? fleshItems : []

  const microscopyRows = find(/microscop|^spores?$/iu)
  const sporeMorphology = microscopyRows.flatMap(row => {
    const start = row.text.search(/\b(?:basidio|asco|conidio|chlamydo)?spores?\b/iu)
    if (start < 0) return []
    return [row.text.slice(start).split(/\b(?:basidia|asci|cystidia|cheilocystidia|hyphae|capillitium)\b/iu)[0]]
  }).join('; ')
  const microscopyItems = select([
    definition('globose', 'Globose / subglobose', /\b(?:sub)?globose\b/iu, 'microscopy-globose'),
    definition('ellipsoid', 'Ellipsoid / ovoid', /\b(?:ellipsoid|ellipsoidal|ovoid|ovate)\b/iu, 'microscopy-ellipsoid'),
    definition('fusiform', 'Fusiform', /\b(?:sub)?fusiform\b/iu, 'microscopy-fusiform'),
    definition('almond', 'Almond-shaped', /\b(?:amygdaliform|almond[- ]shaped)\b/iu, 'microscopy-almond'),
    definition('cylindrical', 'Cylindrical / curved', /\b(?:cylindrical|subcylindrical|allantoid|sausage[- ]shaped)\b/iu, 'microscopy-cylindrical'),
    definition('smooth', 'Smooth spores', /\bsmooth\b/iu, 'microscopy-smooth'),
    definition('warted', /roughened/iu.test(sporeMorphology) ? 'Rough / ornamented' : 'Warted / ornamented', /\b(?:warted|warts|ornamented|verrucose|roughened)\b/iu, 'microscopy-warted'),
    definition('spiny', 'Spiny', /\b(?:spiny|spines|echinulate)\b/iu, 'microscopy-spiny'),
    definition('reticulate', 'Reticulate spores', /\breticulat(?:e|ed|ion)\b/iu, 'microscopy-reticulate'),
  ], sporeMorphology)

  return [
    category('body', 'Fruiting form', bodyRows, bodyItems),
    category('cap', 'Cap shape', capRows, isAbsent(capText, 'cap') ? [{ id: 'absent', label: 'No distinct cap', icon: 'cap-absent' }] : select(caps, capText), true),
    category('surface', 'Cap surface', capRows, isAbsent(capText, 'cap') ? [] : select(surfaces, capText)),
    category('hymenium', 'Hymenium', hymeniumRows, hymeniumItems, true),
    category('attachment', 'Hymenium attachment', attachmentRows, isAbsent(join(attachmentRows), 'attachment') ? [{ id: 'not-applicable', label: 'Not applicable', icon: 'attachment-none' }] : select(attachments, join(attachmentRows)), true),
    category('stipe', 'Stipe', stipeRows, stipeItems, true),
    category('veil', 'Veil & stipe features', veilItems.length ? stipeRows : [], veilItems),
    category('spore-print', sporeMass ? 'Spore mass' : 'Spore print', sporeRows, sporeItems, true),
    category('ecology', 'Ecology', ecologyRows, ecologyItems, true),
    category('edibility', 'Edibility', edibilityRows, edibilityItems(join(edibilityRows)), true),
    category('flesh', 'Flesh reaction', filteredFlesh.length ? fleshRows : [], filteredFlesh),
    category('microscopy', 'Spores under the microscope', microscopyItems.length ? microscopyRows : [], microscopyItems),
  ].filter(Boolean).filter(item => !['body', 'surface'].includes(item.id) || item.items[0].id !== 'unknown')
}
