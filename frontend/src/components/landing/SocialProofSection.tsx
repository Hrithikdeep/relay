import { GithubIcon } from "./GithubIcon";
import { SectionLabel } from "./SectionHeading";
import { REPO_URL, SECONDARY_BUTTON } from "./links";

// An honest placeholder: Relay has no users yet, so there are deliberately no
// quotes, names, avatars, ratings or logos here.
export function SocialProofSection() {
  return (
    <section id="feedback" className="scroll-mt-20 border-b border-(--l-border)">
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-24">
        <div className="rounded-xl border border-dashed border-(--l-border-strong) bg-(--l-surface) p-6 text-center sm:p-10">
          <SectionLabel>reviews · none yet</SectionLabel>
          <h2 className="mt-3 text-2xl font-semibold leading-tight tracking-tight text-(--l-text) sm:text-3xl">
            No reviews yet — we just launched.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-(--l-muted)">
            Relay doesn&apos;t have customer testimonials because it doesn&apos;t have customers yet. This section
            will fill up with real feedback from real users. If you try it, we&apos;d genuinely like to hear what
            broke.
          </p>
          <div className="mt-6 flex justify-center">
            <a href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer" className={SECONDARY_BUTTON}>
              <GithubIcon className="h-4 w-4" />
              Tell us what broke
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default SocialProofSection;
