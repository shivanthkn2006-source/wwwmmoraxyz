package app.lovable.p5e9c1fcbad3b434fa9d89d7d3fb4a4b4;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.media.MediaMetadata;
import android.media.MediaPlayer;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;

public class ZoeMusicPlaybackService extends Service implements MediaPlayer.OnPreparedListener, MediaPlayer.OnCompletionListener, MediaPlayer.OnErrorListener {
    public static final String ACTION_EVENT = "app.lovable.mmora.ZOE_MUSIC_EVENT";
    public static final String ACTION_LOAD = "music.load";
    public static final String ACTION_PLAY = "music.play";
    public static final String ACTION_PAUSE = "music.pause";
    public static final String ACTION_STOP = "music.stop";
    public static final String ACTION_SEEK = "music.seek";
    public static final String ACTION_VOLUME = "music.volume";
    private static final String CHANNEL = "zoe_music";
    private MediaPlayer player;
    private MediaSession session;
    private String title = "Music";
    private String artist = "M'Mora";
    private AudioManager audioManager;
    private AudioFocusRequest focusRequest;
    private boolean resumeAfterFocusGain = false;

    @Override public void onCreate() {
        super.onCreate();
        createChannel();
        audioManager = (AudioManager) getSystemService(AUDIO_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AudioAttributes attributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build();
            focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                .setAudioAttributes(attributes)
                .setOnAudioFocusChangeListener(this::onAudioFocusChanged)
                .setWillPauseWhenDucked(false)
                .build();
        }
        session = new MediaSession(this, "ZoeMusic");
        session.setCallback(new MediaSession.Callback() {
            @Override public void onPlay() { handlePlay(); }
            @Override public void onPause() { handlePause(); }
            @Override public void onStop() { handleStop(); }
            @Override public void onSkipToNext() { emit("next", null, null); }
            @Override public void onSkipToPrevious() { emit("previous", null, null); }
            @Override public void onSeekTo(long pos) { if (player != null) player.seekTo((int) pos); }
        });
        session.setActive(true);
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        startForeground(3304, notification());
        if (intent == null) return START_NOT_STICKY;
        String action = intent.getAction();
        if (ACTION_LOAD.equals(action)) load(intent);
        else if (ACTION_PLAY.equals(action)) handlePlay();
        else if (ACTION_PAUSE.equals(action)) handlePause();
        else if (ACTION_STOP.equals(action)) handleStop();
        else if (ACTION_SEEK.equals(action) && player != null) player.seekTo((int)(intent.getDoubleExtra("position", 0) * 1000));
        else if (ACTION_VOLUME.equals(action) && player != null) {
            float value = (float)Math.max(0, Math.min(1, intent.getDoubleExtra("volume", 1)));
            player.setVolume(value, value);
        }
        return START_NOT_STICKY;
    }

    private void load(Intent intent) {
        String url = intent.getStringExtra("url");
        if (url == null || url.isEmpty()) { emit("stateChanged", "error", "A valid stream URL is required"); return; }
        title = intent.getStringExtra("title") == null ? "Music" : intent.getStringExtra("title");
        artist = intent.getStringExtra("artist") == null ? "M'Mora" : intent.getStringExtra("artist");
        if (player != null) player.release();
        player = new MediaPlayer();
        player.setOnPreparedListener(this);
        player.setOnCompletionListener(this);
        player.setOnErrorListener(this);
        try { player.setDataSource(url); player.prepareAsync(); emit("stateChanged", "buffering", null); }
        catch (Exception error) { emit("stateChanged", "error", error.getMessage()); }
        publishState(PlaybackState.STATE_BUFFERING);
    }

    private boolean requestAudioFocus() {
        if (audioManager == null) return true;
        int result = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? audioManager.requestAudioFocus(focusRequest)
            : audioManager.requestAudioFocus(this::onAudioFocusChanged, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
        return result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
    }
    private void onAudioFocusChanged(int change) {
        if (player == null) return;
        if (change == AudioManager.AUDIOFOCUS_LOSS) {
            resumeAfterFocusGain = false;
            handlePause();
        } else if (change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) {
            resumeAfterFocusGain = player.isPlaying();
            handlePause();
        } else if (change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK) {
            player.setVolume(0.15f, 0.15f);
        } else if (change == AudioManager.AUDIOFOCUS_GAIN) {
            player.setVolume(1f, 1f);
            if (resumeAfterFocusGain) { resumeAfterFocusGain = false; handlePlay(); }
        }
    }
    private void abandonAudioFocus() {
        if (audioManager == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && focusRequest != null) audioManager.abandonAudioFocusRequest(focusRequest);
        else audioManager.abandonAudioFocus(this::onAudioFocusChanged);
    }
    private void handlePlay() { if (player != null && requestAudioFocus()) { try { player.start(); publishState(PlaybackState.STATE_PLAYING); emit("stateChanged", "playing", null); } catch (Exception ignored) {} } }
    private void handlePause() { if (player != null && player.isPlaying()) player.pause(); publishState(PlaybackState.STATE_PAUSED); emit("stateChanged", "paused", null); }
    private void handleStop() { if (player != null) { player.stop(); player.release(); player = null; } abandonAudioFocus(); emit("stateChanged", "idle", null); stopSelf(); }
    @Override public void onPrepared(MediaPlayer mediaPlayer) { if (requestAudioFocus()) mediaPlayer.start(); publishMetadata(); publishState(PlaybackState.STATE_PLAYING); emit("stateChanged", "playing", null); }
    @Override public void onCompletion(MediaPlayer mediaPlayer) { emit("next", null, null); }
    @Override public boolean onError(MediaPlayer mediaPlayer, int what, int extra) { emit("stateChanged", "error", "Stream playback failed"); return true; }

    private void publishState(int state) {
        if (session == null) return;
        long actions = PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE | PlaybackState.ACTION_STOP | PlaybackState.ACTION_SKIP_TO_NEXT | PlaybackState.ACTION_SKIP_TO_PREVIOUS | PlaybackState.ACTION_SEEK_TO;
        long position = player == null ? 0 : player.getCurrentPosition();
        session.setPlaybackState(new PlaybackState.Builder().setActions(actions).setState(state, position, 1f).build());
    }

    private void publishMetadata() {
        if (session == null) return;
        session.setMetadata(new MediaMetadata.Builder().putString(MediaMetadata.METADATA_KEY_TITLE, title).putString(MediaMetadata.METADATA_KEY_ARTIST, artist).build());
    }

    private void emit(String event, String state, String reason) {
        Intent out = new Intent(ACTION_EVENT).setPackage(getPackageName());
        out.putExtra("event", event); out.putExtra("state", state); out.putExtra("reason", reason);
        if (player != null) { out.putExtra("position", player.getCurrentPosition() / 1000.0); out.putExtra("duration", player.getDuration() / 1000.0); }
        sendBroadcast(out);
    }

    private android.app.Notification notification() {
        Intent open = new Intent(this, MainActivity.class);
        PendingIntent pending = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        return new NotificationCompat.Builder(this, CHANNEL).setSmallIcon(R.mipmap.ic_launcher).setContentTitle(title).setContentText(artist).setOngoing(true).setContentIntent(pending).build();
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL, "M'Mora music", NotificationManager.IMPORTANCE_LOW);
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }

    @Override public void onDestroy() { if (player != null) player.release(); abandonAudioFocus(); if (session != null) session.release(); super.onDestroy(); }
    @Override public IBinder onBind(Intent intent) { return null; }
}