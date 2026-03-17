import React from "react";

export const TIME_SLOTS = [
  { key: "before_8", label: "Before 8:00 AM", start: "06:00", end: "08:00" },
  { key: "8_10", label: "8:00 AM - 10:00 AM", start: "08:00", end: "10:00" },
  { key: "10_12", label: "10:00 AM - 12:00 PM", start: "10:00", end: "12:00" },
  { key: "13_15", label: "1:00 PM - 3:00 PM", start: "13:00", end: "15:00" },
  { key: "15_17", label: "3:00 PM - 5:00 PM", start: "15:00", end: "17:00" },
  { key: "17_19", label: "5:00 PM - 7:00 PM", start: "17:00", end: "19:00" },
  { key: "past_19", label: "Past 7:00 PM", start: "19:00", end: "21:00" }
];

export const AUDIO_ITEMS = ["Amplifier", "Speaker", "Microphone", "Others"];
export const VIDEO_ITEMS = ["Video Showing", "Video Editing", "Video Coverage", "Others"];
export const LIGHTING_ITEMS = ["Follow Spot", "House Light", "Electric Fans", "Others"];

export const toDateInputValue = (value) => {
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

export const computeInclusiveFromSlots = (slots) => {
  if (!slots || slots.length === 0) return { start: "", end: "", text: "" };
  const map = new Map(TIME_SLOTS.map(s => [s.key, s]));
  const times = slots.map(k => map.get(k)).filter(Boolean);
  times.sort((a, b) => a.start.localeCompare(b.start));
  const start = times[0].start;
  const end = times.reduce((acc, cur) => (cur.end.localeCompare(acc) > 0 ? cur.end : acc), times[0].end);
  return { start, end, text: `${start} - ${end}` };
};

export const parseInclusiveTime = (value) => {
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

export const normalizeKey = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const CheckboxMark = ({ checked }) => (
  <span className="inline-flex items-center">
    (
    <span className="inline-block w-[4mm] text-center">
      {checked ? "✓" : ""}
    </span>
    )
  </span>
);

const VenueOption = ({ checked, label }) => (
  <span className="inline-flex items-center gap-1 whitespace-nowrap">
    <CheckboxMark checked={checked} />
    <span>{label}</span>
  </span>
);

const BookingPDF = ({ 
  formData, 
  venueName, 
  venueKey, 
  selectedAudio, 
  selectedVideo, 
  selectedLighting, 
  audioDetails, 
  videoDetails, 
  lightingDetails 
}) => {
  const isVenueSelected = (label) => {
    const ll = normalizeKey(label);
    const vn = normalizeKey(venueName);
    const vk = normalizeKey(venueKey);
    if (!ll) return false;
    return (vn && (vn.includes(ll) || ll.includes(vn))) || (vk && (vk.includes(ll) || ll.includes(vk)));
  };

  return (
    <div className="w-[216mm] min-h-[330mm] text-black leading-tight">
      <div className="flex items-start">
        <div className="w-[16%] flex justify-end pt-[1mm] pr-[1mm]">
          <img src="/assets/LNULogo.png" alt="LNU Logo" className="w-[23.3mm] h-[23mm]" />
        </div>

        <div className="w-[56%] pt-[0.5mm]">
          <div className="text-center">
            <div className="[font-family:Bahnschrift] text-[12pt] font-semibold">
              Republic of the Philippines
            </div>
            <div className="h-[0.8mm]" />
            <div className="[font-family:Bahnschrift] text-[12pt] font-bold">
              LEYTE NORMAL UNIVERSITY
            </div>
            <div className="[font-family:Calibri] text-[12pt]">
              Tacloban City
            </div>
            <div className="h-[0.8mm]" />
            <div className="[font-family:Arial] text-[11pt] font-bold">
              PHYSICAL PLANT AND FACILITIES
            </div>
            <div className="[font-family:Arial] text-[11pt]">
              VENUE AND AUDIO-VISUAL FACILITIES RESERVATION FORM
            </div>
          </div>
        </div>

        <div className="w-[52.1mm] h-[20.9mm] border border-black p-[6px] [font-family:Calibri] text-[11pt]">
          <div className="grid grid-cols-[42%_1fr] gap-x-2 gap-y-1">
            <div>OR Number:</div>
            <div className="border-b border-red">
              <span className="inline-block w-full">{formData.orNumber || "\u00A0"}</span>
            </div>
            <div>Amount:</div>
            <div className="border-b border-black">
              <span className="inline-block w-full">{formData.amount || "\u00A0"}</span>
            </div>
            <div>Date:</div>
            <div className="border-b border-black">
              <span className="inline-block w-full">{formData.orDate || "\u00A0"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="h-[2mm]" />

      <div className="grid grid-cols-2 gap-x-10 [font-family:Arial] text-[11pt]">
        <div className="space-y-1">
          <div className="flex items-end gap-2">
            <div className="w-[32%]">Activity/Event:</div>
            <div className="flex-1 border-b border-black">{formData.activity || "\u00A0"}</div>
          </div>
          <div className="flex items-end gap-2">
            <div className="w-[32%]">Requesting Party:</div>
            <div className="flex-1 border-b border-black">{formData.requestingParty || "\u00A0"}</div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-end gap-2">
            <div className="w-[40%]">Date of Use:</div>
            <div className="flex-1 border-b border-black">{formData.dateOfUse || "\u00A0"}</div>
          </div>
          <div className="flex items-end gap-2">
            <div className="w-[40%]">Inclusive Time:</div>
            <div className="flex-1 border-b border-black">{formData.inclusiveTime || "\u00A0"}</div>
          </div>
        </div>
      </div>

      <div className="h-[3mm]" />

      <div className="text-center font-bold text-[10pt]">VENUE REQUESTED</div>
      <div className="grid grid-cols-2 gap-x-8 [font-family:Arial] text-[9pt] mt-1">
        <div className="space-y-1">
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <VenueOption checked={isVenueSelected("HRDC Hall")} label="HRDC Hall" />
            <VenueOption checked={isVenueSelected("AV Studio")} label="AV Studio" />
            <VenueOption checked={isVenueSelected("Bleacher")} label="Bleacher" />
            <VenueOption checked={isVenueSelected("Alba Hall")} label="Alba Hall" />
          </div>
          <div>
            <VenueOption checked={isVenueSelected("Student Center Mini-Theater")} label="Student Center Mini-Theater" />
          </div>
          <div className="flex items-center gap-2">
            <VenueOption checked={isVenueSelected("CTE Training Hall") || isVenueSelected("CTE Training Hall 2")} label="CTE Training Hall 2" />
            <span className="inline-block border-b border-black w-[18px] h-[10px]" />
            <span>or</span>
            <span className="inline-block border-b border-black w-[18px] h-[10px]" />
            <span>3 (specify)</span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <VenueOption checked={isVenueSelected("Admin Ballroom 2F")} label="Admin Ballroom 2F" />
            <VenueOption checked={isVenueSelected("Multi-Purpose Hall 3F")} label="Multi-Purpose Hall 3F" />
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <VenueOption checked={isVenueSelected("Hum. AV Theater")} label="Hum. AV Theater" />
            <VenueOption checked={isVenueSelected("Dance Studio")} label="Dance Studio" />
          </div>
          <div>
            <VenueOption checked={isVenueSelected("CME Gym")} label="CME Gym" />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <VenueOption checked={isVenueSelected("Classroom")} label="Classroom" />
            <span className="inline-block border-b border-black w-[70px] h-[10px]" />
            <span>(specify)</span>
          </div>
          <div className="flex items-center gap-2">
            <VenueOption checked={isVenueSelected("Laboratory Room")} label="Laboratory Room" />
            <span className="inline-block border-b border-black w-[55px] h-[10px]" />
            <span>(specify)</span>
          </div>
          <div>
            <VenueOption checked={isVenueSelected("Library Grounds")} label="Library Grounds" />
          </div>
          <div>
            <VenueOption checked={isVenueSelected("ORC Quadrangle") || isVenueSelected("ORC Quadrangle/Stage")} label="ORC Quadrangle/Stage" />
          </div>
          <div className="flex items-center gap-2">
            <VenueOption checked={isVenueSelected("Others")} label="Others" />
            <span className="inline-block border-b border-black w-[85px] h-[10px]" />
            <span>(specify)</span>
          </div>
        </div>
      </div>

      <div className="h-[4mm]" />

      <div className="text-center font-bold text-[10pt]">AUDIO-VISUAL FACILITIES</div>
      <div className="grid grid-cols-3 gap-x-6 [font-family:Arial] text-[9pt] mt-2">
        <div>
          <div className="text-center font-bold underline">AUDIO SYSTEM</div>
          <div className="flex justify-end gap-6 pr-1 mt-1">
            <span className="font-bold">Qty</span>
            <span className="font-bold">Remarks</span>
          </div>
          <div className="mt-1 space-y-1">
            {AUDIO_ITEMS.map((item) => {
              const isChecked = selectedAudio.includes(item);
              const qty = audioDetails[item]?.qty || "";
              const remarks = audioDetails[item]?.remarks || "";
              return (
                <div key={item} className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <CheckboxMark checked={isChecked} />
                    <span>{item}</span>
                  </div>
                  <div className="flex gap-2">
                    <input className="border-b border-black w-[18mm] h-4 text-center focus:outline-none bg-transparent" value={qty} readOnly />
                    <input className="border-b border-black w-[28mm] h-4 focus:outline-none bg-transparent" value={remarks} readOnly />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="text-center font-bold underline">VIDEO SYSTEM</div>
          <div className="flex justify-end gap-6 pr-1 mt-1">
            <span className="font-bold">Qty</span>
            <span className="font-bold">Remarks</span>
          </div>
          <div className="mt-1 space-y-1">
            {VIDEO_ITEMS.map((item) => {
              const isChecked = selectedVideo.includes(item);
              const qty = videoDetails[item]?.qty || "";
              const remarks = videoDetails[item]?.remarks || "";
              return (
                <div key={item} className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <CheckboxMark checked={isChecked} />
                    <span>{item}</span>
                  </div>
                  <div className="flex gap-2">
                    <input className="border-b border-black w-[18mm] h-4 text-center focus:outline-none bg-transparent" value={qty} readOnly />
                    <input className="border-b border-black w-[28mm] h-4 focus:outline-none bg-transparent" value={remarks} readOnly />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="text-center font-bold underline">LIGHTING SYSTEM / FANS</div>
          <div className="flex justify-end gap-6 pr-1 mt-1">
            <span className="font-bold">Qty</span>
            <span className="font-bold">Remarks</span>
          </div>
          <div className="mt-1 space-y-1">
            {LIGHTING_ITEMS.map((item) => {
              const isChecked = selectedLighting.includes(item);
              const qty = lightingDetails[item]?.qty || "";
              const remarks = lightingDetails[item]?.remarks || "";
              return (
                <div key={item} className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <CheckboxMark checked={isChecked} />
                    <span>{item}</span>
                  </div>
                  <div className="flex gap-2">
                    <input className="border-b border-black w-[18mm] h-4 text-center focus:outline-none bg-transparent" value={qty} readOnly />
                    <input className="border-b border-black w-[28mm] h-4 focus:outline-none bg-transparent" value={remarks} readOnly />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="h-[4mm]" />

      <div className="grid grid-cols-3 gap-x-6 [font-family:Arial] text-[9pt]">
        <div>
          <div className="mb-2 text-[10pt]">Requested by:</div>
          <div className="border-b border-black h-[18px]">{formData.requestedBy || "\u00A0"}</div>
          <div className="text-center text-[8pt] mt-1 whitespace-nowrap">
            Requesting Party (Signature Over Printed Name)
          </div>
        </div>

        <div className="text-center">
          <div className="text-[10pt] mb-1">Certification of Availability of Equipment:</div>
          <div className="border-b border-black h-[18px] w-[80%] mx-auto" />
          <div className="text-[9pt] mt-1">HRDC Audio-Visual Coordinator</div>
          <div className="h-3" />
          <div className="text-[10pt] mb-1">Recommending Approval:</div>
          <div className="border-b border-black h-[18px] w-[90%] mx-auto" />
          <div className="text-[8pt] mt-1 whitespace-nowrap">
            Building Coordinator (Signature Over Printed Name)
          </div>
        </div>

        <div className="[font-family:Calibri] text-[11pt]">
          <div className="border border-black p-2">
            <div>Approved by:</div>
            <div className="h-5" />
            <div className="border-b border-black h-[18px]" />
            <div className="[font-family:Arial] text-[9pt] mt-1">
              Director, Physical Plant &amp; Facilities
            </div>
            <div className="h-4" />
            <div className="flex items-center gap-2">
              <div className="font-bold">DATE RECEIVED</div>
              <div className="flex-1 border-b border-black h-[14px]" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 [font-family:Arial] text-[12pt] font-bold">
        F-PPF-001 (09-02-19)
      </div>
    </div>
  );
};

export default BookingPDF;
