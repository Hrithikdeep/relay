import { CreateWorkspaceButton } from "./CreateWorkspaceButton";
import { GithubIcon } from "./GithubIcon";
import { PRIMARY_BUTTON, REPO_URL, SECONDARY_BUTTON } from "./links";

export function FinalCta() {
  return (
    <section className="border-b border-(--l-border)">
      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center sm:px-6">
        <h2 className="text-3xl font-semibold leading-tight tracking-tight text-(--l-text) sm:text-4xl">
          Your next failed job could come back explained.
        </h2>
        <p className="mt-4 max-w-xl text-base text-(--l-muted)">
          Create an isolated workspace in seconds — or clone the repo and run it yourself.
        </p>
        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <CreateWorkspaceButton className={PRIMARY_BUTTON}>
            Create your workspace
          </CreateWorkspaceButton>
          <a href={REPO_URL} target="_blank" rel="noreferrer" className={SECONDARY_BUTTON}>
            <GithubIcon className="h-4 w-4" />
            View on GitHub
          </a>
        </div>
        <p className="mt-6 font-mono text-[11px] text-(--l-muted)">
          free during beta · no billing system, so no pricing table · your workspace, your data
        </p>
      </div>
    </section>
  );
}

export default FinalCta;
