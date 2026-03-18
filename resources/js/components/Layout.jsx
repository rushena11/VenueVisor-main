import React, { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const Layout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = JSON.parse(localStorage.getItem('user'));
    const [pendingCount, setPendingCount] = useState(0);
    const [hasNew, setHasNew] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <nav className="bg-blue-900 text-white shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 flex items-center gap-2">
                                <img
                                    src="/assets/LNULogo.png"
                                    alt="LNULogo"
                                    className="h-10 sm:h-12 w-auto object-contain"
                                />
                                <div className="flex flex-col">
                                    <span className="text-lg sm:text-xl font-bold leading-none">VenueVisor</span>
                                    <span className="hidden sm:inline text-xs font-bold text-yellow-400 tracking-wider">LNU BLUEBOOK</span>
                                </div>
                            </div>
                            <div className="hidden md:block">
                                <div className="ml-10 flex items-baseline space-x-4">
                                    <Link to="/dashboard" className={`hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium ${location.pathname.startsWith('/dashboard') ? 'border-b-2 border-yellow-400' : ''}`}>Dashboard</Link>
                                    <Link to="/reservation/new" className={`hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium ${location.pathname.startsWith('/reservation/new') ? 'border-b-2 border-yellow-400' : ''}`}>New Reservation</Link>
                                    <Link to="/venues" className={`hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium ${location.pathname.startsWith('/venues') ? 'border-b-2 border-yellow-400' : ''}`}>View Venues</Link>
                                    <Link to="/bug-reports" className={`hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium ${location.pathname.startsWith('/bug-reports') ? 'border-b-2 border-yellow-400' : ''}`}>Bug Reports</Link>
                                    <Link to="/reports" className={`hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium ${location.pathname.startsWith('/reports') ? 'border-b-2 border-yellow-400' : ''}`}>View Reports</Link>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4">
                            <span className="hidden sm:inline">Welcome Admin</span>
                            <button
                                onClick={openPending}
                                title={hasNew ? 'New reservation request(s)' : 'Pending reservation requests'}
                                className="relative p-2 rounded hover:bg-blue-800 transition-colors"
                                aria-label="Pending reservation requests"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                {pendingCount > 0 && (
                                    <span className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 text-[10px] leading-[18px] text-center rounded-full border ${hasNew ? 'bg-red-500 border-red-600' : 'bg-yellow-500 border-yellow-600'} text-white`}>
                                        {pendingCount}
                                    </span>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsMobileMenuOpen(v => !v)}
                                className="md:hidden inline-flex items-center justify-center p-2 rounded hover:bg-blue-800 transition-colors"
                                aria-label="Open menu"
                                aria-expanded={isMobileMenuOpen}
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
                                </svg>
                            </button>
                            <button onClick={handleLogout} className="bg-yellow-500 hover:bg-yellow-600 text-blue-900 font-bold py-1.5 px-3 sm:px-4 rounded flex items-center gap-2 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                            <span className="hidden sm:inline">Logout</span></button>
                        </div>
                    </div>
                    {isMobileMenuOpen && (
                        <div className="md:hidden border-t border-blue-800 py-2">
                            <div className="space-y-1">
                                <Link
                                    to="/dashboard"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`block px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-800 ${location.pathname.startsWith('/dashboard') ? 'bg-blue-800' : ''}`}
                                >
                                    Dashboard
                                </Link>
                                <Link
                                    to="/reservation/new"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`block px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-800 ${location.pathname.startsWith('/reservation/new') ? 'bg-blue-800' : ''}`}
                                >
                                    New Reservation
                                </Link>
                                <Link
                                    to="/venues"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`block px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-800 ${location.pathname.startsWith('/venues') ? 'bg-blue-800' : ''}`}
                                >
                                    View Venues
                                </Link>
                                <Link
                                    to="/bug-reports"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`block px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-800 ${location.pathname.startsWith('/bug-reports') ? 'bg-blue-800' : ''}`}
                                >
                                    Bug Reports
                                </Link>
                                <Link
                                    to="/reports"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`block px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-800 ${location.pathname.startsWith('/reports') ? 'bg-blue-800' : ''}`}
                                >
                                    View Reports
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <Outlet />
            </main>
        </div>
    );
};

// Helper for protection
import { Navigate } from 'react-router-dom';

export default Layout;
