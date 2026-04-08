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

export type ProjectDataStatus = {
  project_id: number;
  has_uploaded_data: boolean;
  supported_file_types: string[];
  uploads: ProjectUpload[];
};

export type UploadProjectFileResponse = {
  message: string;
  chunk_count: number;
  embedding_count: number;
  sparse_embedding_count: number;
  stored_count: number;
};

export type UploadProjectSourcePayload =
  | { type: "file"; file: File }
  | { type: "youtube"; url: string }
  | { type: "website"; url: string };

export type ProjectUpload = {
  id: number;
  project_id: number;
  source_type: string;
  file_name: string | null;
  file_type: string | null;
  content_type: string | null;
  created_at: string;
};

type ProjectsDataContextValue = {
  projects: Project[];
  isProjectsLoading: boolean;
  projectsError: string | null;
  loadProjects: (options?: { force?: boolean }) => Promise<Project[]>;
  createProject: (payload: { name: string; description: string | null }) => Promise<Project>;

  projectDataStatusByProjectId: Record<number, ProjectDataStatus | undefined>;
  isProjectDataStatusLoadingByProjectId: Record<number, boolean | undefined>;
  loadProjectDataStatus: (
    projectId: number,
    options?: { force?: boolean },
  ) => Promise<ProjectDataStatus | null>;
  uploadProjectSource: (
    projectId: number,
    payload: UploadProjectSourcePayload,
  ) => Promise<UploadProjectFileResponse>;

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
  const [projectDataStatusByProjectId, setProjectDataStatusByProjectId] =
    useState<Record<number, ProjectDataStatus | undefined>>({});
  const [isProjectDataStatusLoadingByProjectId, setIsProjectDataStatusLoadingByProjectId] =
    useState<Record<number, boolean | undefined>>({});

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

  const loadProjectDataStatus = useCallback(
    async (projectId: number, options?: { force?: boolean }) => {
      if (!token) return null;
      if (projectDataStatusByProjectId[projectId] && !options?.force) {
        return projectDataStatusByProjectId[projectId] ?? null;
      }

      setIsProjectDataStatusLoadingByProjectId((prev) => ({
        ...prev,
        [projectId]: true,
      }));

      try {
        const data = await apiRequest<ProjectDataStatus>(
          `/projects/${projectId}/data-status`,
          { token },
        );
        setProjectDataStatusByProjectId((prev) => ({ ...prev, [projectId]: data }));
        return data;
      } finally {
        setIsProjectDataStatusLoadingByProjectId((prev) => ({
          ...prev,
          [projectId]: false,
        }));
      }
    },
    [projectDataStatusByProjectId, token],
  );

  const uploadProjectSource = useCallback(
    async (projectId: number, payload: UploadProjectSourcePayload) => {
      if (!token) {
        throw new Error("Not authenticated");
      }

      const body = new FormData();
      if (payload.type === "file") {
        body.append("file", payload.file);
      } else if (payload.type === "youtube") {
        body.append("youtube_url", payload.url);
      } else {
        body.append("website_url", payload.url);
      }

      const uploaded = await apiRequest<UploadProjectFileResponse>(
        `/projects/${projectId}/upload-data`,
        {
          token,
          method: "POST",
          body,
        },
      );

      setProjectDataStatusByProjectId((prev) => {
        const existing = prev[projectId];
        return {
          ...prev,
          [projectId]: {
            project_id: projectId,
            has_uploaded_data: true,
            supported_file_types: existing?.supported_file_types ?? [],
            uploads: existing?.uploads ?? [],
          },
        };
      });

      return uploaded;
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
    setProjectDataStatusByProjectId({});
    setIsProjectDataStatusLoadingByProjectId({});
  }, []);

  const value = useMemo<ProjectsDataContextValue>(
    () => ({
      projects,
      isProjectsLoading,
      projectsError,
      loadProjects,
      createProject,
      projectDataStatusByProjectId,
      isProjectDataStatusLoadingByProjectId,
      loadProjectDataStatus,
      uploadProjectSource,
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
      isProjectDataStatusLoadingByProjectId,
      isMessagesLoadingByProjectId,
      isProjectsLoading,
      loadProjectDataStatus,
      loadMessages,
      messagesByProjectId,
      messagesErrorByProjectId,
      loadProjects,
      projectDataStatusByProjectId,
      projects,
      projectsError,
      setMessages,
      uploadProjectSource,
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
