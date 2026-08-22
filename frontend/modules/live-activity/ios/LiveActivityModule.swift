import ActivityKit
import ExpoModulesCore

// Module-scope, not instance-scope — mirrors cardioBackgroundLocation.ts's
// module-scope TaskManager.defineTask for the same reason: iOS can
// headlessly relaunch the app in a fresh JS context (e.g. to deliver a
// background location batch), and this reference needs to still make
// sense across that relaunch rather than resetting to nil every time.
@available(iOS 16.1, *)
private enum CardioActivityHolder {
  static var current: Activity<CardioLiveActivityAttributes>?
}

public class LiveActivityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LiveActivity")

    Function("isSupported") { () -> Bool in
      guard #available(iOS 16.1, *) else { return false }
      return ActivityAuthorizationInfo().areActivitiesEnabled
    }

    AsyncFunction("startActivity") { (activityType: String, startedAtMs: Double) in
      guard #available(iOS 16.1, *) else { return }

      // On a fresh JS context (headless relaunch), re-attach to whatever
      // is already running for this attributes type instead of assuming
      // CardioActivityHolder.current is populated — it won't be, since
      // that's an in-memory Swift value that doesn't survive relaunch
      // either. This is the native-side analog of cardio-session.tsx's
      // restoreSession().
      if let existing = Activity<CardioLiveActivityAttributes>.activities.first {
        CardioActivityHolder.current = existing
        return
      }

      let attributes = CardioLiveActivityAttributes(activityType: activityType)
      let startedAt = Date(timeIntervalSince1970: startedAtMs / 1000)
      let initialState = CardioLiveActivityAttributes.ContentState(
        startedAt: startedAt,
        pausedAt: nil,
        totalPausedSeconds: 0,
        distanceText: "0",
        paceText: "--:--",
        caloriesBurned: 0,
        stepCount: 0,
        currentHeartRate: nil
      )

      // The iOS 16.1-native signature (bare contentState, no ActivityContent
      // wrapper) — that wrapper-based overload is 16.2+ only, and this
      // module's floor is 16.1 since nothing here needs staleDate/
      // relevanceScore or push-token-eligible updates.
      CardioActivityHolder.current = try Activity.request(
        attributes: attributes,
        contentState: initialState,
        pushType: nil
      )
    }

    AsyncFunction("updateActivity") { (state: [String: Any]) in
      guard #available(iOS 16.1, *) else { return }

      let activity = CardioActivityHolder.current ?? Activity<CardioLiveActivityAttributes>.activities.first
      guard let activity else { return }

      let startedAtMs = state["startedAtMs"] as? Double ?? 0
      let pausedAtMs = state["pausedAtMs"] as? Double
      let contentState = CardioLiveActivityAttributes.ContentState(
        startedAt: Date(timeIntervalSince1970: startedAtMs / 1000),
        pausedAt: pausedAtMs.map { Date(timeIntervalSince1970: $0 / 1000) },
        totalPausedSeconds: state["totalPausedSeconds"] as? Double ?? 0,
        distanceText: state["distanceText"] as? String ?? "",
        paceText: state["paceText"] as? String ?? "--:--",
        caloriesBurned: state["caloriesBurned"] as? Int ?? 0,
        stepCount: state["stepCount"] as? Int ?? 0,
        currentHeartRate: state["currentHeartRate"] as? Int
      )

      await activity.update(using: contentState)
    }

    AsyncFunction("endActivity") {
      guard #available(iOS 16.1, *) else { return }

      let activity = CardioActivityHolder.current ?? Activity<CardioLiveActivityAttributes>.activities.first
      guard let activity else { return }

      await activity.end(using: nil, dismissalPolicy: .immediate)
      CardioActivityHolder.current = nil
    }
  }
}
