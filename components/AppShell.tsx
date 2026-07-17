import type { ReactNode } from "react";
import BodyClass from "./BodyClass";
import Nav from "./Nav";
import Footer from "./Footer";
import PageReveal from "./PageReveal";
import { getGeneralSettings, getSection } from "@/lib/content/queries";

function Grid() {
  return (
    <div className="grid">
      {Array.from({ length: 16 }).map((_, i) => (
        <div key={i} className="grid-col" />
      ))}
    </div>
  );
}

type AppShellProps = {
  children: ReactNode;
  bodyClass?: string;
  current?: "index" | "work" | "about" | "registration" | "events" | "profile";
  appClass?: string;
  scrollDirection?: "horizontal" | "vertical";
  /** "spin" = the home scale/rotate reveal; "fade" = opacity fade used by inner pages */
  intro?: "spin" | "fade";
  /** render the default top nav (true) or leave chrome to the page (false) */
  withNav?: boolean;
  withFooter?: boolean;
};

/**
 * The shared page frame: sets the body class and renders the `#app`
 * smooth-scroll container with the paper background, nav, grid guides,
 * page content and footer - matching the original DOM order.
 * Social links / location come from admin-editable settings (with static
 * fallbacks), so the chrome stays correct without code changes.
 */
export default async function AppShell({
  children,
  bodyClass = "",
  current = "index",
  appClass = "app",
  scrollDirection,
  intro = "fade",
  withNav = true,
  withFooter = true,
}: AppShellProps) {
  const [settings, announcement] = await Promise.all([
    getGeneralSettings(),
    getSection("announcement"),
  ]);

  return (
    <>
      <BodyClass name={bodyClass} />
      <main
        id="app"
        data-scroll-container="null"
        data-scroll-direction={scrollDirection}
        data-intro={intro}
        data-w-id="a4f20c94-f77d-5612-6f88-8ba669c39129"
        className={appClass}
      >
        <div className="paper-background">
          <div className="paper-mode w-embed" />
        </div>
        {announcement.enabled && announcement.text && (
          <div className="site-banner" role="status">
            <span className="site-banner-dot" aria-hidden="true">✳&#xFE0E;</span>
            {announcement.text}
            {announcement.linkLabel && announcement.linkHref && (
              <a
                href={announcement.linkHref}
                className="site-banner-link"
                target={announcement.linkHref.startsWith("http") ? "_blank" : undefined}
                rel={announcement.linkHref.startsWith("http") ? "noopener noreferrer" : undefined}
              >
                {announcement.linkLabel} <span aria-hidden="true">↗&#xFE0E;</span>
              </a>
            )}
          </div>
        )}
        {withNav && (
          <Nav
            current={current}
            instagramUrl={settings.instagramUrl}
            linkedinUrl={settings.linkedinUrl}
            locationLabel={settings.locationLabel}
          />
        )}
        <Grid />
        {children}
        {withFooter && (
          <Footer
            instagramUrl={settings.instagramUrl}
            linkedinUrl={settings.linkedinUrl}
            contactEmail={settings.contactEmail}
          />
        )}
      </main>
      <PageReveal />
    </>
  );
}
