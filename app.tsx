import { useEffect, useMemo, useState } from "react";
import {
  definePluginApp,
  experimental_resolveThreadStatus,
  experimental_ThreadActionsContextMenu as ThreadActionsContextMenu,
  experimental_ThreadActionsMenu as ThreadActionsMenu,
  experimental_useSidebarThreads,
  experimental_useSidebarThreadSplit,
  ThreadTitle,
  useBbNavigate,
  useSidebarThreadDraft,
  useSidebarThreadDraftIds,
  useSidebarThreadRowStatus,
  useSidebarThreadRowStatuses,
  useSidebarThreadShortcut,
  type PluginSidebarProject,
  type PluginSidebarThread,
  type PluginThreadListProps,
} from "@get-bb/plugin-sdk/app";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type FilterMode = "active" | "archived" | "all";

const PROJECT_BADGE_COLORS = [
  "bg-rose-500/20 text-rose-300 border-rose-500/30",
  "bg-violet-500/20 text-violet-300 border-violet-500/30",
  "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "bg-amber-500/20 text-amber-300 border-amber-500/30",
  "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30",
  "bg-teal-500/20 text-teal-300 border-teal-500/30",
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getProjectInitials(name: string): string {
  const words = name
    .trim()
    .split(/[\s\-_./]+/)
    .filter(Boolean);
  if (words.length === 0) return "BB";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function formatRelativeTime(timestamp: number): string {
  if (!timestamp || Number.isNaN(timestamp)) return "";
  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSeconds < 60) return "now";
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo`;
}

function T3ThreadRow({
  thread,
  project,
  isActive,
  isSettled,
  onToggleSettle,
  onNavigate,
}: {
  thread: PluginSidebarThread;
  project: PluginSidebarProject | undefined;
  isActive: boolean;
  isSettled: boolean;
  onToggleSettle: (threadId: string) => void;
  onNavigate: () => void;
}) {
  const navigate = useBbNavigate();
  const { splitProps } = experimental_useSidebarThreadSplit(thread.id);
  const { hasUnsubmittedDraft } = useSidebarThreadDraft(thread.id);
  const rowStatus = useSidebarThreadRowStatus(thread.id);
  const shortcut = useSidebarThreadShortcut(thread.id);

  const resolvedStatus = experimental_resolveThreadStatus({
    thread,
    hiddenThreads: [],
    hasUnsubmittedDraft,
    rowStatus,
  });

  const isWorking = resolvedStatus.isWorking;
  const projectName = project?.name ?? "General";
  const initials = getProjectInitials(projectName);
  const badgeColor =
    PROJECT_BADGE_COLORS[hashString(project?.id ?? projectName) % PROJECT_BADGE_COLORS.length];
  const relativeTime = formatRelativeTime(thread.updatedAt || thread.createdAt);
  const showMetaLine = isWorking || thread.isPinned || thread.isUnread || isActive;
  const actionTarget = {
    ...thread,
    environment:
      thread.environment?.id != null
        ? { id: thread.environment.id, path: thread.environment.path }
        : null,
  };

  return (
    <ThreadActionsContextMenu thread={actionTarget}>
      <div
        className={cn(
          "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors",
          isActive
            ? "bg-accent/80 text-accent-foreground"
            : "hover:bg-accent/40 text-foreground/90",
        )}
      >
        <a
          {...splitProps}
          href={thread.href}
          data-sidebar-thread-shortcut-target=""
          data-sidebar-thread-id={thread.id}
          aria-label={thread.displayTitle}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
              return;
            }
            e.preventDefault();
            navigate.toThread(thread.id);
            onNavigate();
          }}
          className="flex min-w-0 flex-1 items-start gap-2.5 outline-none"
        >
          <span
            className={cn(
              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold tracking-tight border",
              badgeColor,
            )}
            title={projectName}
          >
            {initials}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  "truncate text-[13px] leading-tight",
                  isWorking
                    ? "font-medium text-foreground"
                    : thread.isUnread
                      ? "font-semibold text-foreground"
                      : "font-normal text-foreground/90",
                )}
              >
                <ThreadTitle threadId={thread.id} />
              </span>

              <div className="flex shrink-0 items-center gap-1.5">
                {shortcut ? (
                  <kbd className="rounded bg-muted px-1 py-0.5 text-[10px] font-mono text-muted-foreground">
                    {shortcut.label}
                  </kbd>
                ) : isWorking ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-400">
                    <Icon name="Loader2" className="h-3 w-3 animate-spin" />
                    {relativeTime}
                  </span>
                ) : thread.isUnread ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                    <Icon name="CheckCircle2" className="h-3 w-3" />
                    Done
                  </span>
                ) : (
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {relativeTime}
                  </span>
                )}
              </div>
            </div>

            {showMetaLine && (thread.host?.name || thread.environment?.branchName) && (
              <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                {thread.host?.name && (
                  <span className="inline-flex items-center gap-1 truncate">
                    <Icon name="Cloud" className="h-3 w-3 shrink-0 opacity-70" />
                    <span className="truncate">{thread.host.name}</span>
                  </span>
                )}
                {thread.environment?.branchName && (
                  <span className="inline-flex items-center gap-1 truncate text-violet-400/90">
                    <Icon name="GitBranch" className="h-3 w-3 shrink-0" />
                    <span className="truncate">{thread.environment.branchName}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </a>

        <div className="flex items-center gap-0.5 opacity-75 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleSettle(thread.id);
            }}
            aria-label={isSettled ? "Unsettle thread" : "Settle thread"}
            title={isSettled ? "Mover para ativas (Unsettle)" : "Finalizar tarefa (Settle)"}
            className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Icon name={isSettled ? "RotateCcw" : "CheckCheck"} className="h-3.5 w-3.5" />
          </button>
          <ThreadActionsMenu
            thread={actionTarget}
            trigger={(props) => (
              <button
                {...props}
                type="button"
                aria-label="Thread actions"
                className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Icon name="MoreHorizontal" className="h-3.5 w-3.5" />
              </button>
            )}
          />
        </div>
      </div>
    </ThreadActionsContextMenu>
  );
}

function SectionDivider({
  label,
  count,
  collapsible,
  collapsed,
  onToggle,
}: {
  label: string;
  count?: number;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  if (collapsible) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="flex w-full items-center gap-1.5 px-2.5 pb-1 pt-3 text-left text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <Icon
          name={collapsed ? "ChevronRight" : "ChevronDown"}
          className="h-3 w-3 shrink-0"
        />
        <span>{label}</span>
        {typeof count === "number" && (
          <span className="text-[10px] tabular-nums opacity-70">{count}</span>
        )}
        <div className="h-px flex-1 bg-border/60" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 px-2.5 pb-1 pt-3">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <div className="h-px flex-1 bg-border/60" />
    </div>
  );
}

function T3SidebarThreadList({
  activeThreadId,
  onNavigate,
}: PluginThreadListProps) {
  const { status, threads, projects } = experimental_useSidebarThreads();
  const draftIds = useSidebarThreadDraftIds();
  const rowStatuses = useSidebarThreadRowStatuses();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("active");
  const [settledIds, setSettledIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("bb-better-sidebar:settled-ids");
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? new Set(parsed.filter((x) => typeof x === "string")) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    const onSync = () => {
      try {
        const raw = localStorage.getItem("bb-better-sidebar:settled-ids");
        const parsed = raw ? JSON.parse(raw) : [];
        setSettledIds(
          Array.isArray(parsed) ? new Set(parsed.filter((x) => typeof x === "string")) : new Set(),
        );
      } catch {
        // ignore
      }
    };
    window.addEventListener("bb-better-sidebar:settled-changed", onSync);
    return () => window.removeEventListener("bb-better-sidebar:settled-changed", onSync);
  }, []);

  const toggleSettleThread = (threadId: string) => {
    setSettledIds((prev) => {
      const next = new Set(prev);
      if (next.has(threadId)) {
        next.delete(threadId);
      } else {
        next.add(threadId);
      }
      try {
        localStorage.setItem("bb-better-sidebar:settled-ids", JSON.stringify(Array.from(next)));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const [settledCollapsed, setSettledCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("bb-better-sidebar:settled-collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleSettled = () => {
    setSettledCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("bb-better-sidebar:settled-collapsed", String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const projectMap = useMemo(() => {
    const map = new Map<string, PluginSidebarProject>();
    for (const project of projects) {
      map.set(project.id, project);
    }
    return map;
  }, [projects]);

  const { attention, working, settled } = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const visible = threads.filter((t) => {
      if (t.isHidden) return false;
      if (filterMode === "active" && t.isArchived) return false;
      if (filterMode === "archived" && !t.isArchived) return false;
      if (normalizedQuery) {
        const titleMatch = t.displayTitle.toLowerCase().includes(normalizedQuery);
        const projectMatch = (projectMap.get(t.projectId)?.name ?? "")
          .toLowerCase()
          .includes(normalizedQuery);
        const hostMatch = (t.host?.name ?? "").toLowerCase().includes(normalizedQuery);
        if (!titleMatch && !projectMatch && !hostMatch) return false;
      }
      return true;
    });

    const sortByUpdated = (a: PluginSidebarThread, b: PluginSidebarThread) =>
      (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt);

    const attentionList: PluginSidebarThread[] = [];
    const workingList: PluginSidebarThread[] = [];
    const settledList: PluginSidebarThread[] = [];

    for (const thread of visible) {
      const resolved = experimental_resolveThreadStatus({
        thread,
        hiddenThreads: [],
        hasUnsubmittedDraft: draftIds.has(thread.id),
        rowStatus: rowStatuses.get(thread.id) ?? null,
      });
      if (resolved.isWorking) {
        workingList.push(thread);
      } else if (settledIds.has(thread.id) || thread.isArchived) {
        settledList.push(thread);
      } else {
        attentionList.push(thread);
      }
    }

    attentionList.sort(sortByUpdated);
    workingList.sort(sortByUpdated);
    settledList.sort(sortByUpdated);

    return { attention: attentionList, working: workingList, settled: settledList };
  }, [threads, filterMode, query, projectMap, draftIds, rowStatuses, settledIds]);

  const cycleFilterMode = () => {
    setFilterMode((prev) =>
      prev === "active" ? "archived" : prev === "archived" ? "all" : "active",
    );
  };

  return (
    <div className="flex flex-col gap-1 px-1.5 pb-4">
      <div className="sticky top-0 z-10 flex flex-col gap-1.5 bg-sidebar/95 px-1.5 py-1.5 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-semibold tracking-tight text-foreground/80">
            Chats
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setSearchOpen((v) => !v);
                if (searchOpen) setQuery("");
              }}
              aria-label="Search threads"
              title="Search threads"
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                searchOpen && "bg-accent text-foreground",
              )}
            >
              <Icon name="Search" className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={cycleFilterMode}
              aria-label={`Filter: ${filterMode}`}
              title={`Filter: ${filterMode} (click to switch)`}
              className={cn(
                "inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                filterMode !== "active" && "bg-accent text-foreground",
              )}
            >
              <Icon name="Filter" className="h-3.5 w-3.5" />
              {filterMode !== "active" && <span className="capitalize">{filterMode}</span>}
            </button>
          </div>
        </div>

        {searchOpen && (
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by title, project, host..."
            className="h-7 text-xs"
            autoFocus
          />
        )}
      </div>

      {status === "loading" && threads.length === 0 ? (
        <div className="px-2.5 py-6 text-center text-xs text-muted-foreground">
          Loading threads...
        </div>
      ) : attention.length === 0 && working.length === 0 && settled.length === 0 ? (
        <div className="px-2.5 py-6 text-center text-xs text-muted-foreground">
          {query ? "No threads match your search." : "No threads yet."}
        </div>
      ) : (
        <>
          {attention.length > 0 && (
            <div className="flex flex-col gap-0.5">
              {attention.map((thread) => (
                <T3ThreadRow
                  key={thread.id}
                  thread={thread}
                  project={projectMap.get(thread.projectId)}
                  isActive={thread.id === activeThreadId}
                  isSettled={settledIds.has(thread.id)}
                  onToggleSettle={toggleSettleThread}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          )}

          {working.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <SectionDivider label="Working" />
              {working.map((thread) => (
                <T3ThreadRow
                  key={thread.id}
                  thread={thread}
                  project={projectMap.get(thread.projectId)}
                  isActive={thread.id === activeThreadId}
                  isSettled={settledIds.has(thread.id)}
                  onToggleSettle={toggleSettleThread}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          )}

          {settled.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <SectionDivider
                label="Settled"
                count={settled.length}
                collapsible
                collapsed={settledCollapsed}
                onToggle={toggleSettled}
              />
              {!settledCollapsed &&
                settled.map((thread) => (
                  <T3ThreadRow
                    key={thread.id}
                    thread={thread}
                    project={projectMap.get(thread.projectId)}
                    isActive={thread.id === activeThreadId}
                    isSettled={settledIds.has(thread.id)}
                    onToggleSettle={toggleSettleThread}
                    onNavigate={onNavigate}
                  />
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default definePluginApp((app) => {
  app.slots.experimental_threadList({
    id: "t3-sidebar",
    title: "T3 Code Style",
    component: T3SidebarThreadList,
  });
});
