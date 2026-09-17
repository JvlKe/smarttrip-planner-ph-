import test from "node:test";
import assert from "node:assert/strict";
import {
  confirmAccountDeletion,
  removeAccountInTransaction,
} from "../src/lib/accountDeletion.js";

const user = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "test@example.test",
};
const valid = { password: "test-password", confirmation: "DELETE" };
test("deletion requires exact confirmation and forbids a supplied target user ID", async () => {
  for (const body of [
    {},
    { ...valid, confirmation: "delete" },
    { ...valid, userId: "someone-else" },
  ]) {
    await assert.rejects(
      confirmAccountDeletion({
        user,
        body,
        verifyPassword: () => assert.fail("must not authenticate"),
        removeAccount: () => assert.fail("must not delete"),
      }),
      { status: 400 },
    );
  }
});
test("deletion requires an authenticated account", async () => {
  await assert.rejects(confirmAccountDeletion({ user: null, body: valid }), {
    status: 401,
  });
});
test("wrong password and mismatched identity never delete data", async () => {
  for (const verified of [null, { id: "another-user" }]) {
    await assert.rejects(
      confirmAccountDeletion({
        user,
        body: valid,
        verifyPassword: async () => verified,
        removeAccount: () => assert.fail("must not delete"),
      }),
      { status: 403 },
    );
  }
});
test("verified deletion targets only the session user", async () => {
  let target;
  await confirmAccountDeletion({
    user,
    body: valid,
    verifyPassword: async (email, password) => {
      assert.equal(email, user.email);
      assert.equal(password, valid.password);
      return user;
    },
    removeAccount: async (id) => {
      target = id;
    },
  });
  assert.equal(target, user.id);
});
function database({ authExists = true, failAuthDelete = false } = {}) {
  const state = { profile: true, auth: authExists };
  return {
    state,
    async $transaction(run) {
      const draft = { ...state };
      const result = await run({
        $queryRaw: async (strings, id) => {
          assert.ok(strings.join("?").includes("FOR UPDATE"));
          assert.equal(id, user.id);
          return draft.auth ? [{ id }] : [];
        },
        profile: {
          deleteMany: async ({ where }) => {
            assert.equal(where.id, user.id);
            draft.profile = false;
          },
        },
        $executeRaw: async (strings, id) => {
          assert.ok(strings.join("?").includes("DELETE FROM auth.users"));
          assert.equal(id, user.id);
          if (failAuthDelete) throw new Error("permission denied");
          draft.auth = false;
          return 1;
        },
      });
      Object.assign(state, draft);
      return result;
    },
  };
}
test("profile and authentication deletion share one transaction", async () => {
  const db = database();
  await removeAccountInTransaction(db, user.id);
  assert.deepEqual(db.state, { profile: false, auth: false });
});
test("authentication deletion failure rolls back profile deletion", async () => {
  const db = database({ failAuthDelete: true });
  await assert.rejects(removeAccountInTransaction(db, user.id));
  assert.deepEqual(db.state, { profile: true, auth: true });
});
test("missing auth identity prevents deleting any app data", async () => {
  const db = database({ authExists: false });
  await assert.rejects(removeAccountInTransaction(db, user.id), {
    status: 401,
  });
  assert.equal(db.state.profile, true);
});
