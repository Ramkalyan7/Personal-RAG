import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";

import { streamSse } from "../lib/sse";
import { useAuth } from "../providers/AuthProvider";
import {
  useProjectsData,
  type ConversationMessage,
} from "../providers/ProjectsDataProvider";

type StreamEventPayload =
  | { id: string; delta?: string }
  | { id: string; message?: string };

export function ChatPage() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId?: string }>();
  const { token } = useAuth();

  const {
    projects,
    isProjectsLoading,
    projectsError,
    loadProjects,
    createProject,
    messagesByProjectId,
    isMessagesLoadingByProjectId,
    messagesErrorByProjectId,
    loadMessages,
    appendMessages,
    appendAssistantDelta,
  } = useProjectsData();

  const selectedProjectId = useMemo(() => {
    const parsed = Number(projectId);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [projectId]);

  const selectedProject = useMemo(() => {
    if (selectedProjectId == null) return null;
    return projects.find((project) => project.id === selectedProjectId) ?? null;
  }, [projects, selectedProjectId]);

  const messages =
    selectedProjectId != null
      ? (messagesByProjectId[selectedProjectId] ?? [])
      : [];
  const messagesError =
    selectedProjectId != null
      ? (messagesErrorByProjectId[selectedProjectId] ?? null)
      : null;
  const isMessagesLoading =
    selectedProjectId != null
      ? Boolean(isMessagesLoadingByProjectId[selectedProjectId])
      : false;

  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (isProjectsLoading) return;
    if (projectsError) return;
    if (projects.length === 0) {
      navigate("/projects", { replace: true, state: { openCreate: true } });
    }
  }, [isProjectsLoading, navigate, projects.length, projectsError]);

  useEffect(() => {
    if (isProjectsLoading) return;
    if (selectedProjectId == null) {
      navigate("/projects", { replace: true });
      return;
    }
  }, [isProjectsLoading, navigate, projects, selectedProjectId]);

  useEffect(() => {
    if (selectedProjectId != null) {
      void loadMessages(selectedProjectId);
    }
  }, [selectedProjectId, token]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  const showHero =
    selectedProjectId != null &&
    !isMessagesLoading &&
    !messagesError &&
    messages.length === 0;

  async function sendMessage() {
    if (!token || selectedProjectId == null) return;

    const question = draft.trim();
    if (!question) return;

    setSendError(null);
    setDraft("");
    setIsStreaming(true);

    abortRef.current?.abort();
    const abortController = new AbortController();
    abortRef.current = abortController;

    const now = new Date().toISOString();
    const optimisticUser: ConversationMessage = {
      id: Date.now(),
      project_id: selectedProjectId,
      role: "user",
      content: question,
      created_at: now,
    };

    const optimisticAssistant: ConversationMessage = {
      id: Date.now() + 1,
      project_id: selectedProjectId,
      role: "llm",
      content: "",
      created_at: now,
    };

    appendMessages(selectedProjectId, [optimisticUser, optimisticAssistant]);

    const baseUrl =
      import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
      "http://localhost:8000";

    try {
      await streamSse({
        url: `${baseUrl}/projects/${selectedProjectId}/query/stream`,
        token,
        body: { question },
        signal: abortController.signal,
        onEvent: ({ event, data }) => {
          let payload: StreamEventPayload | null = null;
          try {
            payload = JSON.parse(data) as StreamEventPayload;
          } catch {
            payload = null;
          }

          if (event === "message_delta") {
            const delta = (payload as { delta?: string } | null)?.delta ?? "";
            if (!delta) return;
            appendAssistantDelta(selectedProjectId, delta);
            return;
          }

          if (event === "error") {
            const message =
              (payload as { message?: string } | null)?.message ??
              "Streaming failed";
            setSendError(message);
            abortController.abort();
          }
        },
      });

      await loadMessages(selectedProjectId, { force: true });
    } catch (error) {
      setSendError(
        error instanceof Error ? error.message : "Unable to send message",
      );
    } finally {
      setIsStreaming(false);
    }
  }

  async function handleCreateProject() {
    setCreateError(null);
    setIsCreating(true);
    try {
      const created = await createProject({
        name: createName.trim(),
        description: createDescription.trim() ? createDescription.trim() : null,
      });
      setIsCreateOpen(false);
      setCreateName("");
      setCreateDescription("");
      navigate(`/chat/${created.id}`);
    } catch (e) {
      setCreateError(
        e instanceof Error ? e.message : "Unable to create project",
      );
    } finally {
      setIsCreating(false);
    }
  }

  if (!token) {
    return <Navigate replace to="/login" />;
  }

  return (
    <main className="min-h-screen">
      <section className="grid min-h-screen grid-cols-1 md:grid-cols-[320px_1fr]">
        <aside
          className="scroll-area hidden h-screen overflow-y-auto p-6 md:block"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--surface) 65%, transparent), transparent 120%), var(--bg)",
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="section-kicker">Chat</p>
              <h1 className="display-face mt-3 text-[1.4rem] leading-none">
                Projects
              </h1>
            </div>
          </div>

          <div className="mt-5">
            <button
              className="primary-button w-full justify-center"
              onClick={() => {
                setCreateError(null);
                setIsCreateOpen(true);
              }}
              type="button"
            >
              Create{" "}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="inline"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>

          {isProjectsLoading ? (
            <div className="mt-6 space-y-3">
              <div className="loading-bar rounded-full" />
              <div className="skeleton h-4 w-[70%]" />
              <div className="skeleton h-4 w-[62%]" />
              <div className="skeleton h-4 w-[78%]" />
            </div>
          ) : projectsError ? (
            <p
              className="mt-6 rounded-2xl border px-4 py-3 text-sm"
              style={{ borderColor: "#8b2b2b", color: "#ffb8b8" }}
            >
              {projectsError}
            </p>
          ) : projects.length === 0 ? (
            <div className="card mt-6 rounded-[1.9rem] p-5">
              <p className="text-sm muted-copy">No projects yet.</p>
              <Link
                className="mt-4 inline-flex underline underline-offset-4"
                to="/projects"
              >
                Create one
              </Link>
            </div>
          ) : (
            <div className="mt-6 space-y-2">
              {projects.map((project) => {
                const isActive = selectedProjectId === project.id;
                return (
                  <Link
                    className="block rounded-2xl px-4 py-3 transition hover:-translate-y-px hover:shadow-[0_18px_50px_rgba(0,0,0,0.25)]"
                    key={project.id}
                    style={{
                      background: isActive
                        ? "linear-gradient(180deg, color-mix(in srgb, var(--surface-strong) 92%, transparent), transparent 160%), var(--bg-soft)"
                        : "linear-gradient(180deg, color-mix(in srgb, var(--surface) 80%, transparent), transparent 160%), var(--bg-soft)",
                      boxShadow: isActive
                        ? "0 18px 60px rgba(0,0,0,0.28)"
                        : undefined,
                    }}
                    to={`/chat/${project.id}`}
                  >
                    <p className="line-clamp-1 font-semibold leading-snug">
                      {project.name}
                    </p>
                    <p
                      className="mt-1 text-[0.7rem] line-clamp-2 leading-snug"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {project.description || "No description"}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </aside>

        <section className="flex min-h-0 flex-col">
          <div className="px-6 py-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {selectedProjectId == null
                  ? "Select a project to chat."
                  : selectedProject
                    ? selectedProject.name
                    : `Project #${selectedProjectId}`}
              </p>
              {selectedProjectId != null && (
                <span className="tag w-fit">
                  {isStreaming ? "Streaming" : "Ready"}
                </span>
              )}
            </div>
          </div>

          <div
            className="scroll-area flex-1 overflow-y-auto px-6 py-2"
            ref={transcriptRef}
            style={{
              background:
                "linear-gradient(180deg, color-mix(in srgb, var(--surface) 55%, transparent), transparent 30%)",
            }}
          >
            {selectedProjectId == null ? (
              <div className="card rounded-[2.1rem] p-7">
                <p className="display-face text-[1.3rem]">
                  Pick a project to chat.
                </p>
                <p className="mt-3 text-xs muted-copy">
                  Your full history is saved per project. Ask anything and watch
                  the answer stream in.
                </p>
              </div>
            ) : isMessagesLoading ? (
              <div className="mx-auto w-full max-w-3xl space-y-4 py-10">
                <div className="loading-bar rounded-full" />
                <div className="skeleton h-5 w-[55%]" />
                <div className="skeleton h-4 w-[85%]" />
                <div className="skeleton h-4 w-[76%]" />
              </div>
            ) : messagesError ? (
              <p
                className="rounded-2xl px-4 py-3 text-sm"
                style={{
                  backgroundColor: "rgba(139, 43, 43, 0.16)",
                  color: "#ffb8b8",
                }}
              >
                {messagesError}
              </p>
            ) : messages.length === 0 ? null : (
              <div className="mx-auto w-full max-w-3xl space-y-5 pb-8 pt-4">
                {messages.map((message) => {
                  const isUser = message.role === "user";
                  return (
                    <div
                      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                      key={message.id}
                    >
                      <div
                        className="rounded-[1.6rem] px-5 py-4 shadow-[0_22px_70px_rgba(0,0,0,0.26)]"
                        style={{
                          maxWidth: "92%",
                          background: isUser
                            ? "linear-gradient(180deg, color-mix(in srgb, var(--surface-strong) 92%, transparent), transparent 170%), color-mix(in srgb, var(--bg-soft) 55%, transparent)"
                            : "linear-gradient(180deg, color-mix(in srgb, var(--surface) 80%, transparent), transparent 170%), var(--bg-soft)",
                        }}
                      >
                        <p
                          className="text-[0.7rem] uppercase tracking-[0.22em]"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {isUser ? "You" : "Assistant"}
                        </p>
                        <p className="mt-3 whitespace-pre-wrap text-[0.9rem] leading-6">
                          {message.content || (!isUser ? "…" : "")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div
            className="px-6 py-5"
            style={{
              background:
                "linear-gradient(180deg, transparent, color-mix(in srgb, var(--bg) 75%, transparent) 35%, var(--bg) 100%)",
            }}
          >
            {sendError ? (
              <p
                className="mb-4 rounded-2xl px-4 py-3 text-sm"
                style={{
                  backgroundColor: "rgba(139, 43, 43, 0.16)",
                  color: "#ffb8b8",
                }}
              >
                {sendError}
              </p>
            ) : null}

            <div className="mx-auto w-full max-w-3xl">
              {showHero ? (
                <div className="flex min-h-[42vh] flex-col items-center justify-center pb-8">
                  <h2 className="display-face text-center text-[1.5rem] leading-tight sm:text-[1.7rem]">
                    How can I help
                    {selectedProject ? `, ${selectedProject.name}` : ""}?
                  </h2>
                </div>
              ) : null}

              <div className="chat-input-shell flex items-center gap-2 rounded-[999px] px-3 py-2">
                <button
                  aria-label="New message"
                  className="icon-button"
                  disabled={selectedProjectId == null}
                  type="button"
                >
                  <span aria-hidden="true">+</span>
                </button>

                <label className="sr-only" htmlFor="chat-draft">
                  Message
                </label>
                <input
                  className="w-full bg-transparent px-2 py-2 text-[0.9rem] outline-none"
                  disabled={isStreaming || selectedProjectId == null}
                  id="chat-draft"
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={
                    selectedProjectId == null
                      ? "Select a project first"
                      : "Ask anything"
                  }
                  value={draft}
                />

                <button
                  aria-label={
                    isStreaming ? "Streaming response" : "Send message"
                  }
                  className="icon-button"
                  disabled={
                    isStreaming || selectedProjectId == null || !draft.trim()
                  }
                  onClick={() => void sendMessage()}
                  type="button"
                >
                  <span aria-hidden="true">{isStreaming ? "…" : "→"}</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </section>

      {isCreateOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center px-5"
          role="dialog"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        >
          <div
            className="w-full max-w-xl rounded-[1.8rem] p-6 sm:p-7"
            style={{
              background:
                "linear-gradient(180deg, color-mix(in srgb, var(--surface) 85%, transparent), transparent 160%), var(--bg-elevated)",
              boxShadow: "0 40px 120px rgba(0,0,0,0.6)",
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="section-kicker">New project</p>
                <p className="display-face mt-3 text-[1.3rem] leading-tight">
                  Create a project.
                </p>
              </div>
              <button
                className="icon-button"
                onClick={() => setIsCreateOpen(false)}
                type="button"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <div className="mt-6 space-y-5">
              <label className="field-shell">
                <span className="field-label">Name</span>
                <input
                  className="field-input w-full"
                  maxLength={255}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="My project"
                  required
                  value={createName}
                />
              </label>
              <label className="field-shell">
                <span className="field-label">Description (optional)</span>
                <input
                  className="field-input w-full"
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder="What is this project about?"
                  value={createDescription}
                />
              </label>

              {createError ? (
                <p
                  className="rounded-2xl px-4 py-3 text-sm"
                  style={{
                    backgroundColor: "rgba(139, 43, 43, 0.16)",
                    color: "#ffb8b8",
                  }}
                >
                  {createError}
                </p>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs muted-copy">
                  We’ll open chat right after creation.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    className="secondary-button"
                    onClick={() => setIsCreateOpen(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="primary-button"
                    disabled={isCreating || !createName.trim()}
                    onClick={() => void handleCreateProject()}
                    type="button"
                  >
                    {isCreating ? "Creating..." : "Create"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
