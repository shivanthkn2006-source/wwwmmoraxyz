import Capacitor

@objc(MMoraBridgeViewController)
final class MMoraBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(NativeZoeAudioPlugin())
    }
}