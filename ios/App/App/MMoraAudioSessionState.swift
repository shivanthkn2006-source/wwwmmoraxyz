import Foundation

final class MMoraAudioSessionState {
    static let shared = MMoraAudioSessionState()
    private init() {}
    var musicActive = false
}