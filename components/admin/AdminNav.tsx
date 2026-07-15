"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; group?: string };

export default function AdminNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  let lastGroup: string | undefined;

  return (
    <nav className="adm-nav" aria-label="Admin sections">
      {items.map((item) => {
        const groupLabel =
          item.group && item.group !== lastGroup ? (
            <div className="adm-nav-label" key={`g-${item.group}`}>
              {item.group}
            </div>
          ) : null;
        lastGroup = item.group ?? lastGroup;
        const active =
          item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <span key={item.href} style={{ display: "contents" }}>
            {groupLabel}
            <Link href={item.href} className={active ? "active" : undefined}>
              {item.label}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
