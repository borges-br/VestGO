-- VestGO PostgreSQL initialization
-- This script runs only when the PostgreSQL data volume is created for the first time.
-- Existing volumes will not automatically re-run this file.

-- Required only if the application starts using PostGIS/geospatial SQL queries.
-- The current application still stores latitude/longitude as Float fields,
-- but keeping PostGIS enabled is useful for future distance/radius optimizations.
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;

-- Optional extension for gen_random_uuid().
-- The current Prisma schema uses cuid(), so this is not required today,
-- but pgcrypto is the modern PostgreSQL-native option if UUIDs are needed later.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;