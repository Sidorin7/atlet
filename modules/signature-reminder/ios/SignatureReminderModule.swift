import ExpoModulesCore
import UserNotifications

struct SignatureNotification: Record {
  @Field var id: String = ""
  @Field var timestamp: Double = 0
  @Field var title: String = ""
  @Field var body: String = ""
}

public class SignatureReminderModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SignatureReminder")

    Function("expirationDate") { () -> String? in
      SignatureProfile.installedExpiration().map { ISO8601DateFormatter().string(from: $0) }
    }

    AsyncFunction("syncReminders") { (requests: [SignatureNotification], requestPermission: Bool) -> String in
      let center = UNUserNotificationCenter.current()
      let identifiers = ["atlet.signature.2", "atlet.signature.1"]
      // Never remove workout reminders or notifications belonging to another feature.
      center.removePendingNotificationRequests(withIdentifiers: identifiers)
      guard let expiration = SignatureProfile.installedExpiration() else { return "unavailable" }

      var settings = await center.notificationSettings()
      if settings.authorizationStatus == .notDetermined && requestPermission {
        _ = try await center.requestAuthorization(options: [.alert, .sound])
        settings = await center.notificationSettings()
      }
      switch settings.authorizationStatus {
      case .notDetermined: return "notDetermined"
      case .denied: return "disabled"
      case .authorized, .provisional, .ephemeral: break
      @unknown default: return "disabled"
      }

      for request in requests {
        let date = Date(timeIntervalSince1970: request.timestamp / 1000)
        guard identifiers.contains(request.id), date > Date(), date < expiration else { continue }
        let content = UNMutableNotificationContent()
        content.title = request.title
        content.body = request.body
        content.sound = .default
        let trigger = UNCalendarNotificationTrigger(dateMatching: SignatureSchedule.localComponents(for: date), repeats: false)
        try await center.add(UNNotificationRequest(identifier: request.id, content: content, trigger: trigger))
      }
      return "enabled"
    }
  }
}
