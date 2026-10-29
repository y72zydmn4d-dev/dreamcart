import { describePersistenceContract } from "./persistence.contract";
import { createMemoryPersistence } from "./memory-persistence";
import { makeDeps } from "./test-support";

describePersistenceContract("memory", async () => {
  const deps = makeDeps();
  return {
    p: createMemoryPersistence(deps),
    clock: deps.clock,
    ids: deps.ids as never,
    fresh: async () => createMemoryPersistence(makeDeps({ ids: deps.ids })),
  };
});
