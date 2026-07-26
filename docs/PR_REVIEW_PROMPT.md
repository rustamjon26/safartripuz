# PR review prompt (copy into a new chat)

After each refactor / before merge, open a **separate** Agent chat on the branch and paste:

---

Review the diff on this branch as a senior engineer responsible for a LIVE payment
system. Check specifically:

1. Does any `prisma` import appear outside a repository file?
2. Does any external network call (Payme, Click, email, SMS) happen inside a
   DB transaction?
3. Is any booking status written without going through assertTransition()?
4. Is any money value handled as a float, or is any tiyin/som conversion done
   outside a payment adapter?
5. Is any LedgerEntry updated or deleted rather than compensated?
6. Are there new code paths that can leave inventory and bookings inconsistent
   if the process crashes midway?
7. Is every new external input validated with Zod?
8. What is the rollback plan if this breaks in production?
9. Which of these changes are NOT covered by a test?

Be harsh. List concrete file:line issues, not general advice.

---

Cursor tip: you can also `@`-mention the rule `pr-payment-review` or say “run the payment PR review on this branch.”

Save the report under `docs/reviews/` if you want an audit trail (e.g. `docs/reviews/YYYY-MM-DD-branch-name.md`).
