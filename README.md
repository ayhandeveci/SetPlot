# SetPilot

Mobile-first AI workout logger for GitHub Pages.

## Current scope

- PWA-ready mobile interface
- iOS home screen support
- Workout timer
- Mock previous workout loading
- Simple set recommendation logic
- Active set entry
- Workout timeline
- CSV download preview

## Later integration

After UI/design is finalized:

- Import session config file
- OpenAI API key from session only
- Google Drive Folder ID from session/config
- Read previous CSV files from Google Drive
- Save completed workout CSV to Google Drive
- GPT-based set recommendations

## File structure

```text
setpilot/
  index.html
  style.css
  app.js
  manifest.json
  icons/
    icon-192.svg
    icon-512.svg
```

## GitHub Pages

Push these files to a GitHub repo, then enable GitHub Pages from:

Settings > Pages > Deploy from branch > main > root
