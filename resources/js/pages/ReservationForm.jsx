import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import BookingFormModal from '../components/BookingFormModal';

const ReservationForm = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [categories, setCategories] = useState([]);
    const [selectedSlots, setSelectedSlots] = useState([]);
    const [bannerVenueName, setBannerVenueName] = useState('');
    const [reservations, setReservations] = useState([]);
    const [selectedDay, setSelectedDay] = useState(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [user, setUser] = useState(null);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [selectedVenueForBooking, setSelectedVenueForBooking] = useState(null);
    const [acknowledged, setAcknowledged] = useState(false);
    const [selectedAudio, setSelectedAudio] = useState([]);
    const [selectedVideo, setSelectedVideo] = useState([]);
    const [selectedLighting, setSelectedLighting] = useState([]);
    const [venues, setVenues] = useState([]);
    const [audioDetails, setAudioDetails] = useState({});
    const [videoDetails, setVideoDetails] = useState({});
    const [lightingDetails, setLightingDetails] = useState({});
    const TIME_SLOTS = [
        { key: "before_8", label: "Before 8:00 AM", start: "06:00", end: "08:00" },
        { key: "8_10", label: "8:00 AM - 10:00 AM", start: "08:00", end: "10:00" },
        { key: "10_12", label: "10:00 AM - 12:00 PM", start: "10:00", end: "12:00" },
        { key: "13_15", label: "1:00 PM - 3:00 PM", start: "13:00", end: "15:00" },
        { key: "15_17", label: "3:00 PM - 5:00 PM", start: "15:00", end: "17:00" },
        { key: "17_19", label: "5:00 PM - 7:00 PM", start: "17:00", end: "19:00" },
        { key: "past_19", label: "Past 7:00 PM", start: "19:00", end: "21:00" }
    ];
    const formatVenueName = (key) => {
        if (!key) return '';
        return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };
    const formatDateHeader = (s) => {
        if (!s) return '';
        const dt = new Date(s);
        if (!isNaN(dt.getTime())) {
            return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        }
        return s;
    };
    const dateOnly = (v) => {
        if (!v) return '';
        try {
            if (typeof v === 'string') {
                const t = v.split('T')[0];
                return t || v;
            }
            const d = new Date(v);
            return d.toLocaleDateString('en-CA');
        } catch { return typeof v === 'string' ? v : ''; }
    };
    const formatTime12h = (s) => {
        if (!s) return '';
        const [h, m] = s.split(':').map(Number);
        if (Number.isNaN(h)) return s;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hr = ((h + 11) % 12) + 1;
        return `${hr}:${m?.toString().padStart(2, '0')} ${ampm}`;
    };
    const toggleSlot = (key) => {
        setSelectedSlots(prev => {
            const exists = prev.includes(key);
            return exists ? prev.filter(k => k !== key) : [...prev, key];
        });
    };
    const computeInclusiveFromSlots = (keys) => {
        if (!keys || keys.length === 0) return { start: '', end: '' };
        const selected = TIME_SLOTS.filter(s => keys.includes(s.key));
        const starts = selected.map(s => s.start).sort();
        const ends = selected.map(s => s.end).sort();
        return { start: starts[0], end: ends[ends.length - 1] };
    };
    const [formData, setFormData] = useState({
        activity_event: '',
        requesting_party: '',
        date_of_use: '',
        inclusive_time_start: '',
        inclusive_time_end: '',
        category_id: '',
        hrdc_hall: false,
        av_studio: false,
        bleacher: false,
        alba_hall: false,
        student_center_mini_theater: false,
        cte_training_hall_2_or_3: false,
        admin_building_2nd_floor: false,
        multi_purpose_hall_3f: false,
        hum_av_theater: false,
        dance_studio_hall_3f: false,
        cme_gym: false,
        library_grounds: false,
        hrdc_quadrangle_stage: false,
        classroom_specify: '',
        laboratory_room_specify: '',
        others_venue_specify: '',
        amplifier_qty: 0,
        speaker_qty: 0,
        microphone_qty: 0,
        audio_remarks: '',
        video_showing_qty: 0,
        video_editing_qty: 0,
        video_coverage_qty: 0,
        video_remarks: '',
        follow_spot_qty: 0,
        house_light_qty: 0,
        electric_fans_qty: 0,
        lighting_remarks: '',
        requested_by: '',
    });

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get('/api/categories', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setCategories(response.data);
            } catch (error) {
                console.error("Error fetching categories", error);
            }
        };
        fetchCategories();
    }, []);
    useEffect(() => {
        try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) setUser(JSON.parse(storedUser));
        } catch {}
    }, []);
    useEffect(() => {
        const fetchReservations = async () => {
            try {
                const token = localStorage.getItem('token');
                const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
                const res = await axios.get('/api/reservations', { headers }).catch(() => ({ data: [] }));
                const normalized = Array.isArray(res.data) ? res.data.map(r => ({ ...r, date_of_use: dateOnly(r?.date_of_use) })) : [];
                setReservations(normalized);
            } catch {}
        };
        fetchReservations();
    }, []);
    useEffect(() => {
        const fetchVenues = async () => {
            try {
                const res = await axios.get('/api/venues').catch(() => ({ data: [] }));
                setVenues(Array.isArray(res.data) ? res.data : []);
            } catch {}
        };
        fetchVenues();
    }, []);
    useEffect(() => {
        const sp = new URLSearchParams(location.search);
        const date = sp.get('date');
        const venueKey = sp.get('venue');
        const venueNameParam = sp.get('venueName');
        setFormData(prev => ({
            ...prev,
            date_of_use: date || prev.date_of_use,
            ...(venueKey ? { [venueKey]: true } : {})
        }));
        const vName = venueNameParam || formatVenueName(venueKey);
        setBannerVenueName(vName);
    }, [location.search]);
    useEffect(() => {
        if (formData.date_of_use) {
            try {
                const d = new Date(formData.date_of_use);
                if (!isNaN(d.getTime())) setSelectedDay(d);
            } catch {}
        }
    }, [formData.date_of_use]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const togglePick = (setFn, prevArr, item, setDetails) => {
        if (prevArr.includes(item)) {
            setFn(prevArr.filter(i => i !== item));
            if (setDetails) {
                setDetails(prev => {
                    const next = { ...prev };
                    delete next[item];
                    return next;
                });
            }
        } else {
            setFn([...prevArr, item]);
            if (setDetails) {
                setDetails(prev => ({
                    ...prev,
                    [item]: prev[item] || { qty: "0", remarks: "" }
                }));
            }
        }
    };
    const toggleAudio = (item) => togglePick(setSelectedAudio, selectedAudio, item, setAudioDetails);
    const toggleVideo = (item) => togglePick(setSelectedVideo, selectedVideo, item, setVideoDetails);
    const toggleLighting = (item) => togglePick(setSelectedLighting, selectedLighting, item, setLightingDetails);
    const updateAudioDetail = (item, field, value) => setAudioDetails(prev => ({ ...prev, [item]: { ...(prev[item] || {}), [field]: value } }));
    const updateVideoDetail = (item, field, value) => setVideoDetails(prev => ({ ...prev, [item]: { ...(prev[item] || {}), [field]: value } }));
    const updateLightingDetail = (item, field, value) => setLightingDetails(prev => ({ ...prev, [item]: { ...(prev[item] || {}), [field]: value } }));

    const venueNames = {
        'hrdc_hall': 'HRDC Hall',
        'av_studio': 'AV Studio',
        'bleacher': 'Bleacher',
        'alba_hall': 'Alba Hall',
        'student_center_mini_theater': 'Student Center Mini-Theater',
        'cte_training_hall_2_or_3': 'CTE Training Hall',
        'admin_building_2nd_floor': 'Admin Ballroom 2F',
        'multi_purpose_hall_3f': 'Multi-Purpose Hall 3F',
        'hum_av_theater': 'Hum. AV Theater',
        'dance_studio_hall_3f': 'Dance Studio',
        'cme_gym': 'CME Gym',
        'classroom_specify': 'Classroom',
        'laboratory_room_specify': 'Laboratory Room',
        'library_grounds': 'Library Grounds',
        'hrdc_quadrangle_stage': 'ORC Quadrangle/Stage',
        'others_venue_specify': 'Others'
    };
    const venueKeys = Object.keys(venueNames);
    const dateKey = (d) => d ? d.toLocaleDateString('en-CA') : '';
    const tokenize = (s) => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
    const containsAll = (small, big) => small.every(t => big.includes(t));
    const getVenueStatusForLabel = (label) => {
        const lt = tokenize(label);
        const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const n = norm(label);
        let candidate = venues.find(x => {
            const xn = norm(x?.name);
            return xn && (xn === n || xn.includes(n) || n.includes(xn));
        });
        if (candidate) return candidate.status || 'available';
        for (const v of venues) {
            const xt = tokenize(v?.name);
            if (containsAll(lt, xt) || containsAll(xt, lt)) return v.status || 'available';
            if (lt.includes('hrdc') && lt.includes('hall') && xt.includes('hrdc') && xt.includes('hall')) return v.status || 'available';
        }
        return 'available';
    };
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
    const generateCalendarDays = () => {
        const year = selectedYear;
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
        return days;
    };
    const getBookedVenuesForDate = (date) => {
        if (!date) return new Set();
        const dateStr = dateKey(date);
        const dayReservations = reservations.filter(
            r => r.date_of_use === dateStr && (r.status === 'approved' || r.status === 'pending')
        );
        const bookedVenues = new Set();
        dayReservations.forEach(r => {
            venueKeys.forEach(key => {
                if (r[key]) bookedVenues.add(key);
            });
        });
        return bookedVenues;
    };
    const getAvailability = (date) => {
        if (!date) return { total: 0, available: 0, events: [] };
        const bookedVenuesForDay = getBookedVenuesForDate(date);
        const totalVenues = venueKeys.length;
        const available = totalVenues - bookedVenuesForDay.size;
        const dateStr = dateKey(date);
        const dayReservations = reservations.filter(r => r.date_of_use === dateStr);
        const events = dayReservations.map(r => ({ id: r.id, name: r.activity_event, type: 'Event' }));
        return { total: totalVenues, available, events };
    };
    const getVenueStatusCountsForDate = (date) => {
        if (!date) return { approved: 0, pending: 0, rejected: 0, available: venueKeys.length, total: venueKeys.length };
        const dateStr = dateKey(date);
        const dayReservations = reservations.filter(r => r.date_of_use === dateStr);
        const statusByVenue = new Map();
        dayReservations.forEach(r => {
            venueKeys.forEach(key => {
                if (r[key]) {
                    const prev = statusByVenue.get(key);
                    if (r.status === 'approved') {
                        statusByVenue.set(key, 'approved');
                    } else if (r.status === 'pending') {
                        if (prev !== 'approved') statusByVenue.set(key, 'pending');
                    } else if (r.status === 'rejected') {
                        if (prev !== 'approved' && prev !== 'pending') statusByVenue.set(key, 'rejected');
                    }
                }
            });
        });
        let approved = 0, pending = 0, rejected = 0;
        venueKeys.forEach(key => {
            const v = statusByVenue.get(key);
            if (v === 'approved') approved++;
            else if (v === 'pending') pending++;
            else if (v === 'rejected') rejected++;
        });
        const total = venueKeys.length;
        const available = total - (approved + pending + rejected);
        return { approved, pending, rejected, available, total };
    };
    const handleMonthClick = (index) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(index);
        setCurrentDate(newDate);
    };
    const handleDayClick = (date) => {
        if (!date) return;
        setSelectedDay(date);
        setFormData(prev => ({ ...prev, date_of_use: dateKey(date) }));
    };
    const handleVenueClick = (key) => {
        setSelectedVenueForBooking(key);
        setIsBookingModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let start = formData.inclusive_time_start;
            let end = formData.inclusive_time_end;
            if (selectedSlots.length > 0) {
                const s = computeInclusiveFromSlots(selectedSlots);
                start = s.start;
                end = s.end;
            }
            if (!start || !end) {
                alert('Please select time slots or provide start and end time.');
                return;
            }
            if (!acknowledged) {
                alert('Please acknowledge the reservation form requirement.');
                return;
            }
            const avQty = {
                amplifier_qty: parseInt((audioDetails["Amplifier"]?.qty) || formData.amplifier_qty || 0, 10),
                speaker_qty: parseInt((audioDetails["Speaker"]?.qty) || formData.speaker_qty || 0, 10),
                microphone_qty: parseInt((audioDetails["Microphone"]?.qty) || formData.microphone_qty || 0, 10),
                video_showing_qty: parseInt((videoDetails["Video Showing"]?.qty) || formData.video_showing_qty || 0, 10),
                video_editing_qty: parseInt((videoDetails["Video Editing"]?.qty) || formData.video_editing_qty || 0, 10),
                video_coverage_qty: parseInt((videoDetails["Video Coverage"]?.qty) || formData.video_coverage_qty || 0, 10),
                follow_spot_qty: parseInt((lightingDetails["Follow Spot"]?.qty) || formData.follow_spot_qty || 0, 10),
                house_light_qty: parseInt((lightingDetails["House Light"]?.qty) || formData.house_light_qty || 0, 10),
                electric_fans_qty: parseInt((lightingDetails["Electric Fans"]?.qty) || formData.electric_fans_qty || 0, 10),
            };
            const payload = {
                activity_event: formData.activity_event,
                requesting_party: formData.requesting_party,
                date_of_use: formData.date_of_use,
                inclusive_time_start: start,
                inclusive_time_end: end,
                category_id: formData.category_id,
                hrdc_hall: formData.hrdc_hall,
                av_studio: formData.av_studio,
                bleacher: formData.bleacher,
                alba_hall: formData.alba_hall,
                student_center_mini_theater: formData.student_center_mini_theater,
                cte_training_hall_2_or_3: formData.cte_training_hall_2_or_3,
                admin_building_2nd_floor: formData.admin_building_2nd_floor,
                multi_purpose_hall_3f: formData.multi_purpose_hall_3f,
                hum_av_theater: formData.hum_av_theater,
                dance_studio_hall_3f: formData.dance_studio_hall_3f,
                cme_gym: formData.cme_gym,
                library_grounds: formData.library_grounds,
                hrdc_quadrangle_stage: formData.hrdc_quadrangle_stage,
                classroom_specify: formData.classroom_specify,
                laboratory_room_specify: formData.laboratory_room_specify,
                others_venue_specify: formData.others_venue_specify,
                amplifier_qty: avQty.amplifier_qty,
                speaker_qty: avQty.speaker_qty,
                microphone_qty: avQty.microphone_qty,
                audio_others_qty: parseInt((audioDetails["Others"]?.qty) || formData.audio_others_qty || 0, 10),
                amplifier_remarks: audioDetails["Amplifier"]?.remarks || '',
                speaker_remarks: audioDetails["Speaker"]?.remarks || '',
                microphone_remarks: audioDetails["Microphone"]?.remarks || '',
                audio_others_remarks: audioDetails["Others"]?.remarks || formData.audio_remarks,
                video_showing_qty: avQty.video_showing_qty,
                video_editing_qty: avQty.video_editing_qty,
                video_coverage_qty: avQty.video_coverage_qty,
                video_others_qty: parseInt((videoDetails["Others"]?.qty) || formData.video_others_qty || 0, 10),
                video_showing_remarks: videoDetails["Video Showing"]?.remarks || '',
                video_editing_remarks: videoDetails["Video Editing"]?.remarks || '',
                video_coverage_remarks: videoDetails["Video Coverage"]?.remarks || '',
                video_others_remarks: videoDetails["Others"]?.remarks || formData.video_remarks,
                follow_spot_qty: avQty.follow_spot_qty,
                house_light_qty: avQty.house_light_qty,
                electric_fans_qty: avQty.electric_fans_qty,
                lighting_others_qty: parseInt((lightingDetails["Others"]?.qty) || formData.lighting_others_qty || 0, 10),
                follow_spot_remarks: lightingDetails["Follow Spot"]?.remarks || '',
                house_light_remarks: lightingDetails["House Light"]?.remarks || '',
                electric_fans_remarks: lightingDetails["Electric Fans"]?.remarks || '',
                lighting_others_remarks: lightingDetails["Others"]?.remarks || formData.lighting_remarks,
                requested_by: formData.requested_by,
            };
            const token = localStorage.getItem('token');
            await axios.post('/api/reservations', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Reservation submitted successfully!');
            navigate('/dashboard');
        } catch (error) {
            console.error("Error submitting reservation", error);
            alert('Failed to submit reservation.');
        }
    };

    const isReadyToPrint = !!(formData.activity_event && formData.requesting_party && formData.date_of_use && (formData.inclusive_time_start || selectedSlots.length > 0));

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">New Reservation</h1>
                <p className="text-sm text-gray-600 mt-1">Select a date to view availability and create a request.</p>
            </div>

            <div className="bg-blue-900 text-blue-200 shadow-md rounded-lg overflow-hidden mb-6">
                <div className="px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 py-3">
                    <div className="flex-shrink-0 sm:border-r border-blue-700 sm:pr-4">
                        <select
                            className="bg-blue-800 border border-blue-700 text-white text-sm rounded px-3 py-1.5 focus:outline-none hover:bg-blue-700 transition-colors cursor-pointer font-bold"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                        >
                            <option value={2025}>2025</option>
                            <option value={2026}>2026</option>
                            <option value={2027}>2027</option>
                            <option value={2028}>2028</option>
                            <option value={2029}>2029</option>
                            <option value={2030}>2030</option>
                        </select>
                    </div>

                    <div className="w-full sm:flex-1 flex items-center justify-start overflow-x-auto no-scrollbar gap-1 pr-6">
                        {months.map((month, index) => (
                            <button
                                key={month}
                                type="button"
                                onClick={() => handleMonthClick(index)}
                                className={`px-4 py-2 rounded flex text-sm font-medium transition-colors whitespace-nowrap
                                    ${currentDate.getMonth() === index
                                        ? 'bg-yellow-500 text-blue-900'
                                        : 'hover:bg-blue-800 hover:text-white'}`}
                            >
                                {month}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow ring-1 ring-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="min-w-[720px]">
                        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                            {daysOfWeek.map(day => (
                                <div key={day} className="py-2 text-center text-xs font-semibold text-gray-500 tracking-wide uppercase">
                                    {day}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 bg-gray-200 gap-px border-b border-gray-200">
                            {generateCalendarDays().map((date, index) => {
                                const { total } = getAvailability(date);
                                const isToday = date && new Date().toDateString() === date.toDateString();
                                const { approved } = getVenueStatusCountsForDate(date);
                                const approvedPct = total > 0 ? (approved / total) * 100 : 0;
                                let adminUnavailableCount = 0;
                                venueKeys.forEach(k => {
                                    const label = venueNames[k];
                                    const s = getVenueStatusForLabel(label);
                                    if (s && s !== 'available') adminUnavailableCount++;
                                });
                                const availableDisplay = Math.max(total - approved - adminUnavailableCount, 0);
                                let pendingRequestsCount = 0;
                                if (date) {
                                    const dateStr = dateKey(date);
                                    pendingRequestsCount = reservations.filter(
                                        r => r.date_of_use === dateStr && r.status === 'pending'
                                    ).length;
                                }

                                return (
                                    <div
                                        key={index}
                                        onClick={() => date && handleDayClick(date)}
                                        className={`min-h-[96px] sm:min-h-[120px] bg-white p-1.5 sm:p-2 relative group hover:bg-gray-50 transition-colors ${!date ? 'bg-gray-50 cursor-default' : 'cursor-pointer'}`}
                                    >
                                        {date && (
                                            <>
                                                <div className="flex flex-col items-start">
                                                    <span className={`text-sm font-medium ${isToday ? 'bg-blue-900 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-black-900'}`}>
                                                        {date.getDate()}
                                                    </span>
                                                    <div className="mt-3 sm:mt-5">
                                                        <div className="text-[11px] text-gray-500 leading-tight">Availability</div>
                                                        <div className={`text-xs font-bold ${availableDisplay === 0 ? 'text-red-900' : 'text-gray-700'}`}>
                                                            {availableDisplay}/{total}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="w-full bg-indigo-100 rounded-full h-1.5 mt-3 mb-1">
                                                    <div
                                                        className="h-1.5 rounded-full bg-indigo-400"
                                                        style={{ width: `${approvedPct}%` }}
                                                    ></div>
                                                </div>

                                                {pendingRequestsCount > 0 && (
                                                    <div className="mt-1">
                                                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
                                                            {pendingRequestsCount}Semi
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {selectedDay && (
                <>
                    <div
                        className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-40"
                        onClick={() => setSelectedDay(null)}
                    ></div>

                    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Daily Schedule</h2>
                                <p className="text-gray-500 text-sm mt-1">
                                    {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                </p>
                                <div className="mt-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    Status viewing as: <span className="text-black font-bold">
                                        {(user?.role === 'admin' || user?.role === 'staff') ? 'ADMIN' : (user ? 'USER' : 'GUEST')}
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedDay(null)}
                                className="text-gray-400 hover:text-gray-600 p-1"
                                aria-label="Close"
                                title="Close"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-3">
                            {venueKeys.map(key => {
                                const bookedVenues = getBookedVenuesForDate(selectedDay);
                                const label = venueNames[key];
                                const adminStatus = getVenueStatusForLabel(label);
                                const adminUnavailable = adminStatus && adminStatus !== 'available';
                                const isAvailable = !bookedVenues.has(key) && !adminUnavailable;
                                const dateStr = dateKey(selectedDay);
                                const venueReservations = reservations.filter(r => r.date_of_use === dateStr && r[key]);
                                const approvedCount = venueReservations.filter(r => r.status === 'approved').length;
                                const SLOT_CAPACITY = 7;
                                const open = adminUnavailable ? 0 : Math.max(SLOT_CAPACITY - approvedCount, 0);
                                const statusLabel = adminUnavailable
                                    ? (adminStatus === 'maintenance' ? 'Under Maintenance' : adminStatus === 'repair' ? 'Under Repair' : 'Unavailable')
                                    : (open === 0 ? 'Unavailable' : (approvedCount > 0 ? 'Semi-booked' : 'Available'));
                                const statusStyle = adminUnavailable
                                    ? (adminStatus === 'maintenance'
                                        ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                        : adminStatus === 'repair'
                                            ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                                            : 'bg-red-100 text-red-800 border-red-200')
                                    : (open === 0
                                        ? 'bg-gray-100 text-gray-800 border-gray-200'
                                        : (approvedCount > 0 ? 'bg-indigo-100 text-indigo-800 border-indigo-200' : 'bg-green-100 text-green-800 border-green-200'));
                                return (
                                    <div
                                        key={key}
                                        onClick={() => { if (!adminUnavailable) handleVenueClick(key); }}
                                        className={`border rounded-lg p-4 bg-white shadow-sm 
                                            ${adminUnavailable ? 'border-red-200 opacity-80' : (open === 0 ? 'border-gray-200' : (approvedCount > 0 ? 'border-indigo-200' : 'border-green-200'))}
                                            ${adminUnavailable ? 'cursor-not-allowed' : 'cursor-pointer hover:shadow-md hover:border-blue-300'} transition-all ring-offset-2
                                        `}
                                    >
                                        <div className="flex items-start justify-between mb-1">
                                            <div>
                                                <div className="text-sm font-semibold text-gray-900">{venueNames[key]}</div>
                                                <div className="mt-1 text-xs">
                                                    <span className={`inline-block px-2 py-0.5 rounded-full font-medium border ${statusStyle}`}>
                                                        {statusLabel}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-500">7 fixed slots per day</div>
                                        </div>
                                        {isAvailable ? (
                                            <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                                </svg>
                                                Ready for reservation
                                            </div>
                                        ) : (
                                            <div className="mt-2 space-y-2">
                                                {approvedCount > 0 && open > 0 && (
                                                    <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                                        </svg>
                                                        {open} of {SLOT_CAPACITY} slots still open
                                                    </div>
                                                )}
                                                {venueReservations.map(r => (
                                                    <div key={r.id} className="rounded border border-gray-200 p-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm font-semibold text-gray-900">{r.activity_event || 'Event'}</span>
                                                            <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                                                                r.status === 'approved' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                                                                r.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                                'bg-red-50 text-red-700 border-red-200'
                                                            }`}>
                                                                {r.status.toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-gray-600">{formatTime12h(r.inclusive_time_start)} - {formatTime12h(r.inclusive_time_end)}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="p-6 border-t border-gray-100 bg-gray-50">
                            <button
                                type="button"
                                onClick={() => setSelectedDay(null)}
                                className="w-full bg-blue-900 text-white font-bold py-3 rounded-lg hover:bg-blue-800 transition-colors"
                            >
                                Close View
                            </button>
                        </div>
                        <BookingFormModal
                            isOpen={isBookingModalOpen}
                            onClose={() => setIsBookingModalOpen(false)}
                            venueName={selectedVenueForBooking ? venueNames[selectedVenueForBooking] : ''}
                            venueKey={selectedVenueForBooking}
                            selectedDate={selectedDay}
                            onSubmitted={(res) => {
                                const normalized = res ? { ...res, date_of_use: dateOnly(res.date_of_use) } : res;
                                if (normalized) {
                                    setReservations(prev => [...prev, normalized]);
                                }
                                setIsBookingModalOpen(false);
                            }}
                        />
                    </div>
                </>
            )}
        </div>
    );
};

export default ReservationForm;
