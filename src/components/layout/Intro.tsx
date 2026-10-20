import { site } from "@/content/site";
import { LogoMark } from "@/components/brand/Logo";

/**
 * Page-load intro: logo + progress bar. Pure CSS (see globals.css) so it never waits for
 * JavaScript, plays once per session and is never shown when reduced motion is requested.
 * Decorative only — the page underneath is already fully rendered.
 */
export function Intro() {
  return (
    <div className="intro" aria-hidden="true">
      <div className="flex flex-col items-center gap-6">
        <div className="intro__mark flex items-center gap-3 text-white">
          <LogoMark className="h-14 w-14" />
          <span className="font-display text-4xl font-bold tracking-tight">{site.name}</span>
        </div>
        <div className="h-1 w-48 overflow-hidden rounded-full bg-white/15">
          <div className="intro__bar h-full w-full rounded-full bg-gradient-to-r from-[#ffc27a] to-[#ff7a3d]" />
        </div>
      </div>
    </div>
  );
}
