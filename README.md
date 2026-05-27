# SetPlot Mock Flow

Mobile-first mock version for testing the real workout flow on iPhone.

## What works now

- Select workout day
- Mock Google Drive scan
- Mock GPT kg recommendations
- Start workout
- Follow exercise/set guidance
- Enter actual kg, reps, RIR, note
- Go back to previous set
- Edit any previous/current set from bottom sheet
- Finish workout
- See CSV preview
- Download CSV locally

## Not connected yet

- OpenAI API
- Google Drive read/write
- Session config import

These will be added after the design and workout flow are approved.


## V3 logo setup

The generated SetPlot logo has been converted into PWA/iOS app icons:

```text
icons/icon-180.png
icons/icon-192.png
icons/icon-512.png
icons/setplot-logo-full.png
```

The app icon is connected through:

- `manifest.json`
- `index.html` apple-touch-icon
- `index.html` favicon


## V4 API test

This version adds a first OpenAI API connectivity test:

- App is locked until an OpenAI API key is entered.
- API key is stored only in `sessionStorage`.
- The selected workout day is sent to OpenAI.
- OpenAI returns a theoretical 1-100 readiness score.
- Google Drive integration is still not active.
