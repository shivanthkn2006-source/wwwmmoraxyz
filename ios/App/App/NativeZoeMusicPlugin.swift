import AVFoundation
import Capacitor
import MediaPlayer

@objc(NativeZoeMusicPlugin)
final class NativeZoeMusicPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "NativeZoeMusicPlugin"
    let jsName = "NativeZoeMusic"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "load", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "play", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pause", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "seek", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setVolume", returnType: CAPPluginReturnPromise),
    ]

    private var player: AVPlayer?
    private var timeObserver: Any?
    private var endObserver: NSObjectProtocol?
    private var interruptionObserver: NSObjectProtocol?
    private var title = "Music"
    private var artist = "M'Mora"

    override func load() {
        configureRemoteControls()
        interruptionObserver = NotificationCenter.default.addObserver(
            forName: AVAudioSession.interruptionNotification,
            object: AVAudioSession.sharedInstance(),
            queue: .main
        ) { [weak self] notification in self?.handleInterruption(notification) }
    }

    deinit {
        removeObservers()
        if let interruptionObserver { NotificationCenter.default.removeObserver(interruptionObserver) }
    }

    @objc func load(_ call: CAPPluginCall) {
        guard let raw = call.getString("url"), let url = URL(string: raw) else {
            call.reject("A valid stream URL is required")
            return
        }
        removeObservers()
        title = call.getString("title") ?? "Music"
        artist = call.getString("artist") ?? "M'Mora"
        player = AVPlayer(url: url)
        observePlayer()
        publishMetadata()
        notify("buffering")
        call.resolve()
    }

    @objc func play(_ call: CAPPluginCall) {
        guard let player else { call.reject("No track is loaded"); return }
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default, options: [.allowAirPlay, .allowBluetoothA2DP])
            try session.setActive(true)
            player.play()
            notify("playing")
            call.resolve()
        } catch { call.reject(error.localizedDescription) }
    }

    @objc func pause(_ call: CAPPluginCall) {
        player?.pause()
        notify("paused")
        call.resolve()
    }

    @objc func stop(_ call: CAPPluginCall) {
        player?.pause()
        player?.seek(to: .zero)
        notify("idle")
        call.resolve()
    }

    @objc func seek(_ call: CAPPluginCall) {
        let seconds = max(0, call.getDouble("position") ?? 0)
        player?.seek(to: CMTime(seconds: seconds, preferredTimescale: 600))
        call.resolve()
    }

    @objc func setVolume(_ call: CAPPluginCall) {
        player?.volume = Float(min(1, max(0, call.getDouble("volume") ?? 1)))
        call.resolve()
    }

    private func observePlayer() {
        guard let player else { return }
        timeObserver = player.addPeriodicTimeObserver(forInterval: CMTime(seconds: 1, preferredTimescale: 2), queue: .main) { [weak self] time in
            guard let self else { return }
            let duration = self.player?.currentItem?.duration.seconds ?? 0
            self.notifyListeners("stateChanged", data: [
                "state": self.player?.rate == 0 ? "paused" : "playing",
                "position": time.seconds.isFinite ? time.seconds : 0,
                "duration": duration.isFinite ? duration : 0,
            ])
            self.publishMetadata()
        }
        endObserver = NotificationCenter.default.addObserver(
            forName: .AVPlayerItemDidPlayToEndTime,
            object: player.currentItem,
            queue: .main
        ) { [weak self] _ in self?.notifyListeners("next", data: [:]) }
    }

    private func removeObservers() {
        if let timeObserver, let player { player.removeTimeObserver(timeObserver) }
        if let endObserver { NotificationCenter.default.removeObserver(endObserver) }
        timeObserver = nil
        endObserver = nil
    }

    private func configureRemoteControls() {
        let center = MPRemoteCommandCenter.shared()
        center.nextTrackCommand.addTarget { [weak self] _ in self?.notifyListeners("next", data: [:]); return .success }
        center.previousTrackCommand.addTarget { [weak self] _ in self?.notifyListeners("previous", data: [:]); return .success }
        center.changePlaybackPositionCommand.addTarget { [weak self] event in
            guard let event = event as? MPChangePlaybackPositionCommandEvent else { return .commandFailed }
            self?.player?.seek(to: CMTime(seconds: event.positionTime, preferredTimescale: 600))
            return .success
        }
    }

    private func publishMetadata() {
        var info: [String: Any] = [
            MPMediaItemPropertyTitle: title,
            MPMediaItemPropertyArtist: artist,
            MPNowPlayingInfoPropertyElapsedPlaybackTime: player?.currentTime().seconds ?? 0,
            MPNowPlayingInfoPropertyPlaybackRate: player?.rate ?? 0,
        ]
        let duration = player?.currentItem?.duration.seconds ?? 0
        if duration.isFinite { info[MPMediaItemPropertyPlaybackDuration] = duration }
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    }

    private func handleInterruption(_ notification: Notification) {
        guard let value = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: value) else { return }
        if type == .began {
            player?.pause()
            notify("paused")
        }
    }

    private func notify(_ state: String, reason: String? = nil) {
        var data: [String: Any] = ["state": state]
        if let reason { data["reason"] = reason }
        notifyListeners("stateChanged", data: data)
    }
}