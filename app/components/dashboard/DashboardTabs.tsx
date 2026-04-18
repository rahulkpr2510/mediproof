"use client";

import { ReactNode } from "react";

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface DashboardTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function DashboardTabs({
  tabs,
  activeTab,
  onTabChange,
}: DashboardTabsProps) {
  return (
    <div className="border-b border-zinc-800">
      <nav className="flex gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.icon && <span className="opacity-70">{tab.icon}</span>}
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-100" />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
