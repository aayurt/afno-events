export const TAG_OPTIONS = [
  { label: 'Music', value: 'music' },
  { label: 'Gaming', value: 'gaming' },
  { label: 'Theatre', value: 'theatre' },
  { label: 'Arts', value: 'arts' },
  { label: 'Business', value: 'business' },
  { label: 'Technology', value: 'technology' },
  { label: 'Sports', value: 'sports' },
  { label: 'Food & Drink', value: 'food-drink' },
  { label: 'Exhibition', value: 'exhibition' },
  { label: 'Comedy', value: 'comedy' },
  { label: 'Workshop', value: 'workshop' },
  { label: 'Fitness', value: 'fitness' },
] as const

export type TagValue = (typeof TAG_OPTIONS)[number]['value']
