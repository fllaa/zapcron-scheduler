ALTER TABLE "zc_log" ADD COLUMN "duration" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "zc_log" ADD COLUMN "mode" varchar(255) DEFAULT 'SCHEDULED' NOT NULL;--> statement-breakpoint
ALTER TABLE "zc_log" ADD COLUMN "created_by" varchar(255);--> statement-breakpoint
ALTER TABLE "zc_log" ADD CONSTRAINT "zc_log_created_by_zc_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."zc_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "log_created_by_idx" ON "zc_log" USING btree ("created_by");