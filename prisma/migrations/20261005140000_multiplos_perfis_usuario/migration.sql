ALTER TABLE "User" ADD COLUMN "roles" "UserRole"[] NOT NULL DEFAULT ARRAY[]::"UserRole"[];
UPDATE "User" SET "roles" = ARRAY["role"];
