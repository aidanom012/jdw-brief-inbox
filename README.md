# JDW Brief Builder

Private single-passcode JDW campaign brief builder.

This version keeps the one-question swipe builder and PC-desktop artist folders, with a cleaner tactile mono visual pass.

## Login persistence

The app sets a long-lived signed cookie. For best results, keep `SESSION_SECRET` stable in Vercel. If `SESSION_SECRET` changes, old login cookies become invalid and you will have to log in again.
