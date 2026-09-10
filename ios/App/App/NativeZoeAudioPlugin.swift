import AVFoundation
import Capacitor
import MediaPlayer
import Speech

@objc(NativeZoeAudioPlugin)
final class NativeZoeAudioPlugin: CAPPlugin, CAPBridgedPlugin, SFSpeechRecognizerDelegate {
    let identifier = "NativeZoeAudioPlugin"
    let jsName = "NativeZoeAudio"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "startListening", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopListening", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setOutputActive", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise),
    ]

    private let engine = AVAudioEngine()
    private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var wakePhrases: [String] = []
    private var stopPhrases: [String] = []
    private var active = false
    private var outputActive = false

    override func load() {
        recognizer?.delegate = self
        configureRemoteControls()
    }

    @objc func startListening(_ call: CAPPluginCall) {
        wakePhrases = call.getArray("wakePhrases", String.self) ?? []
        stopPhrases = call.getArray("stopPhrases", String.self) ?? []
        requestPermissions { [weak self] granted in
            guard let self else { return }
            DispatchQueue.main.async {
                guard granted else {
                    self.notifyListeners("stateChanged", data: ["state": "error", "reason": "Microphone or speech permission denied"])
                    call.reject("Microphone or speech permission denied")
                    return
                }
                do {
                    try self.beginRecognition()
                    call.resolve(["active": true])
                } catch {
                    self.notifyListeners("stateChanged", data: ["state": "error", "reason": error.localizedDescription])
                    call.reject(error.localizedDescription)
                }
            }
        }
    }

    @objc func stopListening(_ call: CAPPluginCall) {
        active = false
        stopRecognition(deactivateSession: true)
        notifyListeners("stateChanged", data: ["state": "off"])
        call.resolve()
    }

    @objc func setOutputActive(_ call: CAPPluginCall) {
        outputActive = call.getBool("active") ?? false
        if outputActive {
            stopRecognition(deactivateSession: false)
        } else if active {
            try? beginRecognition()
        }
        call.resolve()
    }

    @objc func getStatus(_ call: CAPPluginCall) {
        let permission: String
        switch AVAudioSession.sharedInstance().recordPermission {
        case .granted: permission = "granted"
        case .denied: permission = "denied"
        default: permission = "prompt"
        }
        call.resolve(["active": active, "permission": permission])
    }

    private func requestPermissions(completion: @escaping (Bool) -> Void) {
        AVAudioSession.sharedInstance().requestRecordPermission { micGranted in
            guard micGranted else { completion(false); return }
            SFSpeechRecognizer.requestAuthorization { status in
                completion(status == .authorized)
            }
        }
    }

    private func beginRecognition() throws {
        guard !outputActive, !engine.isRunning else { active = true; return }
        guard recognizer?.isAvailable == true else {
            throw NSError(domain: "NativeZoeAudio", code: 1, userInfo: [NSLocalizedDescriptionKey: "Speech recognition unavailable"])
        }
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .voiceChat, options: [.allowBluetooth, .allowBluetoothA2DP, .defaultToSpeaker])
        try session.setActive(true, options: .notifyOthersOnDeactivation)

        task?.cancel()
        request = SFSpeechAudioBufferRecognitionRequest()
        request?.shouldReportPartialResults = true
        let input = engine.inputNode
        input.removeTap(onBus: 0)
        input.installTap(onBus: 0, bufferSize: 1024, format: input.outputFormat(forBus: 0)) { [weak self] buffer, _ in
            self?.request?.append(buffer)
        }
        engine.prepare()
        try engine.start()
        active = true
        notifyListeners("stateChanged", data: ["state": "listening"])
        task = recognizer?.recognitionTask(with: request!) { [weak self] result, error in
            guard let self else { return }
            if let text = result?.bestTranscription.formattedString.lowercased() {
                self.inspect(text)
            }
            if error != nil || result?.isFinal == true {
                self.stopRecognition(deactivateSession: false)
                if self.active && !self.outputActive {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { try? self.beginRecognition() }
                }
            }
        }
    }

    private func inspect(_ text: String) {
        if let phrase = stopPhrases.sorted(by: { $0.count > $1.count }).first(where: { text.contains($0.lowercased()) }) {
            notifyListeners("stopPhrase", data: ["phrase": phrase])
            return
        }
        if let phrase = wakePhrases.sorted(by: { $0.count > $1.count }).first(where: { text.contains($0.lowercased()) }) {
            notifyListeners("wakeWord", data: ["phrase": phrase])
        }
    }

    private func stopRecognition(deactivateSession: Bool) {
        if engine.isRunning { engine.stop() }
        engine.inputNode.removeTap(onBus: 0)
        request?.endAudio()
        task?.cancel()
        request = nil
        task = nil
        if deactivateSession { try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation) }
    }

    private func configureRemoteControls() {
        let center = MPRemoteCommandCenter.shared()
        center.playCommand.addTarget { [weak self] _ in self?.headsetPressed() ?? .commandFailed }
        center.togglePlayPauseCommand.addTarget { [weak self] _ in self?.headsetPressed() ?? .commandFailed }
        center.pauseCommand.addTarget { [weak self] _ in
            self?.notifyListeners("stopPhrase", data: ["phrase": "headset pause"])
            return .success
        }
    }

    private func headsetPressed() -> MPRemoteCommandHandlerStatus {
        notifyListeners("headsetButton", data: [:])
        return .success
    }
}