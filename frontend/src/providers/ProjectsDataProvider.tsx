import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { apiRequest } from "../lib/api";
import { useAuth } from "./AuthProvider";

export type Project = {
  id: number;
  name: string;
  description: string | null;
  owner_id: number;
  created_at: string;
  updated_at: string;
};

export type ConversationMessage = {
  id: number;
  project_id: number;
  role: "user" | "llm";
  content: string;
  created_at: string;
};

type ProjectsDataContextValue = {
  projects: Project[];
  isProjectsLoading: boolean;
  projectsError: string | null;
  loadProjects: (options?: { force?: boolean }) => Promise<Project[]>;
  createProject: (payload: { name: string; description: string | null }) => Promise<Project>;

  messagesByProjectId: Record<number, ConversationMessage[] | undefined>;
  isMessagesLoadingByProjectId: Record<number, boolean | undefined>;
  messagesErrorByProjectId: Record<number, string | null | undefined>;
  loadMessages: (projectId: number, options?: { force?: boolean }) => Promise<ConversationMessage[]>;

  setMessages: (projectId: number, messages: ConversationMessage[]) => void;
  appendMessages: (projectId: number, messages: ConversationMessage[]) => void;
  upsertMessage: (projectId: number, message: ConversationMessage) => void;
  appendAssistantDelta: (projectId: number, delta: string) => void;
  clearAll: () => void;
};

const ProjectsDataContext = createContext<ProjectsDataContextValue | null>(null);

export function ProjectsDataProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [isProjectsLoading, setIsProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const hasLoadedProjectsRef = useRef(false);

  const [messagesByProjectId, setMessagesByProjectId] = useState<
    Record<number, ConversationMessage[] | undefined>
  >({});
  const [isMessagesLoadingByProjectId, setIsMessagesLoadingByProjectId] = useState<
    Record<number, boolean | undefined>
  >({});
  const [messagesErrorByProjectId, setMessagesErrorByProjectId] = useState<
    Record<number, string | null | undefined>
  >({});

  const loadProjects = useCallback(
    async (options?: { force?: boolean }) => {
      if (!token) return [];
      if (hasLoadedProjectsRef.current && !options?.force) return projects;

      setIsProjectsLoading(true);
      setProjectsError(null);
      try {
        const data = await apiRequest<Project[]>("/projects", { token });
        setProjects(data);
        hasLoadedProjectsRef.current = true;
        return data;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unable to load projects";
        setProjectsError(msg);
        throw new Error(msg);
      } finally {
        setIsProjectsLoading(false);
      }
    },
    [projects, token],
  );

  const createProject = useCallback(
    async (payload: { name: string; description: string | null }) => {
      if (!token) {
        throw new Error("Not authenticated");
      }

      const created = await apiRequest<Project>("/projects", {
        token,
        method: "POST",
        body: JSON.stringify(payload),
      });

      setProjects((prev) => [created, ...prev]);
      hasLoadedProjectsRef.current = true;
      return created;
    },
    [token],
  );

  const loadMessages = useCallback(
    async (projectId: number, options?: { force?: boolean }) => {
      if (!token) return [];
      if (messagesByProjectId[projectId] && !options?.force) {
        return messagesByProjectId[projectId] ?? [];
      }

      setIsMessagesLoadingByProjectId((prev) => ({ ...prev, [projectId]: true }));
      setMessagesErrorByProjectId((prev) => ({ ...prev, [projectId]: null }));
      try {
        const data = await apiRequest<ConversationMessage[]>(
          `/projects/${projectId}/messages`,
          { token },
        );
        setMessagesByProjectId((prev) => ({ ...prev, [projectId]: data }));
        return data;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unable to load messages";
        setMessagesErrorByProjectId((prev) => ({ ...prev, [projectId]: msg }));
        throw new Error(msg);
      } finally {
        setIsMessagesLoadingByProjectId((prev) => ({ ...prev, [projectId]: false }));
      }
    },
    [messagesByProjectId, token],
  );

  const setMessages = useCallback((projectId: number, messages: ConversationMessage[]) => {
    setMessagesByProjectId((prev) => ({ ...prev, [projectId]: messages }));
  }, []);

  const appendMessages = useCallback((projectId: number, messages: ConversationMessage[]) => {
    if (messages.length === 0) return;
    setMessagesByProjectId((prev) => {
      const existing = prev[projectId] ?? [];
      return { ...prev, [projectId]: [...existing, ...messages] };
    });
  }, []);

  const upsertMessage = useCallback((projectId: number, message: ConversationMessage) => {
    setMessagesByProjectId((prev) => {
      const existing = prev[projectId] ?? [];
      const idx = existing.findIndex((m) => m.id === message.id);
      if (idx === -1) return { ...prev, [projectId]: [...existing, message] };
      const next = [...existing];
      next[idx] = message;
      return { ...prev, [projectId]: next };
    });
  }, []);

  const appendAssistantDelta = useCallback((projectId: number, delta: string) => {
    if (!delta) return;
    setMessagesByProjectId((prev) => {
      const existing = prev[projectId] ?? [];
      if (existing.length === 0) return prev;
      const last = existing[existing.length - 1];
      if (!last || last.role !== "llm") return prev;
      const next = [...existing];
      next[next.length - 1] = { ...last, content: last.content + delta };
      return { ...prev, [projectId]: next };
    });
  }, []);

  const clearAll = useCallback(() => {
    setProjects([]);
    setProjectsError(null);
    setIsProjectsLoading(false);
    hasLoadedProjectsRef.current = false;
    setMessagesByProjectId({});
    setIsMessagesLoadingByProjectId({});
    setMessagesErrorByProjectId({});
  }, []);

  const value = useMemo<ProjectsDataContextValue>(
    () => ({
      projects,
      isProjectsLoading,
      projectsError,
      loadProjects,
      createProject,
      messagesByProjectId,
      isMessagesLoadingByProjectId,
      messagesErrorByProjectId,
      loadMessages,
      setMessages,
      appendMessages,
      upsertMessage,
      appendAssistantDelta,
      clearAll,
    }),
    [
      appendAssistantDelta,
      appendMessages,
      clearAll,
      createProject,
      isMessagesLoadingByProjectId,
      isProjectsLoading,
      loadMessages,
      messagesByProjectId,
      messagesErrorByProjectId,
      loadProjects,
      projects,
      projectsError,
      setMessages,
      upsertMessage,
    ],
  );

  return <ProjectsDataContext.Provider value={value}>{children}</ProjectsDataContext.Provider>;
}

export function useProjectsData() {
  const ctx = useContext(ProjectsDataContext);
  if (!ctx) {
    throw new Error("useProjectsData must be used within ProjectsDataProvider");
  }
  return ctx;
}

