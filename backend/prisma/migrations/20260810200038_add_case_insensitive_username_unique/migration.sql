-- Username uniqueness was previously enforced case-sensitively (the plain
-- @unique on username), which let "duptest" and "DupTest" both exist —
-- confusing/duplicate-looking side by side on the leaderboard. This adds a
-- case-insensitive unique index so any casing variant of an existing
-- username is rejected too, without changing the stored casing itself.
CREATE UNIQUE INDEX "users_username_lower_unique" ON "users" (LOWER("username")) WHERE "username" IS NOT NULL;
