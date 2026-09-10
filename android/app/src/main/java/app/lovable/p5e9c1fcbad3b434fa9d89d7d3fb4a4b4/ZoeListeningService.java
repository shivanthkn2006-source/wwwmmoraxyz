package app.lovable.p5e9c1fcbad3b434fa9d89d7d3fb4a4b4;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import androidx.core.app.NotificationCompat;
import java.util.ArrayList;
import java.util.Locale;

public class ZoeListeningService extends Service implements RecognitionListener {
    public static final String ACTION_EVENT = "app.lovable.mmora.ZOE_AUDIO_EVENT";
    public static final String ACTION_START = "start";
    public static final String ACTION_OUTPUT = "output";
    private static final String CHANNEL = "zoe_hands_free";
    private static volatile boolean running = false;
    private SpeechRecognizer recognizer;
    private Intent recognizerIntent;
    private ArrayList<String> wakePhrases = new ArrayList<>();
    private ArrayList<String> stopPhrases = new ArrayList<>();
    private boolean outputActive = false;
    private MediaSession mediaSession;

    public static boolean isRunning() { return running; }

    @Override public void onCreate() {
        super.onCreate();
        createChannel();
        configureHeadsetControls();
    }

    private void configureHeadsetControls() {
        mediaSession = new MediaSession(this, "ZoeHandsFree");
        mediaSession.setCallback(new MediaSession.Callback() {
            @Override public void onPlay() { emit("headsetButton", null, null, null); }
            @Override public void onPause() { emit("stopPhrase", "headset pause", null, null); }
            @Override public void onStop() { emit("stopPhrase", "headset stop", null, null); }
            @Override public void onMediaButtonEvent(Intent mediaButtonIntent) {
                emit("headsetButton", null, null, null);
                super.onMediaButtonEvent(mediaButtonIntent);
            }
        });
        PlaybackState state = new PlaybackState.Builder()
            .setActions(PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE | PlaybackState.ACTION_PLAY_PAUSE | PlaybackState.ACTION_STOP)
            .setState(PlaybackState.STATE_PAUSED, 0, 1f)
            .build();
        mediaSession.setPlaybackState(state);
        mediaSession.setActive(true);
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_OUTPUT.equals(intent.getAction())) {
            outputActive = intent.getBooleanExtra("active", false);
            if (outputActive) pauseRecognizer();
            else if (running) startRecognizer();
            return START_STICKY;
        }
        ArrayList<String> wakes = intent == null ? null : intent.getStringArrayListExtra("wakePhrases");
        ArrayList<String> stops = intent == null ? null : intent.getStringArrayListExtra("stopPhrases");
        if (wakes != null) wakePhrases = wakes;
        if (stops != null) stopPhrases = stops;
        startForeground(3303, notification());
        running = true;
        startRecognizer();
        emit("stateChanged", null, "listening", null);
        return START_STICKY;
    }

    private void startRecognizer() {
        if (outputActive) return;
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            emit("stateChanged", null, "error", "Native speech recognition unavailable");
            stopSelf();
            return;
        }
        if (recognizer == null) {
            recognizer = SpeechRecognizer.createSpeechRecognizer(this);
            recognizer.setRecognitionListener(this);
            recognizerIntent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            recognizerIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            recognizerIntent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
            recognizerIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault().toLanguageTag());
        }
        recognizer.startListening(recognizerIntent);
    }

    private void pauseRecognizer() {
        if (recognizer != null) {
            recognizer.cancel();
            recognizer.destroy();
            recognizer = null;
        }
    }

    private boolean contains(ArrayList<String> phrases, String text) {
        String normalized = text.toLowerCase(Locale.ROOT);
        for (String phrase : phrases) if (normalized.contains(phrase.toLowerCase(Locale.ROOT))) return true;
        return false;
    }

    private void inspect(ArrayList<String> matches) {
        if (matches == null) return;
        for (String phrase : matches) {
            if (contains(stopPhrases, phrase)) { emit("stopPhrase", phrase, null, null); return; }
            if (contains(wakePhrases, phrase)) { emit("wakeWord", phrase, null, null); return; }
        }
    }

    private void emit(String event, String phrase, String state, String reason) {
        Intent out = new Intent(ACTION_EVENT).setPackage(getPackageName());
        out.putExtra("event", event);
        out.putExtra("phrase", phrase);
        out.putExtra("state", state);
        out.putExtra("reason", reason);
        sendBroadcast(out);
    }

    private Notification notification() {
        Intent open = new Intent(this, MainActivity.class);
        PendingIntent pending = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        return new NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Zoe is listening")
            .setContentText("Say Hey Zoe or use your headset button")
            .setOngoing(true)
            .setContentIntent(pending)
            .build();
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL, "Zoe hands-free", NotificationManager.IMPORTANCE_LOW);
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }

    @Override public void onDestroy() {
        running = false;
        if (recognizer != null) { recognizer.cancel(); recognizer.destroy(); recognizer = null; }
        if (mediaSession != null) { mediaSession.setActive(false); mediaSession.release(); mediaSession = null; }
        emit("stateChanged", null, "off", null);
        super.onDestroy();
    }
    @Override public IBinder onBind(Intent intent) { return null; }
    @Override public void onReadyForSpeech(android.os.Bundle params) {}
    @Override public void onBeginningOfSpeech() {}
    @Override public void onRmsChanged(float rmsdB) {}
    @Override public void onBufferReceived(byte[] buffer) {}
    @Override public void onEndOfSpeech() {}
    @Override public void onError(int error) { if (running && !outputActive) new android.os.Handler(getMainLooper()).postDelayed(this::startRecognizer, 650); }
    @Override public void onResults(android.os.Bundle results) { inspect(results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)); if (running && !outputActive) startRecognizer(); }
    @Override public void onPartialResults(android.os.Bundle partialResults) { inspect(partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)); }
    @Override public void onEvent(int eventType, android.os.Bundle params) {}
}