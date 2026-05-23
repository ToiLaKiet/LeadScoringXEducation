import { Link } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-5 py-3">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="grid place-items-center w-9 h-9 rounded-lg bg-primary text-primary-foreground shadow-sm">
            <GraduationCap className="w-5 h-5" />
          </span>
          <div className="leading-tight">
            <div className="font-display text-lg font-semibold">X Education</div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Lead Scoring Suite
            </div>
          </div>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            className="px-3 py-2 rounded-md hover:bg-muted transition"
            activeProps={{ className: "bg-muted font-medium text-primary" }}
          >
            Đăng ký khóa học
          </Link>
          <Link
            to="/admin"
            className="px-3 py-2 rounded-md hover:bg-muted transition"
            activeProps={{ className: "bg-muted font-medium text-primary" }}
          >
            Admin Dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
}
