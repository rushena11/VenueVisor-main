import React from 'react';

const UserManualModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  const steps = [
    {
      title: 'Log In',
      desc: 'Access the platform using your official LNU credentials. Guests can only view availability.'
    },
    {
      title: 'Check Availability',
      desc: 'Browse the calendar view. Dates with colored dots indicate activity. Click a date to see venue specifics.'
    },
    {
      title: 'Select a Venue',
      desc: "In the daily view, find a venue marked 'Available' (Green). Click the card to initiate a request."
    },
    {
      title: 'Submit & Complete Form',
      desc: 'After submission, download the Venue Reservation Form PDF. Print it, fill it out completely, and obtain all required signatures from your organization head and authorities (VPAA, VPA, Registrar, etc.).'
    },
    {
      title: 'Submit Signed Form Offline',
      desc: 'Deliver the completed and signed Venue Reservation Form to the MIS or General Services office. Keep your booking reference number handy.'
    },
    {
      title: 'Admin Review & Approval',
      desc: 'The admin office will review your signed form. Once approved, you will receive an OR (Official Receipt) number via email or in person.'
    },
    {
      title: 'Booking Confirmed',
      desc: 'Your booking status will change to Approved in VenueVisor with your OR Number displayed. Your event is now confirmed in the system.'
    }
  ];
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl overflow-hidden relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="Close"
          title="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2"/></svg>
            </div>
            <h2 className="text-3xl font-bold text-blue-900">User Manual</h2>
            <p className="text-gray-600 mt-1">A step-by-step guide to using VenueVisor.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-h-[55vh] overflow-y-auto">
            <div className="lg:col-span-2 space-y-5">
              {steps.map((s, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-900 text-white flex items-center justify-center text-sm font-bold">{i + 1}</div>
                    {i < steps.length - 1 && <div className="flex-1 w-px bg-blue-100"></div>}
                  </div>
                  <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                    <div className="text-base font-semibold text-gray-900">{s.title}</div>
                    <div className="text-gray-600 text-sm mt-1">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-5">
              <div className="bg-blue-900 text-blue-50 rounded-xl p-5 shadow">
                <div className="text-lg font-semibold mb-2">Admin Privileges</div>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-start gap-2"><span>•</span><span>Create and approve bookings instantly with OR Numbers.</span></li>
                  <li className="flex items-start gap-2"><span>•</span><span>Review and approve/reject pending student requests.</span></li>
                  <li className="flex items-start gap-2"><span>•</span><span>Mark venues as Unavailable for maintenance.</span></li>
                  <li className="flex items-start gap-2"><span>•</span><span>Manage and cancel bookings as needed.</span></li>
                </ul>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-semibold text-gray-900">Statuses & Calendar Tags</div>
                  <div className="text-[11px] font-semibold text-gray-500">Quick Reference</div>
                </div>
                <div className="mt-3 space-y-3 text-sm text-gray-700">
                  <div>
                    <div className="font-semibold text-gray-900">Booking States</div>
                    <div className="mt-1 space-y-1">
                      <div><span className="font-semibold">Pending:</span> Request submitted by a user, awaiting admin review and signed form verification.</div>
                      <div><span className="font-semibold">Approved:</span> User-submitted request has been reviewed by an admin and approved (OR number assigned).</div>
                      <div><span className="font-semibold">Booked:</span> Event directly created by an admin.</div>
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Venue States</div>
                    <div className="mt-1 space-y-1">
                      <div><span className="font-semibold">Available:</span> No confirmed booking; open for requests.</div>
                      <div><span className="font-semibold">Semi-booked:</span> Some time slots are booked; some still open.</div>
                      <div><span className="font-semibold">Fully Booked:</span> All time slots for a venue are booked.</div>
                      <div><span className="font-semibold">Unavailable:</span> Venue closed for maintenance or other reasons.</div>
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Calendar Tags</div>
                    <div className="mt-1 space-y-1">
                      <div><span className="font-semibold">Pending:</span> Venues with at least one pending request for that day.</div>
                      <div><span className="font-semibold">Full:</span> Venues fully booked for the day.</div>
                      <div><span className="font-semibold">Semi:</span> Venues that have some time slots still available.</div>
                      <div><span className="font-semibold">Maint.:</span> Venues marked unavailable for maintenance.</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-5">
                <div className="text-lg font-semibold text-red-800 mb-2">Critical: Venue Reservation Form Workflow</div>
                <div className="text-sm text-red-900 space-y-1">
                  <div>1. Submit booking request in VenueVisor (shows as Pending).</div>
                  <div>2. Download and complete the Venue Reservation Form.</div>
                  <div>3. Get all required signatures.</div>
                  <div>4. Submit signed form to the office.</div>
                  <div>5. Admin approves and assigns OR Number.</div>
                  <div>6. Booking shows as Approved in VenueVisor.</div>
                </div>
                <div className="text-xs text-red-700 mt-3">Without the signed physical form, your booking will remain pending and cannot be finalized.</div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-8 py-4 text-center text-xs text-gray-500 border-t border-gray-100">
          VenueVisor • LNU Bluebook
        </div>
      </div>
    </div>
  );
};

export default UserManualModal;
