import React, { useState, useEffect, useRef } from "react"; 
import axios from "axios";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
// import Logo from "../assets/lnu-logo.png"; 
// Using the existing logo path from the project
const Logo = "/assets/LNULogo.png";

const BookingFormModal = ({ isOpen, onClose, venueName, venueKey, selectedDate, onSubmitted, reservationToEdit, onNotify }) => { 
  const isEditing = !!reservationToEdit?.id;
  const toDateInputValue = (value) => {
    if (!value) return "";
    if (typeof value === "string") {
      const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    }
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const initialFormData = { 
    orNumber: "", 
    amount: "", 
    orDate: "", 
    activity: "", 
    dateOfUse: "", 
    requestingParty: "", 
    requestedBy: "",
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
  const [audioDetails, setAudioDetails] = useState({});
  const [videoDetails, setVideoDetails] = useState({});
  const [lightingDetails, setLightingDetails] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const printRef = useRef(null);
  const shouldRenderForm = isGeneratingPdf;
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

      let el = null;
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => requestAnimationFrame(() => r()));
        el = printRef.current;
        if (el) break;
      }
      if (!el) throw new Error("Reservation form element not ready");

      if (document.fonts?.ready) {
        try {
          await document.fonts.ready;
        } catch {}
      }
      const images = Array.from(el.querySelectorAll("img"));
      await Promise.all(
        images.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise((resolve) => {
                img.onload = () => resolve();
                img.onerror = () => resolve();
              })
        )
      );

      const buildClientPdfBlob = async () => {
        const canvas = await html2canvas(el, {
          scale: 1,
          useCORS: true,
          allowTaint: false,
          backgroundColor: "#ffffff",
          logging: false,
        });
        const pdf = new jsPDF({
          orientation: "p",
          unit: "pt",
          format: [612, 936],
        });
        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        pdf.addImage(imgData, "JPEG", 0, 0, 612, 936, undefined, "FAST");
        return pdf.output("blob");
      };

      const buildTcpdfBlob = async () => {
        if (!formData.activity?.trim()) {
          throw new Error("Please enter the Activity / Event.");
        }
        if (!formData.requestingParty?.trim()) {
          throw new Error("Please enter the Requesting Party.");
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
          or_number: formData.orNumber,
          amount: formData.amount,
          or_date: formData.orDate,
          venue_name: venueName || "",
          venue_key: venueKey || "",
          selected_audio: selectedAudio,
          selected_video: selectedVideo,
          selected_lighting: selectedLighting,
          audio_details: audioDetails,
          video_details: videoDetails,
          lighting_details: lightingDetails,
        };
        const res = await axios.post("/api/reservations/form-pdf", payload, {
          responseType: "blob",
          headers: { Authorization: `Bearer ${token}` },
        });
        return new Blob([res.data], { type: "application/pdf" });
      };

      let blob = null;
      try {
        setPopupMessage("Preparing PDF…");
        blob = await buildClientPdfBlob();
      } catch (e) {
        setPopupMessage("Preparing PDF (alternate)…");
        blob = await buildTcpdfBlob();
      }

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
  const TIME_SLOTS = [
    { key: "before_8", label: "Before 8:00 AM", start: "06:00", end: "08:00" },
    { key: "8_10", label: "8:00 AM - 10:00 AM", start: "08:00", end: "10:00" },
    { key: "10_12", label: "10:00 AM - 12:00 PM", start: "10:00", end: "12:00" },
    { key: "13_15", label: "1:00 PM - 3:00 PM", start: "13:00", end: "15:00" },
    { key: "15_17", label: "3:00 PM - 5:00 PM", start: "15:00", end: "17:00" },
    { key: "17_19", label: "5:00 PM - 7:00 PM", start: "17:00", end: "19:00" },
    { key: "past_19", label: "Past 7:00 PM", start: "19:00", end: "21:00" }
  ];
  const AUDIO_ITEMS = ["Amplifier", "Speaker", "Microphone", "Others"];
  const VIDEO_ITEMS = ["Video Showing", "Video Editing", "Video Coverage", "Others"];
  const LIGHTING_ITEMS = ["Follow Spot", "House Light", "Electric Fans", "Others"];

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
        return { ...initialFormData, dateOfUse };
      });
      setSelectedSlots([]);
      setAcknowledged(false);
      setShowForm(false);
      setSelectedAudio([]);
      setSelectedVideo([]);
      setSelectedLighting([]);
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
      inclusiveTime: timeText,
      paxCount: (reservationToEdit?.pax_count ?? '') + '',
    });
    setSelectedSlots([]);
    setAcknowledged(true);
    setShowForm(false);

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
    setFormData({ ...formData, [e.target.name]: e.target.value }); 
  }; 
  const toggleSlot = (key) => {
    setSelectedSlots(prev => {
      const exists = prev.includes(key);
      const next = exists ? prev.filter(k => k !== key) : [...prev, key];
      return next;
    });
  };
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
      setAudioDetails(prev => ({
        ...prev,
        [item]: prev[item] || { qty: "0", remarks: "" }
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
      setVideoDetails(prev => ({
        ...prev,
        [item]: prev[item] || { qty: "0", remarks: "" }
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
      setLightingDetails(prev => ({
        ...prev,
        [item]: prev[item] || { qty: "0", remarks: "" }
      }));
    }
  };
  const updateLightingDetail = (item, field, value) => {
    setLightingDetails(prev => ({
      ...prev,
      [item]: { ...(prev[item] || { qty: "", remarks: "" }), [field]: value }
    }));
  };
  const computeInclusiveFromSlots = (slots) => {
    if (!slots || slots.length === 0) return { start: "", end: "", text: "" };
    const map = new Map(TIME_SLOTS.map(s => [s.key, s]));
    const times = slots.map(k => map.get(k)).filter(Boolean);
    times.sort((a, b) => a.start.localeCompare(b.start));
    const start = times[0].start;
    const end = times.reduce((acc, cur) => (cur.end.localeCompare(acc) > 0 ? cur.end : acc), times[0].end);
    return { start, end, text: `${start} - ${end}` };
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
  
  const parseInclusiveTime = (value) => {
    if (!value) return { start: "", end: "" };
    const cleaned = value.replace(/\s+/g, " ").trim();
    const match = cleaned.match(/(\d{1,2}:\d{2})\s*[-–to]+\s*(\d{1,2}:\d{2})/i);
    if (match) {
      return { start: match[1], end: match[2] };
    }
    const parts = cleaned.split("-").map(s => s.trim());
    if (parts.length === 2) {
      return { start: parts[0], end: parts[1] };
    }
    return { start: cleaned, end: cleaned };
  };
  const normalizeKey = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
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
      const dateOfUse = formData.dateOfUse?.trim() || toDateInputValue(selectedDate);
      if (!dateOfUse) {
        if (onNotify) onNotify("Please select the Date of Use.", 'warning');
        return;
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
        payload[venueKey] = true;
      }
      const response = isEditing
        ? await axios.put(`/api/reservations/${reservationToEdit.id}`, payload, { headers: { Authorization: `Bearer ${token}` } })
        : await axios.post("/api/reservations", payload, { headers: { Authorization: `Bearer ${token}` } });
      if (onNotify) onNotify(isEditing ? "Reservation updated successfully!" : "Reservation submitted successfully!", 'success');
      if (onSubmitted) {
        const augmented = { ...(response?.data || {}), pax_count: formData.paxCount };
        if (venueKey && !augmented[venueKey]) {
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

  const CertificationAndApproval = () => (
    <div className="flex-1 text-center flex flex-col justify-between mt-0.1">
      <div className="mb-2">
        <p className="whitespace-nowrap" style={{ fontFamily: "Arial", fontSize: "10pt" }}>
          Certification of Availability of Equipment:
        </p>
        <input className="mt-0 border-b border-black mx-3 w-[80%] text-center focus:outline-none bg-transparent" />
        <p style={{ fontFamily: "Arial", fontSize: "9pt" }}>
          HRDC Audio-Visual Coordinator
        </p>
      </div>
      <div>
        <p className="mb-0" style={{ fontFamily: "Arial", fontSize: "10pt" }}>
          Recommending Approval:
        </p>
        <input className="mt-0 border-b border-black w-full text-center focus:outline-none bg-transparent" />
        <p className="whitespace-nowrap" style={{ fontFamily: "Arial", fontSize: "8pt" }}>
          Building Coordinator (Signature Over Printed Name)
        </p>
      </div>
    </div>
  );

  const ReservationForm = () => (
    <div className="relative">
          {/* HEADER */} 
          <div className="relative pb-3 leading-none"> 
            <img 
              src={Logo} 
              alt="LNU Logo" 
              className="absolute"
              style={{
                left: '3.78cm',
                top: '0cm',
                height: '2.25cm',
                width: '2.3cm'
              }}
            /> 

            <div className="text-center space-y-0 pt-4"> 
              <h2 className="mb-1" style={{ fontFamily: 'Bahnschrift', fontSize: '12pt' }}>Republic of the Philippines</h2> 
              <h1 className="font-bold mb-1" style={{ fontFamily: 'Bahnschrift, sans-serif', fontSize: '12pt' }}>LEYTE NORMAL UNIVERSITY</h1> 
              <p className="mb-1" style={{ fontFamily: 'Calibri, sans-serif', fontSize: '12pt' }}>Tacloban City</p> 
              <p className="font-bold mb-1" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt' }}>PHYSICAL PLANT AND FACILITIES</p> 
              <p className="font-bold mb-0" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt' }}>VENUE AND AUDIO-VISUAL FACILITIES RESERVATION FORM</p> 
            </div> 
          </div>

          {/* OR DETAILS BOX - Top Right */}
          <div 
            className="absolute top-2 left-130 border border-black p-2 bg-white z-10 flex flex-col justify-start"
            style={{ 
              fontFamily: 'Calibri(Body)', 
              fontSize: '11pt',
              width: '5.62cm',
              height: '2.09cm'
            }}
          >
            <div className="flex items-center gap-1 mb-0">
              <label className="w-21 shrink-0">OR Number:</label>
              <input 
                name="orNumber" 
                value={formData.orNumber} 
                onChange={handleChange} 
                className="border-b border-black flex-1 w-full focus:outline-none px-1" 
              />
            </div>
            <div className="flex items-center gap-1 mb-0">
              <label className="w-21 shrink-0">Amount:</label>
              <input 
                name="amount" 
                value={formData.amount} 
                onChange={handleChange} 
                className="border-b border-black flex-1 w-full focus:outline-none px-1" 
              />
            </div>
            <div className="flex items-center gap-1">
              <label className="w-21 shrink-0">Date:</label>
              <input 
                name="orDate" 
                value={formData.orDate} 
                onChange={handleChange} 
                className="border-b border-black flex-1 w-full focus:outline-none px-1" 
              />
            </div>
          </div>

          {/* EVENT INFO */} 
          <div className="grid grid-cols-2 gap-x-14 gap-y-0 mt-0" style={{ fontFamily: 'Arial', fontSize: '12pt' }}> 
            <div className="flex items-center gap-1 mb-0 space-y-0">
                <label className="w-25 shrink-0">Activity/Event:</label>
                <input name="activity" value={formData.activity} onChange={handleChange} className="border-b border-black w-200 focus:outline-none px-1" /> 
            </div>
            <div className="flex items-center gap-x-1 gap-y-10 space-y-0">
                <label className="text-right shrink-0 mb-0">Date of Use:</label>
                <input type="date" name="dateOfUse" value={formData.dateOfUse} onChange={handleChange} className="border-b border-black w-35 focus:outline-none px-1" /> 
            </div>
            <div className="flex items-center gap-1 whitespace-nowrap leading-none">
                <label className="text-right shrink-0 mb-0">Requesting Party:</label>
                <input name="requestingParty" value={formData.requestingParty} onChange={handleChange} className="border-b border-black flex-1 w-full focus:outline-none px-1" /> 
            </div>
            <div className="flex items-center gap-1 whitespace-nowrap leading-none">
                <label className="text-right shrink-0 mb-0">Inclusive Time:</label>
                <input name="inclusiveTime" value={formData.inclusiveTime} onChange={handleChange} className="border-b border-black w-34 focus:outline-none px-1" /> 
            </div>
          </div>

          {/* VENUE */} 
          <h3 className="font-bold mt-3 ml-68" style={{ fontFamily: 'Arial', fontSize: '9pt' }}>VENUE REQUESTED</h3> 
          <div className="grid grid-cols-2 gap-x-14 text-left" style={{ fontFamily: 'Arial', fontSize: '9pt' }}>
            <div className="flex flex-col space-y-0">
                {/* Row 1 */}
                <div className="flex items-center gap-2 whitespace-nowrap leading-none">
                    <label className="flex items-center gap-1">
                        <div className="flex items-center" style={{ fontFamily: 'Arial', fontSize: '9pt' }}><span>(</span><span className="w-3 h-4 flex items-center justify-center font-bold text-sm">{isVenueSelected("HRDC Hall") ? "✓" : ""}</span><span>)</span></div>
                        HRDC Hall
                    </label>
                    <label className="flex items-center gap-1">
                        <div className="flex items-center" style={{ fontFamily: 'Arial', fontSize: '9pt' }}><span>(</span><span className="w-3 h-4 flex items-center justify-center font-bold text-sm">{isVenueSelected("AV Studio") ? "✓" : ""}</span><span>)</span></div>
                        AV Studio
                    </label>
                    <label className="flex items-center gap-1">
                        <div className="flex items-center" style={{ fontFamily: 'Arial', fontSize: '9pt' }}><span>(</span><span className="w-3 h-4 flex items-center justify-center font-bold text-sm">{isVenueSelected("Bleacher") ? "✓" : ""}</span><span>)</span></div>
                        Bleacher
                    </label>
                    <label className="flex items-center gap-1">
                        <div className="flex items-center" style={{ fontFamily: 'Arial', fontSize: '9pt' }}><span>(</span><span className="w-3 h-4 flex items-center justify-center font-bold text-sm">{isVenueSelected("Alba Hall") ? "✓" : ""}</span><span>)</span></div>
                        Alba Hall
                    </label>
                </div>

                {/* Row 2 */}
                <label className="flex items-center gap-1 leading-none space-y-0">
                    <div className="flex items-center" style={{ fontFamily: 'Arial', fontSize: '9pt' }}><span>(</span><span className="w-3 h-4 flex items-center justify-center font-bold text-sm">{isVenueSelected("Student Center Mini-Theater") ? "✓" : ""}</span><span>)</span></div>
                    Student Center Mini-Theater
                </label>

                {/* Row 3 */}
                <div className="flex items-center gap-1 whitespace-nowrap leading-none">
                    <label className="flex items-center gap-1 cursor-pointer">
                        <div className="flex items-center" style={{ fontFamily: 'Arial', fontSize: '9pt' }}><span>(</span><span className="w-3 h-4 flex items-center justify-center font-bold text-sm">{isVenueSelected("CTE Training Hall") || isVenueSelected("CTE Training Hall 2") ? "✓" : ""}</span><span>)</span></div>
                        CTE Training Hall 2
                    </label>
                    <input className="border-b border-black w-5 min-w-[10px] focus:outline-none h-3" />
                    <span>or</span>
                    <input className="border-b border-black w-5 min-w-[10px] focus:outline-none h-3" />
                    <span>3 (specify)</span>
                </div>

                {/* Row 4 */}
                <div className="flex items-center gap-4 whitespace-nowrap leading-none">
                    <label className="flex items-center gap-1 cursor-pointer">
                        <div className="flex items-center" style={{ fontFamily: 'Arial', fontSize: '9pt' }}><span>(</span><span className="w-3 h-4 flex items-center justify-center font-bold text-sm">{isVenueSelected("Admin Ballroom 2F") ? "✓" : ""}</span><span>)</span></div>
                        Admin Ballroom 2F
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                        <div className="flex items-center" style={{ fontFamily: 'Arial', fontSize: '9pt' }}><span>(</span><span className="w-3 h-4 flex items-center justify-center font-bold text-sm">{isVenueSelected("Multi-Purpose Hall 3F") ? "✓" : ""}</span><span>)</span></div>
                        Multi-Purpose Hall 3F
                    </label>
                </div>

                {/* Row 5 */}
                <div className="flex items-center gap-4 whitespace-nowrap leading-none">
                    <label className="flex items-center gap-1 cursor-pointer">
                        <div className="flex items-center" style={{ fontFamily: 'Arial', fontSize: '9pt' }}><span>(</span><div className="w-3 h-4 relative flex items-center justify-center"><input type="checkbox" className="hidden peer" /><span className="hidden peer-checked:block font-bold text-sm absolute">✓</span></div><span>)</span></div>
                        Hum. AV Theater
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                        <div className="flex items-center" style={{ fontFamily: 'Arial', fontSize: '9pt' }}><span>(</span><span className="w-3 h-4 flex items-center justify-center font-bold text-sm">{isVenueSelected("Dance Studio") ? "✓" : ""}</span><span>)</span></div>
                        Dance Studio
                    </label>
                </div>

                {/* Row 6 */}
                <label className="flex items-center gap-1 leading-none">
                    <div className="flex items-center" style={{ fontFamily: 'Arial', fontSize: '9pt' }}><span>(</span><span className="w-3 h-4 flex items-center justify-center font-bold text-sm">{isVenueSelected("CME Gym") ? "✓" : ""}</span><span>)</span></div>
                    CME Gym
                </label>
            </div>

            <div className="flex flex-col space-y-0">
                {/* Row 1 */}
                <div className="flex items-center mr-30 gap-1 whitespace-nowrap leading-none">
                    <label className="flex items-center gap-1">
                        <div className="flex items-center" style={{ fontFamily: 'Arial', fontSize: '9pt' }}><span>(</span><span className="w-3 h-4 flex items-center justify-center font-bold text-sm">{isVenueSelected("Classroom") ? "✓" : ""}</span><span>)</span></div>
                        Classroom
                    </label>
                    <input className="border-b border-black flex-1 min-w-[10px] focus:outline-none h-3" />
                    <span>(specify)</span>
                </div>

                {/* Row 2 */}
                <div className="flex items-center gap-1 mr-19 whitespace-nowrap leading-none">
                    <label className="flex items-center gap-1">
                        <div className="flex items-center" style={{ fontFamily: 'Arial', fontSize: '9pt' }}><span>(</span><span className="w-3 h-4 flex items-center justify-center font-bold text-sm">{isVenueSelected("Laboratory Room") ? "✓" : ""}</span><span>)</span></div>
                        Laboratory Room
                    </label>
                    <input className="border-b border-black flex-1 min-w-[50px] focus:outline-none h-3" />
                    <span>(specify)</span>
                </div>

                {/* Row 3 */}
                <label className="flex items-center gap-1 leading-none">
                    <div className="flex items-center" style={{ fontFamily: 'Arial', fontSize: '9pt' }}><span>(</span><span className="w-3 h-4 flex items-center justify-center font-bold text-sm">{isVenueSelected("Library Grounds") ? "✓" : ""}</span><span>)</span></div>
                    Library Grounds
                </label>

                {/* Row 4 */}
                <label className="flex items-center gap-1 leading-none">
                    <div className="flex items-center" style={{ fontFamily: 'Arial', fontSize: '9pt' }}><span>(</span><span className="w-3 h-4 flex items-center justify-center font-bold text-sm">{isVenueSelected("ORC Quadrangle") || isVenueSelected("ORC Quadrangle/Stage") ? "✓" : ""}</span><span>)</span></div>
                    ORC Quadrangle/Stage
                </label>

                {/* Row 5 */}
                <div className="flex items-center gap-1 mr-27 whitespace-nowrap leading-none">
                    <label className="flex items-center gap-1">
                        <div className="flex items-center" style={{ fontFamily: 'Arial', fontSize: '9pt' }}><span>(</span><span className="w-3 h-4 flex items-center justify-center font-bold text-sm">{isVenueSelected("Others") ? "✓" : ""}</span><span>)</span></div>
                        Others
                    </label>
                    <input className="border-b border-black flex-1 min-w-[50px] focus:outline-none h-3" />
                    <span>(specify)</span>
                </div>
            </div>
          </div>


          {/* AV FACILITIES */} 
          <h3 className="font-bold mt-1 text-center" style={{ fontFamily: 'Arial', fontSize: '10pt' }}>AUDIO-VISUAL FACILITIES</h3> 

          <div className="grid grid-cols-3 gap-6" style={{ fontFamily: 'Arial', fontSize: '9pt' }}> 

            {/* AUDIO */} 
            <div> 
              <h4 className="font-bold text-center underline mb-1">AUDIO SYSTEM</h4> 
              <div className="flex justify-end gap-6 mr-1 leading-none space-y-0">
                 <span className="font-bold space-y-0">Qty</span>
                 <span className="font-bold">Remarks</span>
              </div>
              <div className="space-y-0">
                {["Amplifier", "Speaker", "Microphone", "Others"].map((item) => {
                  const isChecked = selectedAudio.includes(item);
                  const qty = audioDetails[item]?.qty || "";
                  const remarks = audioDetails[item]?.remarks || "";
                  return (
                    <div key={item} className="flex items-center justify-between leading-none">
                      <label className="flex items-center gap-1 whitespace-nowrap">
                        <div className="flex items-center">
                          <span>(</span>
                          <span className="w-3 h-4 flex items-center justify-center font-bold text-sm">{isChecked ? "✓" : ""}</span>
                          <span>)</span>
                        </div>
                        {item}
                      </label>
                      <div className="flex gap-2">
                        <input className="border-b border-black w-13 h-4 text-center focus:outline-none bg-transparent" value={qty} readOnly />
                        <input className="border-b border-black w-15 h-4 focus:outline-none bg-transparent" value={remarks} readOnly />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div> 

            {/* VIDEO */} 
            <div> 
              <h4 className="font-bold text-center underline mb-1">VIDEO SYSTEM</h4> 
              <div className="flex justify-end gap-6 mr-1 mb-1 leading-none space-y-0">
                 <span className="font-bold">Qty</span>
                 <span className="font-bold">Remarks</span>
              </div>
              <div className="space-y-0">
                {["Video Showing", "Video Editing", "Video Coverage", "Others"].map((item) => {
                  const isChecked = selectedVideo.includes(item);
                  const qty = videoDetails[item]?.qty || "";
                  const remarks = videoDetails[item]?.remarks || "";
                  return (
                    <div key={item} className="flex items-center justify-between leading-none">
                      <label className="flex items-center gap-1 whitespace-nowrap">
                        <div className="flex items-center">
                          <span>(</span>
                          <span className="w-3 h-4 flex items-center justify-center font-bold text-sm">{isChecked ? "✓" : ""}</span>
                          <span>)</span>
                        </div>
                        {item}
                      </label>
                      <div className="flex gap-2">
                        <input className="border-b border-black w-12 h-4 text-center focus:outline-none bg-transparent" value={qty} readOnly />
                        <input className="border-b border-black w-15 h-4 focus:outline-none bg-transparent" value={remarks} readOnly />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div> 

            {/* LIGHTING */} 
            <div> 
              <h4 className="font-bold text-center underline mb-1">LIGHTING SYSTEM / FANS</h4> 
              <div className="flex justify-end gap-6 mr-1 mb-1 leading-none">
                 <span className="font-bold">Qty</span>
                 <span className="font-bold">Remarks</span>
              </div>
              <div className="space-y-0">
                {["Follow Spot", "House Light", "Electric Fans", "Others"].map((item) => {
                  const isChecked = selectedLighting.includes(item);
                  const qty = lightingDetails[item]?.qty || "";
                  const remarks = lightingDetails[item]?.remarks || "";
                  return (
                    <div key={item} className="flex items-center justify-between leading-none">
                      <label className="flex items-center gap-1 whitespace-nowrap">
                        <div className="flex items-center">
                          <span>(</span>
                          <span className="w-3 h-4 flex items-center justify-center font-bold text-sm">{isChecked ? "✓" : ""}</span>
                          <span>)</span>
                        </div>
                        {item}
                      </label>
                      <div className="flex gap-2">
                        <input className="border-b border-black w-13 h-4 text-center focus:outline-none bg-transparent" value={qty} readOnly />
                        <input className="border-b border-black w-15 h-4 focus:outline-none bg-transparent" value={remarks} readOnly />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div> 

          </div> 

          {/* FOOTER SECTION */}
          <div className="mt-3">
            
            <div className="flex gap-2 items-end">
                {/* Left Col */}
                <div className="flex-1 text-center">
                    <div className="mb-0.3">
                        <p className="mb-1" style={{ fontFamily: 'Arial', fontSize: '10pt' }}>Requested by:</p>
                        <input className="border-b border-black w-full text-center focus:outline-none bg-transparent mt-3" value={formData.requestedBy} readOnly />
                        <p className="whitespace-nowrap" style={{ fontFamily: 'Arial', fontSize: '8pt' }}>Requesting Party (Signature Over Printed Name)</p>
                    </div>
                </div>

                {/* Middle Col */}
                <CertificationAndApproval />

              {/* Right Col */}
              <div className="flex-1 mt-0">
                <div
                  className="absolute top-111 left-130 border border-black p-2 bg-white z-10 flex flex-col justify-start leading-tight"
                  style={{
                    fontFamily: "Calibri",
                    fontSize: "11pt",
                    height: "3.3cm",
                    width: "5.62cm",
                  }}
                >
                  <p className="m-0">Approved by:</p>

                  <div className="mt-5 text-center">
                    <input className="border-b border-black w-full text-center focus:outline-none bg-transparent h-4" />
                    <p className="m-0 text-[10pt]">
                      Director, Physical Plant & Facilities
                    </p>
                  </div>

                  <div className="mt-4 flex items-center gap-1">
                    <span className="font-bold text-[10pt]"style={{ fontFamily: 'Calibri', fontSize: '11pt' }}>DATE RECEIVED:</span>
                    <input className="border-b border-black w-23 focus:outline-none bg-transparent h-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Document Code */}
            <div className="mt-2">
                <p className="font-bold" style={{ fontFamily: 'Arial', fontSize: '12pt' }}>F-PPF-001 (09-02-19)</p>
            </div>

          </div>
    </div>
  );

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
        <div className="relative max-w-2xl w-full mx-auto bg-white rounded-lg shadow p-6 mb-6 print:hidden max-h-[85vh] overflow-y-auto">
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
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">REQUESTED BY</label>
              <input
                name="requestedBy"
                value={formData.requestedBy}
                onChange={handleChange}
                placeholder="e.g. John J. Doe"
                className="w-full border border-gray-400 rounded-md p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">ACTIVITY / EVENT</label>
              <input
                name="activity"
                value={formData.activity}
                onChange={handleChange}
                placeholder="e.g. Annual General Assembly"
                className="w-full border rounded-md p-2 text-sm border-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">REQUESTING PARTY (ORG/DEPT)</label>
              <input
                name="requestingParty"
                value={formData.requestingParty}
                onChange={handleChange}
                placeholder="e.g. College of Arts & Sciences"
                className="w-full border rounded-md p-2 text-sm border-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">APPROXIMATE NUMBER OF PAX</label>
              <input
                name="paxCount"
                value={formData.paxCount}
                onChange={handleChange}
                placeholder="e.g. 120"
                className="w-full border rounded-md p-2 text-sm border-gray-400"
              />
            </div>
          </div>
          <div className="mb-4">
            <div className="text-sm font-bold text-gray-700 mb-2">TIME SLOTS (2-HOUR WINDOWS)</div>
            <div className="border border-gray-400 rounded-lg p-3 space-y-2">
              {TIME_SLOTS.map(s => (
                <label
                  key={s.key}
                  className={`flex items-center gap-3 border rounded-lg px-3 py-2 cursor-pointer transition ${
                    selectedSlots.includes(s.key) ? 'border-white-500 bg-blue-50' : 'border-blue-200 bg-blue-50'
                  }`}
                >
                  <input type="checkbox" checked={selectedSlots.includes(s.key)} onChange={() => toggleSlot(s.key)} />
                  <span className="text-sm">{s.label}</span>
                </label>
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-2">You may select multiple slots for the same day.</div>
          </div>
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
                          type="checkbox"
                          checked={selectedAudio.includes(item)}
                          onChange={() => toggleAudio(item)}
                        />
                        <span className="text-sm">{item}</span>
                      </label>
                      {selectedAudio.includes(item) && (
                        <>
                          <input
                            className="border border-gray-400 rounded px-2 h-5 w-13 text-center text-sm"
                            type="number"
                            placeholder="0"
                            value={(audioDetails[item]?.qty) || ""}
                            onChange={(e) => updateAudioDetail(item, "qty", e.target.value)}
                          />
                          <input
                            className="border border-gray-400 rounded px-2 h-5 flex-1 text-sm"
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
                          type="checkbox"
                          checked={selectedVideo.includes(item)}
                          onChange={() => toggleVideo(item)}
                        />
                        <span className="text-sm">{item}</span>
                      </label>
                      {selectedVideo.includes(item) && (
                        <>
                          <input
                            className="border border-gray-400 rounded px-2 h-5 w-13 text-center text-sm"
                            type="number"
                            placeholder="0"
                            value={(videoDetails[item]?.qty) || ""}
                            onChange={(e) => updateVideoDetail(item, "qty", e.target.value)}
                          />
                          <input
                            className="border border-gray-400 rounded px-2 h-5 flex-1 text-sm"
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
                          type="checkbox"
                          checked={selectedLighting.includes(item)}
                          onChange={() => toggleLighting(item)}
                        />
                        <span className="text-sm">{item}</span>
                      </label>
                      {selectedLighting.includes(item) && (
                        <>
                          <input
                            className="border border-gray-400 rounded px-2 h-5 w-13 text-center text-sm"
                            type="number"
                            placeholder="0"
                            value={(lightingDetails[item]?.qty) || ""}
                            onChange={(e) => updateLightingDetail(item, "qty", e.target.value)}
                          />
                          <input
                            className="border border-gray-400 rounded px-2 h-5 flex-1 text-sm"
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
                <button 
                  type="button"
                  aria-pressed={acknowledged}
                  onClick={() => setAcknowledged(prev => !prev)} 
                  className={`${acknowledged ? 'bg-green-700 text-white text-sm' : 'border border-red-200 text-red-500 bg-white text-sm'} px-1 py-1 rounded`}
                >
                  {acknowledged ? 'Acknowledged' : 'I Understand'}
                </button>
                <span className="text-xs text-red-700">Click to acknowledge before submitting.</span>
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
              <ReservationForm />
              <div className="mt-2 pt-2 border-t border-black">
                <ReservationForm />
              </div>
            </div>
          </div> 
        )}

      </div> 
    </div>
  ); 
}; 
 
export default BookingFormModal;
