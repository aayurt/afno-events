import type { Config } from 'src/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'


type Global = keyof Config['globals']

async function getGlobal(slug: Global, depth = 0) {
  const payload = await getPayload({ config: configPromise })

  const global = await payload.findGlobal({
    slug,
    depth,
  })

  return global
}

/**
 * Returns a function to fetch the global data directly from Payload
 */
export const getCachedGlobal = (slug: Global, depth = 0) =>
  async () => getGlobal(slug, depth)

