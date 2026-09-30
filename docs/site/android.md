# Android

The Android app is being built in brief 06. This checkout has no verified APK release or Android capture. The phone image on the landing page is the real mobile web demo, labelled as such. You can [use the web app](https://app.kriyan.app/app) on your phone now.

## Installing an APK when available

[Check the latest GitHub release](/download) for an Android APK. If there is no release or APK asset, a download is not available yet. Download only from the project's release page, open the APK, and allow installs from that source when Android asks. You can turn that permission off after installation. Kriyan is not on the Play Store.

## Updating

Download a newer APK from the same GitHub release page. An update must use the same package identity and signing key. Keep your existing app installed when updating. Your signed-in planner data is stored on the shared Convex backend, so the web and Android clients use the same account.

## Notifications and permissions

Task reminders will ask for notification permission. Denying it does not stop you planning tasks. You can change notification permission in Android's app settings. Push delivery is best effort and may be delayed by connectivity or Android battery settings; reminders are not alarm-clock guarantees.

The native sign-in and push flows need a development or release build, rather than Expo Go. Final supported Android versions, permissions, notification behavior and update instructions must be checked against the Android worker's release artifact during integration.
