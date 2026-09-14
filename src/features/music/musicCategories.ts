/**
 * Browse categories for the Music page sidebar. These are plain search shortcuts
 * — selecting one runs the normal provider search, so every result is still real
 * provider metadata.
 */
export interface MusicCategory {
  id: string;
  label: string;
  query: string;
  kind?: 'radio' | 'track';
}

export const MUSIC_GENRES: MusicCategory[] = [
  { id: 'genre-devotional', label: 'Devotional', query: 'devotional bhajan' },
  { id: 'genre-classical', label: 'Classical', query: 'classical carnatic' },
  { id: 'genre-pop', label: 'Pop', query: 'pop hits' },
  { id: 'genre-rock', label: 'Rock', query: 'rock' },
  { id: 'genre-hiphop', label: 'Hip hop', query: 'hip hop' },
  { id: 'genre-jazz', label: 'Jazz', query: 'jazz' },
  { id: 'genre-lofi', label: 'Lo-fi', query: 'lofi chill beats' },
  { id: 'genre-instrumental', label: 'Instrumental', query: 'instrumental' },
  { id: 'genre-bollywood', label: 'Bollywood', query: 'bollywood' },
  { id: 'genre-malayalam', label: 'Malayalam', query: 'malayalam songs' },
  { id: 'genre-tamil', label: 'Tamil', query: 'tamil songs' },
  { id: 'genre-meditation', label: 'Meditation', query: 'meditation calm' },
];

export const MUSIC_STATIONS: MusicCategory[] = [
  { id: 'station-devotional', label: 'Devotional radio', query: 'devotional radio', kind: 'radio' },
  { id: 'station-news', label: 'Talk & news radio', query: 'news radio', kind: 'radio' },
  { id: 'station-classical', label: 'Classical radio', query: 'classical radio', kind: 'radio' },
  { id: 'station-chill', label: 'Chill radio', query: 'chillout radio', kind: 'radio' },
];
