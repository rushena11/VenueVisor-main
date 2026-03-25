import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ReservationDetailsModal from '../components/ReservationDetailsModal';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const Dashboard = () => {
    const navigate = useNavigate();
    const [reservations, setReservations] = useState([]);
    const [venues, setVenues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [selectedReservation, setSelectedReservation] = useState(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [toasts, setToasts] = useState([]);
    const [summaryType, setSummaryType] = useState('month');
    const [summaryStart, setSummaryStart] = useState(() => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}`;
    });
    const [pieFilter, setPieFilter] = useState('all');
    const [pieMonth, setPieMonth] = useState(() => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}`;
    });
    const [dashboardPeriod, setDashboardPeriod] = useState(() => localStorage.getItem('vv_dashboardPeriod') || 'month');
    useEffect(() => {
        const pf = localStorage.getItem('vv_pieFilter');
        const pm = localStorage.getItem('vv_pieMonth');
        if (pf) setPieFilter(pf);
        if (pm) setPieMonth(pm);
    }, []);
    useEffect(() => {
        localStorage.setItem('vv_pieFilter', pieFilter);
    }, [pieFilter]);
    useEffect(() => {
        localStorage.setItem('vv_pieMonth', pieMonth);
    }, [pieMonth]);
    useEffect(() => {
        localStorage.setItem('vv_dashboardPeriod', dashboardPeriod);
    }, [dashboardPeriod]);

    const addToast = (message, type = 'info') => {
        const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        setToasts(prev => [...prev, { id, message: String(message || ''), type }]);
        window.setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    };

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }

        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const headers = { Authorization: `Bearer ${token}` };
                
                const [resResponse, venueResponse] = await Promise.all([
                    axios.get('/api/reservations', { headers }),
                    axios.get('/api/venues', { headers })
                ]);

                setReservations(resResponse.data);
                setVenues(venueResponse.data);
            } catch (error) {
                console.error("Error fetching data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleStatusUpdate = async (id, status) => {
        if (!confirm(`Are you sure you want to ${status} this reservation?`)) return;

        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/reservations/${id}/status`, { status }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setReservations(prev => prev.map(res =>
                res.id === id ? { ...res, status: status === 'approved' ? 'approved' : 'rejected' } : res
            ));
            const title = reservations.find(r => r.id === id)?.activity_event || `#${id}`;
            addToast(`Reservation ${title} ${status === 'approved' ? 'APPROVED' : 'DENIED'}`, status === 'approved' ? 'success' : 'error');
        } catch (error) {
            console.error("Error updating status", error);
            addToast('Failed to update status', 'error');
        }
    };

    

    const handleView = (reservation) => {
        setSelectedReservation(reservation);
        setIsViewModalOpen(true);
    };

    const isAdmin = user?.role === 'admin' || user?.role === 'staff'; // Adjust based on your role names

    const venueNames = {
        hrdc_hall: 'HRDC Hall',
        av_studio: 'AV Studio',
        bleacher: 'Bleacher',
        alba_hall: 'Alba Hall',
        student_center_mini_theater: 'Student Center Mini-Theater',
        cte_training_hall_2_or_3: 'CTE Training Hall',
        admin_building_2nd_floor: 'Admin Ballroom 2F',
        multi_purpose_hall_3f: 'Multi-Purpose Hall 3F',
        hum_av_theater: 'Hum. AV Theater',
        hrdc_quad_stage: 'HRDC Quad Stage',
        dance_studio_hall_3f: 'Dance Studio',
        cme_gym: 'CME Gym',
        classroom_specify: 'Classroom',
        laboratory_room_specify: 'Laboratory Room',
        library_grounds: 'Library Grounds',
        hrdc_quadrangle_stage: 'ORC Quadrangle/Stage',
        others_venue_specify: 'Others'
    };

    const venueKeys = Object.keys(venueNames);
    const venuesOptionList = [{ key: 'all', label: 'All Venues' }].concat(
        venueKeys.map(k => ({ key: k, label: venueNames[k] }))
    );

    const allVenueLabels = (() => {
        const list = (venues || [])
            .map(v => String(v?.name || '').trim())
            .filter(Boolean);
        if (list.length > 0) return Array.from(new Set(list));
        return Array.from(new Set(Object.values(venueNames)));
    })();

    const getPrimaryVenueKey = (res) => {
        for (const key of venueKeys) {
            if (res[key]) return key;
        }
        return null;
    };

    const getPrimaryVenueName = (res) => {
        const key = getPrimaryVenueKey(res);
        if (key) return venueNames[key];
        {
            const o = String(res.others_venue_specify || '').trim();
            if (o && !/^\d+$/.test(o)) return o;
        }
        return 'Venue';
    };

    const parseDate = (s) => {
        if (!s) return null;
        if (s.includes('-')) {
            const [yy, mm, dd] = s.split('-').map(Number);
            return new Date(yy || 1970, (mm || 1) - 1, dd || 1);
        }
        const dt = new Date(s);
        return isNaN(dt) ? null : dt;
    };

    const rangeFor = (type, startYm) => {
        const [yStr, mStr] = (startYm || '').split('-');
        const y = Number(yStr) || new Date().getFullYear();
        const m = Number(mStr) || 1;
        const start = new Date(y, m - 1, 1);
        const months = type === 'month' ? 1 : type === 'quarter' ? 3 : 12;
        const end = new Date(y, m - 1 + months, 0);
        return { start, end };
    };

    const parseTimeToMinutes = (t) => {
        if (!t) return 0;
        const [hh, mm] = String(t).split(':').map(Number);
        if (Number.isNaN(hh)) return 0;
        return (hh || 0) * 60 + (mm || 0);
    };

    const durationHours = (startT, endT) => {
        const s = parseTimeToMinutes(startT);
        const e = parseTimeToMinutes(endT);
        const diff = Math.max(e - s, 0);
        return diff / 60;
    };



    const filterInRange = (type, startYm) => {
        const { start, end } = rangeFor(type, startYm);
        return reservations.filter(r => {
            const d = parseDate(r.date_of_use);
            return d && d >= start && d <= end;
        });
    };

    const summaryStats = (list) => {
        const total = list.length;
        const approved = list.filter(r => r.status === 'approved').length;
        const pending = list.filter(r => r.status === 'pending').length;
        const rejected = list.filter(r => r.status === 'rejected').length;
        const byVenue = {};
        allVenueLabels.forEach(label => {
            byVenue[label] = 0;
        });
        list.forEach(r => {
            const v = getPrimaryVenueName(r);
            byVenue[v] = (byVenue[v] || 0) + 1;
        });
        return { total, approved, pending, rejected, byVenue };
    };

    const buildCsv = (type, startYm, list) => {
        const { start, end } = rangeFor(type, startYm);
        const s = summaryStats(list);
        const lines = [];
        const ymd = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };
        lines.push(`Period,${ymd(start)},${ymd(end)}`);
        lines.push(`Total,${s.total}`);
        lines.push(`Approved,${s.approved}`);
        lines.push(`Pending,${s.pending}`);
        lines.push(`Rejected,${s.rejected}`);
        lines.push('Venue,Count');
        Object.entries(s.byVenue).forEach(([v, c]) => {
            lines.push(`${v},${c}`);
        });
        return lines.join('\n');
    };

    const handleDownloadSummary = () => {
        const list = filterInRange(summaryType, summaryStart);
        const csv = buildCsv(summaryType, summaryStart, list);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const { start, end } = rangeFor(summaryType, summaryStart);
        const ymdName = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };
        const fname = `Summary_${ymdName(start)}_${ymdName(end)}.csv`;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fname;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    };

    const handlePrintSummary = () => {
        const list = filterInRange(summaryType, summaryStart);
        const { start, end } = rangeFor(summaryType, summaryStart);
        const s = summaryStats(list);
        const venueRows = Object.entries(s.byVenue)
            .sort((a, b) => b[1] - a[1])
            .map(([v, c]) => `<tr><td style="padding:8px;border:1px solid #ddd">${v}</td><td style="padding:8px;border:1px solid #ddd;text-align:right">${c}</td></tr>`)
            .join('');
        const html = `
<html>
<head>
<title>Summary Report</title>
<style>
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111}
h1{font-size:20px;margin:0 0 8px}
.table{border-collapse:collapse;width:100%}
.meta{margin-bottom:12px;color:#475569}
.stat{display:inline-block;margin-right:16px}
</style>
</head>
<body>
<h1>Summary Report</h1>
<div class="meta">Period: ${new Intl.DateTimeFormat('en-PH',{year:'numeric',month:'long',day:'2-digit',timeZone:'Asia/Manila'}).format(start)} to ${new Intl.DateTimeFormat('en-PH',{year:'numeric',month:'long',day:'2-digit',timeZone:'Asia/Manila'}).format(end)}</div>
<div class="stat">Total: <strong>${s.total}</strong></div>
<div class="stat">Approved: <strong>${s.approved}</strong></div>
<div class="stat">Pending: <strong>${s.pending}</strong></div>
<div class="stat">Rejected: <strong>${s.rejected}</strong></div>
<h2 style="margin-top:16px;font-size:16px">By Venue</h2>
<table class="table">
<thead><tr><th style="padding:8px;border:1px solid #ddd;text-align:left">Venue</th><th style="padding:8px;border:1px solid #ddd;text-align:right">Count</th></tr></thead>
<tbody>${venueRows}</tbody>
</table>
</body>
</html>
`;
        const w = window.open('', '_blank', 'noopener,noreferrer');
        if (!w) return;
        w.document.write(html);
        w.document.close();
        w.focus();
        w.print();
    };

    const handleViewSummary = () => {
        const list = filterInRange(summaryType, summaryStart);
        const { start, end } = rangeFor(summaryType, summaryStart);
        const s = summaryStats(list);
        const venueRows = Object.entries(s.byVenue)
            .sort((a, b) => b[1] - a[1])
            .map(([v, c]) => `<tr><td style="padding:8px;border:1px solid #ddd">${v}</td><td style="padding:8px;border:1px solid #ddd;text-align:right">${c}</td></tr>`)
            .join('');
        const html = `
<html>
<head>
<title>Summary Report</title>
<style>
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111}
h1{font-size:20px;margin:0 0 8px}
.table{border-collapse:collapse;width:100%}
.meta{margin-bottom:12px;color:#475569}
.stat{display:inline-block;margin-right:16px}
</style>
</head>
<body>
<h1>Summary Report</h1>
<div class="meta">Period: ${new Intl.DateTimeFormat('en-PH',{year:'numeric',month:'long',day:'2-digit',timeZone:'Asia/Manila'}).format(start)} to ${new Intl.DateTimeFormat('en-PH',{year:'numeric',month:'long',day:'2-digit',timeZone:'Asia/Manila'}).format(end)}</div>
<div class="stat">Total: <strong>${s.total}</strong></div>
<div class="stat">Approved: <strong>${s.approved}</strong></div>
<div class="stat">Pending: <strong>${s.pending}</strong></div>
<div class="stat">Rejected: <strong>${s.rejected}</strong></div>
<h2 style="margin-top:16px;font-size:16px">By Venue</h2>
<table class="table">
<thead><tr><th style="padding:8px;border:1px solid #ddd;text-align:left">Venue</th><th style="padding:8px;border:1px solid #ddd;text-align:right">Count</th></tr></thead>
<tbody>${venueRows}</tbody>
</table>
</body>
</html>
`;
        const w = window.open('', '_blank', 'noopener,noreferrer');
        if (!w) return;
        w.document.write(html);
        w.document.close();
        w.focus();
    };
    const SLOT_CAPACITY = 7;

    const formatTime12h = (t) => {
        if (!t) return '';
        const [h, m] = t.split(':').map(Number);
        const date = new Date(1970, 0, 1, h || 0, m || 0, 0);
        return new Intl.DateTimeFormat('en-PH', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Manila'
        }).format(date).replace(' ', '');
    };

    const formatDatePH = (s) => {
        if (!s) return '';
        const d = new Date(s);
        return new Intl.DateTimeFormat('en-PH', {
            year: 'numeric',
            month: 'long',
            day: '2-digit',
            timeZone: 'Asia/Manila'
        }).format(d);
    };

    const occupancyFor = (res) => {
        const key = getPrimaryVenueKey(res);
        if (!key) return { approved: 0, open: SLOT_CAPACITY, label: 'Available' };
        const approved = reservations.filter(r =>
            r.date_of_use === res.date_of_use && r.status === 'approved' && r[key]
        ).length;
        const open = Math.max(SLOT_CAPACITY - approved, 0);
        const label = approved === 0 ? 'Available' : (open > 0 ? 'Semi-booked' : 'Fully booked');
        return { approved, open, label };
    };

    const rangeForDashboard = (period, ym) => {
        const [yStr, mStr] = String(ym || '').split('-');
        const y = Number(yStr) || new Date().getFullYear();
        const m = Number(mStr) || (new Date().getMonth() + 1);
        if (period === 'year') {
            return { start: new Date(y, 0, 1), end: new Date(y, 11, 31) };
        }
        if (period === 'week') {
            const now = new Date();
            const base = (now.getFullYear() === y && now.getMonth() + 1 === m) ? now : new Date(y, m - 1, 1);
            const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
            const day = d.getDay();
            const diff = day === 0 ? -6 : (1 - day);
            const start = new Date(d);
            start.setDate(d.getDate() + diff);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            return { start, end };
        }
        return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0) };
    };

    const filterByRange = (range) => {
        const { start, end } = range;
        return reservations.filter(r => {
            const d = parseDate(r.date_of_use);
            return d && d >= start && d <= end;
        });
    };

    const shiftRangeBack = (period, range) => {
        const start = new Date(range.start);
        const end = new Date(range.end);
        if (period === 'year') {
            start.setFullYear(start.getFullYear() - 1);
            end.setFullYear(end.getFullYear() - 1);
            return { start, end };
        }
        if (period === 'week') {
            start.setDate(start.getDate() - 7);
            end.setDate(end.getDate() - 7);
            return { start, end };
        }
        start.setMonth(start.getMonth() - 1);
        end.setMonth(end.getMonth() - 1);
        return { start, end };
    };

    const periodLabel = dashboardPeriod === 'week' ? 'week' : dashboardPeriod === 'year' ? 'year' : 'month';
    const dashboardRange = rangeForDashboard(dashboardPeriod, pieMonth);
    const dashboardList = filterByRange(dashboardRange);
    const prevList = filterByRange(shiftRangeBack(dashboardPeriod, dashboardRange));

    const statsNow = useMemo(() => summaryStats(dashboardList), [dashboardList]);
    const statsPrev = useMemo(() => summaryStats(prevList), [prevList]);

    const pctChange = (now, prev) => {
        const n = Number(now) || 0;
        const p = Number(prev) || 0;
        if (p === 0) return n === 0 ? 0 : 100;
        return Math.round(((n - p) / p) * 100);
    };

    const totalNow = statsNow.total;
    const approvedNow = statsNow.approved;
    const pendingNow = statsNow.pending;
    const deniedNow = statsNow.rejected;

    const approvalRate = totalNow > 0 ? Math.round((approvedNow / totalNow) * 100) : 0;
    const statusDonutData = {
        labels: ['Approved', 'Pending', 'Denied'],
        datasets: [
            {
                data: [approvedNow, pendingNow, deniedNow],
                backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
                borderColor: '#ffffff',
                borderWidth: 2,
                hoverOffset: 2
            }
        ]
    };
    const statusDonutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
            legend: { display: false },
            tooltip: { enabled: true }
        }
    };

    const venueCounts = Object.entries(statsNow.byVenue)
        .filter(([, c]) => c > 0)
        .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]));
    const topVenues = venueCounts.slice(0, 6);
    const venueBarData = {
        labels: topVenues.map(([label]) => label),
        datasets: [
            {
                data: topVenues.map(([, c]) => c),
                backgroundColor: '#3b82f6',
                borderRadius: 8,
                barThickness: 20
            }
        ]
    };
    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { enabled: true }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: {
                    autoSkip: true,
                    maxRotation: 45,
                    minRotation: 0
                }
            },
            y: {
                beginAtZero: true,
                grid: { color: '#eef2ff' },
                ticks: { precision: 0 }
            }
        }
    };

    const statCards = useMemo(() => ([
        {
            title: 'Total Reservations',
            value: totalNow,
            accent: 'border-blue-500',
            iconBg: 'bg-blue-100 text-blue-700',
            icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <path d="M8 7V3m8 4V3M3 9h18M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
            ),
            onClick: () => navigate('/reservations?status=all'),
            delta: pctChange(totalNow, statsPrev.total)
        },
        {
            title: 'Approved',
            value: approvedNow,
            accent: 'border-green-500',
            iconBg: 'bg-green-100 text-green-700',
            icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            onClick: () => navigate('/reservations?status=approved'),
            delta: pctChange(approvedNow, statsPrev.approved)
        },
        {
            title: 'Pending',
            value: pendingNow,
            accent: 'border-yellow-500',
            iconBg: 'bg-yellow-100 text-yellow-700',
            icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2" />
                </svg>
            ),
            onClick: () => navigate('/reservations?status=pending'),
            delta: pctChange(pendingNow, statsPrev.pending)
        },
        {
            title: 'Denied',
            value: deniedNow,
            accent: 'border-red-500',
            iconBg: 'bg-red-100 text-red-700',
            icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
            ),
            onClick: () => navigate('/reservations?status=rejected'),
            delta: pctChange(deniedNow, statsPrev.rejected)
        }
    ]), [approvedNow, deniedNow, navigate, pendingNow, statsPrev, totalNow]);

    const monthLabel = useMemo(() => {
        const [yStr, mStr] = String(pieMonth || '').split('-');
        const y = Number(yStr);
        const m = Number(mStr);
        if (!y || !m) return 'Select month';
        const dt = new Date(y, m - 1, 1);
        return new Intl.DateTimeFormat('en-PH', { month: 'long', year: 'numeric', timeZone: 'Asia/Manila' }).format(dt);
    }, [pieMonth]);

    const recentReservations = useMemo(() => {
        return [...reservations]
            .sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0))
            .slice(0, 3);
    }, [reservations]);

    const notifications = useMemo(() => {
        const pick = (status) => {
            return [...reservations]
                .filter(r => r.status === status)
                .sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0))[0] || null;
        };
        const pending = pick('pending');
        const approved = pick('approved');
        const rejected = pick('rejected');
        return [
            pending && {
                key: `pending-${pending.id}`,
                title: 'New reservation request',
                subtitle: `${getPrimaryVenueName(pending)} • ${formatDatePH(pending.date_of_use)}`,
                iconBg: 'bg-blue-100 text-blue-700',
                icon: (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <path d="M8 7V3m8 4V3M3 9h18M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                )
            },
            pendingNow > 0 && !pending && {
                key: 'pending-generic',
                title: 'Reservation pending',
                subtitle: `${pendingNow} request(s) awaiting review`,
                iconBg: 'bg-yellow-100 text-yellow-700',
                icon: (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2" />
                    </svg>
                )
            },
            approved && {
                key: `approved-${approved.id}`,
                title: 'Reservation approved',
                subtitle: `${getPrimaryVenueName(approved)} • ${formatDatePH(approved.date_of_use)}`,
                iconBg: 'bg-green-100 text-green-700',
                icon: (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                )
            },
            rejected && {
                key: `rejected-${rejected.id}`,
                title: 'Reservation denied',
                subtitle: `${getPrimaryVenueName(rejected)} • ${formatDatePH(rejected.date_of_use)}`,
                iconBg: 'bg-red-100 text-red-700',
                icon: (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                )
            }
        ].filter(Boolean).slice(0, 3);
    }, [approvedNow, formatDatePH, getPrimaryVenueName, pendingNow, deniedNow, reservations]);

    const mostUsedVenue = topVenues[0]?.[0] || null;
    const peakDay = useMemo(() => {
        const byDow = new Map();
        dashboardList.forEach(r => {
            const d = parseDate(r.date_of_use);
            if (!d) return;
            const label = new Intl.DateTimeFormat('en-PH', { weekday: 'long', timeZone: 'Asia/Manila' }).format(d);
            byDow.set(label, (byDow.get(label) || 0) + 1);
        });
        const list = Array.from(byDow.entries()).sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]));
        return list[0]?.[0] || null;
    }, [dashboardList]);

    return (
        <div>
            {toasts.length > 0 && (
                <div className="fixed top-4 right-4 z-[60] w-96 max-w-[calc(100vw-2rem)] space-y-2">
                    {toasts.map(t => {
                        const theme =
                            t.type === 'success' ? 'border-green-500' :
                            t.type === 'error' ? 'border-red-500' :
                            'border-blue-500';
                        const iconColor =
                            t.type === 'success' ? 'text-green-600' :
                            t.type === 'error' ? 'text-red-600' :
                            'text-blue-600';
                        const iconPath =
                            t.type === 'success'
                                ? 'M20 6 9 17l-5-5'
                                : t.type === 'error'
                                    ? 'M6 6l12 12M18 6 6 18'
                                    : 'M12 9v4m0 4h.01';
                        return (
                            <div key={t.id} className={`bg-white border border-gray-200 ${theme} border-l-4 rounded-2xl shadow-sm p-3 flex items-start gap-3`}>
                                <div className={`mt-0.5 ${iconColor}`}>
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                                        <path d={iconPath} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <div className="flex-1 text-sm font-semibold text-gray-900">{t.message}</div>
                                <button
                                    type="button"
                                    onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                                    className="text-gray-400 hover:text-gray-600"
                                    aria-label="Close notification"
                                    title="Close"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                                        <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
            {loading ? (
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="relative flex w-64 animate-pulse gap-2 p-4">
                        <div className="h-12 w-12 rounded-full bg-slate-400"></div>
                        <div className="flex-1">
                            <div className="mb-1 h-5 w-3/5 rounded-lg bg-slate-400 text-lg"></div>
                            <div className="h-5 w-[90%] rounded-lg bg-slate-400 text-sm"></div>
                        </div>
                        <div className="absolute bottom-5 right-0 h-4 w-4 rounded-full bg-slate-400"></div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                    <div className="text-sm text-gray-500">Welcome back! Here's what's happening with your venues.</div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <div className="relative inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
                        <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="none">
                            <path d="M8 7V3m8 4V3M3 9h18M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <div className="text-sm font-semibold text-gray-800">{monthLabel}</div>
                        <svg className="w-4 h-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z" clipRule="evenodd" />
                        </svg>
                        <input
                            type="month"
                            value={pieMonth}
                            onChange={(e) => setPieMonth(e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            aria-label="Select month"
                        />
                    </div>
                    <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
                        {[
                            { key: 'week', label: 'This Week' },
                            { key: 'month', label: 'This Month' },
                            { key: 'year', label: 'This Year' }
                        ].map(t => (
                            <button
                                key={t.key}
                                type="button"
                                onClick={() => setDashboardPeriod(t.key)}
                                className={`px-3 py-2 text-sm rounded-lg font-semibold transition-colors ${dashboardPeriod === t.key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map(card => {
                    const delta = card.delta;
                    const up = delta >= 0;
                    return (
                        <button
                            key={card.title}
                            type="button"
                            onClick={card.onClick}
                            className={`text-left bg-white rounded-2xl shadow-sm border border-gray-200 border-l-4 ${card.accent} p-4 hover:shadow-md transition-shadow`}
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="text-sm text-gray-500 font-semibold">{card.title}</div>
                                    <div className="mt-1 text-3xl font-bold text-gray-900">{card.value}</div>
                                </div>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                                    {card.icon}
                                </div>
                            </div>
                            <div className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold ${up ? 'text-green-600' : 'text-red-600'}`}>
                                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d={up ? 'M10 3l5 6H5l5-6z' : 'M10 17l-5-6h10l-5 6z'} />
                                </svg>
                                <span>{Math.abs(delta)}%</span>
                                <span className="text-gray-500 font-medium">vs last {periodLabel}</span>
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-5 bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                        <div className="font-semibold text-gray-900">Reservation Status</div>
                        <div className="text-xs font-semibold text-gray-500">{dashboardPeriod === 'week' ? 'This Week' : dashboardPeriod === 'year' ? 'This Year' : 'This Month'}</div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                        <div className="relative h-[220px]">
                            {totalNow === 0 ? (
                                <div className="h-full flex items-center justify-center text-sm text-gray-500">No data available</div>
                            ) : (
                                <>
                                    <Doughnut data={statusDonutData} options={statusDonutOptions} />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <div className="text-3xl font-extrabold text-gray-900">{approvalRate}%</div>
                                        <div className="text-xs font-semibold text-gray-500">Approval Rate</div>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="space-y-3">
                            {[
                                { label: 'Approved', value: approvedNow, color: 'bg-green-500' },
                                { label: 'Pending', value: pendingNow, color: 'bg-yellow-500' },
                                { label: 'Denied', value: deniedNow, color: 'bg-red-500' }
                            ].map(row => (
                                <div key={row.label} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2.5 h-2.5 rounded-full ${row.color}`} />
                                        <div className="text-sm font-semibold text-gray-700">{row.label}</div>
                                    </div>
                                    <div className="text-sm font-bold text-gray-900">{row.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-4 bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                        <div className="font-semibold text-gray-900">Venue Usage</div>
                        <button
                            type="button"
                            onClick={() => navigate('/reports')}
                            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                        >
                            View Details
                        </button>
                    </div>
                    <div className="mt-4 h-[260px]">
                        {topVenues.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-sm text-gray-500">No data available</div>
                        ) : (
                            <Bar data={venueBarData} options={barOptions} />
                        )}
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                        <div className="font-semibold text-gray-900 flex items-center gap-2">
                            <span>Notifications</span>
                            {pendingNow > 0 && <span className="w-2 h-2 rounded-full bg-red-500" />}
                        </div>
                        <button
                            type="button"
                            onClick={() => localStorage.setItem('lastSeenPendingCount', String(pendingNow))}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                        >
                            Mark all as read
                        </button>
                    </div>
                    <div className="mt-4 space-y-3">
                        {notifications.length === 0 ? (
                            <div className="text-sm text-gray-500">No notifications</div>
                        ) : (
                            notifications.map(n => (
                                <button
                                    key={n.key}
                                    type="button"
                                    onClick={() => navigate('/reservations?status=pending')}
                                    className="w-full text-left flex items-start gap-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 p-3 transition-colors"
                                >
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${n.iconBg}`}>
                                        {n.icon}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold text-gray-900 truncate">{n.title}</div>
                                        <div className="text-xs text-gray-500 truncate">{n.subtitle}</div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate('/reservations?status=pending')}
                        className="mt-4 w-full text-sm font-semibold text-blue-600 hover:text-blue-700"
                    >
                        View all notifications →
                    </button>
                </div>

                <div className="col-span-12 lg:col-span-8 bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                        <div className="font-semibold text-gray-900">Recent Reservations</div>
                        <button
                            type="button"
                            onClick={() => navigate('/reservations?status=all')}
                            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                        >
                            View All
                        </button>
                    </div>
                    <div className="mt-4 overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                                    <th className="py-2 pr-4">Event</th>
                                    <th className="py-2 pr-4">Venue</th>
                                    <th className="py-2 pr-4">Date</th>
                                    <th className="py-2 pr-4">Status</th>
                                    <th className="py-2">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {recentReservations.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-6 text-center text-gray-500">No reservations</td>
                                    </tr>
                                ) : (
                                    recentReservations.map(res => {
                                        const statusStyle =
                                            res.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                                            res.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                            'bg-red-50 text-red-700 border-red-200';
                                        const statusLabel =
                                            res.status === 'approved' ? 'Approved' :
                                            res.status === 'pending' ? 'Pending' :
                                            'Denied';
                                        return (
                                            <tr key={res.id} className="hover:bg-gray-50">
                                                <td className="py-3 pr-4 font-semibold text-gray-900 whitespace-nowrap">{res.activity_event || '-'}</td>
                                                <td className="py-3 pr-4 text-gray-700 whitespace-nowrap">{getPrimaryVenueName(res)}</td>
                                                <td className="py-3 pr-4 text-gray-700 whitespace-nowrap">{formatDatePH(res.date_of_use)}</td>
                                                <td className="py-3 pr-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusStyle}`}>
                                                        {statusLabel}
                                                    </span>
                                                </td>
                                                <td className="py-3 whitespace-nowrap">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleView(res)}
                                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold"
                                                    >
                                                        View
                                                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 0 1 0-1.414L10.586 10 7.293 6.707a1 1 0 1 1 1.414-1.414l4 4a1 1 0 0 1 0 1.414l-4 4a1 1 0 0 1-1.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                        <div className="font-semibold text-gray-900">Insights</div>
                        <div className="mt-4 space-y-3">
                            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                                <div className="text-xs font-semibold text-blue-700">Most Used Venue</div>
                                <div className="mt-1 font-bold text-gray-900">{mostUsedVenue || '—'}</div>
                                <div className="text-xs text-gray-600 mt-1">{mostUsedVenue ? `${topVenues[0]?.[1] || 0} booking(s) this ${periodLabel}` : 'No data for this period'}</div>
                            </div>
                            <div className="rounded-2xl border border-yellow-100 bg-yellow-50 p-4">
                                <div className="text-xs font-semibold text-yellow-700">Peak Day</div>
                                <div className="mt-1 font-bold text-gray-900">{peakDay || '—'}</div>
                                <div className="text-xs text-gray-600 mt-1">{peakDay ? `Highest activity this ${periodLabel}` : 'No data for this period'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ReservationDetailsModal 
                isOpen={isViewModalOpen} 
                onClose={() => setIsViewModalOpen(false)} 
                reservation={selectedReservation} 
                isAdmin={isAdmin}
                onStatusUpdate={handleStatusUpdate}
                onNotify={(msg, type) => addToast(msg, type)}
            />

                </div>
            )}
        </div>
    );
};

export default Dashboard;
