import ActivityKit
import Foundation

// Used by LiveActivityModule.swift, which calls Activity<...>.request/
// update/end. This is a SECOND, independently-compiled copy of
// targets/cardio-live-activity/_shared/CardioLiveActivityAttributes.swift
// (the one the widget extension renders from) — see that file's comment
// for why two copies are required (this module compiles into its own
// CocoaPod target, which the `_shared` mechanism can't reach) and why
// that's still correct at runtime (ActivityKit marshals ContentState via
// Codable across the process boundary, which only needs the two types to
// be structurally identical, not the same compiled symbol). Keep both
// copies in sync by hand if either one changes.
struct CardioLiveActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var startedAt: Date
        var pausedAt: Date?
        var totalPausedSeconds: Double

        var distanceText: String
        var paceText: String

        var caloriesBurned: Int
        var stepCount: Int
        var currentHeartRate: Int?
    }

    var activityType: String
}
