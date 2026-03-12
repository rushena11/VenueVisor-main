import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';

const ViewReports = () => {
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reportTab, setReportTab] = useState('booking_summary');
    const [reportStart, setReportStart] = useState('');
    const [reportEnd, setReportEnd] = useState('');
    const [reportVenue, setReportVenue] = useState('all');
    const [reportStatus, setReportStatus] = useState('all');
    const [reportDept, setReportDept] = useState('');
    const [reportSearch, setReportSearch] = useState('');
    const reportRef = useRef(null);
    const [reportPage, setReportPage] = useState(1);
    const REPORT_PAGE_SIZE = 10;

    useEffect(() => {
        setReportPage(1);
    }, [reportTab, reportStart, reportEnd, reportVenue, reportStatus, reportDept, reportSearch]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const headers = { Authorization: `Bearer ${token}` };
                const resResponse = await axios.get('/api/reservations', { headers });
                setReservations(resResponse.data);
            } catch (error) {
                console.error('Error fetching reservations', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

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
        const o = String(res.others_venue_specify || '').trim();
        if (o && !/^\d+$/.test(o)) return o;
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
    const parseTimeToMinutes = (t) => {
        if (!t) return 0;
        const [hh, mm] = String(t).split(':').map(Number);
        if (Number.isNaN(hh)) return 0;
        return (hh || 0) * 60 + (mm || 0);
    };
    const formatTime12h = (t) => {
        if (!t) return '';
        const [h, m] = String(t).split(':').map(Number);
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
    const setMonthRange = (ym) => {
        if (!ym) {
            setReportStart('');
            setReportEnd('');
            return;
        }
        const [yStr, mStr] = ym.split('-');
        const y = Number(yStr);
        const m = Number(mStr);
        if (!y || !m) return;
        const start = new Date(y, m - 1, 1);
        const end = new Date(y, m, 0);
        const pad = (n) => String(n).padStart(2, '0');
        setReportStart(`${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(1)}`);
        setReportEnd(`${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`);
    };
    const statusBadgeClass = (s) => {
        const st = String(s || '').toLowerCase();
        if (st === 'approved') return 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 ring-1 ring-green-200';
        if (st === 'pending') return 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-800 ring-1 ring-yellow-200';
        if (st === 'rejected') return 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 ring-1 ring-red-200';
        if (st === 'cancelled') return 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 ring-1 ring-gray-300';
        return 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-blue-200';
    };
    const statusRowBgClass = () => '';
    const durationHours = (startT, endT) => {
        const s = parseTimeToMinutes(startT);
        const e = parseTimeToMinutes(endT);
        const diff = Math.max(e - s, 0);
        return diff / 60;
    };
    const withinReportFilters = (r) => {
        if (reportStart) {
            const d = parseDate(r.date_of_use);
            const s = parseDate(reportStart);
            if (d && s && d < s) return false;
        }
        if (reportEnd) {
            const d = parseDate(r.date_of_use);
            const e = parseDate(reportEnd);
            if (d && e && d > e) return false;
        }
        if (reportVenue !== 'all') {
            if (!r[reportVenue]) return false;
        }
        if (reportStatus !== 'all') {
            if ((r.status || '').toLowerCase() !== reportStatus) return false;
        }
        if (reportDept) {
            const v = (r.requesting_party || '').toLowerCase();
            if (!v.includes(reportDept.toLowerCase())) return false;
        }
        if (reportSearch) {
            const s = reportSearch.toLowerCase();
            const hay = [
                String(r.id || ''),
                r.activity_event || '',
                r.requesting_party || '',
                getPrimaryVenueName(r) || '',
                r.date_of_use || '',
                r.inclusive_time_start || '',
                r.inclusive_time_end || ''
            ].join(' | ').toLowerCase();
            if (!hay.includes(s)) return false;
        }
        return true;
    };
    const reportList = reservations.filter(withinReportFilters);

    const groupBy = (arr, keyFn) => {
        const map = new Map();
        arr.forEach(item => {
            const k = keyFn(item);
            const list = map.get(k) || [];
            list.push(item);
            map.set(k, list);
        });
        return map;
    };
    const venueUtilization = (() => {
        const byVenue = {};
        reportList.forEach(r => {
            const key = getPrimaryVenueKey(r);
            const label = key ? venueNames[key] : (r.others_venue_specify || 'Venue');
            byVenue[label] = byVenue[label] || { venue: label, bookings: 0, hours: 0 };
            byVenue[label].bookings += 1;
            byVenue[label].hours += durationHours(r.inclusive_time_start, r.inclusive_time_end);
        });
        const days = (() => {
            if (!reportStart || !reportEnd) return 0;
            const s = parseDate(reportStart);
            const e = parseDate(reportEnd);
            if (!s || !e) return 0;
            return Math.max(0, Math.floor((e - s) / (1000 * 60 * 60 * 24)) + 1);
        })();
        const SLOT_CAPACITY = 7;
        const denom = days > 0 ? days * SLOT_CAPACITY : 0;
        return Object.values(byVenue).map(v => {
            const pct = denom > 0 ? Math.round((v.bookings / denom) * 100) : 0;
            return { ...v, usagePct: pct };
        }).sort((a, b) => b.bookings - a.bookings);
    })();
    const conflicts = (() => {
        const sameDay = groupBy(reportList, r => `${r.date_of_use || ''}`);
        const list = [];
        sameDay.forEach(dayList => {
            const byVenueKey = groupBy(dayList, r => getPrimaryVenueKey(r) || r.others_venue_specify || 'Venue');
            byVenueKey.forEach(vlist => {
                const arr = vlist.slice().sort((a, b) => {
                    const as = parseTimeToMinutes(a.inclusive_time_start);
                    const bs = parseTimeToMinutes(b.inclusive_time_start);
                    return as - bs;
                });
                for (let i = 0; i < arr.length; i++) {
                    for (let j = i + 1; j < arr.length; j++) {
                        const a = arr[i];
                        const b = arr[j];
                        const aS = parseTimeToMinutes(a.inclusive_time_start);
                        const aE = parseTimeToMinutes(a.inclusive_time_end);
                        const bS = parseTimeToMinutes(b.inclusive_time_start);
                        const bE = parseTimeToMinutes(b.inclusive_time_end);
                        if (Math.max(aS, bS) < Math.min(aE, bE) && a.date_of_use === b.date_of_use) {
                            list.push({
                                date: a.date_of_use,
                                venue: getPrimaryVenueName(a),
                                aId: a.id, aStart: a.inclusive_time_start, aEnd: a.inclusive_time_end,
                                bId: b.id, bStart: b.inclusive_time_start, bEnd: b.inclusive_time_end
                            });
                        }
                    }
                }
            });
        });
        return list;
    })();
    const userActivity = (() => {
        const map = {};
        reportList.forEach(r => {
            const userLabel = r.requested_by || r.user?.name || r.user?.email || 'Unknown';
            map[userLabel] = map[userLabel] || { user: userLabel, total: 0, approved: 0, rejected: 0, pending: 0, cancelled: 0 };
            map[userLabel].total += 1;
            const st = (r.status || '').toLowerCase();
            if (st === 'approved') map[userLabel].approved += 1;
            else if (st === 'rejected') map[userLabel].rejected += 1;
            else if (st === 'pending') map[userLabel].pending += 1;
            else if (st === 'cancelled') map[userLabel].cancelled += 1;
        });
        return Object.values(map).sort((a, b) => b.total - a.total);
    })();
    const paginated = (arr) => {
        const start = (reportPage - 1) * REPORT_PAGE_SIZE;
        return arr.slice(start, start + REPORT_PAGE_SIZE);
    };
    const cancelledList = reportList.filter(r => (r.status || '').toLowerCase() === 'cancelled');
    const bookingRows = paginated(reportList);
    const venueUtilizationRows = paginated(venueUtilization);
    const bookingStatusRows = paginated(reportList);
    const userActivityRows = paginated(userActivity);
    const venueAvailabilityRows = paginated(reportList);
    const conflictRows = paginated(conflicts);
    const cancelledRows = paginated(cancelledList);
    const activeTotal = reportTab === 'venue_utilization' ? venueUtilization.length
        : reportTab === 'user_activity' ? userActivity.length
        : reportTab === 'conflicts' ? conflicts.length
        : reportTab === 'cancelled' ? cancelledList.length
        : reportList.length;
    const activePages = Math.max(1, Math.ceil(activeTotal / REPORT_PAGE_SIZE));
    const activeFrom = activeTotal === 0 ? 0 : (reportPage - 1) * REPORT_PAGE_SIZE + 1;
    const activeTo = Math.min(reportPage * REPORT_PAGE_SIZE, activeTotal);

    const exportCsv = (headers, rows, filename) => {
        const lines = [];
        lines.push(headers.join(','));
        rows.forEach(r => {
            lines.push(headers.map(h => {
                const v = r[h] ?? '';
                const s = String(v).replace(/"/g, '""');
                return `"${s}"`;
            }).join(','));
        });
        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    };
    const exportCurrentReportCsv = () => {
        if (reportTab === 'booking_summary') {
            const headers = ['Booking ID','Event Name','Venue Name','Requester Name','Department','Event Date','Time','Status','Approval Info'];
            const rows = reportList.map(r => ({
                'Booking ID': r.id,
                'Event Name': r.activity_event || '',
                'Venue Name': getPrimaryVenueName(r),
                'Requester Name': r.requested_by || r.user?.name || r.user?.email || '',
                'Department': r.requesting_party || '',
                'Event Date': r.date_of_use || '',
                'Time': `${r.inclusive_time_start || ''}-${r.inclusive_time_end || ''}`,
                'Status': r.status || '',
                'Approval Info': r.or_number ? `OR ${r.or_number}` : ''
            }));
            exportCsv(headers, rows, 'Booking_Summary.csv');
        } else if (reportTab === 'venue_utilization') {
            const headers = ['Venue','Total Bookings','Total Hours','Usage %'];
            const rows = venueUtilization.map(v => ({
                'Venue': v.venue,
                'Total Bookings': v.bookings,
                'Total Hours': v.hours.toFixed(2),
                'Usage %': v.usagePct
            }));
            exportCsv(headers, rows, 'Venue_Utilization.csv');
        } else if (reportTab === 'booking_status') {
            const headers = ['ID','Event','Venue','Requester','Date','Time','Status'];
            const rows = reportList.map(r => ({
                'ID': r.id,
                'Event': r.activity_event || '',
                'Venue': getPrimaryVenueName(r),
                'Requester': r.requesting_party || '',
                'Date': r.date_of_use || '',
                'Time': `${r.inclusive_time_start || ''}-${r.inclusive_time_end || ''}`,
                'Status': r.status || ''
            }));
            exportCsv(headers, rows, 'Booking_Status.csv');
        } else if (reportTab === 'user_activity') {
            const headers = ['User','Total','Approved','Rejected','Pending','Cancelled'];
            const rows = userActivity.map(u => ({
                'User': u.user,
                'Total': u.total,
                'Approved': u.approved,
                'Rejected': u.rejected,
                'Pending': u.pending,
                'Cancelled': u.cancelled
            }));
            exportCsv(headers, rows, 'User_Activity.csv');
        } else if (reportTab === 'venue_availability') {
            const headers = ['Venue','Date','Time','Status','Event'];
            const rows = reportList.map(r => ({
                'Venue': getPrimaryVenueName(r),
                'Date': r.date_of_use || '',
                'Time': `${r.inclusive_time_start || ''}-${r.inclusive_time_end || ''}`,
                'Status': r.status || '',
                'Event': r.activity_event || ''
            }));
            exportCsv(headers, rows, 'Venue_Availability.csv');
        } else if (reportTab === 'conflicts') {
            const headers = ['Date','Venue','Booking A','Time A','Booking B','Time B'];
            const rows = conflicts.map(c => ({
                'Date': c.date,
                'Venue': c.venue,
                'Booking A': c.aId,
                'Time A': `${c.aStart}-${c.aEnd}`,
                'Booking B': c.bId,
                'Time B': `${c.bStart}-${c.bEnd}`
            }));
            exportCsv(headers, rows, 'Conflicts.csv');
        } else if (reportTab === 'cancelled') {
            const headers = ['ID','Event','Venue','Requester','Date','Time','Cancelled On','Reason'];
            const rows = reportList.filter(r => (r.status || '').toLowerCase() === 'cancelled').map(r => ({
                'ID': r.id,
                'Event': r.activity_event || '',
                'Venue': getPrimaryVenueName(r),
                'Requester': r.requesting_party || '',
                'Date': r.date_of_use || '',
                'Time': `${r.inclusive_time_start || ''}-${r.inclusive_time_end || ''}`,
                'Cancelled On': r.cancelled_at || '',
                'Reason': r.cancellation_reason || r.rejection_reason || ''
            }));
            exportCsv(headers, rows, 'Cancelled_Bookings.csv');
        }
    };
    const printCurrentReport = () => {
        const el = reportRef.current;
        if (!el) return;
        const w = window.open('', '_blank', 'noopener,noreferrer');
        if (!w) return;
        w.document.write(`<html><head><title>Report</title><style>
            body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111;padding:16px}
            table{border-collapse:collapse;width:100%}
            th,td{padding:8px;border:1px solid #ddd;font-size:12px;text-align:left}
            h2{margin:0 0 8px}
            .meta{color:#475569;margin-bottom:12px}
        </style></head><body>${el.innerHTML}</body></html>`);
        w.document.close();
        w.focus();
        w.print();
    };

    if (loading) {
        return (
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
    }

    return (
        <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">Reports</h3>
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">Admin</span>
                </div>
            </div>
            <div className="px-5 py-3 border-b overflow-x-auto">
                <div className="flex items-stretch ring-1 ring-blue-100 bg-blue shadow-sm min-w-[520px]">
                    <button className={`flex-1 px-2 py-1.5 text-sm ${reportTab === 'booking_summary' ? 'bg-blue-800 text-white' : 'text-gray-700 hover:bg-gray-50'}`} onClick={() => setReportTab('booking_summary')}>Booking Summary</button>
                    <button className={`flex-1 px-2 py-1.5 text-sm ${reportTab === 'venue_utilization' ? 'bg-blue-800 text-white' : 'text-gray-700 hover:bg-gray-50'}`} onClick={() => setReportTab('venue_utilization')}>Venue Utilization</button>
                    <button className={`flex-1 px-2 py-1.5 text-sm ${reportTab === 'booking_status' ? 'bg-blue-800 text-white' : 'text-gray-700 hover:bg-gray-50'}`} onClick={() => setReportTab('booking_status')}>Booking Status</button>
                    <button className={`flex-1 px-2 py-1.5 text-sm ${reportTab === 'user_activity' ? 'bg-blue-800 text-white' : 'text-gray-700 hover:bg-gray-50'}`} onClick={() => setReportTab('user_activity')}>User Activity</button>
                    <button className={`flex-1 px-2 py-1.5 text-sm ${reportTab === 'venue_availability' ? 'bg-blue-800 text-white' : 'text-gray-700 hover:bg-gray-50'}`} onClick={() => setReportTab('venue_availability')}>Venue Availability</button>
                    <button className={`flex-1 px-2 py-1.5 text-sm ${reportTab === 'conflicts' ? 'bg-blue-800 text-white' : 'text-gray-700 hover:bg-gray-50'}`} onClick={() => setReportTab('conflicts')}>Conflicts</button>
                    <button className={`flex-1 px-2 py-1.5 text-sm ${reportTab === 'cancelled' ? 'bg-blue-800 text-white' : 'text-gray-700 hover:bg-gray-50'}`} onClick={() => setReportTab('cancelled')}>Cancelled</button>
                </div>
            </div>
            <div className="px-5 py-3 border-b flex flex-wrap items-center gap-2">
                <select value={reportVenue} onChange={(e) => setReportVenue(e.target.value)} className="h-8 border border-gray-300 rounded-lg px-2 text-xs bg-white w-36">
                    {venuesOptionList.map(v => <option key={v.key} value={v.key}>{v.label}</option>)}
                </select>
                <select value={reportStatus} onChange={(e) => setReportStatus(e.target.value)} className="h-8 border border-gray-300 rounded-lg px-2 text-xs bg-white w-32">
                    <option value="all">All Statuses</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                    <option value="cancelled">Cancelled</option>
                </select>
                <input type="text" placeholder="Department/Party" value={reportDept} onChange={(e) => setReportDept(e.target.value)} className="h-8 border border-gray-300 rounded-lg px-2 text-xs w-40" />
                <div className="relative">
                    <input type="text" placeholder="Search..." value={reportSearch} onChange={(e) => setReportSearch(e.target.value)} className="h-8 border border-gray-300 rounded-lg pl-8 pr-2 text-xs w-44" />
                    <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-gray-400">
                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.9 14.32A8 8 0 1114.32 12.9l3.38 3.38a1 1 0 01-1.42 1.42l-3.38-3.38zM8 14A6 6 0 108 2a6 6 0 000 12z" clipRule="evenodd"/></svg>
                    </span>
                </div>
                <input type="month" value={reportStart ? String(reportStart).slice(0,7) : ''} onChange={(e) => setMonthRange(e.target.value)} className="h-8 border border-gray-300 rounded-lg px-2 text-xs bg-white w-32" />
                <button onClick={exportCurrentReportCsv} className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-50">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M5 20h14a1 1 0 001-1v-5h-2v4H6v-4H4v5a1 1 0 001 1zm7-3l4-4h-3V4h-2v9H8l4 4z"/></svg>
                    Export
                </button>
                <button onClick={printCurrentReport} className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7V3h10v4h2a3 3 0 013 3v5a2 2 0 01-2 2h-2v3H7v-3H5a2 2 0 01-2-2v-5a3 3 0 013-3h2zm2-2h6v2H9V5zm8 12v-3H7v3h10z"/></svg>
                    Print
                </button>
            </div>
            <div className="p-5 overflow-auto" ref={reportRef}>
                {reportTab === 'booking_summary' && (
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Booking Summary</h2>
                        <div className="text-sm text-gray-600 mb-3">Displays booking details and approval info</div>
                        <div className="relative rounded-lg border border-gray-200 bg-white shadow-sm">
                            <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Booking ID</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Event Name</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Venue Name</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Requester Name</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Department</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Event Date</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Time</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Status</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Approval Information</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {bookingRows.map(r => (
                                    <tr key={r.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">#{r.id}</td>
                                        <td className="px-4 py-2 text-sm text-gray-800">{r.activity_event}</td>
                                        <td className="px-4 py-2 text-sm text-gray-800">{getPrimaryVenueName(r)}</td>
                                        <td className="px-4 py-2 text-sm text-gray-800">{r.requested_by || r.user?.name || r.user?.email || '-'}</td>
                                        <td className="px-4 py-2 text-sm text-gray-800">{r.requesting_party || '-'}</td>
                                        <td className="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">{formatDatePH(r.date_of_use)}</td>
                                        <td className="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">{formatTime12h(r.inclusive_time_start)} - {formatTime12h(r.inclusive_time_end)}</td>
                                        <td className="px-4 py-2 text-sm"><span className={statusBadgeClass(r.status)}>{r.status}</span></td>
                                        <td className="px-4 py-2 text-sm text-gray-800">{r.or_number ? `OR ${r.or_number}` : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {reportTab === 'venue_utilization' && (
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Venue Utilization</h2>
                        <div className="text-sm text-gray-600 mb-3">Usage frequency, hours, and percentage</div>
                        <div className="relative rounded-lg border border-gray-200 bg-white shadow-sm">
                            <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Venue</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase tracking-wide">Total Bookings</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase tracking-wide">Total Hours</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase tracking-wide">Usage %</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {venueUtilizationRows.map(v => (
                                    <tr key={v.venue} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 text-sm text-gray-800">{v.venue}</td>
                                        <td className="px-4 py-2 text-sm text-gray-800 text-right">{v.bookings}</td>
                                        <td className="px-4 py-2 text-sm text-gray-800 text-right">{v.hours.toFixed(2)}</td>
                                        <td className="px-4 py-2 text-sm text-gray-800 text-right">{v.usagePct}%</td>
                                    </tr>
                                ))}
                            </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {reportTab === 'booking_status' && (
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Booking Status</h2>
                        <div className="text-sm text-gray-600 mb-3">List bookings by status</div>
                        <div className="relative rounded-lg border border-gray-200 bg-white shadow-sm">
                            <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">ID</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Event</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Venue</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Requester</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Date</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Time</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {bookingStatusRows.map(r => (
                                    <tr key={r.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">#{r.id}</td>
                                        <td className="px-4 py-2 text-sm text-gray-800">{r.activity_event}</td>
                                        <td className="px-4 py-2 text-sm text-gray-800">{getPrimaryVenueName(r)}</td>
                                        <td className="px-4 py-2 text-sm text-gray-800">{r.requesting_party || '-'}</td>
                                        <td className="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">{formatDatePH(r.date_of_use)}</td>
                                        <td className="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">{formatTime12h(r.inclusive_time_start)} - {formatTime12h(r.inclusive_time_end)}</td>
                                        <td className="px-4 py-2 text-sm"><span className={statusBadgeClass(r.status)}>{r.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {reportTab === 'user_activity' && (
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">User Activity</h2>
                        <div className="text-sm text-gray-600 mb-3">Requests by user</div>
                        <div className="relative rounded-lg border border-gray-200 bg-white shadow-sm">
                            <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">User</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase tracking-wide">Total</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase tracking-wide">Approved</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase tracking-wide">Rejected</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase tracking-wide">Pending</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase tracking-wide">Cancelled</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {userActivityRows.map(u => (
                                    <tr key={u.user} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 text-sm text-gray-800">{u.user}</td>
                                        <td className="px-4 py-2 text-sm text-gray-800 text-right">{u.total}</td>
                                        <td className="px-4 py-2 text-sm text-gray-800 text-right">{u.approved}</td>
                                        <td className="px-4 py-2 text-sm text-gray-800 text-right">{u.rejected}</td>
                                        <td className="px-4 py-2 text-sm text-gray-800 text-right">{u.pending}</td>
                                        <td className="px-4 py-2 text-sm text-gray-800 text-right">{u.cancelled}</td>
                                    </tr>
                                ))}
                            </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {reportTab === 'venue_availability' && (
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Venue Availability</h2>
                        <div className="text-sm text-gray-600 mb-3">Schedules and time slots</div>
                        <div className="relative rounded-lg border border-gray-200 bg-white shadow-sm">
                            <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Venue</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Date</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Time</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Status</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Event</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {venueAvailabilityRows.map(r => (
                                    <tr key={`${r.id}-${r.date_of_use}`} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 text-sm text-gray-800">{getPrimaryVenueName(r)}</td>
                                        <td className="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">{formatDatePH(r.date_of_use)}</td>
                                        <td className="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">{formatTime12h(r.inclusive_time_start)} - {formatTime12h(r.inclusive_time_end)}</td>
                                        <td className="px-4 py-2 text-sm"><span className={statusBadgeClass(r.status)}>{r.status}</span></td>
                                        <td className="px-4 py-2 text-sm text-gray-800">{r.activity_event}</td>
                                    </tr>
                                ))}
                            </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {reportTab === 'conflicts' && (
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Conflict Report</h2>
                        <div className="text-sm text-gray-600 mb-3">Overlapping bookings</div>
                        <div className="relative rounded-lg border border-gray-200 bg-white shadow-sm">
                            <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Date</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Venue</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Booking A</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Time A</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Booking B</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Time B</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {conflictRows.map((c, idx) => (
                                    <tr key={`${c.date}-${c.venue}-${idx}`} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">{formatDatePH(c.date)}</td>
                                        <td className="px-4 py-2 text-sm text-gray-800">{c.venue}</td>
                                        <td className="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">#{c.aId}</td>
                                        <td className="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">{formatTime12h(c.aStart)} - {formatTime12h(c.aEnd)}</td>
                                        <td className="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">#{c.bId}</td>
                                        <td className="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">{formatTime12h(c.bStart)} - {formatTime12h(c.bEnd)}</td>
                                    </tr>
                                ))}
                                {conflicts.length === 0 && (
                                    <tr><td colSpan="6" className="px-4 py-3 text-sm text-gray-600 text-center">No conflicts detected</td></tr>
                                )}
                            </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {reportTab === 'cancelled' && (
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Cancelled Bookings</h2>
                        <div className="text-sm text-gray-600 mb-3">List of cancelled bookings</div>
                        <div className="relative rounded-lg border border-gray-200 bg-white shadow-sm">
                            <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">ID</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Event</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Venue</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Requester</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Date</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Time</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Cancelled On</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">Reason</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {cancelledRows.map(r => (
                                    <tr key={r.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">#{r.id}</td>
                                        <td className="px-4 py-2 text-sm text-gray-800">{r.activity_event}</td>
                                        <td className="px-4 py-2 text-sm text-gray-800">{getPrimaryVenueName(r)}</td>
                                        <td className="px-4 py-2 text-sm text-gray-800">{r.requesting_party || '-'}</td>
                                        <td className="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">{formatDatePH(r.date_of_use)}</td>
                                        <td className="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">{formatTime12h(r.inclusive_time_start)} - {formatTime12h(r.inclusive_time_end)}</td>
                                        <td className="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">{r.cancelled_at || '-'}</td>
                                        <td className="px-4 py-2 text-sm text-gray-800">{r.cancellation_reason || r.rejection_reason || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                            </table>
                        </div>
                    </div>
                )}
                <div className="mt-3 flex items-center justify-between text-sm text-gray-700">
                    <div>
                        {activeTotal === 0 ? 'No records' : `Showing ${activeFrom}-${activeTo} of ${activeTotal} • Page ${reportPage} of ${activePages}`}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setReportPage(p => Math.max(1, p - 1))}
                            disabled={reportPage <= 1}
                            className={`px-3 py-1 rounded border ${reportPage <= 1 ? 'text-gray-400 bg-gray-50 cursor-not-allowed' : 'bg-white hover:bg-gray-50'}`}
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setReportPage(p => Math.min(activePages, p + 1))}
                            disabled={reportPage >= activePages}
                            className={`px-3 py-1 rounded border ${reportPage >= activePages ? 'text-gray-400 bg-gray-50 cursor-not-allowed' : 'bg-white hover:bg-gray-50'}`}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewReports;
