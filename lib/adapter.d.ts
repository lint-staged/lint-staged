declare module LintStaged {
  type AdapterData = {
    baseDir: string;
    shouldBackup: boolean;
  }

  interface Adapter {
    init: (ctx: Ctx) => Promise<AdapterData>;

    prepare: (ctx: Ctx) => Promise<void>;

    getStagedFilesList: (ctx: Ctx) => Promise<string[]>;

    applyModifications: (ctx: Ctx) => Promise<void>;
    applyModificationsSkipped: (ctx: Ctx) => string | boolean;
    restoreOriginalState: (ctx: Ctx) => Promise<void>;
    executeTasksSkipped: (ctx: Ctx) => string | boolean;

    shouldBackup: (ctx: Ctx) => Promise<boolean>;
    hideUnstagedChanges: (ctx: Ctx) => Promise<void>;
    restoreUnstagedChanges(Enabled?): (ctx: Ctx) => Promise<void>;
    restoreUnstagedChangesSkipped: (ctx: Ctx) => string | boolean;

    restoreOriginalStateEnabled: (ctx: Ctx) => boolean;
    restoreOriginalStateSkipped: (ctx: Ctx) => string | boolean;

    cleanup: (ctx: Ctx) => Promise<void>;
    cleanupEnabled: (ctx: Ctx) => boolean;
    cleanupSkipped: (ctx: Ctx) => string | boolean;

    finalize: (ctx: Ctx) => Promise<void>;
  }
}
