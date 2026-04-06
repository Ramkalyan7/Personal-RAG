import { useEffect, useState } from "react";

import { apiRequest } from "../lib/api";
import { useAuth } from "../providers/AuthProvider";

type Project = {
  id: number;
  name: string;
  description: string | null;
  owner_id: number;
  created_at: string;
  updated_at: string;
};

export function ProjectsPage() {
  const { token, user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      if (!token) {
        return;
      }

      try {
        const data = await apiRequest<Project[]>("/projects", { token });
        if (!cancelled) {
          setProjects(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load projects");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
      <section className="glass-panel rounded-[2.4rem] p-6 sm:p-8 lg:p-10">
        <div className="flex flex-col gap-5 border-b pb-8 sm:flex-row sm:items-end sm:justify-between" style={{ borderColor: "var(--border)" }}>
          <div>
            <p className="section-kicker">Workspace</p>
            <h1 className="display-face mt-3 text-[2.1rem] leading-none sm:text-[2.5rem]">Projects</h1>
            <p className="mt-3 text-[0.96rem] muted-copy">{user?.email}</p>
          </div>
          <div
            className="rounded-[1.5rem] border px-5 py-4 text-[0.72rem] uppercase tracking-[0.18em]"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-soft)" }}
          >
            {projects.length} project{projects.length === 1 ? "" : "s"}
          </div>
        </div>

        {isLoading ? (
          <p className="py-10 text-sm" style={{ color: "var(--text-muted)" }}>
            Loading projects...
          </p>
        ) : error ? (
          <p className="mt-6 rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: "#8b2b2b", color: "#ffb8b8" }}>
            {error}
          </p>
        ) : projects.length === 0 ? (
          <div className="mt-8 rounded-[1.9rem] border p-7" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-soft)" }}>
            <p className="display-face text-[1.9rem]">No projects yet.</p>
            <p className="mt-3 max-w-xl text-[0.95rem] leading-7 muted-copy">
              Create your first project.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <article
                className="rounded-[1.9rem] border p-6"
                key={project.id}
                style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-soft)" }}
              >
                <p className="text-[0.7rem] uppercase tracking-[0.22em] muted-copy">
                  Project #{project.id}
                </p>
                <h2 className="display-face mt-4 text-[1.35rem] leading-tight">{project.name}</h2>
                <p className="mt-4 text-[0.94rem] leading-7 muted-copy">
                  {project.description || "No description."}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
