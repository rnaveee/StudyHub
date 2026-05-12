import "server-only";
import { z } from "zod";
import { publicEnv } from "./env";

const serverEnvSchema = z.object({
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    CLERK_SECRET_KEY: z.string().min(1),
});

const serverOnly = serverEnvSchema.parse(process.env);

export const env =  { ...publicEnv, ...serverOnly }