import React, { useEffect, useState } from 'react';
import axios from 'axios';
const Logo = "/assets/LNULogo.png";

const ReservationDetailsModal = ({ isOpen, onClose, reservation, isAdmin, onStatusUpdate, onReservationUpdate, onEdit, onDeleted, onNotify }) => {
    if (!isOpen || !reservation) return null;

    const formatDate = (s) => {
        if (!s) return '';
        const dt = new Date(s);
        if (isNaN(dt.getTime())) return s;
        return new Intl.DateTimeFormat('en-PH', {
            year: 'numeric',
            month: 'long',
            day: '2-digit',
            timeZone: 'Asia/Manila'
        }).format(dt);
    };

    const formatTime = (t) => {
        if (!t) return '';
        const [hh, mm] = t.split(':');
        const h = parseInt(hh, 10);
        const m = parseInt(mm || '0', 10);
        if (isNaN(h)) return t;
        const d = new Date(1970, 0, 1, h || 0, m || 0, 0);
        return new Intl.DateTimeFormat('en-PH', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Manila'
        }).format(d).replace(' ', '');
    };
    const formatDateShortPH = (s) => {
        if (!s) return '';
        const dt = new Date(s);
        if (isNaN(dt.getTime())) return s;
        return new Intl.DateTimeFormat('en-GB', {
            year: '2-digit',
            month: '2-digit',
            day: '2-digit',
            timeZone: 'Asia/Manila'
        }).format(dt);
    };
    const formatCurrencyPHP = (v) => {
        if (v === null || v === undefined || v === '') return '';
        const n = typeof v === 'number' ? v : parseFloat((v + '').replace(/[^0-9.-]/g, ''));
        if (isNaN(n)) return v;
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(n);
    };

    const [orNumber, setOrNumber] = useState(reservation.or_number || '');
    const [orAmount, setOrAmount] = useState(reservation.or_amount || '');
    const [orDate, setOrDate] = useState(reservation.or_date || '');
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [saveOk, setSaveOk] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const [confirmOpen, setConfirmOpen] = useState(false);

    const handleOrNumberChange = (e) => {
        const raw = e.target.value || '';
        const cleaned = raw.replace(/\D+/g, '');
        setOrNumber(cleaned);
    };
    const handleOrAmountChange = (e) => {
        const raw = (e.target.value || '').replace(/[^0-9.]/g, '');
        const firstDot = raw.indexOf('.');
        if (firstDot === -1) {
            setOrAmount(raw);
            return;
        }
        const intPart = raw.slice(0, firstDot).replace(/\./g, '');
        const decPart = raw.slice(firstDot + 1).replace(/\./g, '').slice(0, 2);
        setOrAmount(`${intPart || '0'}.${decPart}`);
    };

    useEffect(() => {
        setOrNumber(reservation.or_number || '');
        setOrAmount(reservation.or_amount || '');
        setOrDate(reservation.or_date || '');
        setSaveError('');
        setSaveOk('');
    }, [reservation]);

    const isOrLocked = (reservation.status === 'approved') && !!(reservation.or_number || reservation.or_amount || reservation.or_date);

    const saveOR = async () => {
        setSaving(true);
        setSaveError('');
        setSaveOk('');
        try {
            const isValidOrNumber = !orNumber || /^[0-9]+$/.test(orNumber);
            const isValidOrAmount = !orAmount || /^[0-9]+(\.[0-9]{1,2})?$/.test(orAmount);
            if (!isValidOrNumber || !isValidOrAmount) {
                setSaveError('OR Number and Amount must contain numbers only');
                setSaving(false);
                return;
            }
            const token = localStorage.getItem('token');
            const res = await axios.put(`/api/reservations/${reservation.id}`, {
                or_number: orNumber,
                or_amount: orAmount,
                or_date: orDate
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const updated = res?.data ? res.data : { ...reservation, or_number: orNumber, or_amount: orAmount, or_date: orDate };
            if (onReservationUpdate) onReservationUpdate(updated);
            const amountText = formatCurrencyPHP(orAmount);
            const dateText = orDate ? formatDateShortPH(orDate) : '';
            const msg = `Official Receipt saved: OR ${orNumber}${amountText ? ` • ${amountText}` : ''}${dateText ? ` • ${dateText}` : ''}`;
            setSaveOk(msg);
            if (onNotify) onNotify(msg, 'success');
        } catch (e) {
            console.error(e);
            setSaveError('Failed to save Official Receipt');
        } finally {
            setSaving(false);
        }
    };

    const cancelReservation = () => {
        if (deleting) return;
        setConfirmOpen(true);
    };
    const confirmCancelNow = async () => {
        if (deleting) return;
        setDeleting(true);
        setDeleteError('');
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/reservations/${reservation.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (onNotify) onNotify('Request cancelled', 'success');
            if (onDeleted) onDeleted(reservation.id);
            setConfirmOpen(false);
            onClose();
        } catch (e) {
            console.error(e);
            setDeleteError('Failed to cancel request');
        } finally {
            setDeleting(false);
        }
    };

    const handleAction = (status) => {
        onStatusUpdate(reservation.id, status);
        onClose();
    };

    const sanitizeLabel = (s) => {
        const txt = String(s || '').trim();
        return txt.replace(/\s*0+\s*$/g, '');
    };

    const hasVenue = [
        reservation.hrdc_hall,
        reservation.av_studio,
        reservation.bleacher,
        reservation.alba_hall,
        reservation.student_center_mini_theater,
        reservation.cte_training_hall_2_or_3,
        reservation.admin_building_2nd_floor,
        reservation.multi_purpose_hall_3f,
        reservation.hum_av_theater,
        reservation.dance_studio_hall_3f,
        reservation.cme_gym,
        reservation.library_grounds,
        reservation.hrdc_quadrangle_stage,
        (() => { const v = String(reservation.others_venue_specify || '').trim(); return v && !/^\d+$/.test(v); })(),
        (() => { const v = String(reservation.classroom_specify || '').trim(); return v && !/^\d+$/.test(v); })(),
        (() => { const v = String(reservation.laboratory_room_specify || '').trim(); return v && !/^\d+$/.test(v); })()
    ].some(Boolean);

    const audioRemarks = String(reservation.audio_remarks || '').trim();
    const amplifierRemarks = String(reservation.amplifier_remarks || audioRemarks).trim();
    const speakerRemarks = String(reservation.speaker_remarks || audioRemarks).trim();
    const microphoneRemarks = String(reservation.microphone_remarks || audioRemarks).trim();
    const audioOthersRemarks = String(reservation.audio_others_remarks || audioRemarks).trim();
    const hasAudio = [
        reservation.amplifier_qty,
        reservation.speaker_qty,
        reservation.microphone_qty,
        reservation.audio_others_qty
    ].some(qty => Number(qty) > 0) || !!audioRemarks;

    const videoRemarks = String(reservation.video_remarks || '').trim();
    const videoShowingRemarks = String(reservation.video_showing_remarks || videoRemarks).trim();
    const videoEditingRemarks = String(reservation.video_editing_remarks || videoRemarks).trim();
    const videoCoverageRemarks = String(reservation.video_coverage_remarks || videoRemarks).trim();
    const videoOthersRemarks = String(reservation.video_others_remarks || videoRemarks).trim();
    const hasVideo = [
        reservation.video_showing_qty,
        reservation.video_editing_qty,
        reservation.video_coverage_qty,
        reservation.video_others_qty
    ].some(qty => Number(qty) > 0) || !!videoRemarks;

    const lightingRemarks = String(reservation.lighting_remarks || '').trim();
    const followSpotRemarks = String(reservation.follow_spot_remarks || lightingRemarks).trim();
    const houseLightRemarks = String(reservation.house_light_remarks || lightingRemarks).trim();
    const electricFansRemarks = String(reservation.electric_fans_remarks || lightingRemarks).trim();
    const lightingOthersRemarks = String(reservation.lighting_others_remarks || lightingRemarks).trim();
    const audioLines = [];
    if (Number(reservation.amplifier_qty) > 0) audioLines.push(`Amplifier - ${Number(reservation.amplifier_qty)}${amplifierRemarks ? ` - ${amplifierRemarks}` : ''}`);
    if (Number(reservation.speaker_qty) > 0) audioLines.push(`Speaker - ${Number(reservation.speaker_qty)}${speakerRemarks ? ` - ${speakerRemarks}` : ''}`);
    if (Number(reservation.microphone_qty) > 0) audioLines.push(`Microphone - ${Number(reservation.microphone_qty)}${microphoneRemarks ? ` - ${microphoneRemarks}` : ''}`);
    if ((Number(reservation.audio_others_qty) > 0) || !!audioOthersRemarks) {
        const q = Number(reservation.audio_others_qty) || '';
        const s = audioOthersRemarks ? `Others - ${audioOthersRemarks}${q ? ` - ${q}` : ''}` : (q ? `Others - ${q}` : '');
        if (s) audioLines.push(s);
    }
    const videoLines = [];
    if (Number(reservation.video_showing_qty) > 0) videoLines.push(`Video Showing - ${Number(reservation.video_showing_qty)}${videoShowingRemarks ? ` - ${videoShowingRemarks}` : ''}`);
    if (Number(reservation.video_editing_qty) > 0) videoLines.push(`Video Editing - ${Number(reservation.video_editing_qty)}${videoEditingRemarks ? ` - ${videoEditingRemarks}` : ''}`);
    if (Number(reservation.video_coverage_qty) > 0) videoLines.push(`Video Coverage - ${Number(reservation.video_coverage_qty)}${videoCoverageRemarks ? ` - ${videoCoverageRemarks}` : ''}`);
    if ((Number(reservation.video_others_qty) > 0) || !!videoOthersRemarks) {
        const q = Number(reservation.video_others_qty) || '';
        const s = videoOthersRemarks ? `Others - ${videoOthersRemarks}${q ? ` - ${q}` : ''}` : (q ? `Others - ${q}` : '');
        if (s) videoLines.push(s);
    }
    const lightingLines = [];
    if (Number(reservation.follow_spot_qty) > 0) lightingLines.push(`Follow Spot - ${Number(reservation.follow_spot_qty)}${followSpotRemarks ? ` - ${followSpotRemarks}` : ''}`);
    if (Number(reservation.house_light_qty) > 0) lightingLines.push(`House Light - ${Number(reservation.house_light_qty)}${houseLightRemarks ? ` - ${houseLightRemarks}` : ''}`);
    if (Number(reservation.electric_fans_qty) > 0) lightingLines.push(`Electric Fans - ${Number(reservation.electric_fans_qty)}${electricFansRemarks ? ` - ${electricFansRemarks}` : ''}`);
    if ((Number(reservation.lighting_others_qty) > 0) || !!lightingOthersRemarks) {
        const q = Number(reservation.lighting_others_qty) || '';
        const s = lightingOthersRemarks ? `Others - ${lightingOthersRemarks}${q ? ` - ${q}` : ''}` : (q ? `Others - ${q}` : '');
        if (s) lightingLines.push(s);
    }
    const hasLighting = [
        reservation.follow_spot_qty,
        reservation.house_light_qty,
        reservation.electric_fans_qty,
        reservation.lighting_others_qty
    ].some(qty => Number(qty) > 0) || !!lightingRemarks;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b">
                    <div className="flex items-center gap-3">
                        <img src={Logo} alt="Logo" className="w-8 h-8 rounded" />
                        <div>
                            <div className="text-lg font-semibold text-gray-900">Reservation Details</div>
                            <div className="text-xs text-gray-500">ID #{reservation.id}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                            reservation.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                            reservation.status === 'pending' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
                            'bg-red-50 text-red-700 border-red-200'
                        }`}>
                            {reservation.status === 'rejected' ? 'Denied' : reservation.status.charAt(0).toUpperCase()+reservation.status.slice(1)}
                        </span>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close" title="Close">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>
                </div>
                <div className="px-4 sm:px-6 py-5 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="text-sm font-semibold text-gray-700">Request Info</div>
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">Activity/Event</span>
                                    <span className="text-gray-900 font-medium">{reservation.activity_event}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">Requesting Party</span>
                                    <span className="text-gray-900">{reservation.requesting_party}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">Requested By</span>
                                    <span className="text-gray-900">{reservation.requested_by || reservation.user?.name || reservation.user?.email || '-'}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">Date of Use</span>
                                    <span className="text-gray-900">{formatDate(reservation.date_of_use)}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">Inclusive Time</span>
                                    <span className="text-gray-900">{formatTime(reservation.inclusive_time_start)} - {formatTime(reservation.inclusive_time_end)}</span>
                                </div>
                                {reservation.rejection_reason && reservation.status === 'rejected' && (
                                    <div className="pt-2">
                                        <div className="text-xs text-gray-500 mb-1">Reason</div>
                                        <div className="text-sm text-gray-800 bg-white border border-red-200 rounded-lg p-3">{reservation.rejection_reason}</div>
                                    </div>
                                )}
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-gray-700 mb-2">Official Receipt</div>
                                {(!isAdmin || isOrLocked) ? (
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500">OR Number</span>
                                            <span className="text-gray-900">{(reservation.or_number ?? orNumber) || '-'}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500">Amount</span>
                                            <span className="text-gray-900">
                                                {formatCurrencyPHP(reservation.or_amount ?? orAmount) || '-'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500">Date</span>
                                            <span className="text-gray-900">
                                                {(reservation.or_date ?? orDate) ? formatDateShortPH(reservation.or_date ?? orDate) : '-'}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-xs text-blue-800 mb-1 font-semibold">OR Number</label>
                                                <input
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                    className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    value={orNumber}
                                                    onChange={handleOrNumberChange}
                                                    placeholder="e.g. 123456"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-blue-800 mb-1 font-semibold">Amount</label>
                                                <input
                                                    inputMode="decimal"
                                                    pattern="^[0-9]+(\\.[0-9]{1,2})?$"
                                                    className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    value={orAmount}
                                                    onChange={handleOrAmountChange}
                                                    placeholder="e.g. 500.00"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-blue-800 mb-1 font-semibold">Date</label>
                                                <input
                                                    type="date"
                                                    className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    value={orDate || ''}
                                                    onChange={(e) => setOrDate(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        {saveError && <div className="text-sm text-red-700">{saveError}</div>}
                                        {saveOk && (
                                            <div className="text-sm text-gray-800 bg-white border border-green-200 rounded-lg p-3 space-y-1">
                                                <div>OR Number: {orNumber || ''}</div>
                                                <div>Amount: {orAmount || ''}</div>
                                                <div>Date: {orDate ? formatDateShortPH(orDate) : ''}</div>
                                            </div>
                                        )}
                                        <div className="flex justify-end">
                                            <button
                                                onClick={saveOR}
                                                disabled={saving}
                                                className={`px-4 py-2 rounded-lg ${saving ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                                            >
                                                {saving ? 'Saving…' : 'Save OR Details'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="text-sm font-semibold text-gray-700">Venues</div>
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                <div className="flex flex-wrap gap-2">
                                    {!!reservation.hrdc_hall && <span className="px-2.5 py-1 text-xs rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">{sanitizeLabel('HRDC Hall')}</span>}
                                    {!!reservation.av_studio && <span className="px-2.5 py-1 text-xs rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">{sanitizeLabel('AV Studio')}</span>}
                                    {!!reservation.bleacher && <span className="px-2.5 py-1 text-xs rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">{sanitizeLabel('Bleacher')}</span>}
                                    {!!reservation.alba_hall && <span className="px-2.5 py-1 text-xs rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">{sanitizeLabel('Alba Hall')}</span>}
                                    {!!reservation.student_center_mini_theater && <span className="px-2.5 py-1 text-xs rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">{sanitizeLabel('Student Center Mini-Theater')}</span>}
                                    {!!reservation.cte_training_hall_2_or_3 && <span className="px-2.5 py-1 text-xs rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">{sanitizeLabel('CTE Training Hall')}</span>}
                                    {!!reservation.admin_building_2nd_floor && <span className="px-2.5 py-1 text-xs rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">{sanitizeLabel('Admin Ballroom 2F')}</span>}
                                    {!!reservation.multi_purpose_hall_3f && <span className="px-2.5 py-1 text-xs rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">{sanitizeLabel('Multi-Purpose Hall 3F')}</span>}
                                    {!!reservation.hum_av_theater && <span className="px-2.5 py-1 text-xs rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">{sanitizeLabel('Hum. AV Theater')}</span>}
                                    {!!reservation.dance_studio_hall_3f && <span className="px-2.5 py-1 text-xs rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">{sanitizeLabel('Dance Studio')}</span>}
                                    {!!reservation.cme_gym && <span className="px-2.5 py-1 text-xs rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">{sanitizeLabel('CME Gym')}</span>}
                                    {!!reservation.library_grounds && <span className="px-2.5 py-1 text-xs rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">{sanitizeLabel('Library Grounds')}</span>}
                                    {!!reservation.hrdc_quadrangle_stage && <span className="px-2.5 py-1 text-xs rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">{sanitizeLabel('ORC Quadrangle/Stage')}</span>}
                                    {(() => { const v = String(reservation.classroom_specify || '').trim(); return v && !/^\d+$/.test(v); })() && <span className="px-2.5 py-1 text-xs rounded-full bg-purple-50 text-purple-700 border border-purple-200">{sanitizeLabel('Classroom')}</span>}
                                    {(() => { const v = String(reservation.laboratory_room_specify || '').trim(); return v && !/^\d+$/.test(v); })() && <span className="px-2.5 py-1 text-xs rounded-full bg-purple-50 text-purple-700 border border-purple-200">{sanitizeLabel('Laboratory')}</span>}
                                    {(() => { const v = String(reservation.others_venue_specify || '').trim(); return v && !/^\d+$/.test(v); })() && <span className="px-2.5 py-1 text-xs rounded-full bg-purple-50 text-purple-700 border border-purple-200">{sanitizeLabel('Others')}</span>}
                                </div>
                                {!hasVenue && <div className="text-sm text-gray-500 mt-2">No venue selected</div>}
                            </div>
                            <div className="text-sm font-semibold text-gray-700">Requested Equipment</div>
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-4">
                                <div>
                                    <div className="text-xs font-semibold text-gray-600">AUDIO SYSTEM</div>
                                    <div className="mt-1 text-sm text-gray-900 space-y-1">
                                        {audioLines.length > 0 ? audioLines.map((line, i) => (
                                            <div key={`audio-${i}`}>{line}</div>
                                        )) : <div>-</div>}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold text-gray-600">VIDEO SYSTEM</div>
                                    <div className="mt-1 text-sm text-gray-900 space-y-1">
                                        {videoLines.length > 0 ? videoLines.map((line, i) => (
                                            <div key={`video-${i}`}>{line}</div>
                                        )) : <div>-</div>}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold text-gray-600">LIGHTING SYSTEM</div>
                                    <div className="mt-1 text-sm text-gray-900 space-y-1">
                                        {lightingLines.length > 0 ? lightingLines.map((line, i) => (
                                            <div key={`lighting-${i}`}>{line}</div>
                                        )) : <div>-</div>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="px-4 sm:px-6 py-4 border-t bg-gray-50">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="text-xs text-gray-500">Requested on {formatDate(reservation.created_at || reservation.date_of_use)}</div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                            {isAdmin && reservation.status === 'pending' ? (
                                <>
                                    <button onClick={() => handleAction('rejected')} className="px-4 py-2 rounded-lg border border-red-300 text-red-700 bg-white hover:bg-red-50">Deny</button>
                                    <button onClick={() => handleAction('approved')} className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700">Approve</button>
                                </>
                            ) : (!isAdmin && reservation.status === 'pending' ? (
                                <>
                                    <button onClick={cancelReservation} disabled={deleting} className={`px-4 py-2 rounded-lg border ${deleting ? 'border-gray-300 text-gray-400 bg-white' : 'border-red-300 text-red-700 bg-white hover:bg-red-50'}`}>Cancel</button>
                                    <button onClick={() => onEdit && onEdit(reservation)} className="px-4 py-2 rounded-lg bg-indigo-700 text-white hover:bg-indigo-800">Edit</button>
                                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Close</button>
                                </>
                            ) : (
                                <button onClick={onClose} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Close</button>
                            ))}
                        </div>
                    </div>
                    {deleteError && <div className="mt-2 text-sm text-red-700">{deleteError}</div>}
                </div>
                {confirmOpen && (
                    <div
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4"
                        onClick={() => setConfirmOpen(false)}
                    >
                        <div
                            className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm border border-gray-200 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setConfirmOpen(false)}
                                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                                aria-label="Close"
                                title="Close"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            <div className="px-6 pt-6 pb-4 text-center">
                                <div className="mx-auto w-14 h-14 rounded-full border-2 border-gray-200 flex items-center justify-center">
                                    <svg className="w-7 h-7 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v4m0 4h.01M10.29 3.86l-8.3 14.38A2 2 0 003.7 21h16.6a2 2 0 001.71-2.76l-8.3-14.38a2 2 0 00-3.42 0z" />
                                    </svg>
                                </div>
                                <div className="mt-4 text-base font-semibold text-gray-900">Cancel this request?</div>
                                <div className="mt-2 text-xs text-gray-500">
                                    If you continue, your reservation request will be cancelled. You can always submit a new request later.
                                </div>
                            </div>

                            <div className="px-6 pb-6 flex flex-col gap-2">
                                <button
                                    onClick={confirmCancelNow}
                                    disabled={deleting}
                                    className={`w-full px-4 py-2.5 rounded-lg font-semibold ${deleting ? 'bg-gray-300 text-gray-600' : 'bg-gray-900 text-white hover:bg-gray-800'}`}
                                >
                                    {deleting ? 'Cancelling…' : 'Yes, cancel'}
                                </button>
                                <button
                                    onClick={() => setConfirmOpen(false)}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReservationDetailsModal;
