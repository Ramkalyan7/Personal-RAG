import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <main>
      <section className="landing-shell mx-auto flex min-h-[calc(100vh-92px)] max-w-7xl items-center px-5 py-14 sm:px-8 lg:py-20">
        <div className="w-full max-w-4xl">
          <div className="flex flex-col justify-center gap-7">
            <p className="section-kicker">Ask Vault</p>
            <div className="space-y-5">
              <h1 className="display-face max-w-4xl text-[2.35rem] leading-[0.95] sm:text-[3rem] lg:text-[4rem]">
                Chat with your data.
              </h1>
              <p className="max-w-xl text-[0.95rem] leading-7 muted-copy sm:text-[1rem]">
                Create focused knowledge spaces, upload your sources, and get
                answers that stay grounded in your own files.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                className="primary-button px-5 py-3 text-[0.68rem]"
                to="/signup"
              >
                Create Account
              </Link>
              <Link
                className="secondary-button px-5 py-3 text-[0.68rem]"
                to="/login"
              >
                Log In
              </Link>
            </div>
            <p className="landing-fineprint muted-copy pt-2">
              Private projects <span aria-hidden="true">&middot;</span> Fast
              retrieval <span aria-hidden="true">&middot;</span> Grounded answers
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
