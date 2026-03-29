# Firebase setup (bird-af69c)

## Project binding

- Default project: `bird-af69c` (`.firebaserc`)
- Firebase config file: `firebase.json`
- Firestore rules: `firebase/firestore.rules`
- Firestore indexes: `firebase/firestore.indexes.json`

## Region choice

Cloud Functions are configured to run in `us-central1` (région "centrale").

## CI token usage

Set your token in env (do not commit token in repo):

```bash
export FIREBASE_TOKEN='YOUR_LOGIN_CI_TOKEN'
./scripts/firebase-deploy.sh bird-af69c
```

## Notes

- Payment gateway is intentionally left unconfigured for now.
- Emulator suite can be launched after installing firebase-tools.
