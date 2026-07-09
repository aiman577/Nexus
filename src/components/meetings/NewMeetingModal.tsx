import React, { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { User } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { createMeetingRequest } from '../../data/meetings';

interface NewMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  connectedUsers: User[];
  initialDate?: string;
  initialStartTime?: string;
  initialEndTime?: string;
  onCreated?: () => void;
}

export const NewMeetingModal: React.FC<NewMeetingModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  connectedUsers,
  initialDate,
  initialStartTime,
  initialEndTime,
  onCreated
}) => {
  const [recipientId, setRecipientId] = useState(connectedUsers[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(initialDate ?? format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState(initialStartTime ?? '10:00');
  const [endTime, setEndTime] = useState(initialEndTime ?? '10:30');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const resetAndClose = () => {
    setTitle('');
    setNotes('');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipientId) {
      toast.error('Select who you want to meet with');
      return;
    }
    if (!title.trim()) {
      toast.error('Give the meeting a title');
      return;
    }
    if (endTime <= startTime) {
      toast.error('End time must be after start time');
      return;
    }

    createMeetingRequest(currentUserId, recipientId, title.trim(), date, startTime, endTime, notes.trim() || undefined);
    toast.success('Meeting request sent');
    onCreated?.();
    resetAndClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Request a Meeting</h2>
          <button
            onClick={resetAndClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meet with</label>
              {connectedUsers.length > 0 ? (
                <select
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  className="block w-full rounded-md shadow-sm border-gray-300 focus:border-primary-500 focus:ring-primary-500 focus:ring-2 focus:ring-opacity-50 sm:text-sm"
                >
                  {connectedUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-gray-500">
                  You don't have any accepted connections yet. Connect with someone first to request a meeting.
                </p>
              )}
            </div>

            <Input
              label="Title"
              placeholder="e.g. Intro call, term sheet discussion"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              required
            />

            <Input
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              fullWidth
              required
            />

            <div className="flex gap-3">
              <Input
                label="Start time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                fullWidth
                required
              />
              <Input
                label="End time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                fullWidth
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="block w-full rounded-md shadow-sm border-gray-300 focus:border-primary-500 focus:ring-primary-500 focus:ring-2 focus:ring-opacity-50 sm:text-sm"
                placeholder="Add any context for this meeting"
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={resetAndClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={connectedUsers.length === 0}>
              Send Request
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
