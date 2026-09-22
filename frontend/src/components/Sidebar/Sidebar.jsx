import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Activity, BarChart2, ChevronRight, ChevronLeft, PieChart, Bell, Database, Scale } from 'lucide-react';

const navItems = [
  {
    section: 'Dashboards',
    items: [
      { to: '/alerts/live',        icon: Bell,      label: 'Live Alerts' },
      { to: '/device-status',      icon: PieChart,  label: 'Device Type Status' },
      { to: '/zone-analysis',        icon: Activity,  label: 'ZoneWise Analysis' },
      { to: '/alerts/rs-category', icon: BarChart2, label: 'RollingStock Category Alerts' },
      { to: '/all-data',           icon: Database,  label: 'All Sensor Data' },
      { to: '/analysis/uneven-loaded', icon: Scale, label: 'Uneven Loaded' },
    ],
  }
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const location = useLocation();

  const getIsActive = (to) => {
    return location.pathname === to;
  };

  return (
    <aside
      className={`${isOpen ? 'w-72' : 'w-[80px]'} bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(247,250,254,0.9)_100%)] border-r border-[rgba(121,151,188,0.16)] flex flex-col z-10 transition-all duration-300 ease-in-out shrink-0 relative shadow-[4px_0_20px_rgba(56,93,138,0.06)]`}
    >
      {/* Toggle Button */}
      <div className="absolute -right-3 top-6 z-20">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-white border border-[rgba(121,151,188,0.18)] shadow-sm text-slate-400 hover:text-[var(--color-office-blue)] rounded-full p-1.5 transition-all hover:scale-110 focus:outline-none"
          title={isOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
        >
          {isOpen ? <ChevronLeft size={16} strokeWidth={3} /> : <ChevronRight size={16} strokeWidth={3} />}
        </button>
      </div>

      <div className="p-4 flex-1 flex flex-col overflow-y-auto custom-scrollbar">
        {navItems.map((group, gi) => (
          <div key={gi}>
            {isOpen && (
              <h3 className={`px-4 text-[11px] font-extrabold text-[var(--color-text-muted)] uppercase tracking-[0.22em] mb-4 ${gi === 0 ? 'mt-2' : 'mt-8'}`}>
                {group.section}
              </h3>
            )}

            <nav className="flex flex-col gap-1 w-full">
              {group.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  title={label}
                  className={() => {
                    const isActive = getIsActive(to);
                    return `group relative flex items-center ${isOpen ? 'px-4' : 'justify-center'} w-full py-3 rounded-r-xl transition-all duration-300 ${
                      isActive
                        ? 'bg-linear-to-r from-[rgba(79,129,189,0.18)] via-[rgba(79,129,189,0.08)] to-transparent text-[var(--color-office-blue-dark)] font-bold'
                        : 'text-slate-500 hover:bg-[rgba(220,230,242,0.38)] hover:text-slate-900 '
                    }`;
                  }}
                >
                  {() => {
                    const isActive = getIsActive(to);
                    return (
                    <>
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-[var(--color-office-blue)] rounded-r-full shadow-[0_0_12px_rgba(79,129,189,0.45)]"></div>
                      )}
                      <div className={`flex items-center ${isOpen ? 'gap-3 w-full' : 'justify-center w-full'}`}>
                        <Icon
                          size={20}
                          strokeWidth={2.5}
                          className={`${
                            isActive
                              ? 'text-[var(--color-office-blue)] drop-shadow-md'
                              : 'text-slate-400 group-hover:text-slate-500 group-hover:scale-110'
                          } transition-all shrink-0`}
                        />
                        {isOpen && (
                          <span className="text-sm whitespace-nowrap">{label}</span>
                        )}
                      </div>
                    </>
                  );
                  }}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
      </div>
    </aside>
  );
}
