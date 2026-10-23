const languages = {
  English: 'en', German: 'de', Finnish: 'fi', Estonian: 'et', Russian: 'ru',
  French: 'fr', Spanish: 'es', Italian: 'it', Japanese: 'ja', Chinese: 'zh', Polish: 'pl',
}
const flags = { '🇺🇸': 'en', '🇬🇧': 'en', '🇩🇪': 'de', '🇫🇮': 'fi', '🇪🇪': 'et', '🇷🇺': 'ru', '🇫🇷': 'fr', '🇪🇸': 'es', '🇮🇹': 'it', '🇯🇵': 'ja', '🇨🇳': 'zh', '🇵🇱': 'pl' }

export function languageTag(name) { return languages[name?.language] || flags[name?.flag] }

export function captionLanguageRuns(caption) {
  return caption.split(/(?<=\n)/u).map(text => {
    const flag = text.match(/^\s*(\p{Regional_Indicator}{2})\s/u)?.[1]
    return { text, lang: flags[flag] }
  })
}
