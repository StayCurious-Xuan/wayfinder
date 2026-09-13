import * as fs from "fs";
import * as http from "http";
import * as path from "path";
import { wayfinderHome } from "./storage";

const DEFAULT_CDP_PORT = 9223;
const CACHE_VERSION = 1;
const MAX_PAGES = 100;
const MAX_TEXT_LENGTH = 20_000;

export interface TraeRuntimeTurn {
  turnId: string;
  prompt: string;
  response?: string;
  startedAt: string;
  completedAt: string;
}

export interface TraeRuntimeSession {
  version: 1;
  workspaceId: string;
  sessionId: string;
  collectedAt: string;
  turns: TraeRuntimeTurn[];
}

interface CdpTarget {
  type?: string;
  title?: string;
  url?: string;
  webSocketDebuggerUrl?: string;
}

interface CdpMessage {
  id?: number;
  result?: {
    result?: {
      value?: unknown;
      description?: string;
    };
  };
  error?: unknown;
}

interface RuntimeFetchResult {
  sessions?: Array<{
    workspaceId?: string;
    sessionId?: string;
    turns?: Array<{
      turnId?: string;
      prompt?: string;
      response?: string;
      startedAt?: number;
      completedAt?: number;
    }>;
  }>;
  error?: string;
}

export async function refreshTraeRuntimeSessions(
  requests: Array<{ workspaceId: string; sessionIds: string[] }>
): Promise<Map<string, TraeRuntimeSession>> {
  const requested = requests
    .map((request) => ({
      workspaceId: request.workspaceId,
      sessionIds: [...new Set(request.sessionIds)].filter(isTraeId)
    }))
    .filter((request) => request.sessionIds.length > 0);
  if (requested.length === 0) {
    return new Map();
  }
  const targets = await findTraeWorkbenchTargets();
  if (targets.length === 0) {
    return new Map();
  }
  const fetchedSessions: NonNullable<RuntimeFetchResult["sessions"]> = [];
  for (const batch of chunkRequests(requested, 2)) {
    let result: RuntimeFetchResult | undefined;
    for (const target of targets) {
      if (!target.webSocketDebuggerUrl) {
        continue;
      }
      result = await evaluateTarget<RuntimeFetchResult>(
        target.webSocketDebuggerUrl,
        runtimeExtractionExpression(batch)
      );
      if (result?.sessions?.length) {
        fetchedSessions.push(...result.sessions);
        break;
      }
    }
  }
  if (fetchedSessions.length === 0) {
    return new Map();
  }

  const sessions = new Map<string, TraeRuntimeSession>();
  for (const raw of fetchedSessions) {
    if (
      !raw?.workspaceId ||
      !raw?.sessionId ||
      !isTraeId(raw.sessionId)
    ) {
      continue;
    }
    const turns = (raw.turns || []).flatMap((turn) => {
      if (
        !turn?.turnId ||
        !isTraeId(turn.turnId) ||
        typeof turn.prompt !== "string" ||
        typeof turn.startedAt !== "number" ||
        typeof turn.completedAt !== "number"
      ) {
        return [];
      }
      const prompt = clip(turn.prompt.trim(), MAX_TEXT_LENGTH);
      if (!prompt) {
        return [];
      }
      const response = typeof turn.response === "string"
        ? clip(turn.response.trim(), MAX_TEXT_LENGTH) || undefined
        : undefined;
      return [{
        turnId: turn.turnId,
        prompt,
        response,
        startedAt: new Date(turn.startedAt).toISOString(),
        completedAt: new Date(
          Math.max(turn.startedAt, turn.completedAt)
        ).toISOString()
      }];
    });
    if (turns.length === 0) {
      continue;
    }
    const session: TraeRuntimeSession = {
      version: CACHE_VERSION,
      workspaceId: raw.workspaceId,
      sessionId: raw.sessionId,
      collectedAt: new Date().toISOString(),
      turns
    };
    writeTraeRuntimeCache(session);
    sessions.set(session.sessionId, session);
  }
  return sessions;
}

function chunkRequests(
  requests: Array<{ workspaceId: string; sessionIds: string[] }>,
  size: number
): Array<Array<{ workspaceId: string; sessionIds: string[] }>> {
  const flat = requests.flatMap((request) =>
    request.sessionIds.map((sessionId) => ({
      workspaceId: request.workspaceId,
      sessionId
    }))
  );
  const batches: Array<Array<{ workspaceId: string; sessionIds: string[] }>> = [];
  for (let index = 0; index < flat.length; index += size) {
    const grouped = new Map<string, string[]>();
    for (const item of flat.slice(index, index + size)) {
      const ids = grouped.get(item.workspaceId) || [];
      ids.push(item.sessionId);
      grouped.set(item.workspaceId, ids);
    }
    batches.push([...grouped].map(([workspaceId, sessionIds]) => ({
      workspaceId,
      sessionIds
    })));
  }
  return batches;
}

export function readTraeRuntimeCache(
  workspaceId: string,
  sessionId: string
): TraeRuntimeSession | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(
      fs.readFileSync(runtimeCachePath(workspaceId, sessionId), "utf8")
    );
  } catch {
    return undefined;
  }
  if (
    !isRecord(parsed) ||
    parsed.version !== CACHE_VERSION ||
    parsed.workspaceId !== workspaceId ||
    parsed.sessionId !== sessionId ||
    !Array.isArray(parsed.turns)
  ) {
    return undefined;
  }
  const turns = parsed.turns.filter(isRuntimeTurn);
  return turns.length > 0
    ? {
        version: CACHE_VERSION,
        workspaceId,
        sessionId,
        collectedAt: typeof parsed.collectedAt === "string"
          ? parsed.collectedAt
          : new Date(0).toISOString(),
        turns
      }
    : undefined;
}

export function writeTraeRuntimeCache(session: TraeRuntimeSession): void {
  const file = runtimeCachePath(session.workspaceId, session.sessionId);
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(
    temporary,
    `${JSON.stringify(session, null, 2)}\n`,
    { encoding: "utf8", mode: 0o600 }
  );
  fs.renameSync(temporary, file);
}

function runtimeCachePath(workspaceId: string, sessionId: string): string {
  return path.join(
    wayfinderHome(),
    "trae-runtime",
    workspaceId,
    `${sessionId}.json`
  );
}

async function findTraeWorkbenchTargets(): Promise<CdpTarget[]> {
  const configured = Number.parseInt(
    process.env.TRAE_CDP_PORT || "",
    10
  );
  const ports = Number.isFinite(configured)
    ? [configured]
    : [DEFAULT_CDP_PORT];
  for (const port of ports) {
    const targets = await getJson<CdpTarget[]>(
      `http://127.0.0.1:${port}/json/list`
    );
    const candidates = targets?.filter((item) =>
      item.type === "page" &&
      item.url?.startsWith("vscode-file://") &&
      item.webSocketDebuggerUrl?.startsWith("ws://127.0.0.1:")
    );
    const preferredTitle = process.env.TRAE_CDP_TARGET_TITLE;
    if (candidates?.length) {
      const scored = await Promise.all(candidates.map(async (target) => {
        const metadata = target.webSocketDebuggerUrl
          ? await evaluateTarget<{ elements?: number }>(
              target.webSocketDebuggerUrl,
              "({ elements: document.querySelectorAll('*').length })"
            )
          : undefined;
        return {
          target,
          preferred: Boolean(
            preferredTitle && target.title?.includes(preferredTitle)
          ),
          elements: metadata?.elements ?? Number.MAX_SAFE_INTEGER
        };
      }));
      return scored
        .sort((left, right) =>
          Number(right.preferred) - Number(left.preferred) ||
          left.elements - right.elements
        )
        .map((item) => item.target);
    }
  }
  return [];
}

function getJson<T>(url: string): Promise<T | undefined> {
  return new Promise((resolve) => {
    const request = http.get(url, { timeout: 800 }, (response) => {
      if (response.statusCode !== 200) {
        response.resume();
        resolve(undefined);
        return;
      }
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        try {
          resolve(JSON.parse(body) as T);
        } catch {
          resolve(undefined);
        }
      });
    });
    request.on("timeout", () => request.destroy());
    request.on("error", () => resolve(undefined));
  });
}

async function evaluateTarget<T>(
  websocketUrl: string,
  expression: string
): Promise<T | undefined> {
  const WebSocketConstructor = globalThis.WebSocket;
  if (!WebSocketConstructor) {
    return undefined;
  }
  return new Promise((resolve) => {
    let settled = false;
    const socket = new WebSocketConstructor(websocketUrl);
    const backfill = process.env.WAYFINDER_TRAE_BACKFILL === "1";
    const timeoutMs = backfill ? 180_000 : 45_000;
    const finish = (value?: T): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      try {
        socket.close();
      } catch {
        // The target may already have closed the connection.
      }
      resolve(value);
    };
    const timeout = setTimeout(() => finish(), timeoutMs);
    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({
        id: 1,
        method: "Runtime.evaluate",
        params: {
          expression,
          returnByValue: true,
          awaitPromise: true,
          timeout: timeoutMs - 10_000
        }
      }));
    });
    socket.addEventListener("message", (event) => {
      let message: CdpMessage;
      try {
        message = JSON.parse(String(event.data)) as CdpMessage;
      } catch {
        return;
      }
      if (message.id !== 1) {
        return;
      }
      finish(message.result?.result?.value as T | undefined);
    });
    socket.addEventListener("error", () => finish());
  });
}

function runtimeExtractionExpression(
  requests: Array<{ workspaceId: string; sessionIds: string[] }>
): string {
  return `(async () => {
    try {
      const roots = [];
      for (const element of document.querySelectorAll("*")) {
        for (const key of Object.getOwnPropertyNames(element)) {
          if (key.startsWith("__reactFiber$") || key.startsWith("__reactProps$")) {
            roots.push(element[key]);
          }
        }
      }
      const queue = roots.slice(0, 1800).map((value) => ({
        value,
        depth: 0
      }));
      const seen = new WeakSet();
      let port;
      let visited = 0;
      while (queue.length && !port && visited < 30_000) {
        const { value, depth } = queue.shift();
        if (
          (typeof value !== "object" && typeof value !== "function") ||
          value === null ||
          seen.has(value)
        ) {
          continue;
        }
        seen.add(value);
        visited += 1;
        if (
          value.mentionPort &&
          typeof value.mentionPort.exportPastChat === "function" &&
          value.mentionPort.pastChatExporter?._aiNativeChatService
        ) {
          port = value.mentionPort;
          break;
        }
        if (
          typeof value.exportPastChat === "function" &&
          value.pastChatExporter?._aiNativeChatService
        ) {
          port = value;
          break;
        }
        if (depth >= 7) {
          continue;
        }
        let keys = [];
        try {
          keys = Object.getOwnPropertyNames(value);
        } catch {
          continue;
        }
        for (const key of keys.slice(0, 240)) {
          if (
            ["window", "globalThis", "document", "ownerDocument",
              "parentNode", "children", "childNodes"].includes(key)
          ) {
            continue;
          }
          let child;
          try {
            child = value[key];
          } catch {
            continue;
          }
          if (
            (typeof child === "object" || typeof child === "function") &&
            child !== null
          ) {
            queue.push({ value: child, depth: depth + 1 });
          }
        }
      }
      if (!port) {
        return { error: "TRAE runtime chat service was not found." };
      }
      const native = port.pastChatExporter._aiNativeChatService;
      const projectId =
        native._projectStore?.getState?.().projectId ||
        port.pastChatExporter._sessionService?.projectId;

      const text = (value) =>
        typeof value === "string" ? value.trim() : "";
      const responseFor = (message) => {
        const task = message?.agentTaskContent;
        const items = task?.guideline?.planItems || [];
        for (let index = items.length - 1; index >= 0; index -= 1) {
          const item = items[index];
          if (
            item?.toolName === "ReplyUser" &&
            text(item?.params?.message || item?.params?.params?.message)
          ) {
            return text(item.params.message || item.params.params.message);
          }
          if (
            String(item?.toolName || "").toLowerCase() === "finish" &&
            text(item?.params?.summary)
          ) {
            return text(item.params.summary);
          }
        }
        return text(task?.proposal) || text(task?.summary) ||
          text(message?.content);
      };
      const timestampFor = (message) => {
        if (Number.isFinite(message?.timestamp)) {
          return Number(message.timestamp);
        }
        const id = String(
          message?.agentMessageId || message?.turnId || ""
        );
        return /^[0-9a-f]{24,}$/i.test(id)
          ? Number.parseInt(id.slice(0, 8), 16) * 1000
          : 0;
      };

      const sessions = [];
      const requests = ${JSON.stringify(requests)};
      const pending = requests.flatMap((request) =>
        request.sessionIds.map((sessionId) => ({
          workspaceId: request.workspaceId,
          sessionId
        }))
      );
      let pendingIndex = 0;
      const fetchSession = async (request) => {
       try {
        const { workspaceId, sessionId } = request;
        let token;
        const messages = [];
        const seenTokens = new Set();
        for (let pageIndex = 0; pageIndex < ${MAX_PAGES}; pageIndex += 1) {
          const page = await native.getSessionMessages({
            session_id: sessionId,
            project_id: projectId,
            next_page_token: token
          });
          messages.push(...(page?.messages || []));
          if (!page?.hasMore || !page?.nextPageToken) {
            break;
          }
          if (seenTokens.has(page.nextPageToken)) {
            break;
          }
          seenTokens.add(page.nextPageToken);
          token = page.nextPageToken;
        }
        const byTurn = new Map();
        for (const message of messages) {
          const turnId = String(message?.turnId || "");
          if (!/^[0-9a-f]{24,}$/i.test(turnId)) {
            continue;
          }
          const entry = byTurn.get(turnId) || {
            turnId,
            prompt: "",
            response: "",
            startedAt: timestampFor(message),
            completedAt: timestampFor(message)
          };
          const timestamp = timestampFor(message);
          entry.startedAt = Math.min(
            entry.startedAt || timestamp,
            timestamp || entry.startedAt
          );
          entry.completedAt = Math.max(entry.completedAt, timestamp);
          if (message.role === "user") {
            entry.prompt = text(message.content) ||
              (Array.isArray(message.parsedQuery)
                ? message.parsedQuery.filter((part) =>
                    typeof part === "string"
                  ).join("").trim()
                : "");
          } else if (message.role === "assistant") {
            const response = responseFor(message);
            if (response) {
              entry.response = response;
            }
          }
          byTurn.set(turnId, entry);
        }
        const turns = [...byTurn.values()]
          .filter((turn) => turn.prompt)
          .sort((left, right) =>
            left.startedAt - right.startedAt ||
            left.turnId.localeCompare(right.turnId)
          );
        if (turns.length > 0) {
          return {
            workspaceId,
            sessionId,
            turns
          };
        }
       } catch {
         // One corrupt or unavailable session must not abort the batch.
       }
       return undefined;
      };
      const worker = async () => {
        const fetched = [];
        while (pendingIndex < pending.length) {
          const index = pendingIndex;
          pendingIndex += 1;
          const session = await fetchSession(pending[index]);
          if (session) {
            fetched.push(session);
          }
        }
        return fetched;
      };
      const workerCount = Math.min(8, pending.length);
      for (const batch of await Promise.all(
        Array.from({ length: workerCount }, () => worker())
      )) {
        sessions.push(...batch);
      }
      return {
        sessions
      };
    } catch (error) {
      return {
        error: String(error?.stack || error?.message || error)
      };
    }
  })()`;
}

function isRuntimeTurn(value: unknown): value is TraeRuntimeTurn {
  return (
    isRecord(value) &&
    typeof value.turnId === "string" &&
    isTraeId(value.turnId) &&
    typeof value.prompt === "string" &&
    typeof value.startedAt === "string" &&
    typeof value.completedAt === "string" &&
    (
      value.response === undefined ||
      typeof value.response === "string"
    )
  );
}

function isTraeId(value: string): boolean {
  return /^[0-9a-f]{24,}$/i.test(value);
}

function clip(value: string, length: number): string {
  return value.length <= length ? value : `${value.slice(0, length - 1)}…`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
