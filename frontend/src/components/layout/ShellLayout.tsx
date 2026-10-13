"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  FolderOpen, LayoutDashboard, Loader2, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Plus, Settings, Library, X,
} from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { useLocalStorage } from '@/lib/useClientState';
import { CREATE_BOX_EVENT } from '@/lib/types';

interface ShellLayoutProps {
  children: React.ReactNode;
  userEmail?: string;
  userName?: string;
}

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/boxes', icon: LayoutDashboard },
  { name: 'My boxes', href: '/boxes/all', icon: FolderOpen },
  { name: 'Knowledge base', href: '/knowledge-base', icon: Library, badge: 'Soon' },
  { name: 'Settings', href: '/settings', icon: Settings },
];

function isActive(pathname: string, href: string) {
  if (href === '/boxes') return pathname === '/boxes';
  // Individual box pages live under My boxes.
  if (href === '/boxes/all') return pathname.startsWith('/boxes/');
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function ShellLayout({ children, userEmail, userName }: ShellLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsedPref, setCollapsed] = useLocalStorage('docintel.shell.collapsed', false);
  const [signingOut, setSigningOut] = useState(false);
  // The collapsed rail is a desktop affordance; the mobile drawer always shows labels.
  const collapsed = collapsedPref && !mobileOpen;

  const displayName = userName || userEmail || 'Account';
  const initial = (userName || userEmail || '?').charAt(0).toUpperCase();

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  const handleNewBox = () => {
    setMobileOpen(false);
    // Box pages listen for the event and open the dialog in place; elsewhere, go to the dashboard.
    if (pathname === '/boxes' || pathname === '/boxes/all') {
      window.dispatchEvent(new CustomEvent(CREATE_BOX_EVENT));
    } else {
      router.push('/boxes?new=1');
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await fetch('/auth/logout', { method: 'POST' });
    } finally {
      router.replace('/login');
      router.refresh();
    }
  };

  return (
    <div className="flex h-dvh bg-[#f8fafc] text-[#0f172a] font-sans overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-60 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-white focus:text-indigo-700 focus:shadow-lg focus:ring-2 focus:ring-indigo-600"
      >
        Skip to content
      </a>

      {mobileOpen && (
        <div className="fixed inset-0 bg-[#0f172a]/30 backdrop-blur-[3px] z-40 md:hidden" aria-hidden="true" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        id="app-sidebar"
        aria-label="Main navigation"
        className={`
          fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 flex flex-col p-4 transition-[transform,width] duration-300 ease-in-out md:static md:translate-x-0
          ${mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
          ${collapsed ? 'w-20 items-center' : 'w-64'}
        `}
      >
        <div className={`flex items-center py-2 mb-6 ${collapsed ? 'justify-center' : 'justify-between pl-1 w-full'}`}>
          {!collapsed && (
            <Link href="/boxes" aria-label="DocIntel home" className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
              <Logo />
            </Link>
          )}
          <button
            type="button"
            className="hidden md:flex text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
            onClick={() => setCollapsed(!collapsedPref)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-controls="app-sidebar"
            aria-expanded={!collapsed}
          >
            {collapsed ? <PanelLeftOpen size={20} aria-hidden="true" /> : <PanelLeftClose size={20} aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="mb-6 px-1 w-full">
          <button
            type="button"
            onClick={handleNewBox}
            title={collapsed ? 'New box' : undefined}
            aria-label={collapsed ? 'New box' : undefined}
            className={`flex items-center justify-center py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-sm transition-colors ${collapsed ? 'w-10 h-10 px-0 mx-auto' : 'w-full gap-2 px-3'}`}
          >
            <Plus size={16} className="shrink-0" aria-hidden="true" />
            {!collapsed && <span>New box</span>}
          </button>
        </div>

        <nav className="flex-1 text-sm font-medium tracking-tight w-full">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    title={collapsed ? item.name : undefined}
                    aria-label={collapsed ? item.name : undefined}
                    className={`flex items-center justify-between py-2 rounded-lg transition-colors duration-150
                      ${collapsed ? 'justify-center px-0 w-10 mx-auto' : 'px-3'}
                      ${active ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
                  >
                    <span className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
                      <Icon size={20} className={`shrink-0 ${active ? 'text-indigo-600' : 'text-slate-400'}`} aria-hidden="true" />
                      {!collapsed && <span>{item.name}</span>}
                    </span>
                    {!collapsed && item.badge && (
                      <span className="text-[10px] tracking-wide uppercase px-1.5 py-0.5 rounded font-semibold bg-slate-100 text-slate-500">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="pt-4 border-t border-slate-200 space-y-1 w-full">
          <div className={`flex items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2`} title={collapsed ? displayName : undefined}>
            <div className="w-8 h-8 shrink-0 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-xs font-semibold text-indigo-700" aria-hidden="true">
              {initial}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{displayName}</p>
                {userName && userEmail && <p className="text-xs text-slate-500 truncate">{userEmail}</p>}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            title={collapsed ? 'Sign out' : undefined}
            aria-label={collapsed ? 'Sign out' : undefined}
            className={`w-full flex items-center ${collapsed ? 'justify-center px-0 w-10 mx-auto' : 'gap-3 px-3'} py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors text-sm font-medium disabled:opacity-60`}
          >
            {signingOut
              ? <Loader2 size={20} className="text-slate-400 shrink-0 animate-spin" aria-hidden="true" />
              : <LogOut size={20} className="text-slate-400 shrink-0" aria-hidden="true" />}
            {!collapsed && <span>{signingOut ? 'Signing out…' : 'Sign out'}</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Mobile top bar: the sidebar is off-canvas below md. */}
        <header className="md:hidden flex items-center h-14 px-4 gap-3 bg-white border-b border-slate-200 shrink-0">
          <button
            type="button"
            className="p-1.5 -ml-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            aria-controls="app-sidebar"
            aria-expanded={mobileOpen}
          >
            <Menu size={22} aria-hidden="true" />
          </button>
          <Link href="/boxes" aria-label="DocIntel home"><Logo size="sm" /></Link>
        </header>

        <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col min-h-0 overflow-y-auto focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
