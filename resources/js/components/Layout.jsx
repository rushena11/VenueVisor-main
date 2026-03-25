import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const Layout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = JSON.parse(localStorage.getItem('user'));
    const [pendingCount, setPendingCount] = useState(0);
    const [hasNew, setHasNew] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isReportsOpen, setIsReportsOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('vv_sidebarCollapsed') === '1');

    useEffect(() => {
        let mounted = true;
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const fetchPending = async () => {
            try {
                const res = await axios.get('/api/reservations', { headers });
                if (!mounted) return;
                const count = Array.isArray(res.data) ? res.data.filter(r => r.status === 'pending').length : 0;
                setPendingCount(count);
                const lastSeen = parseInt(localStorage.getItem('lastSeenPendingCount') || '0', 10);
                setHasNew(count > lastSeen);
            } catch (e) {
                // silent
            }
        };

        fetchPending();
        const id = setInterval(fetchPending, 30000);
        return () => {
            mounted = false;
            clearInterval(id);
        };
    }, []);

    const openPending = () => {
        localStorage.setItem('lastSeenPendingCount', String(pendingCount));
        setHasNew(false);
        navigate('/reservations?status=pending');
    };

    useEffect(() => {
        setIsReportsOpen(location.pathname.startsWith('/reports') || location.pathname.startsWith('/bug-reports'));
    }, [location.pathname]);
    useEffect(() => {
        localStorage.setItem('vv_sidebarCollapsed', isSidebarCollapsed ? '1' : '0');
        if (isSidebarCollapsed) setIsReportsOpen(false);
    }, [isSidebarCollapsed]);

    const handleLogout = async () => {
        try {
            await axios.post('/api/logout', {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
        } catch (e) {
            console.error(e);
        }
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

    if (!localStorage.getItem('token')) {
        return <Navigate to="/login" />;
    }

    const displayName = user?.name || user?.username || 'Admin User';
    const roleLabel = user?.role ? String(user.role).charAt(0).toUpperCase() + String(user.role).slice(1) : 'Administrator';
    const avatarLetter = String(displayName || 'A').trim().charAt(0).toUpperCase() || 'A';

    const navItems = useMemo(() => ([
        { to: '/dashboard', label: 'Dashboard', match: (p) => p.startsWith('/dashboard'), icon: (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M4 13.5V20a1 1 0 0 0 1 1h5v-6.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V21h5a1 1 0 0 0 1-1v-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3 11.5 12 4l9 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ) },
        { to: '/reservation/new', label: 'New Reservation', match: (p) => p.startsWith('/reservation/new'), icon: (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
        ) },
        { to: '/venues', label: 'View Venues', match: (p) => p.startsWith('/venues'), icon: (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M3 21h18M5 21V7l7-4 7 4v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 21v-6h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ) }
    ]), []);

    const linkBase =
        `w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg text-sm font-medium transition-colors`;
    const activeLink =
        'bg-white/10 text-white ring-1 ring-white/10';
    const inactiveLink =
        'text-white/80 hover:bg-white/10 hover:text-white';

    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            <div className="flex min-h-screen">
                {isMobileMenuOpen && (
                    <button
                        type="button"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="fixed inset-0 z-30 bg-black/30 md:hidden"
                        aria-label="Close sidebar"
                    />
                )}
                <aside
                    className={`fixed z-40 inset-y-0 left-0 w-[280px] ${isSidebarCollapsed ? 'md:w-[88px]' : 'md:w-[280px]'} transform transition-all duration-200 md:static md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} bg-gradient-to-b from-blue-950 via-blue-950 to-blue-900 text-white`}
                >
                    <div className={`h-16 ${isSidebarCollapsed ? 'px-3' : 'px-5'} flex items-center justify-between border-b border-white/10`}>
                        <div className="flex items-center gap-3">
                            <img src="/assets/LNULogo.png" alt="LNULogo" className="h-10 w-10 object-contain" />
                            {!isSidebarCollapsed && (
                                <div className="leading-tight">
                                    <div className="font-bold text-lg">VenueVisor</div>
                                    <div className="text-[11px] tracking-widest text-white/70 font-semibold">LNU EVENT TRACKER</div>
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsSidebarCollapsed(v => !v)}
                            className="hidden md:inline-flex items-center justify-center w-10 h-10 rounded-xl hover:bg-white/10 transition-colors"
                            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        >
                            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none">
                                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>

                    <div className="p-4 flex flex-col h-[calc(100%-4rem)]">
                        <nav className="space-y-1">
                            {navItems.map(item => {
                                const active = item.match(location.pathname);
                                return (
                                    <Link
                                        key={item.to}
                                        to={item.to}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={`${linkBase} ${active ? activeLink : inactiveLink}`}
                                        title={isSidebarCollapsed ? item.label : undefined}
                                    >
                                        <span className={`${active ? 'text-white' : 'text-white/80'}`}>{item.icon}</span>
                                        {!isSidebarCollapsed && <span>{item.label}</span>}
                                    </Link>
                                );
                            })}

                            <button
                                type="button"
                                onClick={() => {
                                    if (isSidebarCollapsed) {
                                        setIsMobileMenuOpen(false);
                                        navigate('/reports');
                                        return;
                                    }
                                    setIsReportsOpen(v => !v);
                                }}
                                className={`${linkBase} ${(location.pathname.startsWith('/reports') || location.pathname.startsWith('/bug-reports')) ? activeLink : inactiveLink}`}
                                aria-expanded={isReportsOpen}
                                title={isSidebarCollapsed ? 'Reports' : undefined}
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                                    <path d="M4 5h16v14H4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                                    <path d="M8 9h8M8 13h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                                {!isSidebarCollapsed && (
                                    <>
                                        <span className="flex-1 text-left">Reports</span>
                                        <svg className={`w-4 h-4 transition-transform ${isReportsOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z" clipRule="evenodd" />
                                        </svg>
                                    </>
                                )}
                            </button>
                            {isReportsOpen && !isSidebarCollapsed && (
                                <div className="pl-7 space-y-1">
                                    <Link
                                        to="/bug-reports"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={`${linkBase} ${location.pathname.startsWith('/bug-reports') ? activeLink : inactiveLink}`}
                                    >
                                        <span className="w-4 h-4 flex items-center justify-center">
                                            <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
                                        </span>
                                        <span>Bug Reports</span>
                                    </Link>
                                    <Link
                                        to="/reports"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={`${linkBase} ${location.pathname.startsWith('/reports') ? activeLink : inactiveLink}`}
                                    >
                                        <span className="w-4 h-4 flex items-center justify-center">
                                            <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
                                        </span>
                                        <span>View Reports</span>
                                    </Link>
                                </div>
                            )}
                        </nav>

                        <div className="mt-6">
                            {!isSidebarCollapsed && (
                                <div className="text-[11px] tracking-widest text-white/60 font-semibold px-3 mb-2">SYSTEM</div>
                            )}
                            <div className="space-y-1">
                                <button type="button" disabled className={`${linkBase} opacity-50 cursor-not-allowed text-white/70`} title={isSidebarCollapsed ? 'Users' : undefined}>
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    {!isSidebarCollapsed && <span>Users</span>}
                                </button>
                                <Link
                                    to="/venues"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`${linkBase} ${location.pathname.startsWith('/venues') ? activeLink : inactiveLink}`}
                                    title={isSidebarCollapsed ? 'Venues' : undefined}
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                                        <path d="M3 21h18M5 21V7l7-4 7 4v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M9 21v-6h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    {!isSidebarCollapsed && <span>Venues</span>}
                                </Link>
                                <button type="button" disabled className={`${linkBase} opacity-50 cursor-not-allowed text-white/70`} title={isSidebarCollapsed ? 'Settings' : undefined}>
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                                        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" stroke="currentColor" strokeWidth="2" />
                                        <path d="M19.4 15a7.94 7.94 0 0 0 .1-1 7.94 7.94 0 0 0-.1-1l2.1-1.6-2-3.5-2.5 1a7.8 7.8 0 0 0-1.7-1L13 2h-4l-.4 3.9a7.8 7.8 0 0 0-1.7 1l-2.5-1-2 3.5L4.6 13a7.94 7.94 0 0 0-.1 1c0 .34.03.67.1 1L2.5 16.6l2 3.5 2.5-1a7.8 7.8 0 0 0 1.7 1L9 22h4l.4-3.9a7.8 7.8 0 0 0 1.7-1l2.5 1 2-3.5L19.4 15z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    {!isSidebarCollapsed && <span>Settings</span>}
                                </button>
                            </div>
                        </div>

                        <div className="mt-auto pt-5">
                            {isSidebarCollapsed ? (
                                <a
                                    href="mailto:support@lnu.edu.ph"
                                    className="w-full h-12 inline-flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/15 ring-1 ring-white/10 transition-colors"
                                    title="Contact Support"
                                >
                                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none">
                                        <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                                        <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                                    </svg>
                                </a>
                            ) : (
                                <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                                    <div className="font-semibold">Need Help?</div>
                                    <div className="text-xs text-white/70 mt-1">Contact the support team for assistance.</div>
                                    <a
                                        href="mailto:support@lnu.edu.ph"
                                        className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-semibold py-2 text-sm transition-colors"
                                    >
                                        Contact Support
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </aside>

                <div className="flex-1 min-w-0 flex flex-col">
                    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setIsMobileMenuOpen(v => !v)}
                                className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 hover:bg-gray-50"
                                aria-label="Toggle sidebar"
                                aria-expanded={isMobileMenuOpen}
                            >
                                <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none">
                                    <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </button>
                            <div className="hidden sm:block">
                                <div className="text-sm text-gray-500">Welcome back</div>
                                <div className="font-semibold text-gray-900">{displayName}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={openPending}
                                title={hasNew ? 'New reservation request(s)' : 'Pending reservation requests'}
                                className="relative w-10 h-10 inline-flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50"
                                aria-label="Pending reservation requests"
                            >
                                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                {pendingCount > 0 && (
                                    <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-[10px] leading-[18px] text-center rounded-full border ${hasNew ? 'bg-red-500 border-red-600' : 'bg-yellow-500 border-yellow-600'} text-white`}>
                                        {pendingCount}
                                    </span>
                                )}
                            </button>
                            <div className="hidden sm:flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center font-semibold text-gray-700">
                                    {avatarLetter}
                                </div>
                                <div className="leading-tight">
                                    <div className="text-sm font-semibold text-gray-900">{displayName}</div>
                                    <div className="text-xs text-gray-500">{roleLabel}</div>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="inline-flex items-center justify-center px-3 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-semibold text-sm transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    </header>

                    <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6">
                        <Outlet />
                    </main>
                </div>
            </div>
        </div>
    );
};

export default Layout;
