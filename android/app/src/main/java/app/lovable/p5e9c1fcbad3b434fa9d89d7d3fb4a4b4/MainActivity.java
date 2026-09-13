package app.lovable.p5e9c1fcbad3b434fa9d89d7d3fb4a4b4;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(NativeZoeAudioPlugin.class);
        registerPlugin(NativeZoeMusicPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
