import Foundation

enum SignatureSchedule {
  static func localComponents(for date: Date, calendar: Calendar = .current) -> DateComponents {
    var components = calendar.dateComponents([.year, .month, .day, .hour, .minute], from: date)
    // A floating local calendar date follows the phone's time zone while the app is closed.
    components.calendar = nil
    components.timeZone = nil
    return components
  }
}

enum SignatureProfile {
  /// The provisioning profile is a CMS envelope containing an XML property list.
  /// Read only its bounded XML payload, since the surrounding bytes are not UTF-8.
  static func expiration(in data: Data) -> Date? {
    guard let start = data.range(of: Data("<?xml".utf8)),
      let end = data.range(of: Data("</plist>".utf8), in: start.lowerBound..<data.endIndex),
      let profile = try? PropertyListSerialization.propertyList(
        from: data.subdata(in: start.lowerBound..<end.upperBound), options: [], format: nil
      ) as? [String: Any],
      let entitlements = profile["Entitlements"] as? [String: Any],
      entitlements["get-task-allow"] as? Bool == true
    else { return nil }
    return profile["ExpirationDate"] as? Date
  }

  static func installedExpiration() -> Date? {
    guard let url = Bundle.main.url(forResource: "embedded", withExtension: "mobileprovision"),
      let data = try? Data(contentsOf: url)
    else { return nil }
    return expiration(in: data)
  }
}
