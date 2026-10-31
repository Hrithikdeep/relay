import { CreateWorkspaceButton } from "./CreateWorkspaceButton";
import { GithubIcon } from "./GithubIcon";
import { SectionLabel, SectionTitle } from "./SectionHeading";
import { PRIMARY_BUTTON, REPO_URL, SECONDARY_BUTTON } from "./links";

const CARDS = [
  { title: "One public repo", body: "The backend, the dashboard and the TypeScript SDK all live on GitHub." },
  { title: "No lock-in", body: "A REST API on top of Postgres — self-host it, or migrate off it." },
  { title: "Free during beta", body: "There's no billing system yet, so there's no pricing page." },
  { title: "Honest by default", body: "No logo wall, no testimonials, no made-up uptime numbers." },
];

export function OpenSourceSection() {
  return (
    <section id="open-source" className="scroll-mt-20 border-b border-(--l-border)">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-4 py-20 sm:py-24 sm:px-6 lg:grid-cols-2">
        <div>
          <SectionLabel>open source · no lock-in</SectionLabel>
          <SectionTitle>Built by one engineer, in the open.</SectionTitle>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-(--l-muted)">
            Relay doesn&apos;t have a customer logo wall — it has a public repository. It&apos;s a solo-built,
            early-stage project: every commit, every issue, and the whole roadmap are on GitHub. If it disappears
            tomorrow, you still have the code.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href={REPO_URL} target="_blank" rel="noreferrer" className={PRIMARY_BUTTON}>
              <GithubIcon className="h-4 w-4" />
              Read the code
            </a>
            <CreateWorkspaceButton className={SECONDARY_BUTTON}>
              Try the live beta
            </CreateWorkspaceButton>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CARDS.map((card) => (
            <div key={card.title} className="rounded-xl border border-(--l-border) bg-(--l-surface) p-5">
              <h3 className="text-sm font-semibold text-(--l-text)">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-(--l-muted)">{card.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default OpenSourceSection;
