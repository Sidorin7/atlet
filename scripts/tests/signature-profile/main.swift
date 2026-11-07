import Foundation

let deadline = Date(timeIntervalSince1970: 1_794_651_243)
let plist: [String: Any] = [
  "ExpirationDate": deadline,
  "Entitlements": ["get-task-allow": true]
]
let xml = try PropertyListSerialization.data(fromPropertyList: plist, format: .xml, options: 0)
// CMS is binary; decoding the entire container as UTF-8 must not be necessary.
let cms = Data([0x30, 0x82, 0xff, 0x00]) + xml + Data([0xff, 0x00])
assert(SignatureProfile.expiration(in: cms) == deadline)
assert(SignatureProfile.expiration(in: Data()) == nil)
assert(SignatureProfile.expiration(in: Data("<?xml broken </plist>".utf8)) == nil)
let store = try PropertyListSerialization.data(fromPropertyList: [
  "ExpirationDate": deadline,
  "Entitlements": ["get-task-allow": false]
], format: .xml, options: 0)
assert(SignatureProfile.expiration(in: store) == nil)
let missing = try PropertyListSerialization.data(fromPropertyList: ["Entitlements": ["get-task-allow": true]], format: .xml, options: 0)
assert(SignatureProfile.expiration(in: missing) == nil)
var moscow = Calendar(identifier: .gregorian)
moscow.timeZone = TimeZone(secondsFromGMT: 3 * 3600)!
let fire = ISO8601DateFormatter().date(from: "2026-11-12T16:00:00Z")!
let components = SignatureSchedule.localComponents(for: fire, calendar: moscow)
assert(components.year == 2026 && components.month == 11 && components.day == 12)
assert(components.hour == 19 && components.minute == 0)
assert(components.timeZone == nil && components.calendar == nil)
if CommandLine.arguments.count > 1 {
  let actual = try Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1]))
  guard let expiration = SignatureProfile.expiration(in: actual) else {
    fatalError("Installed developer profile must have a readable deadline")
  }
  print("Signed build expires at \(ISO8601DateFormatter().string(from: expiration))")
}
print("Signature profile tests passed")
