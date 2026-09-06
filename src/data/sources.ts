export const sources = {
  historic: {
    title: 'Historic England · Lloyd’s Building, entry 1405493',
    url: 'https://historicengland.org.uk/listing/the-list/list-entry/1405493',
    publisher: 'Historic England',
    accessed: '2026-09-06',
  },
  lloyds: {
    title: 'Lloyd’s · The Lloyd’s building',
    url: 'https://www.lloyds.com/about-lloyds/the-lloyds-building',
    publisher: 'Lloyd’s',
    accessed: '2026-09-06',
  },
  rshp: {
    title: 'RSHP · Lloyd’s of London',
    url: 'https://rshp.com/projects/office/lloyds-of-london/',
    publisher: 'RSHP',
    accessed: '2026-09-06',
  },
  room: {
    title: 'Lloyd’s · Navigating the Underwriting Room',
    url: 'https://www.lloyds.com/market-resources/building-facilities/access/navigating-the-underwriting-room',
    publisher: 'Lloyd’s',
    accessed: '2026-09-06',
  },
  market: {
    title: 'Lloyd’s · How the market works',
    url: 'https://www.lloyds.com/about-lloyds/our-market/lloyds-market',
    publisher: 'Lloyd’s',
    accessed: '2026-09-06',
  },
} as const;
export type SourceId = keyof typeof sources;
