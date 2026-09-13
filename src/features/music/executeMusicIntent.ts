import type { MusicIntent } from '@/features/music/musicIntent';
import { resolveMusicQueue } from '@/features/music/musicProviders';
import { musicEngine } from '@/services/MusicEngine';

export interface MusicCommandResult {
  handled: boolean;
  message: string;
}

/** One command executor shared by typed and spoken Zoe experiences. */
export async function executeMusicIntent(
  intent: MusicIntent,
  openMusic: () => void,
): Promise<MusicCommandResult> {
  if (intent.kind === 'open') {
    openMusic();
    return { handled: true, message: 'Opening Music.' };
  }
  if (intent.kind === 'pause') {
    musicEngine.pause();
    return { handled: true, message: 'Music paused.' };
  }
  if (intent.kind === 'stop') {
    musicEngine.stop();
    return { handled: true, message: 'Music stopped.' };
  }
  if (intent.kind === 'resume') {
    await musicEngine.play();
    return { handled: true, message: 'Music resumed.' };
  }
  if (intent.kind === 'next') {
    await musicEngine.next();
    const track = musicEngine.getState().track;
    return { handled: true, message: track ? `Now playing “${track.title}” by ${track.artist}.` : 'There is no next track in the queue.' };
  }
  if (intent.kind === 'previous') {
    await musicEngine.previous();
    const track = musicEngine.getState().track;
    return { handled: true, message: track ? `Now playing “${track.title}” by ${track.artist}.` : 'There is no previous track in the queue.' };
  }

  const query = intent.query || 'calm focus music';
  const result = await resolveMusicQueue(query, intent.lookup);
  if (!result.tracks.length) {
    return { handled: true, message: `I couldn’t find a playable match for “${query}” from the connected music sources.` };
  }
  const played = await musicEngine.playQueue(result.tracks);
  const track = musicEngine.getState().track;
  if (!played || !track) {
    return { handled: true, message: musicEngine.getState().error ?? 'I found music, but this device needs you to tap Play once.' };
  }
  return {
    handled: true,
    message: `Now playing “${track.title}” by ${track.artist}. ${result.tracks.length} tracks are ready in the queue from ${result.source}.`,
  };
}