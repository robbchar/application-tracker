### Conceptual Firestore security rules for `application-tracker`

These rules are intended to be applied (and adapted as needed) in the Firebase console
for the Cloud Firestore database.

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /application-tracker/{applicationId} {
      allow read, update, delete: if request.auth != null
        && resource.data.userId == request.auth.uid;

      allow create: if request.auth != null
        && request.resource.data.userId == request.auth.uid;
    }
  }
}
```
