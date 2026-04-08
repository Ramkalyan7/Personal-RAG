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

const FALLBACK_SUPPORTED_FILE_TYPES = [
  ".pdf",
  ".txt",
  ".md",
  ".csv",
  ".json",
  ".mp3",
  ".wav",
  ".m4a",
  ".aac",
  ".ogg",
  ".flac",
];

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
    projectDataStatusByProjectId,
    isProjectDataStatusLoadingByProjectId,
    loadProjectDataStatus,
    uploadProjectFile,
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

  const projectDataStatus =
    selectedProjectId != null
      ? (projectDataStatusByProjectId[selectedProjectId] ?? null)
      : null;
  const isProjectDataStatusLoading =
    selectedProjectId != null
      ? Boolean(isProjectDataStatusLoadingByProjectId[selectedProjectId])
      : false;
  const hasUploadedData = Boolean(projectDataStatus?.has_uploaded_data);
  const uploads = projectDataStatus?.uploads ?? [];
  const supportedFileTypes =
    projectDataStatus?.supported_file_types?.length
      ? projectDataStatus.supported_file_types
      : FALLBACK_SUPPORTED_FILE_TYPES;

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
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
    }
  }, [isProjectsLoading, navigate, selectedProjectId]);

  useEffect(() => {
    if (selectedProjectId != null) {
      void loadMessages(selectedProjectId);
      void loadProjectDataStatus(selectedProjectId);
    }
  }, [loadMessages, loadProjectDataStatus, selectedProjectId, token]);

  useEffect(() => {
    setSendError(null);
    setUploadError(null);
    setUploadNotice(null);
    setDraft("");
  }, [selectedProjectId]);

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

    if (!hasUploadedData) {
      setSendError(
        "Upload at least one supported document before sending messages.",
      );
      return;
    }

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

  async function handleFileSelected(file: File | null) {
    if (!file || selectedProjectId == null) return;

    setUploadError(null);
    setUploadNotice(null);
    setIsUploading(true);

    try {
      const result = await uploadProjectFile(selectedProjectId, file);
      await loadProjectDataStatus(selectedProjectId, { force: true });
      setUploadNotice(
        `${file.name} uploaded successfully. ${result.stored_count} chunks are ready to query.`,
      );
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Unable to upload file",
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  if (!token) {
    return <Navigate replace to="/login" />;
  }

  return (
    <main className="min-h-screen">
      <section className="grid min-h-screen grid-cols-1 md:grid-cols-[272px_1fr]">
        <aside
          className="scroll-area hidden h-screen overflow-y-auto border-r px-4 py-5 md:block"
          style={{
            borderColor: "var(--border)",
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--surface) 65%, transparent), transparent 120%), var(--bg)",
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="section-kicker">Chat</p>
              <h1 className="display-face mt-2 text-[1.2rem] leading-none">
                Projects
              </h1>
            </div>
          </div>

          <div className="mt-4">
            <button
              className="primary-button create-project-btn w-full justify-center px-4 py-2.5 text-[0.62rem]"
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
            <div className="mt-5 space-y-1.5">
              {projects.map((project) => {
                const isActive = selectedProjectId === project.id;
                return (
                  <Link
                    className="block rounded-[1.15rem] px-3 py-2.5 transition hover:-translate-y-px hover:shadow-[0_18px_50px_rgba(0,0,0,0.25)]"
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
                    <p className="line-clamp-1 text-[0.87rem] font-semibold leading-snug">
                      {project.name}
                    </p>
                    <p
                      className="mt-1 text-[0.66rem] line-clamp-2 leading-snug"
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
          <div
            className="scroll-area flex-1 overflow-y-auto px-6 py-6"
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
                  Upload documents first, then ask questions grounded in those
                  files.
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
                          {message.content || (!isUser ? "..." : "")}
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
                className="mx-auto mb-4 w-full max-w-3xl rounded-2xl px-4 py-3 text-sm"
                style={{
                  backgroundColor: "rgba(139, 43, 43, 0.16)",
                  color: "#ffb8b8",
                }}
              >
                {sendError}
              </p>
            ) : null}

            {uploadError ? (
              <p
                className="mx-auto mb-4 w-full max-w-3xl rounded-2xl px-4 py-3 text-sm"
                style={{
                  backgroundColor: "rgba(139, 43, 43, 0.16)",
                  color: "#ffb8b8",
                }}
              >
                {uploadError}
              </p>
            ) : null}

            {uploadNotice ? (
              <p
                className="mx-auto mb-4 w-full max-w-3xl rounded-2xl px-4 py-3 text-sm"
                style={{
                  backgroundColor: "rgba(34, 197, 94, 0.12)",
                  color: "#b7f7c3",
                }}
              >
                {uploadNotice}
              </p>
            ) : null}

            <div className="mx-auto w-full max-w-3xl">
              {selectedProjectId != null ? (
                <div
                  className="mb-4 rounded-[1.4rem] border px-4 py-4"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[0.68rem] uppercase tracking-[0.18em] muted-copy">
                        Uploaded Files
                      </p>
                      <p className="mt-1 text-xs muted-copy">
                        {uploads.length > 0
                          ? `${uploads.length} upload${uploads.length === 1 ? "" : "s"} available in this project`
                          : "No uploads yet"}
                      </p>
                    </div>
                    {uploads.length > 0 ? (
                      <span className="tag">{uploads.length}</span>
                    ) : null}
                  </div>

                  {uploads.length > 0 ? (
                    <div className="mt-4 space-y-2">
                      {uploads.map((upload) => (
                        <div
                          className="rounded-[1rem] px-3 py-2"
                          key={upload.id}
                          style={{
                            background:
                              "linear-gradient(180deg, color-mix(in srgb, var(--surface) 75%, transparent), transparent 170%), var(--bg-soft)",
                          }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="line-clamp-1 text-sm font-medium">
                              {upload.file_name || "Untitled upload"}
                            </p>
                            <span className="text-[0.65rem] uppercase tracking-[0.16em] muted-copy">
                              {upload.file_type || upload.source_type}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm muted-copy">
                      Upload a supported file and it will appear here.
                    </p>
                  )}
                </div>
              ) : null}

              {showHero ? (
                <div className="pb-8">
                  <div className="card rounded-[2rem] p-6 sm:p-7">
                    <h2 className="display-face text-[1.45rem] leading-tight sm:text-[1.7rem]">
                      {hasUploadedData
                        ? "Ask about your uploaded documents."
                        : "Upload a document to start chatting."}
                    </h2>
                    <p className="mt-3 text-sm leading-6 muted-copy">
                      Tip: upload PDFs, text or markdown files, CSV/JSON data,
                      or audio files like MP3 and WAV. Once a project has at
                      least one upload, your messages will be processed against
                      that project data only.
                    </p>
                    <p className="mt-3 text-xs leading-6 muted-copy">
                      Accepted file types: {supportedFileTypes.join(", ")}
                    </p>
                  </div>
                </div>
              ) : null}

              <input
                accept={supportedFileTypes.join(",")}
                className="sr-only"
                onChange={(e) => void handleFileSelected(e.target.files?.[0] ?? null)}
                ref={fileInputRef}
                type="file"
              />

              <div className="mb-3 flex items-center justify-between gap-3 text-xs muted-copy">
                <span>
                  {isProjectDataStatusLoading
                    ? "Checking uploaded data..."
                    : hasUploadedData
                      ? "Project has uploaded data and is ready for chat."
                      : "No uploaded data yet. Upload a supported file before sending a message."}
                </span>
                <button
                  className="secondary-button px-4 py-2.5 text-[0.62rem]"
                  disabled={selectedProjectId == null || isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >
                  {isUploading ? "Uploading..." : "Upload file"}
                </button>
              </div>

              <div className="chat-input-shell flex items-center gap-2 rounded-[999px] px-3 py-2">
                <button
                  aria-label="Upload file"
                  className="icon-button"
                  disabled={selectedProjectId == null || isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >
                  <span aria-hidden="true">+</span>
                </button>

                <label className="sr-only" htmlFor="chat-draft">
                  Message
                </label>
                <input
                  className="w-full bg-transparent px-2 py-2 text-[0.9rem] outline-none"
                  disabled={
                    isStreaming ||
                    selectedProjectId == null ||
                    !hasUploadedData ||
                    isUploading
                  }
                  id="chat-draft"
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={
                    selectedProjectId == null
                      ? "Select a project first"
                      : hasUploadedData
                        ? "Ask anything about your uploaded data"
                        : "Upload a supported file to enable chat"
                  }
                  value={draft}
                />

                <button
                  aria-label={
                    isStreaming ? "Streaming response" : "Send message"
                  }
                  className="icon-button"
                  disabled={
                    isStreaming ||
                    selectedProjectId == null ||
                    !hasUploadedData ||
                    !draft.trim()
                  }
                  onClick={() => void sendMessage()}
                  type="button"
                >
                  <span aria-hidden="true">{isStreaming ? "..." : "->"}</span>
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
                <span aria-hidden="true">x</span>
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

              <div className="flex items-center justify-end gap-2">
                <button
                  className="secondary-button"
                  onClick={() => setIsCreateOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="primary-button create-project-btn"
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
      ) : null}
    </main>
  );
}
