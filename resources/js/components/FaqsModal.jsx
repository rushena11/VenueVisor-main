import React from 'react';

const FaqsModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  const faqs = [
    { q: 'Who can book a venue?', a: 'Only recognized student organizations, faculty, and staff of Leyte Normal University can request bookings.' },
    { q: 'How far in advance should I book?', a: 'Submit requests at least 3 working days before the event for processing and approval.' },
    { q: 'What is the Venue Reservation Form?', a: 'It is the official document that must be completed and endorsed by your organization or department head and other authorities prior to approval.' },
    { q: 'What venues are available?', a: 'HRDC Hall, AV Studio, Alba Hall, Student Center Mini-Theater, CME Gym, and others listed in the dashboard.' },
    { q: 'What are the booking hours?', a: 'Venue availability follows campus operating hours unless otherwise specified by administrators.' },
    { q: 'Can I modify or cancel a request?', a: 'Pending requests can be updated or withdrawn by coordinating with the approving office. Approved bookings require formal cancellation.' },
    { q: 'Who do I contact for help?', a: 'Contact the Office of Resource Coordination or your department’s booking coordinator.' }
  ];
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl overflow-hidden relative max-h-[90vh] flex flex-col">
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
        <div className="p-4 sm:p-8 overflow-y-auto">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 16a8 8 0 10-6.219 7.781"/></svg>
            </div>
            <h2 className="text-2xl font-bold text-blue-900">Frequently Asked Questions</h2>
            <p className="text-gray-600 mt-1">Everything you need to know about the LNU Booking System.</p>
          </div>
          <div className="space-y-4">
            {faqs.map((item, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="px-5 py-4">
                  <div className="font-semibold text-gray-900">{item.q}</div>
                  <div className="mt-1 text-gray-600">{item.a}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-gray-50 px-4 sm:px-8 py-4 text-center text-xs text-gray-500 border-t border-gray-100">
          Need more help? Contact your department coordinator.
        </div>
      </div>
    </div>
  );
};

export default FaqsModal;
