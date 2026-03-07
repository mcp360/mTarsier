import {
  LayoutDashboard,
  Monitor,
  Settings2,
  ClipboardList,
  Store,
  SlidersHorizontal,
  Info,
} from "lucide-react";
import mtarsierLogo from "../assets/mtarsier-logo.png";
import NavItem from "./NavItem";
import SystemStatus from "./SystemStatus";

const mainNav = [
  { to: "/", label: "Overview", icon: <LayoutDashboard size={16} /> },
  { to: "/clients", label: "Clients", icon: <Monitor size={16} /> },
  { to: "/config", label: "Config", icon: <Settings2 size={16} /> },
];

const toolsNav = [
  { to: "/audit", label: "Audit Logs", icon: <ClipboardList size={16} /> },
  { to: "/marketplace", label: "Marketplace", icon: <Store size={16} /> },
];

const bottomNav = [
  { to: "/settings", label: "Settings", icon: <SlidersHorizontal size={16} /> },
  { to: "/about", label: "About", icon: <Info size={16} /> },
];

function NavSection({ label, items }: { label: string; items: typeof mainNav }) {
  return (
    <div>
      <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted/50">
        {label}
      </p>
      <div className="space-y-0.5">
        {items.map((item) => (
          <NavItem key={item.to} to={item.to} label={item.label} icon={item.icon} />
        ))}
      </div>
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="flex h-full w-56 flex-col border-r border-border bg-surface">
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
        <img src={mtarsierLogo} alt="mTarsier" className="h-7 w-auto object-contain" />
        <div className="flex items-baseline">
          <span className="text-sm font-bold text-primary">m</span>
          <span className="text-sm font-bold text-text">Tarsier</span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-4">
        <NavSection label="Main" items={mainNav} />
        <NavSection label="Tools" items={toolsNav} />
        <div className="flex-1" />
        <div className="space-y-0.5">
          {bottomNav.map((item) => (
            <NavItem key={item.to} to={item.to} label={item.label} icon={item.icon} />
          ))}
        </div>
      </nav>

      <SystemStatus />
    </aside>
  );
}

export default Sidebar;
