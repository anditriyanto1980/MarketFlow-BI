import React, { useState } from 'react';
import { Menu, LogOut, Building, ChevronDown, Check, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/src/lib/auth/auth-context';
import { RoleBadge } from '@/src/components/shared/RoleBadge';

interface HeaderProps {
  onToggleMobileMenu: () => void;
  onOpenNewBusinessModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu, onOpenNewBusinessModal }) => {
  const {
    currentUser,
    userProfile,
    currentBusiness,
    currentRole,
    userBusinesses,
    switchBusiness,
    logout,
  } = useAuth();

  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-16 bg-stone-950/80 backdrop-blur-md border-b border-stone-800/80 px-4 md:px-6 flex items-center justify-between">
      {/* Left: Mobile trigger & Active Workspace */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="p-2 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-900 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Business Workspace Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen);
              setIsUserMenuOpen(false);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800 hover:border-stone-700 text-stone-200 text-xs font-medium transition-all"
          >
            <Building className="w-3.5 h-3.5 text-emerald-400" />
            <span className="max-w-[140px] md:max-w-[200px] truncate">
              {currentBusiness ? currentBusiness.name : 'Pilih Bisnis'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
          </button>

          {isWorkspaceMenuOpen && (
            <div className="absolute left-0 mt-2 w-64 bg-stone-900 border border-stone-800 rounded-xl shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2 border-b border-stone-800/80 text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                Bisnis / Workspace Anda
              </div>
              <div className="max-h-56 overflow-y-auto py-1">
                {userBusinesses.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      switchBusiness(b.id);
                      setIsWorkspaceMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-stone-800 text-stone-200 transition-colors"
                  >
                    <div className="truncate">
                      <div className="font-medium truncate">{b.name}</div>
                      <div className="text-[10px] text-stone-500 uppercase">{b.businessType}</div>
                    </div>
                    {currentBusiness?.id === b.id && (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
              {onOpenNewBusinessModal && (
                <div className="p-2 border-t border-stone-800/80">
                  <button
                    onClick={() => {
                      setIsWorkspaceMenuOpen(false);
                      onOpenNewBusinessModal();
                    }}
                    className="w-full text-center text-xs text-emerald-400 hover:text-emerald-300 py-1 font-medium"
                  >
                    + Buat Bisnis Baru
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: User Profile & Actions */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:block">
          <RoleBadge role={currentRole} />
        </div>

        {/* User Account Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setIsUserMenuOpen(!isUserMenuOpen);
              setIsWorkspaceMenuOpen(false);
            }}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-stone-900 text-stone-300 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-300 font-semibold text-xs">
              {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : <UserIcon className="w-3.5 h-3.5" />}
            </div>
            <span className="hidden md:inline-block text-xs font-medium text-stone-200 max-w-[120px] truncate">
              {userProfile?.displayName || currentUser?.email}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-stone-900 border border-stone-800 rounded-xl shadow-xl py-1 z-50">
              <div className="px-4 py-2.5 border-b border-stone-800">
                <p className="text-xs font-semibold text-stone-100 truncate">
                  {userProfile?.displayName || 'Pengguna'}
                </p>
                <p className="text-[11px] text-stone-400 truncate">{currentUser?.email}</p>
                <div className="mt-2 sm:hidden">
                  <RoleBadge role={currentRole} />
                </div>
              </div>
              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-red-400 hover:bg-stone-800 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar (Logout)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
