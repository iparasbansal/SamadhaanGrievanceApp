import React, { Fragment, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Transition } from '@headlessui/react';
import { useAuth } from '../context/AuthContext';
import { Button, Badge, Modal } from './ui';
import TypingText from './TypingText';
import {
  Plus,
  User,
  Shield,
  Crown,
  ChevronDown,
  LayoutDashboard,
  FilePlus2,
  ListChecks,
  PanelLeftClose,
  PanelLeft,
  Search,
  Command,
  Sparkles,
  Leaf,
  Trophy,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Command', icon: LayoutDashboard },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { id: 'submit', label: 'File grievance', icon: FilePlus2 },
  { id: 'mycomplaints', label: 'My cases', icon: ListChecks },
  { id: 'profile', label: 'Profile', icon: User },
];

function Layout({ children, onNavigate, currentPage }) {
  const {
    user,
    isAuthority,
    isSuperAdmin,
    firstName,
    isEmailVerified,
    departmentId,
    logout,
    isAuthenticated,
    unskip,
  } = useAuth();
  const isSubmitEnabled = user && isEmailVerified;
  const [loginModal, setLoginModal] = useState({ show: false, message: '' });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');

  const handleLogout = () => logout();

  const handleAnonymousSubmitClick = () => {
    setLoginModal({ show: true, message: 'Please log in to submit a grievance.' });
  };

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen((o) => !o);
      }
      if (e.key === 'Escape') setCommandOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const go = useCallback(
    (page) => {
      onNavigate(page);
      setCommandOpen(false);
      setCommandQuery('');
    },
    [onNavigate]
  );

  const filteredNav = NAV_ITEMS.filter(
    (item) =>
      !commandQuery ||
      item.label.toLowerCase().includes(commandQuery.toLowerCase()) ||
      item.id.includes(commandQuery.toLowerCase())
  );

  const UserDisplay = () => {
    const displayName = firstName || (user ? user.email : 'Guest');
    const displayTitle = user ? user.email : 'Guest';

    return (
      <div className="glass-panel flex max-w-[min(100%,20rem)] items-center gap-3 rounded-full px-4 py-1.5">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
        <span className="text-xs font-medium uppercase tracking-wider text-emerald-700">Citizen</span>
        <span className="truncate font-semibold text-slate-800" title={displayTitle}>
          {displayName}
        </span>
        {isSuperAdmin && (
          <Badge variant="critical" className="!text-[10px]">
            <Crown className="mr-1 h-3 w-3" /> Super
          </Badge>
        )}
        {isAuthority && !isSuperAdmin && (
          <Badge variant="primary" className="!text-[10px]">
            <Shield className="mr-1 h-3 w-3" /> {departmentId}
          </Badge>
        )}
      </div>
    );
  };

  return (
    <div className="command-shell text-slate-800">
      <div className="relative z-10 flex min-h-screen">
        <motion.aside
          initial={false}
          animate={{ width: sidebarCollapsed ? 80 : 260 }}
          transition={{ type: 'spring', stiffness: 380, damping: 38 }}
          className="sticky top-0 hidden h-screen shrink-0 flex-col border-r border-emerald-100/80 bg-white/88 py-4 backdrop-blur-2xl md:flex"
        >
          <div className="flex items-center justify-between gap-2 px-3 pb-6">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2 overflow-hidden pl-1">
                <Leaf className="h-8 w-8 shrink-0 text-emerald-500 drop-shadow-[0_8px_16px_rgba(16,185,129,0.25)]" />
                <span className="font-space-grotesk truncate bg-gradient-to-r from-emerald-600 to-sky-600 bg-clip-text text-lg font-bold tracking-tight text-transparent">
                  Samadhaan
                </span>
              </div>
            )}
            {sidebarCollapsed && (
              <Leaf className="mx-auto h-8 w-8 text-emerald-500 drop-shadow-[0_8px_16px_rgba(16,185,129,0.25)]" />
            )}
          </div>

          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            className="mx-3 mb-4 flex items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
            title={sidebarCollapsed ? 'Expand' : 'Collapse'}
          >
            {sidebarCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" />
                Collapse
              </>
            )}
          </button>

          <nav className="flex flex-1 flex-col gap-1 px-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.id}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onNavigate(item.id)}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                    sidebarCollapsed ? 'justify-center' : ''
                  } ${
                    currentPage === item.id
                      ? 'bg-emerald-50 text-emerald-700 font-bold border-l-2 border-emerald-500 shadow-sm'
                      : 'text-slate-600 hover:bg-emerald-50/50 hover:text-emerald-700'
                  }`}
                  title={item.label}
                >
                  <Icon className={`h-5 w-5 shrink-0 transition ${
                    currentPage === item.id ? 'text-emerald-600' : 'text-emerald-500 group-hover:text-emerald-600'
                  }`} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </motion.button>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-emerald-100 px-3 pt-4">
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className={`flex w-full items-center gap-2 rounded-xl border border-emerald-100 bg-white px-3 py-2 text-xs text-slate-500 transition hover:border-emerald-200 hover:text-emerald-700 ${
                sidebarCollapsed ? 'justify-center' : ''
              }`}
            >
              <Command className="h-3.5 w-3.5 shrink-0" />
              {!sidebarCollapsed && (
                <>
                  <span className="flex-1 text-left">Command</span>
                  <kbd className="rounded border border-emerald-100 bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px]">
                    ⌘K
                  </kbd>
                </>
              )}
            </button>
          </div>
        </motion.aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <nav className="nav-glass sticky top-0 z-50">
            <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-4 py-3">
              <div
                className="flex cursor-pointer items-center gap-3 md:hidden"
                onClick={() => onNavigate('dashboard')}
              >
                <Leaf className="h-7 w-7 text-emerald-500" />
                <span className="font-space-grotesk bg-gradient-to-r from-emerald-600 to-sky-600 bg-clip-text text-xl font-bold text-transparent">
                  Samadhaan
                </span>
              </div>

              <button
                type="button"
                onClick={() => setCommandOpen(true)}
                className="glass-panel group flex flex-1 items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm text-slate-500 transition hover:border-emerald-200 hover:text-emerald-700 md:max-w-md"
              >
                <Search className="h-4 w-4 text-emerald-500" />
                <span className="flex-1 truncate">Search or jump…</span>
                <kbd className="hidden rounded border border-emerald-100 bg-emerald-50 px-2 py-0.5 font-mono text-[10px] text-slate-500 sm:inline-block">
                  ⌘K
                </kbd>
              </button>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <UserDisplay />
                <Button
                  onClick={isAuthenticated ? () => onNavigate('submit') : handleAnonymousSubmitClick}
                  disabled={isAuthenticated && !isSubmitEnabled}
                  className="btn-primary !rounded-xl"
                >
                  <Plus className="mr-1 inline-block h-4 w-4" />
                  New case
                </Button>
                <Menu as="div" className="relative inline-block text-left">
                  <Menu.Button className="glass-panel flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-slate-700 transition hover:border-emerald-200">
                    <User className="h-4 w-4 text-emerald-500" />
                    Menu
                    <ChevronDown className="h-4 w-4 opacity-60" />
                  </Menu.Button>

                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items className="glass-panel-strong absolute right-0 z-[60] mt-2 w-52 origin-top-right p-1 focus:outline-none">
                      <div className="py-1">
                        {isAuthenticated ? (
                          <>
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  type="button"
                                  onClick={() => onNavigate('profile')}
                                  className={`${active ? 'bg-emerald-50' : ''} w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700`}
                                >
                                  Profile
                                </button>
                              )}
                            </Menu.Item>
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  type="button"
                                  onClick={() => onNavigate('mycomplaints')}
                                  className={`${active ? 'bg-emerald-50' : ''} w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700`}
                                >
                                  My complaints
                                </button>
                              )}
                            </Menu.Item>
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  type="button"
                                  onClick={handleLogout}
                                  className={`${active ? 'bg-rose-50' : ''} w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600`}
                                >
                                  Sign out
                                </button>
                              )}
                            </Menu.Item>
                          </>
                        ) : (
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                type="button"
                                onClick={unskip}
                                className={`${active ? 'bg-emerald-50' : ''} w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700`}
                              >
                                Log in
                              </button>
                            )}
                          </Menu.Item>
                        )}
                      </div>
                    </Menu.Items>
                  </Transition>
                </Menu>
              </div>
            </div>
          </nav>

          <motion.main
            className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-8 sm:px-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            {children}
          </motion.main>

          <footer className="border-t border-emerald-100/80 py-6 text-center text-xs text-slate-500">
            Samadhaan · Civic issue reporting · {new Date().getFullYear()}
          </footer>
        </div>
      </div>

      {/* Cmd+K palette */}
      <AnimatePresence>
        {commandOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-start justify-center bg-emerald-950/35 p-4 pt-[15vh] backdrop-blur-md"
            onClick={() => setCommandOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              className="glass-panel-strong w-full max-w-lg overflow-hidden p-0 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 border-b border-emerald-100 px-4 py-3">
                <Search className="h-5 w-5 text-emerald-500" />
                <input
                  autoFocus
                  value={commandQuery}
                  onChange={(e) => setCommandQuery(e.target.value)}
                  placeholder="Jump to module…"
                  className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none"
                />
                <kbd className="rounded border border-emerald-100 px-2 py-0.5 font-mono text-[10px] text-slate-500">
                  esc
                </kbd>
              </div>
              <ul className="max-h-72 overflow-y-auto p-2">
                {filteredNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => go(item.id)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <Icon className="h-4 w-4 text-emerald-500" />
                        {item.label}
                      </button>
                    </li>
                  );
                })}
                {filteredNav.length === 0 && (
                  <li className="px-3 py-6 text-center text-sm text-slate-500">No matches</li>
                )}
              </ul>
              <div className="border-t border-emerald-100 px-4 py-2 text-[10px] uppercase tracking-wider text-emerald-700">
                <TypingText
                  texts={['Neural routing online', 'Citizen mesh synced', 'Department uplink ready']}
                  typingSpeed={40}
                  deletingSpeed={25}
                  pauseTime={1200}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal
        show={loginModal.show}
        title="Authentication required"
        onClose={() => setLoginModal({ show: false, message: '' })}
        type="info"
      >
        <p>{loginModal.message}</p>
      </Modal>
    </div>
  );
}

export default Layout;
