import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { FolderOpen, MessageSquareText, Plus, X } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { PageFrame } from "../components/PageFrame";
import { useProjectsData } from "../providers/ProjectsDataProvider";

export function ProjectsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    projects,
    isProjectsLoading: isLoading,
    projectsError: error,
    loadProjects,
    createProject,
  } = useProjectsData();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const projectCountLabel = useMemo(() => {
    return `${projects.length} project${projects.length === 1 ? "" : "s"}`;
  }, [projects.length]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    const state = location.state as { openCreate?: boolean } | null;
    if (state?.openCreate) {
      setIsCreateOpen(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setCreateError(null);
    setIsCreating(true);

    try {
      const payload = {
        name: createName.trim(),
        description: createDescription.trim() ? createDescription.trim() : null,
      };

      const created = await createProject(payload);
      setIsCreateOpen(false);
      setCreateName("");
      setCreateDescription("");
      navigate(`/chat/${created.id}`);
    } catch (submitError) {
      setCreateError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to create project",
      );
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <PageFrame>
      <div className="mx-auto max-w-6xl">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-kicker">Workspace</p>
          <h1 className="display-face mt-3 text-[1.7rem] leading-none sm:text-[2.0rem]">
            Projects
          </h1>
          <p className="mt-4 max-w-2xl text-xs leading-6 muted-copy">
            Create a project and chat with your uploaded data.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="tag">{projectCountLabel}</span>
          <button
            className="primary-button create-project-btn gap-2"
            onClick={() => {
              setCreateError(null);
              setIsCreateOpen(true);
            }}
            type="button"
          >
            <Plus className="h-4 w-4" strokeWidth={2.2} />
            Create
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="mt-10 space-y-4">
          <div className="loading-bar rounded-full" />
          <div className="space-y-3">
            <div className="skeleton h-5 w-[45%]" />
            <div className="skeleton h-4 w-[70%]" />
            <div className="skeleton h-4 w-[62%]" />
          </div>
        </div>
      ) : error ? (
        <p
          className="mt-6 rounded-2xl px-4 py-3 text-sm"
          style={{
            backgroundColor: "rgba(139, 43, 43, 0.16)",
            color: "#ffb8b8",
          }}
        >
          {error}
        </p>
      ) : projects.length === 0 ? (
        <div className="mt-10">
          <div className="flex items-center gap-3">
            <span className="logo-mark" aria-hidden="true">
              <FolderOpen className="h-[1.05rem] w-[1.05rem]" strokeWidth={2} />
            </span>
            <p className="display-face text-[1.4rem]">No projects yet.</p>
          </div>
          <p className="mt-3 max-w-xl text-xs leading-6 muted-copy">
            Create your first project to open the chat.
          </p>
        </div>
      ) : (
        <div
          className="mt-10 overflow-hidden rounded-[1.4rem]"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--bg-soft) 62%, transparent)",
          }}
        >
          <div
            className="grid grid-cols-[1fr_auto] gap-3 px-5 py-4 text-xs uppercase tracking-[0.18em]"
            style={{ color: "var(--text-muted)" }}
          >
            <span>Name</span>
            <span>Action</span>
          </div>
          <div>
            {projects.map((project) => (
              <div
                className="grid grid-cols-[1fr_auto] items-center gap-3 px-5 py-4 transition"
                key={project.id}
                style={{
                  backgroundColor: "transparent",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor =
                    "color-mix(in srgb, var(--surface-strong) 55%, transparent)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor =
                    "transparent";
                }}
              >
                <div>
                  <p className="font-semibold">{project.name}</p>
                  <p className="mt-1 text-xs muted-copy">
                    {project.description || "No description."}
                  </p>
                </div>
                <Link className="secondary-button gap-2" to={`/chat/${project.id}`}>
                  <MessageSquareText className="h-4 w-4" strokeWidth={2} />
                  Open chat
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

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
                <X aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleCreateProject}>
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
                  disabled={isCreating}
                  type="submit"
                >
                  {isCreating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      </div>
    </PageFrame>
  );
}
