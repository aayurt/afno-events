
import { getPayload } from 'payload'
import config from './src/payload.config'

async function checkTenants() {
  const payload = await getPayload({ config })
  const tenants = await payload.find({
    collection: 'tenants',
  })
  tenants.docs.forEach(t => console.log(`- ${t.slug} (${t.name})`))
  process.exit(0)
}

checkTenants()
