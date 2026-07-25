import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "events" ADD COLUMN "start_datetime_tz" varchar;
  ALTER TABLE "events" ADD COLUMN "end_datetime_tz" varchar;
  ALTER TABLE "events" ADD COLUMN "timezone" varchar DEFAULT 'Europe/London';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "events" DROP COLUMN "start_datetime_tz";
  ALTER TABLE "events" DROP COLUMN "end_datetime_tz";
  ALTER TABLE "events" DROP COLUMN "timezone";`)
}
