import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "subscribers" (
  "id" serial PRIMARY KEY NOT NULL,
  "email" varchar NOT NULL,
  "status" varchar DEFAULT 'active',
  "source" varchar,
  "unsubscribe_token" varchar,
  "subscribed_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "subscribers_email_idx" ON "subscribers" USING btree ("email");
CREATE INDEX "subscribers_status_idx" ON "subscribers" USING btree ("status");
CREATE INDEX "subscribers_created_at_idx" ON "subscribers" USING btree ("created_at");
CREATE INDEX "subscribers_updated_at_idx" ON "subscribers" USING btree ("updated_at");

ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "subscribers_id" integer;
CREATE INDEX "payload_locked_documents_rels_subscribers_id_idx" ON "payload_locked_documents_rels" USING btree ("subscribers_id");
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_subscribers_fk" FOREIGN KEY ("subscribers_id") REFERENCES "public"."subscribers"("id") ON DELETE CASCADE;

CREATE TABLE "_subscribers_v" (
  "id" serial PRIMARY KEY NOT NULL,
  "parent_id" integer NOT NULL,
  "version_email" varchar NOT NULL,
  "version_status" varchar DEFAULT 'active',
  "version_source" varchar,
  "version_unsubscribe_token" varchar,
  "version_subscribed_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "version_updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "version_created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "latest" boolean
);

ALTER TABLE "_subscribers_v" ADD CONSTRAINT "_subscribers_v_parent_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."subscribers"("id") ON DELETE CASCADE;
CREATE INDEX "subscribers_v_parent_id_idx" ON "_subscribers_v" USING btree ("parent_id");
CREATE INDEX "subscribers_v_latest_idx" ON "_subscribers_v" USING btree ("latest");

CREATE TABLE "_subscribers_v_rels" (
  "id" serial PRIMARY KEY NOT NULL,
  "order" integer NOT NULL,
  "parent_id" integer NOT NULL,
  "path" varchar NOT NULL
);
`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE IF EXISTS "_subscribers_v_rels";
  DROP TABLE IF EXISTS "_subscribers_v";
  DROP TABLE IF EXISTS "subscribers";`)
}
