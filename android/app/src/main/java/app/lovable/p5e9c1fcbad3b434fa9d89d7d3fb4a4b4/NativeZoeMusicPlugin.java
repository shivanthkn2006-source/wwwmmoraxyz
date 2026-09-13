package app.lovable.p5e9c1fcbad3b434fa9d89d7d3fb4a4b4;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeZoeMusic")
public class NativeZoeMusicPlugin extends Plugin {
    private BroadcastReceiver receiver;

    @Override public void load() {
        receiver = new BroadcastReceiver() {
            @Override public void onReceive(Context context, Intent intent) {
                String event = intent.getStringExtra("event");
                if (event == null) return;
                JSObject data = new JSObject();
                data.put("state", intent.getStringExtra("state"));
                data.put("reason", intent.getStringExtra("reason"));
                data.put("position", intent.getDoubleExtra("position", 0));
                data.put("duration", intent.getDoubleExtra("duration", 0));
                notifyListeners(event, data, true);
            }
        };
        IntentFilter filter = new IntentFilter(ZoeMusicPlaybackService.ACTION_EVENT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) getContext().registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED);
        else getContext().registerReceiver(receiver, filter);
    }

    private void command(String action, PluginCall call) {
        Intent intent = new Intent(getContext(), ZoeMusicPlaybackService.class).setAction(action);
        if (call.hasOption("url")) intent.putExtra("url", call.getString("url"));
        if (call.hasOption("title")) intent.putExtra("title", call.getString("title"));
        if (call.hasOption("artist")) intent.putExtra("artist", call.getString("artist"));
        if (call.hasOption("position")) intent.putExtra("position", call.getDouble("position", 0.0));
        if (call.hasOption("volume")) intent.putExtra("volume", call.getDouble("volume", 1.0));
        ContextCompat.startForegroundService(getContext(), intent);
        call.resolve();
    }

    @PluginMethod public void load(PluginCall call) { command(ZoeMusicPlaybackService.ACTION_LOAD, call); }
    @PluginMethod public void play(PluginCall call) { command(ZoeMusicPlaybackService.ACTION_PLAY, call); }
    @PluginMethod public void pause(PluginCall call) { command(ZoeMusicPlaybackService.ACTION_PAUSE, call); }
    @PluginMethod public void stop(PluginCall call) { command(ZoeMusicPlaybackService.ACTION_STOP, call); }
    @PluginMethod public void seek(PluginCall call) { command(ZoeMusicPlaybackService.ACTION_SEEK, call); }
    @PluginMethod public void setVolume(PluginCall call) { command(ZoeMusicPlaybackService.ACTION_VOLUME, call); }

    @Override protected void handleOnDestroy() {
        if (receiver != null) getContext().unregisterReceiver(receiver);
        super.handleOnDestroy();
    }
}