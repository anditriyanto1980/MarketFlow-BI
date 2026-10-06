import React from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  History,
  TrendingUp,
  DollarSign,
  Package,
  Layers,
  Store as StoreIcon,
  FileSpreadsheet,
  Settings,
  Users,
  CreditCard,
  CheckSquare,
  Sparkles,
  X,
  Boxes,
  Link2,
} from 'lucide-react';
import { useAuth } from '@/src/lib/auth/auth-context';
import { RoleBadge } from '@/src/components/shared/RoleBadge';

export type NavItemKey =
  | 'dashboard'
  | 'import'
  | 'import-history'
  | 'analytics-sales'
  | 'analytics-profit'
  | 'analytics-products'
  | 'analytics-marketplaces'
  | 'reconciliation'
  | 'master-products'
  | 'master-mappings'
  | 'master-hpp'
  | 'master-stores'
  | 'reports'
  | 'settings-business'
  | 'settings-team'
  | 'settings-subscription';

interface SidebarProps {
  currentTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

interface NavItemConfig {
  key: NavItemKey;
  label: string;
  icon: React.ReactNode;
  isComingSoon?: boolean;
}

interface NavSection {
  title?: string;
  items: NavItemConfig[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { currentBusiness, currentRole } = useAuth();

  const navSections: NavSection[] = [
    {
      items: [
        {
          key: 'dashboard',
          label: 'Dashboard',
          icon: <LayoutDashboard className="w-4 h-4" />,
        },
      ],
    },
    {
      title: 'DATA',
      items: [
        {
          key: 'import',
          label: 'Import Data',
          icon: <UploadCloud className="w-4 h-4" />,
        },
        {
          key: 'import-history',
          label: 'Import History',
          icon: <History className="w-4 h-4" />,
        },
      ],
    },
    {
      title: 'ANALYTICS',
      items: [
        {
          key: 'analytics-sales',
          label: 'Sales',
          icon: <TrendingUp className="w-4 h-4" />,
          isComingSoon: true,
        },
        {
          key: 'analytics-profit',
          label: 'Profit',
          icon: <DollarSign className="w-4 h-4" />,
          isComingSoon: true,
        },
        {
          key: 'analytics-products',
          label: 'Products',
          icon: <Package className="w-4 h-4" />,
          isComingSoon: true,
        },
        {
          key: 'analytics-marketplaces',
          label: 'Marketplaces',
          icon: <Layers className="w-4 h-4" />,
          isComingSoon: true,
        },
        {
          key: 'reconciliation',
          label: 'Reconciliation',
          icon: <CheckSquare className="w-4 h-4" />,
          isComingSoon: true,
        },
      ],
    },
    {
      title: 'MASTER DATA',
      items: [
        {
          key: 'master-products',
          label: 'Products',
          icon: <Package className="w-4 h-4" />,
        },
        {
          key: 'master-mappings',
          label: 'SKU Mapping',
          icon: <Link2 className="w-4 h-4" />,
        },
        {
          key: 'master-hpp',
          label: 'HPP',
          icon: <Boxes className="w-4 h-4" />,
        },
        {
          key: 'master-stores',
          label: 'Stores',
          icon: <StoreIcon className="w-4 h-4" />,
        },
      ],
    },
    {
      title: 'REPORTS',
      items: [
        {
          key: 'reports',
          label: 'Reports',
          icon: <FileSpreadsheet className="w-4 h-4" />,
          isComingSoon: true,
        },
      ],
    },
    {
      title: 'SETTINGS',
      items: [
        {
          key: 'settings-business',
          label: 'Business',
          icon: <Settings className="w-4 h-4" />,
        },
        {
          key: 'settings-team',
          label: 'Team',
          icon: <Users className="w-4 h-4" />,
        },
        {
          key: 'settings-subscription',
          label: 'Subscription',
          icon: <CreditCard className="w-4 h-4" />,
          isComingSoon: true,
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-stone-950 border-r border-stone-800/80 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-stone-800/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0F5132] flex items-center justify-center text-emerald-100 shadow-sm border border-emerald-600/40">
              <Sparkles className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-wider text-stone-100 uppercase">
                MarketFlow<span className="text-emerald-500 font-extrabold ml-0.5">BI</span>
              </div>
              <div className="text-[10px] text-stone-500 uppercase tracking-widest font-semibold">
                Foundation v0.1
              </div>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="p-1 rounded-md text-stone-400 hover:text-stone-200 hover:bg-stone-800 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Business workspace pill */}
        {currentBusiness && (
          <div className="px-4 pt-3 pb-2 border-b border-stone-800/50 bg-stone-900/30">
            <div className="text-[11px] font-medium text-stone-400 truncate">
              {currentBusiness.name}
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-stone-400 uppercase tracking-wider">
                {currentBusiness.businessType}
              </span>
              <RoleBadge role={currentRole} />
            </div>
          </div>
        )}

        {/* Scrollable Nav Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 select-none">
          {navSections.map((section, idx) => (
            <div key={idx}>
              {section.title && (
                <div className="px-3 mb-1.5 text-[10px] font-semibold text-stone-400 tracking-wider">
                  {section.title}
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = currentTab === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        onSelectTab(item.key);
                        onCloseMobile();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                        isActive
                          ? 'bg-[#0F5132]/25 text-emerald-300 font-semibold border border-emerald-800/40 shadow-xs'
                          : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`${
                            isActive
                              ? 'text-emerald-400'
                              : 'text-stone-500 group-hover:text-stone-300'
                          }`}
                        >
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </div>
                      {item.isComingSoon && (
                        <span className="text-[9px] uppercase tracking-wider bg-stone-900 text-stone-400 px-1.5 py-0.5 rounded border border-stone-800 group-hover:border-stone-700">
                          Soon
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-stone-800/80 bg-stone-950/60 shrink-0">
          <div className="text-[11px] text-stone-400 text-center">
            IDR · Asia/Jakarta (WIB)
          </div>
        </div>
      </aside>
    </>
  );
};
