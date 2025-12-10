"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plane, Search, Calendar, History, User, LogOut, MessageSquare, Settings, Menu, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const navLinks = [
    { href: "/", label: "Search", icon: Search },
    { href: "/chat", label: "Chat", icon: MessageSquare },
    { href: "/tasks", label: "Tasks", icon: Calendar },
    { href: "/history", label: "History", icon: History },
  ];

  return (
    <nav className="border-b border-border/40 bg-card/70 glass sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8 lg:gap-12">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                <Plane className="w-5 h-5 text-primary-foreground" />
              </div>
              {/* Subtle glow on hover */}
              <div className="absolute inset-0 rounded-xl bg-primary/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-xl font-semibold tracking-tight leading-none">
                Voyager
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none mt-0.5">
                Flight Search
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/30">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Quick action - Settings */}
          <Link href="/settings" className="hidden sm:flex">
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 hover:bg-muted rounded-lg"
            >
              <Settings className="w-4 h-4 text-muted-foreground" />
            </Button>
          </Link>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-9 h-9 rounded-lg">
                  <Menu className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 glass">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;
                  return (
                    <DropdownMenuItem key={link.href} asChild>
                      <Link
                        href={link.href}
                        className={cn(
                          "flex items-center gap-3 py-2",
                          isActive && "font-medium text-primary"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        {link.label}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center gap-3 py-2">
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-9 px-2 gap-2 hover:bg-muted rounded-lg"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/10">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <span className="hidden sm:inline text-sm font-medium">Traveler</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 glass">
              <div className="px-3 py-3 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/10">
                    <Globe className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Traveler</p>
                    <p className="text-xs text-muted-foreground">Personal account</p>
                  </div>
                </div>
              </div>
              <div className="p-1">
                <DropdownMenuItem asChild className="rounded-lg">
                  <Link href="/settings" className="flex items-center gap-3 py-2">
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator className="my-1" />
              <div className="p-1">
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg"
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  Sign out
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
