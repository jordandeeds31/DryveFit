import ActivityKit
import Foundation

// Used by this widget extension (which renders whatever ContentState gets
// pushed to it) — linked into both the main app target and this extension
// target via @bacons/apple-targets' `_shared` directory convention.
//
// IMPORTANT: modules/live-activity/ios/CardioLiveActivityAttributes.swift
// is a SECOND, independently-compiled copy of this exact struct, used by
// LiveActivityModule.swift. It has to be a separate copy rather than
// reusing this file because that module compiles into its own CocoaPod
// target, which `_shared` has no reach into (it only links into the main
// app target and its sibling extension targets, not arbitrary Pods
// targets) — Swift pods can't see the app target's own local sources
// either, since the dependency direction runs the other way. This is
// still correct at runtime: ActivityKit marshals ContentState across the
// app/extension process boundary via Codable, which only requires the two
// independently-compiled types to be STRUCTURALLY identical (same
// property names/types), not literally the same compiled symbol. Keep
// both copies in sync by hand if either one changes.
struct CardioLiveActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Anchors SwiftUI's native Text(timerInterval:) — only changes on
        // pause/resume, never needs a per-second update from JS.
        var startedAt: Date
        var pausedAt: Date?
        var totalPausedSeconds: Double

        // Pre-formatted in JS via lib/utils/units.ts (displayDistance,
        // formatPace) so the app's one metric/imperial conversion path
        // never gets duplicated in Swift.
        var distanceText: String
        var paceText: String

        var caloriesBurned: Int
        var stepCount: Int
        var currentHeartRate: Int?
    }

    // "walk" | "run" | "bike" — picks the icon/label, fixed for the
    // Activity's lifetime.
    var activityType: String
}
