import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, MessageCircle, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Meeting, MeetingStatus } from '../../types';
import { Card, CardBody, CardFooter } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { findUserById } from '../../data/users';
import { updateMeetingStatus } from '../../data/meetings';

interface MeetingRequestCardProps {
  meeting: Meeting;
  currentUserId: string;
  onStatusUpdate?: (meetingId: string, status: MeetingStatus) => void;
}

export const MeetingRequestCard: React.FC<MeetingRequestCardProps> = ({
  meeting,
  currentUserId,
  onStatusUpdate
}) => {
  const navigate = useNavigate();
  const isRecipient = meeting.recipientId === currentUserId;
  const otherPartyId = isRecipient ? meeting.requesterId : meeting.recipientId;
  const otherParty = findUserById(otherPartyId);

  if (!otherParty) return null;

  const handleAccept = () => {
    updateMeetingStatus(meeting.id, 'accepted');
    onStatusUpdate?.(meeting.id, 'accepted');
  };

  const handleDecline = () => {
    updateMeetingStatus(meeting.id, 'declined');
    onStatusUpdate?.(meeting.id, 'declined');
  };

  const getStatusBadge = () => {
    switch (meeting.status) {
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'accepted':
        return <Badge variant="success">Confirmed</Badge>;
      case 'declined':
        return <Badge variant="error">Declined</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="transition-all duration-300">
      <CardBody className="flex flex-col">
        <div className="flex justify-between items-start">
          <div className="flex items-start">
            <Avatar
              src={otherParty.avatarUrl}
              alt={otherParty.name}
              size="md"
              status={otherParty.isOnline ? 'online' : 'offline'}
              className="mr-3"
            />

            <div>
              <h3 className="text-md font-semibold text-gray-900">{meeting.title}</h3>
              <p className="text-sm text-gray-500">
                {isRecipient ? 'Requested by' : 'Requested to'} {otherParty.name}
              </p>
            </div>
          </div>

          {getStatusBadge()}
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
          <Clock size={16} className="text-gray-400" />
          <span>
            {format(parseISO(meeting.date), 'EEE, MMM d, yyyy')} &middot; {meeting.startTime} - {meeting.endTime}
          </span>
        </div>

        {meeting.notes && (
          <p className="mt-2 text-sm text-gray-600">{meeting.notes}</p>
        )}
      </CardBody>

      <CardFooter className="border-t border-gray-100 bg-gray-50">
        {meeting.status === 'pending' && isRecipient ? (
          <div className="flex justify-between w-full">
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<X size={16} />}
                onClick={handleDecline}
              >
                Decline
              </Button>
              <Button
                variant="success"
                size="sm"
                leftIcon={<Check size={16} />}
                onClick={handleAccept}
              >
                Accept
              </Button>
            </div>

            <Button
              variant="primary"
              size="sm"
              leftIcon={<MessageCircle size={16} />}
              onClick={() => navigate(`/chat/${otherParty.id}`)}
            >
              Message
            </Button>
          </div>
        ) : (
          <div className="flex justify-between w-full">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<MessageCircle size={16} />}
              onClick={() => navigate(`/chat/${otherParty.id}`)}
            >
              Message
            </Button>
            {meeting.status === 'pending' && (
              <span className="text-sm text-gray-500 self-center">Awaiting response</span>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
};
