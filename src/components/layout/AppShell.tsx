import React, { useState } from 'react';
import { Sidebar, type NavItemKey } from './Sidebar';
import { Header } from './Header';

interface AppShellProps {
  currentTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
  children: React.ReactNode;
  onOpenNewBusinessModal?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentTab,
  onSelectTab,
  children,
  onOpenNewBusinessModal,
}) => {
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col antialiased">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        isOpenMobile={isOpenMobile}
        onCloseMobile={() => setIsOpenMobile(false)}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header
          onToggleMobileMenu={() => setIsOpenMobile(!isOpenMobile)}
          onOpenNewBusinessModal={onOpenNewBusinessModal}
        />

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
