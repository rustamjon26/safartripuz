/**
 * Side-effect entry-point bootstrap. Import this FIRST — ES modules evaluate in
 * import order, and modules like `lib/prisma` construct their client at import
 * time, so the env has to be loaded and checked before they are pulled in.
 *
 *   import "../src/shared/boot";
 *   import { bookingService } from "../src/modules/booking";
 */
import { bootstrapProcess } from "./bootstrap";

bootstrapProcess();
