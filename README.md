# Atlet

Личное iOS-приложение для записи тренировок. План — в [PLAN.md](PLAN.md).

```sh
npm start            # Expo Go
npm test             # jest
npm run typecheck
npm run db:generate  # после изменения src/db/schema.ts
```

Напоминания об обновлении личной iOS-сборки находятся в локальном Expo-модуле
`modules/signature-reminder`. После изменений Swift нужно выполнить `pod install
--project-directory=ios` и пересобрать приложение. Модуль читает срок из подписи
установленной сборки; в Expo Go, симуляторе и сборках без профиля разработчика
напоминание скрыто. После установки откройте Atlet и разрешите уведомления.

Проверка чтения подписи и календарного расписания без iPhone:

```sh
xcrun swiftc -module-cache-path /tmp/atlet-swift-cache modules/signature-reminder/ios/SignatureProfile.swift scripts/tests/signature-profile/main.swift -o /tmp/atlet-signature-tests
/tmp/atlet-signature-tests
```
