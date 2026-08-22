import ActivityKit
import WidgetKit
import SwiftUI

// Deep-links back into app/cardio-session.tsx, which reads the `action`
// param and calls handleFinish() directly — same behavior as tapping
// Finish in-app today (no confirmation dialog exists for Finish there
// either, so none is added here for consistency).
private let finishURL = URL(string: "dryve://cardio-session?action=finish")!

private func activityIcon(_ activityType: String) -> String {
    switch activityType {
    case "run": return "figure.run"
    case "bike": return "figure.outdoor.cycle"
    default: return "figure.walk"
    }
}

private func activityLabel(_ activityType: String) -> String {
    switch activityType {
    case "run": return "Run"
    case "bike": return "Ride"
    default: return "Walk"
    }
}

// Only used for the paused (non-ticking) state — the running state uses
// SwiftUI's native Text(timerInterval:) instead, which ticks on the OS's
// own clock with no per-second update from JS.
private func formatStaticDuration(_ seconds: TimeInterval) -> String {
    let total = max(0, Int(seconds))
    let h = total / 3600
    let m = (total % 3600) / 60
    let s = total % 60
    return h > 0
        ? String(format: "%d:%02d:%02d", h, m, s)
        : String(format: "%d:%02d", m, s)
}

private struct ElapsedTimeView: View {
    let state: CardioLiveActivityAttributes.ContentState

    var body: some View {
        if let pausedAt = state.pausedAt {
            let elapsed = pausedAt.timeIntervalSince(state.startedAt) - state.totalPausedSeconds
            Text(formatStaticDuration(elapsed))
                .monospacedDigit()
        } else {
            // Shifting the apparent start later by totalPausedSeconds makes
            // the native timer's own "now - start" math equal
            // "now - startedAt - totalPausedSeconds" — exactly the same
            // elapsed-time derivation cardio-session.tsx uses in JS.
            let adjustedStart = state.startedAt.addingTimeInterval(state.totalPausedSeconds)
            Text(timerInterval: adjustedStart...adjustedStart.addingTimeInterval(60 * 60 * 24), countsDown: false)
                .monospacedDigit()
        }
    }
}

private struct StatColumn: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value)
                .font(.system(size: 15, weight: .semibold))
            Text(label)
                .font(.system(size: 11))
                .foregroundStyle(.secondary)
        }
    }
}

private struct LockScreenView: View {
    let context: ActivityViewContext<CardioLiveActivityAttributes>

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label(activityLabel(context.attributes.activityType), systemImage: activityIcon(context.attributes.activityType))
                    .font(.system(size: 14, weight: .semibold))
                Spacer()
                ElapsedTimeView(state: context.state)
                    .font(.system(size: 20, weight: .bold))
            }

            HStack(spacing: 16) {
                StatColumn(label: "Distance", value: context.state.distanceText)
                StatColumn(label: "Pace", value: context.state.paceText)
                StatColumn(label: "Calories", value: "\(context.state.caloriesBurned)")
                StatColumn(label: "Steps", value: "\(context.state.stepCount)")
                if let heartRate = context.state.currentHeartRate {
                    StatColumn(label: "Heart Rate", value: "\(heartRate)")
                }
            }

            Link(destination: finishURL) {
                Label("Finish", systemImage: "flag.checkered")
                    .font(.system(size: 14, weight: .bold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
            }
            .tint(.white)
            .background(Color.red)
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
        .padding(16)
        .activityBackgroundTint(Color.black)
        .activitySystemActionForegroundColor(Color.white)
    }
}

struct CardioLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: CardioLiveActivityAttributes.self) { context in
            LockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label(activityLabel(context.attributes.activityType), systemImage: activityIcon(context.attributes.activityType))
                        .font(.system(size: 13, weight: .semibold))
                }
                DynamicIslandExpandedRegion(.trailing) {
                    ElapsedTimeView(state: context.state)
                        .font(.system(size: 16, weight: .bold))
                }
                DynamicIslandExpandedRegion(.bottom) {
                    HStack(spacing: 12) {
                        StatColumn(label: "Distance", value: context.state.distanceText)
                        StatColumn(label: "Pace", value: context.state.paceText)
                        StatColumn(label: "Calories", value: "\(context.state.caloriesBurned)")
                        Spacer()
                        Link(destination: finishURL) {
                            Label("Finish", systemImage: "flag.checkered")
                                .font(.system(size: 13, weight: .bold))
                        }
                        .tint(.red)
                    }
                }
            } compactLeading: {
                Image(systemName: activityIcon(context.attributes.activityType))
            } compactTrailing: {
                ElapsedTimeView(state: context.state)
                    .font(.system(size: 13, weight: .semibold))
                    .frame(width: 44)
            } minimal: {
                Image(systemName: activityIcon(context.attributes.activityType))
            }
        }
    }
}

@main
struct CardioLiveActivityBundle: WidgetBundle {
    var body: some Widget {
        CardioLiveActivityWidget()
    }
}
