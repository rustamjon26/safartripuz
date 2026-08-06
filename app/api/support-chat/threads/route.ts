/**
 * Compatibility alias. The support chat API is one namespace now:
 *   agents  → /api/support/chat/threads
 *   parties → /api/support/chat/my/threads   (this route)
 *
 * `/api/support-chat` and `/api/support/chat` differed by a single character and
 * neither name said which side it served. Kept as a re-export because the
 * customer and partner UIs shipped against this path; delete once they and the
 * Expo apps are on the new one.
 */
export { GET, POST } from "@/app/api/support/chat/my/threads/route";
