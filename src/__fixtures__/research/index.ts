import type { SourcePackage } from '@/types'

// DRY_RUN fixture — topic: "The Pontianak — Malaysian vampire ghost"
export const dryRunSourcePackage: SourcePackage = {
  sources: [
    {
      url: 'https://www.malaymail.com/news/malaysia/2021/10/28/the-pontianak-malaysias-most-feared-ghost/2016123',
      title: 'The Pontianak: Malaysia\'s Most Feared Ghost',
      snippet:
        'The pontianak is the spirit of a woman who died during childbirth. She is said to haunt banana trees and preys on pregnant women and men. Her presence is announced by the sweet scent of frangipani flowers that suddenly turns rancid.',
      confidence: 0.92,
    },
    {
      url: 'https://www.timeout.com/kuala-lumpur/things-to-do/pontianak-folklore-malaysia',
      title: 'Pontianak Folklore: Origins and Regional Variations Across Southeast Asia',
      snippet:
        'Across Malaysia, Indonesia, and Singapore the pontianak legend takes slightly different forms. In some traditions she can be pacified by driving a nail into the hole at the back of her neck, transforming her into a docile wife. The name derives from the Malay "perempuan mati beranak" — woman who died in childbirth.',
      confidence: 0.88,
    },
    {
      url: 'https://www.academia.edu/38201945/Pontianak_in_Malay_Oral_Tradition',
      title: 'The Pontianak in Malay Oral Tradition and Modern Media',
      snippet:
        'Academic analysis of pontianak narratives reveals how the myth functions as a social control mechanism, encoding anxieties around female sexuality, maternal death, and the liminal state between life and death. The figure has been adapted into over forty Malaysian and Indonesian films since 1956.',
      confidence: 0.85,
    },
    {
      url: 'https://www.visitmalaysia.com/folklore/supernatural-beings/pontianak',
      title: 'Supernatural Beings of Malaysia: Pontianak, Penanggalan, and Langsuir',
      snippet:
        'The pontianak is often confused with the langsuir, her close folkloric cousin. Both are undead women, but the langsuir is a more powerful spirit who can fly and transform into an owl. Protective rituals include burying glass beads, needles, and eggs with the deceased to prevent her rising.',
      confidence: 0.79,
    },
    {
      url: 'https://kontinentalist.com/stories/pontianak-southeast-asia-vampire-ghost-folklore',
      title: 'The Pontianak Across Borders: A Data-Driven Look at Southeast Asia\'s Vampire Ghost',
      snippet:
        'Survey of 200+ oral accounts collected across Peninsular Malaysia and Borneo shows the banana tree association appears in 94% of stories. Urban legends place her near hospitals and construction sites in modern retellings, suggesting the myth adapts to contemporary fears around mortality and displacement.',
      confidence: 0.83,
    },
  ],
  summary:
    'The pontianak is a vampiric female spirit from Malay-Indonesian folklore, originating as the ghost of a woman who died in childbirth. Core traits are consistent across sources: frangipani scent as a warning, association with banana trees, vulnerability through a nail to the nape of the neck. The legend functions both as cultural memory around maternal mortality and as a flexible horror archetype that has been adapted extensively in modern film and urban legend. Regional variations exist between Peninsular Malaysia, Borneo, and Indonesia but the core narrative remains stable.',
  confidence: 0.85,
  gaps: [
    'Pre-colonial written sources for the pontianak myth are sparse — most academic accounts rely on 20th-century oral collection, so the legend\'s earliest form is uncertain.',
    'Specific ritual variations by ethnic subgroup (Orang Asli vs Malay vs Peranakan) are underrepresented in available English-language sources.',
  ],
}
