import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import ReservationDetailsModal from '../components/ReservationDetailsModal';
import html2pdf from 'html2pdf.js';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const Dashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [reservations, setReservations] = useState([]);
    const [venues, setVenues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [selectedReservation, setSelectedReservation] = useState(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
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
        setCurrentPage(1);
    }, [searchTerm]);

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

            // Update local state
            setReservations(reservations.map(res => 
                res.id === id ? { ...res, status: status === 'approved' ? 'approved' : 'rejected' } : res
            ));
        } catch (error) {
            console.error("Error updating status", error);
            alert("Failed to update status");
        }
    };

    

    const handleView = (reservation) => {
        setSelectedReservation(reservation);
        setIsViewModalOpen(true);
    };

    if (loading) return (
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
    );

    const isAdmin = user?.role === 'admin' || user?.role === 'staff'; // Adjust based on your role names

    const getVenuesString = (res) => {
        const venues = [];
        if (res.hrdc_hall) venues.push('HRDC Hall');
        if (res.av_studio) venues.push('AV Studio');
        if (res.bleacher) venues.push('Bleacher');
        if (res.alba_hall) venues.push('Alba Hall');
        if (res.student_center_mini_theater) venues.push('Mini Theater');
        if (res.cte_training_hall_2_or_3) venues.push('CTE Training Hall');
        if (res.admin_building_2nd_floor) venues.push('Admin Bldg 2nd Floor');
        if (res.hrdc_quad_stage) venues.push('HRDC Quad Stage');
        if (res.dance_studio_hall_3f) venues.push('Dance Studio');
        if (res.cme_gym) venues.push('CME Gym');
        if (res.library_grounds) venues.push('Library Grounds');
        if (res.hrdc_quadrangle_stage) venues.push('HRDC Quadrangle');
        {
            const o = String(res.others_venue_specify || '').trim();
            if (o && !/^\d+$/.test(o)) venues.push(o);
        }
        return venues.join(', ') || 'None';
    };

    const getAudioString = (res) => {
        const items = [];
        if (res.amplifier_qty > 0) items.push(`Amp: ${res.amplifier_qty}`);
        if (res.speaker_qty > 0) items.push(`Speaker: ${res.speaker_qty}`);
        if (res.microphone_qty > 0) items.push(`Mic: ${res.microphone_qty}`);
        if (res.audio_others_qty > 0) items.push(`Other: ${res.audio_others_qty}`);
        return items.join(', ') || 'None';
    };

    const getVideoString = (res) => {
        const items = [];
        if (res.video_showing_qty > 0) items.push(`Showing: ${res.video_showing_qty}`);
        if (res.video_editing_qty > 0) items.push(`Editing: ${res.video_editing_qty}`);
        if (res.video_coverage_qty > 0) items.push(`Coverage: ${res.video_coverage_qty}`);
        if (res.video_others_qty > 0) items.push(`Other: ${res.video_others_qty}`);
        return items.join(', ') || 'None';
    };

    const getLightingString = (res) => {
        const items = [];
        if (res.follow_spot_qty > 0) items.push(`Spot: ${res.follow_spot_qty}`);
        if (res.house_light_qty > 0) items.push(`House: ${res.house_light_qty}`);
        if (res.electric_fans_qty > 0) items.push(`Fans: ${res.electric_fans_qty}`);
        if (res.lighting_others_qty > 0) items.push(`Other: ${res.lighting_others_qty}`);
        return items.join(', ') || 'None';
    };

    const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december'];
    const monthAbbr = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

    const matchMonthSearch = (dateStr, searchLower) => {
        const d = parseDate(dateStr);
        if (!d) return false;
        const y = d.getFullYear();
        const m = d.getMonth();
        const ym = `${y}-${String(m + 1).padStart(2, '0')}`;
        const tokens = [
            ym,
            monthNames[m],
            monthAbbr[m],
            `${monthNames[m]} ${y}`,
            `${monthAbbr[m]} ${y}`,
            `${String(m + 1).padStart(2, '0')}/${y}`,
            `${y}/${String(m + 1).padStart(2, '0')}`
        ];
        return tokens.some(t => t.includes(searchLower));
    };

    const reservationHaystack = (res) => {
        const parts = [];
        const activity = (res.activity_event || '').toLowerCase();
        const party = (res.requesting_party || '').toLowerCase();
        const idStr = String(res.id ?? '');
        const orStr = String(res.or_number ?? '');
        const dateRaw = String(res.date_of_use || '');
        parts.push(activity, party, idStr, orStr, dateRaw);
        try {
            if (res.date_of_use) {
                const d = new Date(res.date_of_use);
                if (!isNaN(d)) {
                    const monthNamesFull = ['january','february','march','april','may','june','july','august','september','october','november','december'];
                    const monthNamesAbbr = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    const full = `${monthNamesFull[d.getMonth()]} ${dd}, ${yyyy}`;
                    const abbr = `${monthNamesAbbr[d.getMonth()]} ${dd}, ${yyyy}`;
                    const slashes = `${mm}/${dd}/${yyyy}`;
                    const ym = `${yyyy}-${mm}`;
                    parts.push(full.toLowerCase(), abbr.toLowerCase(), slashes.toLowerCase(), ym);
                }
            }
        } catch (_) {}
        const venuesStr = getVenuesString(res).toLowerCase();
        parts.push(venuesStr);
        return parts.filter(Boolean).join(' | ');
    };
    const filteredReservations = reservations.filter(res => {
        const s = (searchTerm || '').trim().toLowerCase();
        if (!s) return true;
        const hay = reservationHaystack(res);
        if (hay.includes(s)) return true;
        if (matchMonthSearch(res.date_of_use, s)) return true;
        return false;
    });
    const PAGE_SIZE = 5;
    const totalPages = Math.max(1, Math.ceil(filteredReservations.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * PAGE_SIZE;
    const paginatedReservations = filteredReservations.slice(startIndex, startIndex + PAGE_SIZE);

    const venueNames = {
        hrdc_hall: 'HRDC Hall',
        av_studio: 'AV Studio',
        bleacher: 'Bleacher',
        alba_hall: 'Alba Hall',
        student_center_mini_theater: 'Student Center Mini-Theater',
        cte_training_hall_2_or_3: 'CTE Training Hall',
        admin_building_2nd_floor: 'Admin Ballroom 2F',
        hrdc_quad_stage: 'HRDC Quad Stage',
        dance_studio_hall_3f: 'Dance Studio',
        cme_gym: 'CME Gym',
        library_grounds: 'Library Grounds',
        hrdc_quadrangle_stage: 'ORC Quadrangle/Stage'
    };

    const venueKeys = Object.keys(venueNames);
    const venuesOptionList = [{ key: 'all', label: 'All Venues' }].concat(
        venueKeys.map(k => ({ key: k, label: venueNames[k] }))
    );

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

    const effectivePieMonth = pieMonth || summaryStart;
    const usageList = filterInRange('month', effectivePieMonth);
    const pieList = usageList.filter(r => pieFilter === 'all' ? true : r.status === pieFilter);
    const usageStats = summaryStats(pieList);
    const venueUsage = Object.entries(usageStats.byVenue).sort((a, b) => b[1] - a[1]);
    const usageTotal = usageStats.total;
    const pieColors = [
        '#6597e9',
        '#56ecba',
        '#ecb960',
        '#eb5959',
        '#936cec',
        '#71def1',
        '#bcec72',
        '#ee70af',
        '#6ae9da',
        '#b877f5',
        '#f39a6a',
        '#70cdf8'
    ];
    const pieData = {
        labels: venueUsage.map(([label]) => label),
        datasets: [
            {
                data: venueUsage.map(([, count]) => count),
                backgroundColor: pieColors.slice(0, venueUsage.length),
                borderColor: '#e5e7eb',
                borderWidth: 1
            }
        ]
    };
    const pieOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { enabled: true }
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Admin Dashboard</h2>
            
        {!isAdmin && (
            <div className="mb-8 space-y-4">
                {filteredReservations.map((res) => {
                    const occ = occupancyFor(res);
                    const venueLabel = getPrimaryVenueName(res);
                    const statusBadge =
                        res.status === 'approved' ? 'BOOKED' :
                        res.status === 'pending' ? 'REQUESTED' :
                        'REJECTED';
                    return (
                        <div key={res.id} className="border rounded-xl bg-white shadow-sm p-4 hover:shadow-md transition-colors">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-semibold text-gray-900">{venueLabel}</h3>
                                    <p className="text-xs text-gray-500">7 fixed slots per day</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border
                                    ${occ.label === 'Semi-booked' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                      occ.label === 'Fully booked' ? 'bg-red-50 text-red-700 border-red-200' :
                                      'bg-green-50 text-green-700 border-green-200'}`}>
                                    {occ.label}
                                </span>
                            </div>
                            <div className="mt-3 text-sm font-medium text-gray-700 flex items-center gap-2">
                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                {occ.open} of {SLOT_CAPACITY} slots still open
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                                <div className="text-blue-900 font-bold">{res.activity_event}</div>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border
                                    ${res.status === 'approved' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                                      res.status === 'pending' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
                                      'bg-red-50 text-red-800 border-red-200'}`}>
                                    {statusBadge}
                                </span>
                            </div>
                            <div className="mt-1 text-sm text-gray-600">
                                {formatTime12h(res.inclusive_time_start)} - {formatTime12h(res.inclusive_time_end)} • {res.requesting_party}
                            </div>
                        </div>
                    );
                })}
            </div>
        )}

        

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div
                    onClick={() => navigate('/reservations?status=all')}
                    className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500 h-20 flex flex-col justify-center cursor-pointer hover:ring-2 hover:ring-blue-200"
                >
                    <h3 className="text-gray-500 text-sm font-medium">Total Reservations</h3>
                    <p className="text-3xl font-bold text-gray-800">{reservations.length}</p>
                </div>
                <div
                    onClick={() => navigate('/reservations?status=approved')}
                    className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500 h-20 flex flex-col justify-center cursor-pointer hover:ring-2 hover:ring-green-200"
                >
                    <h3 className="text-gray-500 text-sm font-medium">Approved</h3>
                    <p className="text-3xl font-bold text-gray-800">
                        {reservations.filter(r => r.status === 'approved').length}
                    </p>
                </div>
                <div
                    onClick={() => navigate('/reservations?status=pending')}
                    className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500 h-20 flex flex-col justify-center cursor-pointer hover:ring-2 hover:ring-yellow-200"
                >
                    <h3 className="text-gray-500 text-sm font-medium">Pending</h3>
                    <p className="text-3xl font-bold text-gray-800">
                        {reservations.filter(r => r.status === 'pending').length}
                    </p>
                </div>
                <div
                    onClick={() => navigate('/reservations?status=rejected')}
                    className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500 h-20 flex flex-col justify-center cursor-pointer hover:ring-2 hover:ring-red-200"
                >
                    <h3 className="text-gray-500 text-sm font-medium">Denied</h3>
                    <p className="text-3xl font-bold text-gray-800">
                        {reservations.filter(r => r.status === 'rejected').length}
                    </p>
                </div>
            </div>
            <div>
                <div className="bg-white rounded-lg shadow p-8 h-120 w-304 mt-1">
                    
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-700 flex items-center gap-1">
                                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M3 9h18M5 9v10a2 2 0 002 2h10a2 2 0 002-2V9" />
                                    </svg>
                                    Month
                                </span>
                                <input
                                    type="month"
                                    value={pieMonth}
                                    onChange={(e) => setPieMonth(e.target.value)}
                                    className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white"
                                />
                            </div>
                        </div>
                        <div className="mt-4 text-center text-gray-800 font-semibold">Venue Usage</div>
                        {usageTotal === 0 || venueUsage.length === 0 ? (
                            <div className="mt-30 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="flex items-center justify-center mb-2">
                                        <svg className="w-9 h-9 text-gray-500" viewBox="0 0 36 36" fill="none">
                                            <rect x="7" y="5" width="16" height="22" rx="2" stroke="currentColor" strokeWidth="2" />
                                            <rect x="12" y="9" width="4" height="10" rx="1" stroke="currentColor" strokeWidth="2" />
                                            <rect x="12" y="21" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="2" />
                                            <path d="M7 23 L9 23 L7 25 Z" fill="currentColor" />
                                            <circle cx="26" cy="24" r="6" stroke="currentColor" strokeWidth="2" />
                                            <path d="M26 20.5 V27.5 M22.5 24 H29.5 M24.5 22.5 L27.5 25.5 M24.5 25.5 L27.5 22.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                    <div className="text-gray-800 font-semibold">No data available</div>
                                    <div className="text-xs text-gray-500 mt-1">Pick another month</div>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4 flex items-center justify-center gap-8 flex-wrap flex-1">
                                <div className="flex flex-col items-center">
                                    <div style={{ width: 260, height: 260 }}>
                                        <Pie data={pieData} options={pieOptions} />
                                    </div>
                                    <div className="mt-2 text-sm text-gray-700">
                                        <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-800 px-2 py-0.5 rounded">
                                            <span className="font-medium">Total bookings</span>
                                            <span className="font-semibold">{usageTotal}</span>
                                        </span>
                                    </div>
                                </div>
                                <div className="min-w-[240px]">
                                    <div className="text-sm text-gray-600 mb-2">By venue</div>
                                    <div className="space-y-2 max-h-52 overflow-auto pr-2">
                                        {venueUsage.map(([label, count], idx) => {
                                            const pct = usageTotal > 0 ? Math.round((count / usageTotal) * 100) : 0;
                                            return (
                                                <div key={label} className="space-y-1">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="inline-block w-3.5 h-3.5 rounded-full" style={{ backgroundColor: pieColors[idx % pieColors.length] }} />
                                                            <span className="text-sm text-gray-800">{label}</span>
                                                        </div>
                                                        <div className="text-sm text-gray-700">{count} • {pct}%</div>
                                                    </div>
                                                    <div className="w-full bg-gray-100 h-1.5 rounded">
                                                        <div
                                                            className="h-1.5 rounded"
                                                            style={{
                                                                width: `${pct}%`,
                                                                backgroundColor: pieColors[idx % pieColors.length]
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    
                </div>
            </div>
        </div>

        

            {/* Recent Reservations Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden mt-7">
                <div className="px-6 py-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-800">Reservations</h3>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Search event, date, or ID..."
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity/Event</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requesting Party</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date of Use</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inclusive Time</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedReservations.map((res) => (
                                <tr 
                                    key={res.id} 
                                    onClick={() => handleView(res)}
                                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{res.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{res.activity_event}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{res.requesting_party}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDatePH(res.date_of_use)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatTime12h(res.inclusive_time_start)} - {formatTime12h(res.inclusive_time_end)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs border ${
                                                    res.status === 'approved'
                                                        ? 'bg-green-50 text-green-700 border-green-200'
                                                        : res.status === 'pending'
                                                        ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                        : 'bg-red-50 text-red-700 border-red-200'
                                                }`}
                                            >
                                                {res.status === 'approved'
                                                    ? 'Approved'
                                                    : res.status === 'pending'
                                                    ? 'Pending'
                                                    : 'Denied'}
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleView(res);
                                                }}
                                                className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1 rounded hover:bg-blue-100 transition-colors"
                                            >
                                                View
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-4 border-t flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                        {filteredReservations.length === 0
                            ? 'No reservations found'
                            : `Showing ${startIndex + 1}-${Math.min(startIndex + PAGE_SIZE, filteredReservations.length)} of ${filteredReservations.length}`}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            className="px-3 py-1.5 text-sm rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
                            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                            disabled={safePage <= 1}
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-700">
                            Page {safePage} of {totalPages}
                        </span>
                        <button
                            className="px-3 py-1.5 text-sm rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
                            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                            disabled={safePage >= totalPages}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            <ReservationDetailsModal 
                isOpen={isViewModalOpen} 
                onClose={() => setIsViewModalOpen(false)} 
                reservation={selectedReservation} 
                isAdmin={isAdmin}
                onStatusUpdate={handleStatusUpdate}
            />

        </div>
    );
};

export default Dashboard;
