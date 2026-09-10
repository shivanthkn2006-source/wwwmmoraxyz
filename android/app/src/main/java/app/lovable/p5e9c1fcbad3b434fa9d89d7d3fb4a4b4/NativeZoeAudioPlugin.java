package app.lovable.p5e9c1fcbad3b434fa9d89d7d3fb4a4b4;

import android.Manifest;
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
import com.getcapacitor.JSArray;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import java.util.ArrayList;

@CapacitorPlugin(
    name = "NativeZoeAudio",
    permissions = {
        @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO })
    }
)
public class NativeZoeAudioPlugin extends Plugin {
    private BroadcastReceiver receiver;

    @Override
    public void load() {
        receiver = new BroadcastReceiver() {
            @Override public void onReceive(Context context, Intent intent) {
                JSObject data = new JSObject();
                data.put("phrase", intent.getStringExtra("phrase"));
                data.put("state", intent.getStringExtra("state"));
                data.put("reason", intent.getStringExtra("reason"));
                String event = intent.getStringExtra("event");
                if (event != null) notifyListeners(event, data, true);
            }
        };
        IntentFilter filter = new IntentFilter(ZoeListeningService.ACTION_EVENT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(receiver, filter);
        }
    }

    @PluginMethod
    public void startListening(PluginCall call) {
        if (!hasRequiredPermissions()) {
            requestPermissionForAlias("microphone", call, "startAfterPermission");
            return;
        }
        startService(call);
    }

    @com.getcapacitor.annotation.PermissionCallback
    private void startAfterPermission(PluginCall call) {
        if (!hasRequiredPermissions()) {
            call.reject("Microphone permission denied");
            return;
        }
        startService(call);
    }

    private void startService(PluginCall call) {
        Intent intent = new Intent(getContext(), ZoeListeningService.class);
        intent.setAction(ZoeListeningService.ACTION_START);
        intent.putStringArrayListExtra("wakePhrases", strings(call.getArray("wakePhrases")));
        intent.putStringArrayListExtra("stopPhrases", strings(call.getArray("stopPhrases")));
        ContextCompat.startForegroundService(getContext(), intent);
        JSObject result = new JSObject();
        result.put("active", true);
        call.resolve(result);
    }

    private ArrayList<String> strings(JSArray values) {
        ArrayList<String> result = new ArrayList<>();
        if (values == null) return result;
        for (Object value : values.toList()) if (value instanceof String) result.add((String) value);
        return result;
    }

    @PluginMethod
    public void stopListening(PluginCall call) {
        getContext().stopService(new Intent(getContext(), ZoeListeningService.class));
        call.resolve();
    }

    @PluginMethod
    public void setOutputActive(PluginCall call) {
        if (!ZoeListeningService.isRunning()) {
            call.resolve();
            return;
        }
        Intent intent = new Intent(getContext(), ZoeListeningService.class);
        intent.setAction(ZoeListeningService.ACTION_OUTPUT);
        intent.putExtra("active", call.getBoolean("active", false));
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("active", ZoeListeningService.isRunning());
        result.put("permission", hasRequiredPermissions() ? "granted" : "prompt");
        call.resolve(result);
    }

    @Override
    protected void handleOnDestroy() {
        if (receiver != null) getContext().unregisterReceiver(receiver);
        super.handleOnDestroy();
    }
}