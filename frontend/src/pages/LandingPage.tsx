import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <main>
      <section className="mx-auto flex min-h-[calc(100vh-92px)] max-w-7xl items-center px-5 py-16 sm:px-8 lg:py-24">
        <div className="grid w-full gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="flex flex-col justify-center gap-7">
            <p className="section-kicker">Ask Vault</p>
            <div className="space-y-5">
              <h1 className="display-face max-w-4xl text-[2.8rem] leading-[0.95] sm:text-[3.5rem] lg:text-[4.25rem]">
                Chat with your data.
              </h1>
              <p className="max-w-xl text-[0.98rem] leading-7 muted-copy sm:text-[1.05rem]">
                Create a project, upload your files, and ask questions.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link className="primary-button px-5 py-3 text-[0.68rem]" to="/signup">
                Create Account
              </Link>
              <Link className="secondary-button px-5 py-3 text-[0.68rem]" to="/login">
                Log In
              </Link>
            </div>
          </div>

          <div className="glass-panel flex flex-col justify-between rounded-[1.75rem] p-6 sm:p-7">
            <div>
              <p className="section-kicker">Overview</p>
              <p className="display-face mt-3 text-[1.9rem] leading-tight sm:text-[2.3rem]">
                One place for each project.
              </p>
            </div>
            <div className="space-y-3 pt-8">
              <div className="rounded-[1.2rem] border p-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-soft)" }}>
                <p className="text-[0.68rem] uppercase tracking-[0.18em] muted-copy">Projects</p>
                <p className="mt-2 text-[0.95rem]">Keep work separate.</p>
              </div>
              <div className="rounded-[1.2rem] border p-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-soft)" }}>
                <p className="text-[0.68rem] uppercase tracking-[0.18em] muted-copy">Uploads</p>
                <p className="mt-2 text-[0.95rem]">Add your sources.</p>
              </div>
              <div className="rounded-[1.2rem] border p-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-soft)" }}>
                <p className="text-[0.68rem] uppercase tracking-[0.18em] muted-copy">Chat</p>
                <p className="mt-2 text-[0.95rem]">Ask what you need.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
