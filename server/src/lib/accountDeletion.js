import { z } from "zod";

const confirmationSchema = z
  .object({
    password: z.string().min(1).max(4096),
    confirmation: z.literal("DELETE"),
  })
  .strict();

export async function confirmAccountDeletion({
  user,
  body,
  verifyPassword,
  removeAccount,
}) {
  const parsed = confirmationSchema.safeParse(body);
  if (!parsed.success) {
    throw Object.assign(
      new Error("Enter your current password and type DELETE to confirm."),
      { status: 400 },
    );
  }
  if (!user?.id || !user.email) {
    throw Object.assign(
      new Error("Sign in again before deleting your account."),
      { status: 401 },
    );
  }
  const verified = await verifyPassword(user.email, parsed.data.password);
  if (!verified || verified.id !== user.id) {
    throw Object.assign(
      new Error("Current password is incorrect. Your account was not deleted."),
      { status: 403 },
    );
  }
  await removeAccount(user.id);
}

// Both schemas use the same Supabase PostgreSQL database. A single transaction
// avoids deleting only the app data or only the login when either step fails.
// IDs are bound parameters derived from the authenticated user, never the body.
export async function removeAccountInTransaction(db, userId) {
  return db.$transaction(async (tx) => {
    const users =
      await tx.$queryRaw`SELECT id FROM auth.users WHERE id = ${userId}::uuid FOR UPDATE`;
    if (users.length !== 1)
      throw Object.assign(
        new Error("Sign in again before deleting your account."),
        { status: 401 },
      );
    await tx.profile.deleteMany({ where: { id: userId } });
    const deleted =
      await tx.$executeRaw`DELETE FROM auth.users WHERE id = ${userId}::uuid`;
    if (deleted !== 1) throw new Error("Account deletion did not complete.");
  });
}
