import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";
import { cn } from "../lib/utils";

interface NavItemProps {
  to: string;
  label: string;
  icon: ReactNode;
}

function NavItem({ to, label, icon }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        cn(
          "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-text-muted hover:bg-surface-hover hover:text-text"
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r bg-primary" />
          )}
          <span className="h-4 w-4 shrink-0">{icon}</span>
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
}

export default NavItem;
