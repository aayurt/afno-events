import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events_pricing_ticket_types') THEN
        ALTER TABLE "events_pricing_ticket_types" ADD COLUMN IF NOT EXISTS "total_stock" numeric;
      END IF;
    END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events_pricing_ticket_types') THEN
        ALTER TABLE "events_pricing_ticket_types" DROP COLUMN IF EXISTS "total_stock";
      END IF;
    END $$;
  `)
}
