import React, { useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { DateSelectArg, EventClickArg } from '@fullcalendar/core';
import { CalendarClock, CalendarPlus, Check, Clock, PlusCircle, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { MeetingRequestCard } from '../../components/meetings/MeetingRequestCard';
import { NewMeetingModal } from '../../components/meetings/NewMeetingModal';
import { useAuth } from '../../context/AuthContext';
import { findUserById } from '../../data/users';
import {
  addAvailabilitySlot,
  getAvailabilityForUser,
  getConnectedUserIds,
  getMeetingsForUser,
  getPendingIncomingRequests,
  getUpcomingConfirmedMeetings,
  removeAvailabilitySlot
} from '../../data/meetings';
import { Meeting } from '../../types';

type CalendarMode = 'meeting' | 'availability';

export const MeetingsPage: React.FC = () => {
  const { user } = useAuth();
  const [refreshTick, setRefreshTick] = useState(0);
  const [mode, setMode] = useState<CalendarMode>('meeting');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPrefill, setModalPrefill] = useState<{ date: string; startTime: string; endTime: string } | null>(null);

  const refresh = () => setRefreshTick(tick => tick + 1);

  const myMeetings = useMemo(
    () => (user ? getMeetingsForUser(user.id) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, refreshTick]
  );
  const myAvailability = useMemo(
    () => (user ? getAvailabilityForUser(user.id) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, refreshTick]
  );
  const pendingIncoming = useMemo(
    () => (user ? getPendingIncomingRequests(user.id) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, refreshTick]
  );
  const upcomingConfirmed = useMemo(
    () => (user ? getUpcomingConfirmedMeetings(user.id) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, refreshTick]
  );
  const connectedUsers = useMemo(
    () => (user ? getConnectedUserIds(user.id).map(findUserById).filter((u): u is NonNullable<typeof u> => !!u) : []),
    [user]
  );

  if (!user) return null;

  const calendarEvents = useMemo(() => {
    const meetingEvents = myMeetings
      .filter(m => m.status !== 'declined')
      .map(m => ({
        id: `meeting-${m.id}`,
        title: m.status === 'pending' ? `${m.title} (pending)` : m.title,
        start: `${m.date}T${m.startTime}:00`,
        end: `${m.date}T${m.endTime}:00`,
        backgroundColor: m.status === 'accepted' ? '#22C55E' : '#F59E0B',
        borderColor: 'transparent',
        textColor: '#ffffff',
        extendedProps: { type: 'meeting' as const, meeting: m }
      }));

    const availabilityEvents = myAvailability.map(slot => ({
      id: `availability-${slot.id}`,
      title: 'Available',
      start: `${slot.date}T${slot.startTime}:00`,
      end: `${slot.date}T${slot.endTime}:00`,
      backgroundColor: '#DBEAFE',
      borderColor: '#93C5FD',
      textColor: '#1D4ED8',
      extendedProps: { type: 'availability' as const, slot }
    }));

    return [...meetingEvents, ...availabilityEvents];
  }, [myMeetings, myAvailability]);

  const handleSelect = (selection: DateSelectArg) => {
    const startDate = format(selection.start, 'yyyy-MM-dd');
    const startTime = selection.allDay ? '09:00' : format(selection.start, 'HH:mm');
    const endTime = selection.allDay ? '17:00' : format(selection.end, 'HH:mm');

    if (mode === 'availability') {
      addAvailabilitySlot(user.id, startDate, startTime, endTime);
      toast.success('Availability slot added');
      refresh();
    } else {
      if (connectedUsers.length === 0) {
        toast.error('Connect with an investor or startup before requesting a meeting');
      } else {
        setModalPrefill({ date: startDate, startTime, endTime });
        setModalOpen(true);
      }
    }

    selection.view.calendar.unselect();
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const { type } = clickInfo.event.extendedProps as { type: 'meeting' | 'availability' };

    if (type === 'availability') {
      if (mode !== 'availability') {
        toast('Switch to "Manage Availability" to edit or remove this slot', { icon: 'ℹ️' });
        return;
      }
      const slotId = (clickInfo.event.extendedProps as { slot: { id: string } }).slot.id;
      removeAvailabilitySlot(slotId);
      toast.success('Availability slot removed');
      refresh();
      return;
    }

    const meeting = (clickInfo.event.extendedProps as { meeting: Meeting }).meeting;
    const otherId = meeting.requesterId === user.id ? meeting.recipientId : meeting.requesterId;
    const other = findUserById(otherId);
    toast(
      `${meeting.title}\n${format(parseISO(meeting.date), 'EEE, MMM d')} · ${meeting.startTime}-${meeting.endTime}\nWith ${other?.name ?? 'Unknown'} · ${meeting.status}`,
      { icon: meeting.status === 'accepted' ? '✅' : '🕒' }
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
          <p className="text-gray-600">Manage your availability and meeting requests</p>
        </div>

        <Button
          leftIcon={<PlusCircle size={18} />}
          onClick={() => {
            if (connectedUsers.length === 0) {
              toast.error('Connect with an investor or startup before requesting a meeting');
              return;
            }
            setModalPrefill(null);
            setModalOpen(true);
          }}
        >
          New Meeting
        </Button>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-accent-50 border border-accent-100">
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 bg-accent-100 rounded-full mr-4">
                <Clock size={20} className="text-accent-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-accent-700">Pending Requests</p>
                <h3 className="text-xl font-semibold text-accent-900">{pendingIncoming.length}</h3>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-success-50 border border-success-100">
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full mr-4">
                <Check size={20} className="text-success-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-success-700">Upcoming Meetings</p>
                <h3 className="text-xl font-semibold text-success-900">{upcomingConfirmed.length}</h3>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-primary-50 border border-primary-100">
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 bg-primary-100 rounded-full mr-4">
                <CalendarClock size={20} className="text-primary-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary-700">Availability Slots</p>
                <h3 className="text-xl font-semibold text-primary-900">{myAvailability.length}</h3>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-lg font-medium text-gray-900">Calendar</h2>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={mode === 'meeting' ? 'primary' : 'outline'}
                  leftIcon={<Users size={16} />}
                  onClick={() => setMode('meeting')}
                >
                  Book a Meeting
                </Button>
                <Button
                  size="sm"
                  variant={mode === 'availability' ? 'primary' : 'outline'}
                  leftIcon={<CalendarPlus size={16} />}
                  onClick={() => setMode('availability')}
                >
                  Manage Availability
                </Button>
              </div>
            </CardHeader>

            <CardBody>
              <p className="text-sm text-gray-500 mb-3">
                {mode === 'availability'
                  ? 'Click or drag on the calendar to add an open slot. Click an existing slot to remove it.'
                  : 'Click or drag on the calendar to propose a new meeting time with one of your connections.'}
              </p>

              <div className="flex items-center gap-4 mb-4 text-xs text-gray-600">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-success-500" /> Confirmed</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-accent-500" /> Pending</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary-200 border border-primary-300" /> Available</span>
              </div>

              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
                }}
                height="auto"
                nowIndicator
                selectable
                selectMirror
                slotMinTime="07:00:00"
                slotMaxTime="21:00:00"
                events={calendarEvents}
                select={handleSelect}
                eventClick={handleEventClick}
              />
            </CardBody>
          </Card>
        </div>

        {/* Sidebar: requests + upcoming */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Meeting Requests</h2>
              <Badge variant="warning">{pendingIncoming.length} pending</Badge>
            </CardHeader>
            <CardBody className="space-y-4">
              {pendingIncoming.length > 0 ? (
                pendingIncoming.map(meeting => (
                  <MeetingRequestCard
                    key={meeting.id}
                    meeting={meeting}
                    currentUserId={user.id}
                    onStatusUpdate={refresh}
                  />
                ))
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-600">No pending requests</p>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Upcoming Meetings</h2>
            </CardHeader>
            <CardBody className="space-y-3">
              {upcomingConfirmed.length > 0 ? (
                upcomingConfirmed.map(meeting => {
                  const otherId = meeting.requesterId === user.id ? meeting.recipientId : meeting.requesterId;
                  const other = findUserById(otherId);
                  if (!other) return null;
                  return (
                    <div key={meeting.id} className="flex items-center gap-3">
                      <Avatar src={other.avatarUrl} alt={other.name} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{meeting.title}</p>
                        <p className="text-xs text-gray-500">
                          {format(parseISO(meeting.date), 'MMM d')} · {meeting.startTime} with {other.name}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-600">No upcoming meetings</p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <NewMeetingModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        currentUserId={user.id}
        connectedUsers={connectedUsers}
        initialDate={modalPrefill?.date}
        initialStartTime={modalPrefill?.startTime}
        initialEndTime={modalPrefill?.endTime}
        onCreated={refresh}
      />
    </div>
  );
};
