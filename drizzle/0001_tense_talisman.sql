ALTER TABLE "agent_runs" ADD COLUMN "mode" text DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "mandates" ADD COLUMN "title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "mandates" ADD COLUMN "unenforced" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_requests" ADD COLUMN "rationale" text;--> statement-breakpoint
ALTER TABLE "purchase_requests" ADD COLUMN "failure_reason" text;