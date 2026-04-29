import React, { useState, useEffect, useRef } from "react"; 
import axios from "axios";
import BookingPDF, { 
  TIME_SLOTS, 
  AUDIO_ITEMS, 
  VIDEO_ITEMS, 
  LIGHTING_ITEMS, 
  toDateInputValue, 
  computeInclusiveFromSlots, 
  parseInclusiveTime, 
  normalizeKey 
} from "./PDF/BookingPDF";

// import Logo from "../assets/lnu-logo.png"; 
// Using the existing logo path from the project
const Logo = "/assets/LNULogo.png";

const BookingFormModal = ({ isOpen, onClose, venueName, venueKey, selectedDate, existingReservations, onSubmitted, reservationToEdit, onNotify }) => { 
  const isEditing = !!reservationToEdit?.id;

  const initialFormData = { 
    orNumber: "", 
    amount: "", 
    orDate: "", 
    activity: "", 
    dateOfUse: "", 
    requestingParty: "", 
    requestedBy: "",
    cteBuildingRoom: "",
    classroomSpecify: "",
    laboratoryRoomSpecify: "",
    othersVenueSpecify: "",
    preferredWifiName: "",
    inclusiveTime: "", 
    paxCount: "",
  };
  const [formData, setFormData] = useState(initialFormData); 
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [acknowledged, setAcknowledged] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedAudio, setSelectedAudio] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState([]);
  const [selectedLighting, setSelectedLighting] = useState([]);
  const [wifiPreference, setWifiPreference] = useState("");
  const [audioDetails, setAudioDetails] = useState({});
  const [videoDetails, setVideoDetails] = useState({});
  const [lightingDetails, setLightingDetails] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const printRef = useRef(null);
  const shouldRenderForm = isGeneratingPdf;
  const listReservations = Array.isArray(existingReservations) ? existingReservations : [];
  const getStoredUserName = () => {
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return "";
      const user = JSON.parse(raw);
      return (user?.name || "").trim();
    } catch {
      return "";
    }
  };
  const isVenueLabelSelected = (label) => {
    const ll = normalizeKey(label);
    const vn = normalizeKey(venueName);
    const vk = normalizeKey(venueKey);
    if (!ll) return false;
    return (vn && (vn.includes(ll) || ll.includes(vn))) || (vk && (vk.includes(ll) || ll.includes(vk)));
  };
  const isCteTrainingHallSelected = () => isVenueLabelSelected("CTE Training Hall");
  const isClassroomSelected = () => isVenueLabelSelected("Classroom");
  const isLaboratoryRoomSelected = () => isVenueLabelSelected("Laboratory Room");
  const isOthersVenueSelected = () => isVenueLabelSelected("Others");
  const openPrintSection = async () => {
    if (isGeneratingPdf) return;
    const popup = window.open("about:blank", "_blank");
    if (popup) {
      try {
        popup.opener = null;
        popup.document.title = "Preparing PDF…";
        popup.document.body.innerHTML = "<p style='font-family: Arial, sans-serif; padding: 16px;'>Preparing PDF…</p>";
      } catch {}
    }
    setIsGeneratingPdf(true);
    try {
      const setPopupMessage = (text) => {
        if (!popup || popup.closed) return;
        try {
          popup.document.body.innerHTML = `<p style="font-family: Arial, sans-serif; padding: 16px;">${text}</p>`;
        } catch {}
      };
      const openInPopup = (url) => {
        if (popup && !popup.closed) {
          try {
            popup.location.replace(url);
            return;
          } catch {}
          try {
            popup.document.body.innerHTML = `<iframe src="${url}" style="position:fixed; inset:0; width:100%; height:100%; border:0;"></iframe>`;
            return;
          } catch {}
        }
        window.open(url, "_blank");
      };

      const buildTcpdfBlob = async () => {
        if (!formData.activity?.trim()) {
          throw new Error("Please enter the Activity / Event.");
        }
        if (!formData.requestingParty?.trim()) {
          throw new Error("Please enter the Requesting Party.");
        }
        if (isClassroomSelected() && !formData.classroomSpecify?.trim()) {
          throw new Error("Please specify the Classroom.");
        }
        if (isLaboratoryRoomSelected() && !formData.laboratoryRoomSpecify?.trim()) {
          throw new Error("Please specify the Laboratory Room.");
        }
        if (isOthersVenueSelected() && !formData.othersVenueSpecify?.trim()) {
          throw new Error("Please specify the Others venue.");
        }
        if (wifiPreference === "wifi" && !formData.preferredWifiName?.trim()) {
          throw new Error("Please enter the Preferred Wifi Name.");
        }
        const dateOfUse = formData.dateOfUse?.trim() || toDateInputValue(selectedDate);
        if (!dateOfUse) {
          throw new Error("Please select the Date of Use.");
        }
        let start = "";
        let end = "";
        if (selectedSlots.length > 0) {
          const s = computeInclusiveFromSlots(selectedSlots);
          start = s.start;
          end = s.end;
        } else {
          const p = parseInclusiveTime(formData.inclusiveTime);
          start = p.start;
          end = p.end;
        }
        if (!start || !end) {
          throw new Error("Please provide a valid Inclusive Time.");
        }
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("You need to be logged in to open the PDF.");
        }
        const payload = {
          activity_event: formData.activity,
          requesting_party: formData.requestingParty,
          requested_by: formData.requestedBy,
          date_of_use: dateOfUse,
          inclusive_time_start: start,
          inclusive_time_end: end,
          pax_count: formData.paxCount?.toString().trim() ? parseInt(formData.paxCount, 10) : null,
          or_number: formData.orNumber,
          amount: formData.amount,
          or_date: formData.orDate,
          venue_name: venueName || "",
          venue_key: venueKey || "",
          wifi_preference: wifiPreference,
          preferred_wifi_name: formData.preferredWifiName?.trim() || "",
          selected_audio: selectedAudio,
          selected_video: selectedVideo,
          selected_lighting: selectedLighting,
          audio_details: audioDetails,
          video_details: videoDetails,
          lighting_details: lightingDetails,
        };
        if (isCteTrainingHallSelected()) {
          payload.cte_building_room = formData.cteBuildingRoom;
        }
        if (isClassroomSelected()) {
          payload.classroom_specify = formData.classroomSpecify;
        }
        if (isLaboratoryRoomSelected()) {
          payload.laboratory_room_specify = formData.laboratoryRoomSpecify;
        }
        if (isOthersVenueSelected()) {
          payload.others_venue_specify = formData.othersVenueSpecify;
        }
        const res = await axios.post("/api/reservations/form-pdf", payload, {
          responseType: "blob",
          headers: { Authorization: `Bearer ${token}` },
        });
        return new Blob([res.data], { type: "application/pdf" });
      };

      setPopupMessage("Preparing PDF…");
      const blob = await buildTcpdfBlob();

      const url = window.URL.createObjectURL(blob);
      openInPopup(url);
      setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      const msg = (e && typeof e.message === "string" && e.message.trim())
        ? e.message.trim()
        : "Failed to open the PDF. Please try again.";
      if (onNotify) onNotify(msg, "error");
      else alert(msg);
      if (popup && !popup.closed) popup.close();
    } finally {
      setIsGeneratingPdf(false);
    }
  };
  
  // Effect to pre-fill date if provided from parent
  useEffect(() => {
    if (!isOpen) return;
    if (reservationToEdit) return;
    const dateStr = toDateInputValue(selectedDate);
    if (dateStr) {
      setFormData(prev => ({ ...prev, dateOfUse: dateStr }));
    }
  }, [selectedDate, isOpen, reservationToEdit]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (!reservationToEdit) {
      setFormData(prev => {
        const dateOfUse = toDateInputValue(selectedDate) || prev.dateOfUse || "";
        const requestedBy = getStoredUserName();
        return { ...initialFormData, dateOfUse, requestedBy };
      });
      setSelectedSlots([]);
      setAcknowledged(false);
      setShowForm(false);
      setSelectedAudio([]);
      setSelectedVideo([]);
      setSelectedLighting([]);
      setWifiPreference("");
      setAudioDetails({});
      setVideoDetails({});
      setLightingDetails({});
      return;
    }

    const timeText = reservationToEdit?.inclusive_time_start && reservationToEdit?.inclusive_time_end
      ? `${reservationToEdit.inclusive_time_start} - ${reservationToEdit.inclusive_time_end}`
      : '';

    setFormData({
      orNumber: reservationToEdit?.or_number || "",
      amount: reservationToEdit?.or_amount || "",
      orDate: reservationToEdit?.or_date || "",
      activity: reservationToEdit?.activity_event || "",
      dateOfUse: reservationToEdit?.date_of_use ? toDateInputValue(reservationToEdit.date_of_use) : "",
      requestingParty: reservationToEdit?.requesting_party || "",
      requestedBy: reservationToEdit?.requested_by || reservationToEdit?.user?.name || "",
      cteBuildingRoom: "",
      classroomSpecify: reservationToEdit?.classroom_specify || "",
      laboratoryRoomSpecify: reservationToEdit?.laboratory_room_specify || "",
      othersVenueSpecify: reservationToEdit?.others_venue_specify || "",
      preferredWifiName: reservationToEdit?.preferred_wifi_name || reservationToEdit?.preferred_wifi || "",
      inclusiveTime: timeText,
      paxCount: (reservationToEdit?.pax_count ?? '') + '',
    });
    setSelectedSlots([]);
    setAcknowledged(true);
    setShowForm(false);
    const normalizeWifiPreference = (raw) => {
      const v = normalizeKey(raw);
      if (!v) return "";
      if (v === "wifi" || v === "with wifi") return "wifi";
      if (v === "no wifi") return "no_wifi";
      if (v === "true" || v === "1") return "wifi";
      if (v === "false" || v === "0") return "no_wifi";
      return "";
    };
    setWifiPreference(normalizeWifiPreference(reservationToEdit?.wifi_preference));

    const mk = (qty, remarks) => ({ qty: (qty ?? '') + '', remarks: (remarks ?? '') + '' });
    const a = {
      Amplifier: mk(reservationToEdit?.amplifier_qty, reservationToEdit?.amplifier_remarks || reservationToEdit?.audio_remarks),
      Speaker: mk(reservationToEdit?.speaker_qty, reservationToEdit?.speaker_remarks || reservationToEdit?.audio_remarks),
      Microphone: mk(reservationToEdit?.microphone_qty, reservationToEdit?.microphone_remarks || reservationToEdit?.audio_remarks),
      Others: mk(reservationToEdit?.audio_others_qty, reservationToEdit?.audio_others_remarks || reservationToEdit?.audio_remarks),
    };
    const v = {
      "Video Showing": mk(reservationToEdit?.video_showing_qty, reservationToEdit?.video_showing_remarks || reservationToEdit?.video_remarks),
      "Video Editing": mk(reservationToEdit?.video_editing_qty, reservationToEdit?.video_editing_remarks || reservationToEdit?.video_remarks),
      "Video Coverage": mk(reservationToEdit?.video_coverage_qty, reservationToEdit?.video_coverage_remarks || reservationToEdit?.video_remarks),
      Others: mk(reservationToEdit?.video_others_qty, reservationToEdit?.video_others_remarks || reservationToEdit?.video_remarks),
    };
    const l = {
      "Follow Spot": mk(reservationToEdit?.follow_spot_qty, reservationToEdit?.follow_spot_remarks || reservationToEdit?.lighting_remarks),
      "House Light": mk(reservationToEdit?.house_light_qty, reservationToEdit?.house_light_remarks || reservationToEdit?.lighting_remarks),
      "Electric Fans": mk(reservationToEdit?.electric_fans_qty, reservationToEdit?.electric_fans_remarks || reservationToEdit?.lighting_remarks),
      Others: mk(reservationToEdit?.lighting_others_qty, reservationToEdit?.lighting_others_remarks || reservationToEdit?.lighting_remarks),
    };
    setAudioDetails(a);
    setVideoDetails(v);
    setLightingDetails(l);

    const nonZero = (x) => {
      const n = typeof x === 'string' ? parseInt(x || '0', 10) : Number(x || 0);
      return !Number.isNaN(n) && n > 0;
    };
    setSelectedAudio(["Amplifier","Speaker","Microphone","Others"].filter(k => nonZero(a?.[k]?.qty) || !!a?.[k]?.remarks));
    setSelectedVideo(["Video Showing","Video Editing","Video Coverage","Others"].filter(k => nonZero(v?.[k]?.qty) || !!v?.[k]?.remarks));
    setSelectedLighting(["Follow Spot","House Light","Electric Fans","Others"].filter(k => nonZero(l?.[k]?.qty) || !!l?.[k]?.remarks));
  }, [isOpen, reservationToEdit]);

  const handleChange = (e) => { 
    const { name, value } = e.target;
    if (name === 'paxCount') {
      const v = (value || '').toString().replace(/\D+/g, '');
      setFormData({ ...formData, paxCount: v });
      return;
    }
    setFormData({ ...formData, [name]: value }); 
  }; 
  const toggleSlot = (key) => {
    setSelectedSlots(prev => {
      const exists = prev.includes(key);
      const next = exists ? prev.filter(k => k !== key) : [...prev, key];
      return next;
    });
  };

  const timeToMin = (t) => {
    if (!t || typeof t !== 'string') return NaN;
    const [hh, mm] = t.split(':').map(n => parseInt(n, 10));
    if (Number.isNaN(hh) || Number.isNaN(mm)) return NaN;
    return (hh * 60) + mm;
  };
  const overlaps = (aStart, aEnd, bStart, bEnd) => {
    const as = timeToMin(aStart);
    const ae = timeToMin(aEnd);
    const bs = timeToMin(bStart);
    const be = timeToMin(bEnd);
    if ([as, ae, bs, be].some(Number.isNaN)) return false;
    return as < be && ae > bs;
  };
  const computeUnavailableSlotKeys = (dateStr) => {
    const set = new Set();
    const vKey = (venueKey || '').toString();
    if (!dateStr) return set;

    // For today's date, disable time slots that have already started.
    const now = new Date();
    const todayStr = toDateInputValue(now);
    if (dateStr.trim() === todayStr) {
      const nowMinutes = (now.getHours() * 60) + now.getMinutes();
      TIME_SLOTS.forEach(slot => {
        const slotStartMinutes = timeToMin(slot.start);
        if (!Number.isNaN(slotStartMinutes) && slotStartMinutes <= nowMinutes) {
          set.add(slot.key);
        }
      });
    }

    if (!vKey) return set;

    const normalizedDate = dateStr.trim();
    const relevant = listReservations.filter(r => {
      const rStatus = (r?.status || '').toString().toLowerCase();
      if (!(rStatus === 'approved' || rStatus === 'pending')) return false;
      if (isEditing && r?.id && reservationToEdit?.id && String(r.id) === String(reservationToEdit.id)) return false;
      const rDate = toDateInputValue(r?.date_of_use);
      if (rDate !== normalizedDate) return false;
      return !!r?.[vKey];
    });

    TIME_SLOTS.forEach(slot => {
      const blocked = relevant.some(r =>
        overlaps(r?.inclusive_time_start, r?.inclusive_time_end, slot.start, slot.end)
      );
      if (blocked) set.add(slot.key);
    });

    return set;
  };

  const activeDateStr = (formData.dateOfUse?.trim() || toDateInputValue(selectedDate) || '').trim();
  const unavailableSlotKeys = computeUnavailableSlotKeys(activeDateStr);

  useEffect(() => {
    if (!isOpen) return;
    if (selectedSlots.length === 0) return;
    if (unavailableSlotKeys.size === 0) return;
    setSelectedSlots(prev => prev.filter(k => !unavailableSlotKeys.has(k)));
  }, [isOpen, venueKey, activeDateStr, reservationToEdit?.id, existingReservations]);
  const togglePick = (setFn, prevArr, item) => {
    if (prevArr.includes(item)) {
      setFn(prevArr.filter(i => i !== item));
    } else {
      setFn([...prevArr, item]);
    }
  };
  const toggleAudio = (item) => {
    if (selectedAudio.includes(item)) {
      setSelectedAudio(selectedAudio.filter(i => i !== item));
      setAudioDetails(prev => {
        const next = { ...prev };
        delete next[item];
        return next;
      });
    } else {
      setSelectedAudio([...selectedAudio, item]);
      const defaultQty = (item === "Amplifier" || item === "Speaker" || item === "Microphone" || item === "Others") ? "1" : "0";
      setAudioDetails(prev => ({
        ...prev,
        [item]: prev[item] || { qty: defaultQty, remarks: "" }
      }));
    }
  };
  const updateAudioDetail = (item, field, value) => {
    setAudioDetails(prev => ({
      ...prev,
      [item]: { ...(prev[item] || { qty: "", remarks: "" }), [field]: value }
    }));
  };
  const toggleVideo = (item) => {
    if (selectedVideo.includes(item)) {
      setSelectedVideo(selectedVideo.filter(i => i !== item));
      setVideoDetails(prev => {
        const next = { ...prev };
        delete next[item];
        return next;
      });
    } else {
      setSelectedVideo([...selectedVideo, item]);
      const defaultQty = "1";
      setVideoDetails(prev => ({
        ...prev,
        [item]: prev[item] || { qty: defaultQty, remarks: "" }
      }));
    }
  };
  const updateVideoDetail = (item, field, value) => {
    setVideoDetails(prev => ({
      ...prev,
      [item]: { ...(prev[item] || { qty: "", remarks: "" }), [field]: value }
    }));
  };
  const toggleLighting = (item) => {
    if (selectedLighting.includes(item)) {
      setSelectedLighting(selectedLighting.filter(i => i !== item));
      setLightingDetails(prev => {
        const next = { ...prev };
        delete next[item];
        return next;
      });
    } else {
      setSelectedLighting([...selectedLighting, item]);
      const defaultQty = "1";
      setLightingDetails(prev => ({
        ...prev,
        [item]: prev[item] || { qty: defaultQty, remarks: "" }
      }));
    }
  };
  const updateLightingDetail = (item, field, value) => {
    setLightingDetails(prev => ({
      ...prev,
      [item]: { ...(prev[item] || { qty: "", remarks: "" }), [field]: value }
    }));
  };
  const toggleWifiPreference = (value) => {
    setWifiPreference(prev => {
      const next = prev === value ? "" : value;
      if (next !== "wifi") {
        setFormData(formPrev => ({ ...formPrev, preferredWifiName: "" }));
      }
      return next;
    });
  };
  useEffect(() => {
    const { text } = computeInclusiveFromSlots(selectedSlots);
    if (text) {
      setFormData(prev => ({ ...prev, inclusiveTime: text }));
    }
  }, [selectedSlots]);
  useEffect(() => {
    if (formData.dateOfUse && !formData.inclusiveTime && selectedSlots.length === 0) {
      setFormData(prev => ({ ...prev, inclusiveTime: "08:00 - 17:00" }));
    }
  }, [formData.dateOfUse, formData.inclusiveTime, selectedSlots.length]);
  
  const isVenueSelected = (label) => {
    const ll = normalizeKey(label);
    const vn = normalizeKey(venueName);
    const vk = normalizeKey(venueKey);
    if (!ll) return false;
    return (vn && (vn.includes(ll) || ll.includes(vn))) || (vk && (vk.includes(ll) || ll.includes(vk)));
  };

  const handleSubmit = async () => {
    try {
      if (isSubmitting) return;
      setIsSubmitting(true);
      const token = localStorage.getItem("token");
      if (!token) {
        if (onNotify) onNotify("You need to be logged in to submit.", 'warning');
        return;
      }
      if (!acknowledged) {
        if (onNotify) onNotify("Please acknowledge the reservation form requirement.", 'warning');
        return;
      }
      if (!formData.activity?.trim()) {
        if (onNotify) onNotify("Please enter the Activity / Event.", 'warning');
        return;
      }
      if (!formData.requestingParty?.trim()) {
        if (onNotify) onNotify("Please enter the Requesting Party.", 'warning');
        return;
      }
      if (isClassroomSelected() && !formData.classroomSpecify?.trim()) {
        if (onNotify) onNotify("Please specify the Classroom.", 'warning');
        return;
      }
      if (isLaboratoryRoomSelected() && !formData.laboratoryRoomSpecify?.trim()) {
        if (onNotify) onNotify("Please specify the Laboratory Room.", 'warning');
        return;
      }
      if (isOthersVenueSelected() && !formData.othersVenueSpecify?.trim()) {
        if (onNotify) onNotify("Please specify the Others venue.", 'warning');
        return;
      }
      if (wifiPreference === "wifi" && !formData.preferredWifiName?.trim()) {
        if (onNotify) onNotify("Please enter the Preferred Wifi Name.", 'warning');
        return;
      }
      const dateOfUse = formData.dateOfUse?.trim() || toDateInputValue(selectedDate);
      if (!dateOfUse) {
        if (onNotify) onNotify("Please select the Date of Use.", 'warning');
        return;
      }
      {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const d = new Date(dateOfUse);
        d.setHours(0, 0, 0, 0);
        if (!Number.isNaN(d.getTime()) && d < today) {
          if (onNotify) onNotify("You cannot reserve a past date.", 'warning');
          return;
        }
      }
      if (selectedSlots.length > 0) {
        const unavailable = computeUnavailableSlotKeys(dateOfUse);
        const blocked = selectedSlots.filter(k => unavailable.has(k));
        if (blocked.length > 0) {
          if (onNotify) onNotify("One or more selected time slots are no longer available.", 'warning');
          setSelectedSlots(prev => prev.filter(k => !unavailable.has(k)));
          return;
        }
      }
      let start = "";
      let end = "";
      if (selectedSlots.length > 0) {
        const s = computeInclusiveFromSlots(selectedSlots);
        start = s.start;
        end = s.end;
      } else {
        const p = parseInclusiveTime(formData.inclusiveTime);
        start = p.start;
        end = p.end;
      }
      if (!start || !end) {
        if (onNotify) onNotify("Please provide a valid Inclusive Time.", 'warning');
        return;
      }
      const ensureCategoryId = async () => {
        const cats = await axios.get("/api/categories", {
          headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.data).catch(() => []);
        if (Array.isArray(cats) && cats.length > 0) return cats[0].id;
        const created = await axios.post("/api/categories", { name: "General" }, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.data);
        return created.id;
      };
      const category_id = await ensureCategoryId();
      const toInt = (v) => {
        const n = parseInt((v ?? '').toString().trim() || '0', 10);
        return Number.isNaN(n) ? 0 : n;
      };
      const avQty = {
        amplifier_qty: toInt(audioDetails["Amplifier"]?.qty),
        speaker_qty: toInt(audioDetails["Speaker"]?.qty),
        microphone_qty: toInt(audioDetails["Microphone"]?.qty),
        video_showing_qty: toInt(videoDetails["Video Showing"]?.qty),
        video_editing_qty: toInt(videoDetails["Video Editing"]?.qty),
        video_coverage_qty: toInt(videoDetails["Video Coverage"]?.qty),
        follow_spot_qty: toInt(lightingDetails["Follow Spot"]?.qty),
        house_light_qty: toInt(lightingDetails["House Light"]?.qty),
        electric_fans_qty: toInt(lightingDetails["Electric Fans"]?.qty),
      };
      const payload = {
        activity_event: formData.activity,
        requesting_party: formData.requestingParty,
        requested_by: formData.requestedBy,
        date_of_use: dateOfUse,
        inclusive_time_start: start,
        inclusive_time_end: end,
        category_id,
        pax_count: formData.paxCount?.toString().trim() ? parseInt(formData.paxCount, 10) : null,
        wifi_preference: wifiPreference,
        amplifier_qty: avQty.amplifier_qty,
        speaker_qty: avQty.speaker_qty,
        microphone_qty: avQty.microphone_qty,
        audio_others_qty: toInt(audioDetails["Others"]?.qty),
        amplifier_remarks: audioDetails["Amplifier"]?.remarks || "",
        speaker_remarks: audioDetails["Speaker"]?.remarks || "",
        microphone_remarks: audioDetails["Microphone"]?.remarks || "",
        audio_others_remarks: audioDetails["Others"]?.remarks || "",
        video_showing_qty: avQty.video_showing_qty,
        video_editing_qty: avQty.video_editing_qty,
        video_coverage_qty: avQty.video_coverage_qty,
        video_others_qty: toInt(videoDetails["Others"]?.qty),
        video_showing_remarks: videoDetails["Video Showing"]?.remarks || "",
        video_editing_remarks: videoDetails["Video Editing"]?.remarks || "",
        video_coverage_remarks: videoDetails["Video Coverage"]?.remarks || "",
        video_others_remarks: videoDetails["Others"]?.remarks || "",
        follow_spot_qty: avQty.follow_spot_qty,
        house_light_qty: avQty.house_light_qty,
        electric_fans_qty: avQty.electric_fans_qty,
        lighting_others_qty: toInt(lightingDetails["Others"]?.qty),
        follow_spot_remarks: lightingDetails["Follow Spot"]?.remarks || "",
        house_light_remarks: lightingDetails["House Light"]?.remarks || "",
        electric_fans_remarks: lightingDetails["Electric Fans"]?.remarks || "",
        lighting_others_remarks: lightingDetails["Others"]?.remarks || "",
      };
      if (venueKey) {
        if (venueKey === "classroom_specify") {
          payload.classroom_specify = formData.classroomSpecify?.trim() || "";
        } else if (venueKey === "laboratory_room_specify") {
          payload.laboratory_room_specify = formData.laboratoryRoomSpecify?.trim() || "";
        } else if (venueKey === "others_venue_specify") {
          payload.others_venue_specify = formData.othersVenueSpecify?.trim() || "";
        } else {
          payload[venueKey] = true;
        }
      }
      const response = isEditing
        ? await axios.put(`/api/reservations/${reservationToEdit.id}`, payload, { headers: { Authorization: `Bearer ${token}` } })
        : await axios.post("/api/reservations", payload, { headers: { Authorization: `Bearer ${token}` } });
      if (onNotify) onNotify(isEditing ? "Reservation updated successfully!" : "Reservation submitted successfully!", 'success');
      if (onSubmitted) {
        const augmented = { ...(response?.data || {}), pax_count: formData.paxCount };
        if (venueKey === "classroom_specify") {
          augmented.classroom_specify = formData.classroomSpecify?.trim() || augmented.classroom_specify;
        } else if (venueKey === "laboratory_room_specify") {
          augmented.laboratory_room_specify = formData.laboratoryRoomSpecify?.trim() || augmented.laboratory_room_specify;
        } else if (venueKey === "others_venue_specify") {
          augmented.others_venue_specify = formData.othersVenueSpecify?.trim() || augmented.others_venue_specify;
        } else if (venueKey && !augmented[venueKey]) {
          augmented[venueKey] = true;
        }
        onSubmitted(augmented);
      }
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Error submitting reservation", error);
      if (onNotify) onNotify("Failed to submit reservation.", 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return ( 
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <style>
        {`
          @media print {
            @page {
              margin: 0;
              size: 216mm 330mm;
            }
            html,
            body {
              margin: 0;
              padding: 0;
              width: 216mm;
              height: 330mm;
            }
            body {
              margin: 0;
            }
            body * {
              visibility: hidden;
            }
            #reservation-form-print,
            #reservation-form-print * {
              visibility: visible;
            }
            #reservation-form-print {
              position: fixed;
              left: 0;
              top: 0;
              width: 216mm;
              min-height: 330mm;
            }
          }
        `}
      </style>
      <div className="relative w-full min-h-full flex justify-center items-start p-4">
        
        {!showForm && (
        <div className="relative max-w-2xl w-full mx-auto bg-white rounded-lg shadow p-4 sm:p-6 mb-6 print:hidden max-h-[90vh] overflow-y-auto">
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 print:hidden"
            aria-label="Close"
            title="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-black-900">Reservation Request</h2>
            <div className="mt-1 text-sm text-gray-500 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : ''}
            </div>
            <div className="mt-3 rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3 flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white border border-indigo-100 text-indigo-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M9 21V9h6v12M7 9h10l-1-5H8l-1 5z"/></svg>
              </div>
              <div className="flex-1">
                <div className="text-[11px] font-bold tracking-wide text-indigo-700 uppercase">VENUE</div>
                <div className="text-sm font-bold text-gray-900">{venueName || "Venue"}</div>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {isOthersVenueSelected() && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">OTHERS (PLEASE SPECIFY)</label>
                <input
                  name="othersVenueSpecify"
                  value={formData.othersVenueSpecify}
                  onChange={handleChange}
                  placeholder="e.g. LNU Grounds (Main Gate Area)"
                  className="w-full border border-gray-400 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-100 focus:border-gray-300"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">REQUESTED BY</label>
              <input
                name="requestedBy"
                value={formData.requestedBy}
                onChange={handleChange}
                placeholder="e.g. John J. Doe"
                className="w-full border border-gray-400 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-100 focus:border-gray-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">ACTIVITY / EVENT</label>
              <input
                name="activity"
                value={formData.activity}
                onChange={handleChange}
                placeholder="e.g. Annual General Assembly"
                className="w-full border rounded-md p-2 text-sm border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-100 focus:border-gray-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">REQUESTING PARTY (ORG/DEPT)</label>
              <input
                name="requestingParty"
                value={formData.requestingParty}
                onChange={handleChange}
                placeholder="e.g. College of Arts & Sciences"
                className="w-full border rounded-md p-2 text-sm border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-100 focus:border-gray-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">APPROXIMATE NUMBER OF PAX</label>
              <input
                name="paxCount"
                value={formData.paxCount}
                onChange={handleChange}
                placeholder="e.g. 120"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                onKeyDown={(e) => {
                  if (['e','E','+','-','.'].includes(e.key)) e.preventDefault();
                }}
                className="w-full border rounded-md p-2 text-sm border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-100 focus:border-gray-300"
              />
            </div>
          </div>
          <div className="mb-4">
            <div className="text-sm font-bold text-gray-700 mb-2">TIME SLOTS (2-HOUR WINDOWS)</div>
            <div className="border border-gray-400 rounded-lg p-3 space-y-2">
              {TIME_SLOTS.map(s => (
                (() => {
                  const isUnavailable = unavailableSlotKeys.has(s.key);
                  return (
                <label
                  key={s.key}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 transition border-[1px] border-solid focus-within:outline-none focus-within:ring-2 focus-within:ring-gray-100 ${
                    isUnavailable ? 'cursor-not-allowed opacity-60 border-gray-200 bg-gray-100' : 'cursor-pointer'
                  } ${
                    selectedSlots.includes(s.key) ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <input className="h-4 w-4 accent-blue-700" type="checkbox" disabled={isUnavailable} checked={selectedSlots.includes(s.key)} onChange={() => !isUnavailable && toggleSlot(s.key)} />
                  <span className="text-sm">{s.label}</span>
                </label>
                  );
                })()
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-2">You may select multiple slots for the same day.</div>
          </div>
          {isClassroomSelected() && selectedSlots.length > 0 && (
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-700 mb-2">CLASSROOM (PLEASE SPECIFY)</label>
              <select
                name="classroomSpecify"
                value={formData.classroomSpecify}
                onChange={handleChange}
                className="w-full border border-gray-400 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-100 focus:border-gray-300"
              >
                <option value="">-- Select a Classroom --</option>
                <option value="CTE Building, Room 101">CTE Building, Room 101</option>
                <option value="CTE Building, Room 102">CTE Building, Room 102</option>
                <option value="CTE Building, Room 103">CTE Building, Room 103</option>
                <option value="CTE Building, Room 201">CTE Building, Room 201</option>
                <option value="CTE Building, Room 202">CTE Building, Room 202</option>
                <option value="Science Building, Room 301">Science Building, Room 301</option>
                <option value="Science Building, Room 302">Science Building, Room 302</option>
                <option value="Science Building, Room 303">Science Building, Room 303</option>
                <option value="Arts Building, Room 105">Arts Building, Room 105</option>
                <option value="Arts Building, Room 106">Arts Building, Room 106</option>
                <option value="Other">Other (Please specify below)</option>
              </select>
              {formData.classroomSpecify === "Other" && (
                <input
                  type="text"
                  placeholder="Please specify the classroom"
                  className="w-full border border-gray-400 rounded-md p-2 text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-gray-100 focus:border-gray-300"
                  onChange={(e) => setFormData(prev => ({ ...prev, classroomSpecify: e.target.value }))}
                />
              )}
            </div>
          )}
          {isCteTrainingHallSelected() && selectedSlots.length > 0 && (
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-700 mb-2">CTE BLDG / ROOM NO.</label>
              <select
                name="cteBuildingRoom"
                value={formData.cteBuildingRoom}
                onChange={handleChange}
                className="w-full border border-gray-400 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-100 focus:border-gray-300"
              >
                <option value="">-- Select a CTE Room --</option>
                <option value="CTE Bldg, Room 201">CTE Bldg, Room 201</option>
                <option value="CTE Bldg, Room 202">CTE Bldg, Room 202</option>
                <option value="CTE Bldg, Room 203">CTE Bldg, Room 203</option>
                <option value="CTE Bldg, Room 204">CTE Bldg, Room 204</option>
                <option value="CTE Bldg, Room 301">CTE Bldg, Room 301</option>
                <option value="CTE Bldg, Room 302">CTE Bldg, Room 302</option>
                <option value="CTE Bldg, Room 303">CTE Bldg, Room 303</option>
                <option value="CTE Bldg, Room 304">CTE Bldg, Room 304</option>
                <option value="CTE Bldg, Room 305">CTE Bldg, Room 305</option>
                <option value="CTE Training Hall 2">CTE Training Hall 2</option>
                <option value="CTE Training Hall 3">CTE Training Hall 3</option>
                <option value="Other">Other (Please specify below)</option>
              </select>
              {formData.cteBuildingRoom === "Other" && (
                <input
                  type="text"
                  placeholder="Please specify the CTE room"
                  className="w-full border border-gray-400 rounded-md p-2 text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-gray-100 focus:border-gray-300"
                  onChange={(e) => setFormData(prev => ({ ...prev, cteBuildingRoom: e.target.value }))}
                />
              )}
            </div>
          )}
          {isLaboratoryRoomSelected() && selectedSlots.length > 0 && (
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-700 mb-2">LABORATORY ROOM (PLEASE SPECIFY)</label>
              <select
                name="laboratoryRoomSpecify"
                value={formData.laboratoryRoomSpecify}
                onChange={handleChange}
                className="w-full border border-gray-400 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-100 focus:border-gray-300"
              >
                <option value="">-- Select a Laboratory Room --</option>
                <option value="Science Lab 1">Science Lab 1</option>
                <option value="Science Lab 2">Science Lab 2</option>
                <option value="Science Lab 3">Science Lab 3</option>
                <option value="Biology Lab">Biology Lab</option>
                <option value="Chemistry Lab">Chemistry Lab</option>
                <option value="Physics Lab">Physics Lab</option>
                <option value="Computer Lab A">Computer Lab A</option>
                <option value="Computer Lab B">Computer Lab B</option>
                <option value="Engineering Lab">Engineering Lab</option>
                <option value="Other">Other (Please specify below)</option>
              </select>
              {formData.laboratoryRoomSpecify === "Other" && (
                <input
                  type="text"
                  placeholder="Please specify the laboratory room"
                  className="w-full border border-gray-400 rounded-md p-2 text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-gray-100 focus:border-gray-300"
                  onChange={(e) => setFormData(prev => ({ ...prev, laboratoryRoomSpecify: e.target.value }))}
                />
              )}
            </div>
          )}
          <div className="mt-6">
            <div className="text-sm font-semibold text-gray-700">Audio-Visual Facilities <span className="text-gray-400 text-xs font-medium">Optional</span></div>
            <div className="grid grid-cols-1 gap-4 mt-2">
              <div className="border border-gray-400 rounded-md p-3">
                <div className="text-xs font-bold text-red-500 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10v4a1 1 0 001 1h3l5 4V5l-5 4H6a1 1 0 00-1 1z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10.5a3.5 3.5 0 010 7"></path></svg>
                  <span>AUDIO SYSTEM</span>
                </div>
                <div className="space-y-2">
                  {AUDIO_ITEMS.map(item => (
                    <div key={item} className="flex items-center gap-3">
                      <label className="flex items-center gap-2 min-w-[140px]">
                        <input
                          className="h-4 w-4 accent-indigo-700"
                          type="checkbox"
                          checked={selectedAudio.includes(item)}
                          onChange={() => toggleAudio(item)}
                        />
                        <span className="text-sm">{item}</span>
                      </label>
                      {selectedAudio.includes(item) && (
                        <>
                          <input
                            className="border border-gray-400 rounded px-2 h-5 w-13 text-center text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                            type="number"
                            placeholder="0"
                            value={(audioDetails[item]?.qty) || ""}
                            onChange={(e) => updateAudioDetail(item, "qty", e.target.value)}
                          />
                          <input
                            className="border border-gray-400 rounded px-2 h-5 flex-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                            type="text"
                            placeholder="Remarks"
                            value={(audioDetails[item]?.remarks) || ""}
                            onChange={(e) => updateAudioDetail(item, "remarks", e.target.value)}
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="border border-gray-400 rounded-md p-3">
                <div className="text-xs font-bold text-blue-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h11a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 8l5-3v14l-5-3"></path></svg>
                  <span>VIDEO SYSTEM</span>
                </div>
                <div className="space-y-2">
                  {VIDEO_ITEMS.map(item => (
                    <div key={item} className="flex items-center gap-3">
                      <label className="flex items-center gap-2 min-w-[140px]">
                        <input
                          className="h-4 w-4 accent-indigo-700"
                          type="checkbox"
                          checked={selectedVideo.includes(item)}
                          onChange={() => toggleVideo(item)}
                        />
                        <span className="text-sm">{item}</span>
                      </label>
                      {selectedVideo.includes(item) && (
                        <>
                          <input
                            className="border border-gray-400 rounded px-2 h-5 w-13 text-center text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                            type="number"
                            placeholder="0"
                            value={(videoDetails[item]?.qty) || ""}
                            onChange={(e) => updateVideoDetail(item, "qty", e.target.value)}
                          />
                          <input
                            className="border border-gray-400 rounded px-2 h-5 flex-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                            type="text"
                            placeholder="Remarks"
                            value={(videoDetails[item]?.remarks) || ""}
                            onChange={(e) => updateVideoDetail(item, "remarks", e.target.value)}
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="border border-gray-400 rounded-md p-3">
                <div className="text-xs font-bold text-yellow-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3a6 6 0 00-6 6c0 2.2 1.2 3.7 2.2 4.7.5.5.8 1 .8 1.6V17h6v-1.7c0-.6.3-1.1.8-1.6 1-1 2.2-2.5 2.2-4.7a6 6 0 00-6-6z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 21h6"></path></svg>
                  <span>LIGHTING SYSTEM</span>
                </div>
                <div className="space-y-2">
                  {LIGHTING_ITEMS.map(item => (
                    <div key={item} className="flex items-center gap-3">
                      <label className="flex items-center gap-2 min-w-[140px]">
                        <input
                          className="h-4 w-4 accent-indigo-700"
                          type="checkbox"
                          checked={selectedLighting.includes(item)}
                          onChange={() => toggleLighting(item)}
                        />
                        <span className="text-sm">{item}</span>
                      </label>
                      {selectedLighting.includes(item) && (
                        <>
                          <input
                            className="border border-gray-400 rounded px-2 h-5 w-13 text-center text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                            type="number"
                            placeholder="0"
                            value={(lightingDetails[item]?.qty) || ""}
                            onChange={(e) => updateLightingDetail(item, "qty", e.target.value)}
                          />
                          <input
                            className="border border-gray-400 rounded px-2 h-5 flex-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                            type="text"
                            placeholder="Remarks"
                            value={(lightingDetails[item]?.remarks) || ""}
                            onChange={(e) => updateLightingDetail(item, "remarks", e.target.value)}
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="border border-gray-400 rounded-md p-3">
                <div className="text-xs font-bold text-indigo-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12.55a11 11 0 0114 0M8.5 15.5a6 6 0 017 0M12 18h.01" />
                  </svg>
                  <span>WIFI</span>
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      className="h-4 w-4 accent-indigo-700"
                      type="checkbox"
                      checked={wifiPreference === "wifi"}
                      onChange={() => toggleWifiPreference("wifi")}
                    />
                    <span className="text-sm">With Wifi</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      className="h-4 w-4 accent-indigo-700"
                      type="checkbox"
                      checked={wifiPreference === "no_wifi"}
                      onChange={() => toggleWifiPreference("no_wifi")}
                    />
                    <span className="text-sm">No Wifi</span>
                  </label>
                </div>
                {wifiPreference === "wifi" && (
                  <div className="mt-3">
                    <label className="block text-xs font-bold text-gray-700 mb-1">PREFERRED WIFI NAME</label>
                    <input
                      name="preferredWifiName"
                      value={formData.preferredWifiName}
                      onChange={handleChange}
                      placeholder="e.g. VenueVisor-Guest"
                      className="w-full border border-gray-400 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-100 focus:border-gray-300"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 border rounded p-3 bg-red-50 border-red-200">
            <div className="text-sm font-semibold text-red-700">Important: Venue Reservation Form Required</div>
            <div className="text-xs text-red-700 mt-1">You must fill out the reservation form and secure the required signatures.</div>
            <div className="mt-3 space-y-2">
              <div>
                <button 
                  onClick={openPrintSection} 
                  disabled={isGeneratingPdf}
                  className={`px-1 py-1 text-sm rounded-full font-semibold ${isGeneratingPdf ? 'bg-blue-700 cursor-not-allowed' : 'bg-blue-900 hover:bg-blue-800'} text-white`}
                >
                  {isGeneratingPdf ? 'Preparing…' : 'Open Reservation Form (PDF)'}
                </button>
              </div>
              
              <div className="flex items-center gap-1">
                <label className="flex items-center gap-2">
                  <input
                    className="h-4 w-4 accent-green-700"
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                  />
                  <span className="text-sm text-red-700 font-semibold">I Understand</span>
                </label>
                <span className="text-xs text-red-700">Check to acknowledge before submitting.</span>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button 
              onClick={onClose}
              className="px-5 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!acknowledged || isSubmitting}
              className={`px-5 py-2 rounded font-semibold ${acknowledged && !isSubmitting ? 'bg-indigo-700 text-white hover:bg-indigo-800' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
            >
              {isEditing ? 'Update Request' : 'Submit Request'}
            </button>
          </div>
        </div>
        )}

        {shouldRenderForm && (
          <div 
            ref={printRef}
            id="reservation-form-print"
            className="fixed left-0 top-0 bg-white w-full max-w-[816px]" 
            style={{ 
              transform: "translateX(-2000px)",
              width: "8.5in", 
              height: "13in",
              overflow: "hidden",
              paddingTop: '0.5cm',
              paddingBottom: '0.5cm',
              paddingLeft: '1cm',
              paddingRight: '1cm',
              maxWidth: '100%'
            }} 
          > 
            <div className="flex flex-col">
              <BookingPDF 
                formData={formData}
                venueName={venueName}
                venueKey={venueKey}
                selectedAudio={selectedAudio}
                selectedVideo={selectedVideo}
                selectedLighting={selectedLighting}
                audioDetails={audioDetails}
                videoDetails={videoDetails}
                lightingDetails={lightingDetails}
                handleChange={handleChange}
              />
            </div>
          </div> 
        )}

      </div> 
    </div>
  ); 
}; 
 
export default BookingFormModal;
