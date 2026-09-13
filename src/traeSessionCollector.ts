import { diffLines } from "diff";
import * as fs from "fs";
import git from "isomorphic-git";
import * as os from "os";
import * as path from "path";
import { fileURLToPath } from "url";
import { CollectedSession, CollectedTurn } from "./sessionCollector";
import { FileChange } from "./models";
import {
  readTraeRuntimeCache,
  refreshTraeRuntimeSessions,
  TraeRuntimeSession
} from "./traeRuntimeBridge";

const COMPLETION_PREFIX = "ai-chat.chatQueryCompletion.v2.";
const SESSION_MAP_KEY = "icube_session_agent_map";
const LAST_SESSION_KEY = "ai-chat-v2.lastActiveSessionId";
const MAX_DIFF_BYTES = 2 * 1024 * 1024;

interface TraeRootOptions {
  platform: NodeJS.Platform;
  home: string;
  override?: string;
  appData?: string;
  configHome?: string;
}

interface TraeWorkspace {
  id: string;
  root: string;
  database: string;
  databaseMtimeMs: number;
  sessionIds: Set<string>;
  lastActiveSessionId?: string;
}

interface TraeLatestChange {
  tag?: string;
  files: string[];
}

interface TraeTagInfo {
  commitOid: string;
  timestampMs: number;
}

export interface TraeCollectedSource {
  activityPath: string;
  contextPath: string;
  sessionId: string;
  rolloutPath: string;
  cwd: string;
  parse: () => Promise<CollectedSession | undefined>;
}

export function resolveTraeAppRoots({
  platform,
  home,
  override,
  appData,
  configHome
}: TraeRootOptions): string[] {
  if (override) {
    return [path.resolve(override)];
  }
  const names = ["Trae CN", "TRAE SOLO CN", "Trae"];
  if (platform === "darwin") {
    const base = appData || path.join(home, "Library", "Application Support");
    return names.map((name) => path.join(base, name));
  }
  if (platform === "win32") {
    const base = appData || path.join(home, "AppData", "Roaming");
    return names.map((name) => path.join(base, name));
  }
  const base = configHome || path.join(home, ".config");
  return names.map((name) => path.join(base, name));
}

export function traeAppRoots(): string[] {
  const candidates = resolveTraeAppRoots({
    platform: process.platform,
    home: os.homedir(),
    override: process.env.TRAE_APP_ROOT,
    appData: process.platform === "win32"
      ? process.env.APPDATA
      : process.platform === "darwin"
        ? path.join(os.homedir(), "Library", "Application Support")
        : undefined,
    configHome: process.env.XDG_CONFIG_HOME
  });
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    if (!fs.existsSync(candidate)) {
      return false;
    }
    let resolved = path.resolve(candidate);
    try {
      resolved = fs.realpathSync(candidate);
    } catch {
      // The existence check already established a usable fallback path.
    }
    const key = process.platform === "linux" ? resolved : resolved.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export async function discoverTraeSnapshotSources(
  appRoots = traeAppRoots()
): Promise<TraeCollectedSource[]> {
  const workspaces = await discoverTraeWorkspaces(appRoots);
  const snapshotRoots = appRoots
    .map((root) => path.join(root, "ModularData", "ai-agent", "snapshot"))
    .filter((root) => fs.existsSync(root));
  const sessionOwners = new Map<string, TraeWorkspace>();
  for (const workspace of [...workspaces].sort(
    (left, right) => right.databaseMtimeMs - left.databaseMtimeMs
  )) {
    for (const sessionId of workspace.sessionIds) {
      if (!sessionOwners.has(sessionId)) {
        sessionOwners.set(sessionId, workspace);
      }
    }
  }

  const candidates: Array<{
    repo: string;
    sessionId: string;
    turnIds: string[];
    activityMtimeMs: number;
    workspace: TraeWorkspace;
  }> = [];
  for (const [sessionId, workspace] of sessionOwners) {
    const repo = snapshotRoots
      .map((root) => path.join(root, sessionId, "v2"))
      .find((candidate) => fs.existsSync(path.join(candidate, ".git")));
    if (!repo) {
      continue;
    }
    const turnIds = listCompletedTurnIds(repo);
    if (turnIds.length === 0) {
      continue;
    }
    candidates.push({
      repo,
      sessionId,
      turnIds,
      activityMtimeMs: fileMtimeMs(
        path.join(repo, ".git", "refs", "heads", sessionId)
      ),
      workspace
    });
  }

  const runtimeBySession = new Map<string, TraeRuntimeSession>();
  const backfillWorkspaces = new Set(
    (process.env.WAYFINDER_TRAE_BACKFILL_WORKSPACES || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );
  const runtimeRequests: Array<{
    workspaceId: string;
    sessionIds: string[];
  }> = [];
  for (const workspace of workspaces) {
    const workspaceCandidates = candidates.filter(
      (candidate) => candidate.workspace === workspace
    );
    const refreshIds: string[] = [];
    const backfillWorkspace =
      process.env.WAYFINDER_TRAE_BACKFILL === "1" &&
      (
        backfillWorkspaces.size === 0 ||
        backfillWorkspaces.has(workspace.id)
      );
    for (const candidate of workspaceCandidates) {
      const cached = readTraeRuntimeCache(workspace.id, candidate.sessionId);
      if (cached) {
        runtimeBySession.set(candidate.sessionId, cached);
      }
      const collectedAt = cached ? Date.parse(cached.collectedAt) : 0;
      if (
        backfillWorkspace ||
        (
          !cached &&
          workspace.lastActiveSessionId === candidate.sessionId
        ) ||
        (
          Boolean(cached) &&
          candidate.activityMtimeMs > collectedAt
        ) ||
        (
          workspace.lastActiveSessionId === candidate.sessionId &&
          workspace.databaseMtimeMs > collectedAt
        )
      ) {
        refreshIds.push(candidate.sessionId);
      }
    }
    if (refreshIds.length > 0) {
      runtimeRequests.push({
        workspaceId: workspace.id,
        sessionIds: refreshIds
      });
    }
  }
  if (runtimeRequests.length > 0) {
    const refreshed = await refreshTraeRuntimeSessions(runtimeRequests);
    for (const [sessionId, session] of refreshed) {
      runtimeBySession.set(sessionId, session);
    }
  }

  const sources: TraeCollectedSource[] = [];
  for (const candidate of candidates) {
    const { repo, sessionId, workspace } = candidate;
    sources.push({
      activityPath: path.join(repo, ".git", "refs", "heads", sessionId),
      contextPath: workspace.database,
      sessionId,
      rolloutPath: repo,
      cwd: workspace.root,
      parse: async () => {
        const session = await parseTraeSnapshot(
          repo,
          workspace.root,
          runtimeBySession.get(sessionId)
        );
        if (!session) {
          return undefined;
        }
        return session;
      }
    });
  }
  return sources.sort((left, right) =>
    left.activityPath.localeCompare(right.activityPath)
  );
}

export async function parseTraeSnapshot(
  repo: string,
  cwd?: string,
  runtime?: TraeRuntimeSession
): Promise<CollectedSession | undefined> {
  let tags: string[];
  try {
    tags = await git.listTags({ fs, dir: repo });
  } catch {
    return undefined;
  }
  const sessionId = path.basename(path.dirname(repo));
  if (!/^[0-9a-f]{24,}$/i.test(sessionId)) {
    return undefined;
  }

  const turnIds = completedTurnIds(tags);
  if (turnIds.length === 0) {
    return undefined;
  }

  const snapshotTurns = [];
  for (let index = 0; index < turnIds.length; index += 1) {
    const turnId = turnIds[index];
    const beforeRef = `before-chat-turn-${turnId}`;
    const afterRef = `after-chat-turn-${turnId}`;
    const before = await readTagInfo(repo, beforeRef);
    const after = await readTagInfo(repo, afterRef);
    if (!before || !after) {
      continue;
    }
    const files = await fileChangesForTurn(
      repo,
      beforeRef,
      before.commitOid,
      after.commitOid
    );
    snapshotTurns.push({
      host: "trae" as const,
      surface: "trae-code" as const,
      sessionId,
      turnId,
      rolloutPath: repo,
      turnIndex: index,
      cwd,
      prompt: "",
      actions: [],
      files,
      startedAt: new Date(before.timestampMs).toISOString(),
      completedAt: new Date(
        Math.max(before.timestampMs, after.timestampMs)
      ).toISOString()
    });
  }
  if (snapshotTurns.length === 0) {
    return undefined;
  }
  const turns = runtime
    ? mergeRuntimeTurns(runtime, snapshotTurns)
    : [];
  return {
    host: "trae",
    surface: "trae-code",
    sessionId,
    rolloutPath: repo,
    cwd,
    turns
  };
}

function mergeRuntimeTurns(
  runtime: TraeRuntimeSession,
  snapshotTurns: CollectedTurn[]
): CollectedTurn[] {
  const runtimeTurns = [...runtime.turns].sort((left, right) =>
    left.startedAt.localeCompare(right.startedAt) ||
    left.turnId.localeCompare(right.turnId)
  );
  const snapshots = [...snapshotTurns].sort((left, right) =>
    left.startedAt.localeCompare(right.startedAt) ||
    (left.turnId || "").localeCompare(right.turnId || "")
  );
  const grouped = new Map<string, CollectedTurn[]>(
    runtimeTurns.map((turn) => [turn.turnId, []])
  );
  for (const snapshot of snapshots) {
    const exact = snapshot.turnId && grouped.get(snapshot.turnId);
    if (exact) {
      exact.push(snapshot);
      continue;
    }
    const snapshotTime = Date.parse(snapshot.startedAt);
    let owner = runtimeTurns[0];
    for (const turn of runtimeTurns) {
      if (Date.parse(turn.startedAt) > snapshotTime) {
        break;
      }
      owner = turn;
    }
    grouped.get(owner.turnId)?.push(snapshot);
  }

  return runtimeTurns.flatMap((turn, turnIndex) => {
    const evidence = grouped.get(turn.turnId) || [];
    if (evidence.length === 0) {
      return [];
    }
    const exact = evidence.find((item) => item.turnId === turn.turnId);
    const completedAt = evidence.reduce(
      (latest, item) =>
        item.completedAt > latest ? item.completedAt : latest,
      turn.completedAt
    );
    return [{
      host: "trae" as const,
      surface: "trae-code" as const,
      sessionId: runtime.sessionId,
      turnId: turn.turnId,
      rolloutPath: exact?.rolloutPath || evidence[0].rolloutPath,
      turnIndex,
      cwd: exact?.cwd || evidence[0].cwd,
      prompt: turn.prompt,
      promptSource: "transcript" as const,
      response: turn.response,
      actions: [],
      files: mergeFileChanges(evidence.flatMap((item) => item.files)),
      startedAt: exact?.startedAt || turn.startedAt,
      completedAt
    }];
  });
}

function mergeFileChanges(changes: FileChange[]): FileChange[] {
  const grouped = new Map<string, FileChange[]>();
  for (const change of changes) {
    const group = grouped.get(change.path) || [];
    group.push(change);
    grouped.set(change.path, group);
  }
  return [...grouped.entries()]
    .map(([filepath, group]) => {
      const first = group[0];
      const last = group[group.length - 1];
      const lineCountsKnown = group.every(
        (change) => change.lineCountsKnown !== false
      );
      let status: FileChange["status"] = "M";
      if (first.status === "A" && last.status !== "D") {
        status = "A";
      } else if (last.status === "D") {
        status = "D";
      }
      return {
        path: filepath,
        status,
        additions: lineCountsKnown
          ? group.reduce((sum, change) => sum + change.additions, 0)
          : 0,
        deletions: lineCountsKnown
          ? group.reduce((sum, change) => sum + change.deletions, 0)
          : 0,
        binary: group.some((change) => change.binary) || undefined,
        lineCountsKnown
      };
    })
    .sort((left, right) => left.path.localeCompare(right.path));
}

function fileMtimeMs(file: string): number {
  try {
    return fs.statSync(file).mtimeMs;
  } catch {
    return 0;
  }
}

async function discoverTraeWorkspaces(
  appRoots: string[]
): Promise<TraeWorkspace[]> {
  const byRoot = new Map<string, TraeWorkspace>();
  for (const appRoot of appRoots) {
    const storageRoot = path.join(appRoot, "User", "workspaceStorage");
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(storageRoot, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      const directory = path.join(storageRoot, entry.name);
      const database = path.join(directory, "state.vscdb");
      const workspaceFile = path.join(directory, "workspace.json");
      const root = workspaceRoot(workspaceFile);
      if (!root || !fs.existsSync(database)) {
        continue;
      }
      const workspace = await readWorkspaceDatabase(
        entry.name,
        root,
        database
      );
      if (!workspace) {
        continue;
      }
      const key = process.platform === "linux"
        ? path.resolve(root)
        : path.resolve(root).toLowerCase();
      const previous = byRoot.get(key);
      if (!previous) {
        byRoot.set(key, workspace);
        continue;
      }
      for (const sessionId of workspace.sessionIds) {
        previous.sessionIds.add(sessionId);
      }
      if (workspace.databaseMtimeMs >= previous.databaseMtimeMs) {
        previous.id = workspace.id;
        previous.database = workspace.database;
        previous.databaseMtimeMs = workspace.databaseMtimeMs;
        previous.lastActiveSessionId = workspace.lastActiveSessionId;
      }
    }
  }
  return [...byRoot.values()];
}

async function readWorkspaceDatabase(
  id: string,
  root: string,
  database: string
): Promise<TraeWorkspace | undefined> {
  let sqlite: typeof import("node:sqlite");
  try {
    sqlite = await import("node:sqlite");
  } catch {
    return undefined;
  }
  let databaseMtimeMs = 0;
  try {
    databaseMtimeMs = fs.statSync(database).mtimeMs;
  } catch {
    return undefined;
  }
  const sessionIds = new Set<string>();
  let lastActiveSessionId: string | undefined;
  const db = new sqlite.DatabaseSync(database, { readOnly: true });
  try {
    const rows = db.prepare(`
      SELECT key, value
      FROM ItemTable
      WHERE key = '${SESSION_MAP_KEY}'
         OR key = '${LAST_SESSION_KEY}'
         OR key LIKE '${COMPLETION_PREFIX}%'
    `).all() as Array<{ key: string; value: string }>;
    for (const row of rows) {
      if (row.key === SESSION_MAP_KEY) {
        const map = parseJson(row.value);
        if (isRecord(map)) {
          for (const sessionId of Object.keys(map)) {
            if (isTraeId(sessionId)) {
              sessionIds.add(sessionId);
            }
          }
        }
      } else if (row.key === LAST_SESSION_KEY) {
        if (isTraeId(row.value)) {
          sessionIds.add(row.value);
          lastActiveSessionId = row.value;
        }
      } else if (row.key.startsWith(COMPLETION_PREFIX)) {
        const sessionId = row.key.slice(COMPLETION_PREFIX.length);
        if (isTraeId(sessionId)) {
          sessionIds.add(sessionId);
        }
      }
    }
  } catch {
    return undefined;
  } finally {
    db.close();
  }
  return {
    id,
    root,
    database,
    databaseMtimeMs,
    sessionIds,
    lastActiveSessionId
  };
}

function workspaceRoot(file: string): string | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return undefined;
  }
  if (!isRecord(parsed)) {
    return undefined;
  }
  const uri = typeof parsed.folder === "string"
    ? parsed.folder
    : typeof parsed.workspace === "string"
      ? parsed.workspace
      : undefined;
  if (!uri?.startsWith("file:")) {
    return undefined;
  }
  try {
    const candidate = fileURLToPath(uri);
    const stat = fs.statSync(candidate);
    return stat.isDirectory() ? candidate : path.dirname(candidate);
  } catch {
    return undefined;
  }
}

async function fileChangesForTurn(
  repo: string,
  beforeRef: string,
  beforeOid: string,
  afterOid: string
): Promise<FileChange[]> {
  const latest = await readLatestChange(repo, afterOid);
  if (latest.tag !== beforeRef || latest.files.length === 0) {
    return [];
  }
  const extraMeta = {
    ...(await readExtraMeta(repo, beforeOid)),
    ...(await readExtraMeta(repo, afterOid))
  };
  const changes: FileChange[] = [];
  for (const storedPath of latest.files) {
    const normalized = safeRelativePath(storedPath);
    if (!normalized) {
      continue;
    }
    const before = await readBlob(repo, beforeOid, `disk/content/${normalized}`);
    const after = await readBlob(repo, afterOid, `disk/content/${normalized}`);
    if ((!before && !after) || buffersEqual(before, after)) {
      continue;
    }
    const actualPath = safeRelativePath(
      extraMeta[normalized]?.real_relative_path || normalized
    );
    if (!actualPath) {
      continue;
    }
    changes.push(describeFileChange(actualPath, before, after));
  }
  return changes.sort((left, right) => left.path.localeCompare(right.path));
}

async function readLatestChange(
  repo: string,
  oid: string
): Promise<TraeLatestChange> {
  const parsed = parseJson(
    await readTextBlob(repo, oid, "base/version_file_latest_change.json")
  );
  if (!isRecord(parsed) || !isRecord(parsed.toolcall)) {
    return { files: [] };
  }
  const map = isRecord(parsed.toolcall.map) ? parsed.toolcall.map : {};
  return {
    tag: typeof parsed.toolcall.tag === "string"
      ? parsed.toolcall.tag
      : undefined,
    files: Object.keys(map)
  };
}

async function readExtraMeta(
  repo: string,
  oid: string
): Promise<Record<string, { real_relative_path?: string }>> {
  const parsed = parseJson(
    await readTextBlob(repo, oid, "base/version_file_extra_meta.json")
  );
  if (!isRecord(parsed)) {
    return {};
  }
  const result: Record<string, { real_relative_path?: string }> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (isRecord(value) && typeof value.real_relative_path === "string") {
      result[key] = { real_relative_path: value.real_relative_path };
    }
  }
  return result;
}

async function readTagInfo(
  repo: string,
  ref: string
): Promise<TraeTagInfo | undefined> {
  try {
    let oid = await git.resolveRef({ fs, dir: repo, ref: `refs/tags/${ref}` });
    let timestampMs = 0;
    try {
      const { tag } = await git.readTag({ fs, dir: repo, oid });
      oid = tag.object;
      timestampMs = (tag.tagger?.timestamp || 0) * 1000;
    } catch {
      // Lightweight tags already point directly at their commit.
    }
    const commit = await git.readCommit({ fs, dir: repo, oid });
    if (timestampMs === 0) {
      timestampMs = commit.commit.committer.timestamp * 1000;
    }
    return { commitOid: oid, timestampMs };
  } catch {
    return undefined;
  }
}

async function readTextBlob(
  repo: string,
  oid: string,
  filepath: string
): Promise<string> {
  const blob = await readBlob(repo, oid, filepath);
  return blob ? Buffer.from(blob).toString("utf8") : "";
}

async function readBlob(
  repo: string,
  oid: string,
  filepath: string
): Promise<Uint8Array | undefined> {
  try {
    const result = await git.readBlob({ fs, dir: repo, oid, filepath });
    return result.blob;
  } catch {
    return undefined;
  }
}

function describeFileChange(
  filepath: string,
  before: Uint8Array | undefined,
  after: Uint8Array | undefined
): FileChange {
  const status = before ? (after ? "M" : "D") : "A";
  const beforeBuffer = before ? Buffer.from(before) : Buffer.alloc(0);
  const afterBuffer = after ? Buffer.from(after) : Buffer.alloc(0);
  const binary = beforeBuffer.includes(0) || afterBuffer.includes(0);
  if (
    binary ||
    beforeBuffer.length + afterBuffer.length > MAX_DIFF_BYTES
  ) {
    return {
      path: filepath,
      status,
      additions: 0,
      deletions: 0,
      binary,
      lineCountsKnown: false
    };
  }
  let additions = 0;
  let deletions = 0;
  for (const part of diffLines(
    beforeBuffer.toString("utf8"),
    afterBuffer.toString("utf8")
  )) {
    if (part.added) {
      additions += part.count || 0;
    } else if (part.removed) {
      deletions += part.count || 0;
    }
  }
  return {
    path: filepath,
    status,
    additions,
    deletions,
    lineCountsKnown: true
  };
}

function buffersEqual(
  left: Uint8Array | undefined,
  right: Uint8Array | undefined
): boolean {
  if (!left || !right) {
    return left === right;
  }
  return Buffer.from(left).equals(Buffer.from(right));
}

function safeRelativePath(value: string): string | undefined {
  const normalized = path.posix.normalize(value.replace(/\\/g, "/"));
  if (
    !normalized ||
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    path.posix.isAbsolute(normalized)
  ) {
    return undefined;
  }
  return normalized;
}

function objectIdTimestamp(value: string): number {
  if (!isTraeId(value)) {
    return 0;
  }
  return Number.parseInt(value.slice(0, 8), 16) * 1000;
}

function listCompletedTurnIds(repo: string): string[] {
  const names = new Set<string>();
  try {
    for (const entry of fs.readdirSync(
      path.join(repo, ".git", "refs", "tags"),
      { withFileTypes: true }
    )) {
      if (entry.isFile()) {
        names.add(entry.name);
      }
    }
  } catch {
    // Repositories without loose tags may still have packed refs.
  }
  try {
    const packed = fs.readFileSync(path.join(repo, ".git", "packed-refs"), "utf8");
    for (const line of packed.split(/\r?\n/)) {
      const marker = " refs/tags/";
      const index = line.indexOf(marker);
      if (index >= 0) {
        names.add(line.slice(index + marker.length).trim());
      }
    }
  } catch {
    // TRAE currently writes loose refs; packed refs are optional.
  }
  return completedTurnIds([...names]);
}

function completedTurnIds(tags: string[]): string[] {
  const completed = new Set(
    tags
      .filter((tag) => /^after-chat-turn-[0-9a-f]{24,}$/i.test(tag))
      .map((tag) => tag.slice("after-chat-turn-".length))
  );
  return tags
    .filter((tag) => /^before-chat-turn-[0-9a-f]{24,}$/i.test(tag))
    .map((tag) => tag.slice("before-chat-turn-".length))
    .filter((turnId) => completed.has(turnId))
    .sort((left, right) => objectIdTimestamp(left) - objectIdTimestamp(right));
}

function isTraeId(value: string): boolean {
  return /^[0-9a-f]{24,}$/i.test(value);
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
