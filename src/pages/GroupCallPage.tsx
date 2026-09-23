import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { loadFriendDirectory } from '@/lib/friendDirectory';
import { useGroupCall } from '@/hooks/useGroupCall';
import { useActivityStatuses } from '@/features/calls/useActivityStatuses';
import ActivityStatusPicker from '@/components/quantum/ActivityStatusPicker';
import { getCallActivityStatus, type CallActivityStatus } from '@/features/calls/callActivityStatuses';
import {
  activeGroupParticipants,
  groupGridColumns,
  MAX_GROUP_PARTICIPANTS,
  type GroupParticipant,
} from '@/features/calls/groupCallMesh';

interface ContactRow {
  user_id: string;
  display_name: string | null;
  username: string | null;
  profile_photo_url: string | null;
}

const ParticipantTile = ({
  participant,
  stream,
  activity,
}: {
  participant: GroupParticipant;
  stream: MediaStream | null;
  activity: CallActivityStatus;
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="relative aspect-[3/4] overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-2xl">
      <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
      {!participant.hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
          {participant.displayName}
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 px-3 py-2 text-[11px] text-white/70">
        <span className="truncate text-white">{participant.displayName}</span>
        <span
          className="flex shrink-0 items-center gap-1"
          aria-label={`${participant.displayName} activity: ${activity.label}`}
        >
          <activity.Icon className="h-3 w-3" aria-hidden />
          <span className="truncate">{activity.label}</span>
        </span>
      </div>
    </div>
  );
};

const GroupCallPage = () => {
  const { user } = useAuth();
  const group = useGroupCall(user?.id ?? null);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [invite, setInvite] = useState<{ roomId: string; from: string; roster: string[] } | null>(null);
  const [zoePrompt, setZoePrompt] = useState('');
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const memberIds = useMemo(
    () => group.participants.map(entry => entry.userId),
    [group.participants],
  );
  const { ownStatus, ownMessage, setOwnStatus, setOwnMessage, statusFor, messageFor } = useActivityStatuses(user?.id ?? null, memberIds);

  // Only accepted friends can be invited to or seen in a group call.
  useEffect(() => {
    if (!user) return;
    void (async () => {
      const friends = await loadFriendDirectory(user.id);
      setContacts(friends.map(friend => ({
        user_id: friend.user_id,
        display_name: friend.display_name,
        username: friend.username,
        profile_photo_url: friend.profile_photo_url,
      })) as ContactRow[]);
    })();
  }, [user]);

  useEffect(() => {
    const onInvite = (event: Event) => {
      const detail = (event as CustomEvent<{ roomId: string; from: string; roster: string[] }>).detail;
      setInvite(detail);
    };
    window.addEventListener('group-call-invite', onInvite);
    return () => window.removeEventListener('group-call-invite', onInvite);
  }, []);

  useEffect(() => {
    if (localVideoRef.current && group.localStream) localVideoRef.current.srcObject = group.localStream;
  }, [group.localStream]);

  const nameFor = useCallback(
    (userId: string) => {
      const contact = contacts.find(entry => entry.user_id === userId);
      return contact?.display_name || contact?.username || 'Member';
    },
    [contacts],
  );

  const liveParticipants = useMemo(
    () => activeGroupParticipants(group.participants).map(entry => ({ ...entry, displayName: nameFor(entry.userId) })),
    [group.participants, nameFor],
  );

  const columns = groupGridColumns(liveParticipants.length + 1);

  if (!user) return null;

  const isActive = group.callState === 'active' || group.callState === 'starting';

  return (
    <main className="calls-liquid-page relative min-h-[100dvh] overflow-hidden bg-transparent px-4 pb-32 pt-8 text-white">
      <header className="mx-auto flex max-w-3xl items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-medium text-white">Group call</h1>
          <ActivityStatusPicker status={ownStatus} customMessage={ownMessage} onChange={(value) => void setOwnStatus(value)} onCustomMessageChange={setOwnMessage} showLabel />
        </div>
        <Link to="/calls" className="rounded-full border border-white/15 px-4 py-1.5 text-sm text-white/80 hover:bg-white/10 hover:text-white">
          One to one
        </Link>
      </header>

      {group.error && <p className="mx-auto mt-4 max-w-3xl text-sm text-white/70">{group.error}</p>}

      {invite && !isActive && (
        <div className="mx-auto mt-6 max-w-3xl rounded-3xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-2xl">
          <p className="text-sm text-white">{nameFor(invite.from)} started a group call.</p>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-white hover:bg-white/10"
              onClick={() => {
                void group.joinGroupCall(invite.roomId, [invite.from, ...invite.roster]);
                setInvite(null);
              }}
            >
              Join
            </button>
            <button
              type="button"
              className="rounded-full border border-white/10 px-4 py-1.5 text-sm text-white/70 hover:bg-white/10"
              onClick={() => setInvite(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {!isActive ? (
        <section className="mx-auto mt-8 max-w-3xl">
          <p className="text-sm text-white/60">
            Choose up to {MAX_GROUP_PARTICIPANTS - 1} people, then start the call.
          </p>
          <ul className="mt-4 space-y-2">
            {contacts.map(contact => {
              const picked = selected.includes(contact.user_id);
              return (
                <li key={contact.user_id}>
                  <button
                    type="button"
                    aria-pressed={picked}
                    onClick={() =>
                      setSelected(prev =>
                        prev.includes(contact.user_id)
                          ? prev.filter(id => id !== contact.user_id)
                          : [...prev, contact.user_id].slice(0, MAX_GROUP_PARTICIPANTS - 1),
                      )
                    }
                    className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm backdrop-blur-2xl transition-colors ${
                      picked ? 'border-white/40 bg-white/[0.12] text-white' : 'border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]'
                    }`}
                  >
                    <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/[0.06] text-xs">
                      {contact.profile_photo_url ? (
                        <img src={contact.profile_photo_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        (contact.display_name || contact.username || '?').slice(0, 1)
                      )}
                    </span>
                    <span className="truncate">{contact.display_name || contact.username || 'Member'}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            disabled={selected.length === 0}
            onClick={() => void group.startGroupCall(selected)}
            className="mt-6 w-full rounded-full border border-white/20 bg-white/[0.08] py-3 text-sm text-white backdrop-blur-2xl transition-colors hover:bg-white/[0.14] disabled:opacity-40"
          >
            Start group call
          </button>
        </section>
      ) : (
        <section className="mx-auto mt-8 max-w-4xl">
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            <div className="relative aspect-[3/4] overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-2xl">
              <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 px-3 py-2 text-[11px] text-white/70">
                <span className="text-white">You</span>
                <span className="flex shrink-0 items-center gap-1" aria-label={`Your activity: ${getCallActivityStatus(ownStatus).label}`}>
                  {(() => {
                    const OwnIcon = getCallActivityStatus(ownStatus).Icon;
                    return <OwnIcon className="h-3 w-3" aria-hidden />;
                  })()}
                  <span className="truncate">{getCallActivityStatus(ownStatus).label}</span>
                </span>
              </span>
            </div>
            {liveParticipants.map(participant => (
              <ParticipantTile
                key={participant.userId}
                participant={participant}
                stream={group.getRemoteStreamFor(participant.userId)}
                activity={{ ...statusFor(participant.userId), label: messageFor(participant.userId) || statusFor(participant.userId).label }}
              />
            ))}
          </div>

          <form
            className="mt-4 flex items-center gap-2 rounded-full border border-white/15 bg-transparent px-4 py-2 backdrop-blur-2xl"
            onSubmit={event => {
              event.preventDefault();
              const prompt = zoePrompt.trim();
              if (!prompt) return;
              setZoePrompt('');
              void group.askZoe(prompt);
            }}
          >
            <input
              value={zoePrompt}
              onChange={event => setZoePrompt(event.target.value)}
              maxLength={400}
              aria-label="Ask Zoe in this group call"
              placeholder="Ask Zoe"
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-white outline-none placeholder:text-white/50"
            />
            <button type="submit" disabled={!zoePrompt.trim() || group.zoeSpeaking} className="text-sm text-white/80 disabled:opacity-40">
              {group.zoeSpeaking ? 'Speaking…' : 'Send'}
            </button>
          </form>
          {group.zoeCaption && (
            <p aria-live="polite" className="mx-auto mt-3 max-w-2xl text-center text-sm text-white/80">
              <span className="font-medium text-white">Zoe:</span> {group.zoeCaption}
            </p>
          )}

          <button
            type="button"
            onClick={() => void group.leaveGroupCall()}
            className="mt-6 w-full rounded-full border border-white/20 py-3 text-sm text-white hover:bg-white/10"
          >
            Leave call
          </button>
        </section>
      )}
    </main>
  );
};

export default GroupCallPage;
