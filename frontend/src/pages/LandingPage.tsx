import { ArrowRight, LogIn } from "lucide-react";
import { Link } from "react-router-dom";

import { PageFrame } from "../components/PageFrame";

export function LandingPage() {
  return (
    <PageFrame>
      <section className="landing-shell flex min-h-full items-center py-2">
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
                className="primary-button gap-2 px-5 py-3 text-[0.68rem]"
                to="/signup"
              >
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
                Create Account
              </Link>
              <Link
                className="secondary-button gap-2 px-5 py-3 text-[0.68rem]"
                to="/login"
              >
                <LogIn className="h-4 w-4" strokeWidth={2} />
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
    </PageFrame>
  );
}
