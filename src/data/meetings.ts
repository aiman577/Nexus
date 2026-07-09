import { addDays, format, subDays } from 'date-fns';
import { Meeting, AvailabilitySlot, MeetingStatus } from '../types';
import { collaborationRequests } from './collaborationRequests';

const dateOffset = (offset: number): string => format(addDays(new Date(), offset), 'yyyy-MM-dd');

export const meetings: Meeting[] = [
  {
    id: 'm1',
    requesterId: 'i2',
    recipientId: 'e1',
    title: 'Intro call with TechWave AI',
    date: dateOffset(1),
    startTime: '10:00',
    endTime: '10:30',
    status: 'accepted',
    notes: 'Walkthrough of the platform and current traction.',
    createdAt: subDays(new Date(), 4).toISOString()
  },
  {
    id: 'm2',
    requesterId: 'i1',
    recipientId: 'e1',
    title: 'Investment terms discussion',
    date: dateOffset(3),
    startTime: '14:00',
    endTime: '14:30',
    status: 'pending',
    notes: 'Would like to go over term sheet basics.',
    createdAt: subDays(new Date(), 1).toISOString()
  },
  {
    id: 'm3',
    requesterId: 'i2',
    recipientId: 'e2',
    title: 'GreenLife scaling discussion',
    date: dateOffset(2),
    startTime: '11:00',
    endTime: '11:45',
    status: 'accepted',
    notes: 'Focus on manufacturing partners.',
    createdAt: subDays(new Date(), 6).toISOString()
  },
  {
    id: 'm4',
    requesterId: 'e3',
    recipientId: 'i3',
    title: 'HealthPulse traction review',
    date: dateOffset(5),
    startTime: '09:30',
    endTime: '10:00',
    status: 'pending',
    notes: 'Sharing our latest user growth numbers.',
    createdAt: subDays(new Date(), 2).toISOString()
  },
  {
    id: 'm5',
    requesterId: 'i1',
    recipientId: 'e4',
    title: 'UrbanFarm IoT deep dive',
    date: dateOffset(-2),
    startTime: '13:00',
    endTime: '13:30',
    status: 'declined',
    notes: 'Conflicts with an existing portfolio review.',
    createdAt: subDays(new Date(), 9).toISOString()
  }
];

export const availabilitySlots: AvailabilitySlot[] = [
  { id: 'a1', userId: 'e1', date: dateOffset(1), startTime: '09:00', endTime: '12:00' },
  { id: 'a2', userId: 'e1', date: dateOffset(4), startTime: '13:00', endTime: '16:00' },
  { id: 'a3', userId: 'i1', date: dateOffset(3), startTime: '13:00', endTime: '17:00' },
  { id: 'a4', userId: 'i2', date: dateOffset(1), startTime: '09:00', endTime: '11:00' },
  { id: 'a5', userId: 'i2', date: dateOffset(2), startTime: '10:00', endTime: '13:00' },
  { id: 'a6', userId: 'e3', date: dateOffset(5), startTime: '09:00', endTime: '11:00' }
];

// Meetings a user is involved in, either as requester or recipient
export const getMeetingsForUser = (userId: string): Meeting[] => {
  return meetings
    .filter(m => m.requesterId === userId || m.recipientId === userId)
    .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));
};

export const getUpcomingConfirmedMeetings = (userId: string): Meeting[] => {
  const today = format(new Date(), 'yyyy-MM-dd');
  return getMeetingsForUser(userId).filter(m => m.status === 'accepted' && m.date >= today);
};

export const getPendingIncomingRequests = (userId: string): Meeting[] => {
  return getMeetingsForUser(userId).filter(m => m.status === 'pending' && m.recipientId === userId);
};

export const getAvailabilityForUser = (userId: string): AvailabilitySlot[] => {
  return availabilitySlots
    .filter(slot => slot.userId === userId)
    .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));
};

export const addAvailabilitySlot = (
  userId: string,
  date: string,
  startTime: string,
  endTime: string
): AvailabilitySlot => {
  const newSlot: AvailabilitySlot = {
    id: `a${availabilitySlots.length + 1}-${Date.now()}`,
    userId,
    date,
    startTime,
    endTime
  };
  availabilitySlots.push(newSlot);
  return newSlot;
};

export const removeAvailabilitySlot = (slotId: string): void => {
  const index = availabilitySlots.findIndex(slot => slot.id === slotId);
  if (index !== -1) {
    availabilitySlots.splice(index, 1);
  }
};

export const createMeetingRequest = (
  requesterId: string,
  recipientId: string,
  title: string,
  date: string,
  startTime: string,
  endTime: string,
  notes?: string
): Meeting => {
  const newMeeting: Meeting = {
    id: `m${meetings.length + 1}-${Date.now()}`,
    requesterId,
    recipientId,
    title,
    date,
    startTime,
    endTime,
    status: 'pending',
    notes,
    createdAt: new Date().toISOString()
  };
  meetings.push(newMeeting);
  return newMeeting;
};

export const updateMeetingStatus = (meetingId: string, status: MeetingStatus): Meeting | null => {
  const index = meetings.findIndex(m => m.id === meetingId);
  if (index === -1) return null;

  meetings[index] = { ...meetings[index], status };
  return meetings[index];
};

// Users this person has an accepted collaboration with — who they're allowed to request meetings with
export const getConnectedUserIds = (userId: string): string[] => {
  return collaborationRequests
    .filter(req => req.status === 'accepted' && (req.investorId === userId || req.entrepreneurId === userId))
    .map(req => (req.investorId === userId ? req.entrepreneurId : req.investorId));
};
