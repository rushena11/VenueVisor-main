import React, { useEffect, useState } from 'react';
import axios from 'axios';

const BugReportModal = ({ isOpen, onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = description.trim().length > 0 && !isSubmitting;

  useEffect(() => {
    if (!isOpen) return;
    try {
      const raw = localStorage.getItem('user');
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.name) setName(u.name);
        if (u?.email) setEmail(u.email);
      }
    } catch {}
  }, [isOpen]);

  if (!isOpen) return null;

  const submit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    const payload = {
      title: title.trim() || 'Bug Report',
      description: description.trim(),
      name: name.trim() || undefined,
      email: email.trim() || undefined,
      url: window.location.href
    };
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      await axios.post('/api/bug-report', payload, { headers });
      alert('Thanks! Your report has been submitted.');
      setTitle('');
      setDescription('');
      onClose();
    } catch {
      const subject = encodeURIComponent(`[VenueVisor] Bug Report: ${payload.title}`);
      const body = encodeURIComponent(`${payload.description}\n\nFrom: ${payload.name || 'N/A'} <${payload.email || 'N/A'}>\nURL: ${payload.url}`);
      window.location.href = `mailto:it@lnu.edu.ph?subject=${subject}&body=${body}`;
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden relative">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M12 5a7 7 0 00-7 7v0a7 7 0 1014 0v0a7 7 0 00-7-7z"/></svg>
            </div>
            <div className="text-lg font-semibold text-gray-900">Report a Bug</div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="px-6 py-5">
          <div className="max-h-[50vh] overflow-y-auto max-w-lg mx-auto space-y-4">
            <div>
            <div className="text-[11px] font-semibold text-gray-500 uppercase">Title (optional)</div>
            <input
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Short summary of the issue"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            </div>
            <div>
            <div className="text-[11px] font-semibold text-gray-500 uppercase">Description</div>
            <textarea
              className="mt-1 w-full min-h-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="What happened? What did you expect to happen?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase">Your Name (optional)</div>
              <input
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              </div>
              <div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase">Email (optional)</div>
              <input
                type="email"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100">Cancel</button>
          <button
            onClick={submit}
            disabled={!canSubmit}
            className={`px-5 py-2 rounded-lg font-semibold ${canSubmit ? 'bg-indigo-700 text-white hover:bg-indigo-800' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
          >
            {isSubmitting ? 'Submitting…' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BugReportModal;
