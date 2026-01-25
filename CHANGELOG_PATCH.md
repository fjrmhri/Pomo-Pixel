# Changelog - Pomo-Pixel Patch (2026-01-25)

## [Patch] - 2026-01-25

### 🔴 Critical Bugs Fixed

#### BUG-01: OAuth CSRF Protection
- **Impact**: Security vulnerability allowing CSRF attacks
- **Files**: `src/app/github.js`
- **Changes**:
  - Added `generateState()` function for random state parameter generation
  - Modified `redirectToGitHub()` to store state in sessionStorage
  - Modified `exchangeCodeForToken()` to verify state parameter
  - State mismatch now throws error and rejects login
- **Risk**: Medium (client-side OAuth flow change)

#### BUG-02: Firestore Path Inconsistency
- **Impact**: Daily statistics not saved/displayed (data loss)
- **Files**: `src/app/page.js`
- **Changes**:
  - Fixed Firestore path from `users/{uid}/statistik/harian/{date}` → `users/{uid}/statistik_harian/{date}` (line 367)
  - Added comment documenting Firestore structure
- **Risk**: Low (simple path fix)
- **Migration**: Old data not auto-migrated

#### BUG-03: Exposed Credentials
- **Impact**: Firebase & GitHub credentials leaked in repository
- **Files**: `.env.example` (new)
- **Changes**:
  - Created `.env.example` template with placeholder values
  - Documented env vars with comments
- **Action Required**: 
  - Rotate GitHub OAuth Client Secret immediately
  - Remove `.env.local` from git history
- **Risk**: Low (new file creation)

#### BUG-04: Environment Variable Name Mismatch
- **Impact**: OAuth fails if user follows README documentation
- **Files**: `src/app/api/github/callback/route.js`
- **Changes**:
  - Changed `process.env.NEXT_GITHUB_CLIENT_SECRET` → `process.env.GITHUB_CLIENT_SECRET` (line 18)
- **Risk**: Low (simple rename)

---

### 🟡 Quality Improvements

#### IMP-01: Sleep/Resume Handling + Wake Lock API
- **Impact**: Timer accuracy during device sleep/tab freeze
- **Files**: `src/app/components/Timer/Timer.js`
- **Changes**:
  - Added Wake Lock API support detection
  - Added `wakeLockSupported` state and `refWakeLock` ref
  - Implemented `requestWakeLock()` helper function
  - Implemented `releaseWakeLock()` helper function
  - Modified `mulai()` to request wake lock when timer starts
  - Modified `jeda()` and timer completion to release wake lock
  - Added `visibilitychange` event listener for timer correction on resume
  - Added `pageshow` event listener for bfcache restoration
  - Modified cleanup effect to release wake lock on unmount
- **Browser Support**:
  - Chrome/Edge 84+: Full support (wake lock + correction)
  - Safari 16.4+: Full support
  - Firefox: Fallback (correction only, no wake lock)
- **Risk**: Medium (complex state management, extensive testing needed)

#### IMP-02: Audio Recovery After Sleep
- **Impact**: Music continues after device sleep/tab freeze
- **Files**: `src/app/components/Music/MusicPlayer.js`
- **Changes**:
  - Added `visibilitychange` event listener
  - Auto-resume audio when tab becomes visible (if `sedangMain === true` and audio paused)
  - Graceful error handling if autoplay blocked (shows user message)
- **Risk**: Low (best-effort feature, silent fail)

---

## Summary Statistics

- **Total Files Modified**: 5
- **New Files Created**: 1
- **Lines Added**: ~150
- **Lines Removed**: ~20
- **Bugs Fixed**: 4
- **Improvements Added**: 2

---

## Breaking Changes

None. All changes are backward compatible.

---

## Upgrade Notes

1. **Environment Variables**: 
   - If using `NEXT_GITHUB_CLIENT_SECRET` in your `.env.local`, rename it to `GITHUB_CLIENT_SECRET`
   
2. **Firestore Data**:
   - Daily statistics will now be saved to correct path
   - Old data in `users/{uid}/statistik/harian/*` will not be migrated automatically
   - Consider creating migration script if historical data is critical

3. **Browser Support**:
   - Wake Lock API requires modern browsers (Chrome 84+, Safari 16.4+)
   - Older browsers will still work with timestamp-based correction

---

## Verification Steps

### 1. OAuth CSRF (BUG-01)
```bash
# Open browser dev tools → Network tab
# Click GitHub login
# Check redirect URL contains &state=<hex>
# Try to reuse/modify state → should fail
```

### 2. Firestore Path (BUG-02)
```bash
# Login with Firebase account
# Complete 1 pomodoro session
# Open Firebase Console → Firestore
# Verify doc at: users/{uid}/statistik_harian/YYYY-MM-DD
# Check "hari ini" tab shows correct data
```

### 3. Sleep/Resume (IMP-01)
```bash
# Browser: Chrome/Edge/Safari
# 1. Start timer → play music
# 2. Sleep device 30s
# 3. Wake device
# Expected: Timer accurate, music resumes
# Check console: "Wake lock acquired" when timer starts
```

### 4. Audio Recovery (IMP-02)
```bash
# 1. Play music
# 2. Switch tab / minimize window for 30s
# 3. Return to tab
# Expected: Music auto-resumes
```

---

## Known Issues

- Wake Lock not supported in Firefox (fallback works)
- Audio resume may fail if browser blocks autoplay (user sees error message)
- Old Firestore data not migrated (manual migration needed if desired)

---

## Future Improvements (Backlog)

See `implementation_plan.md` for P1-P3 items:
- Enhanced keyboard shortcuts (P1)
- Security headers (P1)
- Session persistence (P2)
- Desktop notifications (P2)
- TypeScript migration (P3)
- Error boundaries (P2)

---

**Version**: Patch-2026-01-25  
**Reviewed By**: User (approved via LGTM)  
**Applied By**: Antigravity AI Agent  
**Date**: 2026-01-25
