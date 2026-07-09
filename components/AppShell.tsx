import type { ReactNode } from "react";
import BodyClass from "./BodyClass";
import Nav from "./Nav";
import Footer from "./Footer";
import PageReveal from "./PageReveal";

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
  current?: "index" | "work" | "about" | "registration";
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
 */
export default function AppShell({
  children,
  bodyClass = "",
  current = "index",
  appClass = "app",
  scrollDirection,
  intro = "fade",
  withNav = true,
  withFooter = true,
}: AppShellProps) {
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
        {withNav && <Nav current={current} />}
        <Grid />
        {children}
        {withFooter && <Footer />}
      </main>
      <PageReveal />
    </>
  );
}
