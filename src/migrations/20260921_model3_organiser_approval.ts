import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_tenants_status') THEN
        CREATE TYPE "enum_tenants_status" AS ENUM ('pending', 'verified', 'rejected');
      END IF;
    END $$;

    ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "status" "enum_tenants_status" DEFAULT 'pending';
    ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "verified" boolean DEFAULT false;
    UPDATE "tenants" SET "status" = 'verified', "verified" = true WHERE "status" IS NULL OR "status" = 'pending';

    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_events_approval_status') THEN
        CREATE TYPE "enum_events_approval_status" AS ENUM ('draft', 'pending_review', 'approved', 'rejected');
      END IF;
    END $$;

    ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "approval_status" "enum_events_approval_status" DEFAULT 'approved';
    UPDATE "events" SET "approval_status" = 'approved' WHERE "approval_status" IS NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "events" DROP COLUMN IF EXISTS "approval_status";
    ALTER TABLE "tenants" DROP COLUMN IF EXISTS "verified";
    ALTER TABLE "tenants" DROP COLUMN IF EXISTS "status";
  `)
}
