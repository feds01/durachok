import { createTRPCReact } from "@trpc/react-query";

import type { AppRouter } from "../../../server/src/routes";

/** Define our tRPC instance from the server definition. */
export const trpc = createTRPCReact<AppRouter>();
