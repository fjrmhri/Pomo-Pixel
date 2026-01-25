# Patch Notes - Pomo-Pixel (2026-01-25)

## Overview

Patch ini mengatasi **6 critical issues** (P0) yang mempengaruhi security, data integrity, dan user experience. Semua patch bersifat **minimal** dan **tidak mengubah UI**.

---

## Critical Bug Fixes (4 items)

### BUG-01: OAuth CSRF Protection ✅
**Severity**: 🔴 CRITICAL (Security)

**Problem**: GitHub OAuth flow tidak menggunakan `state` parameter untuk CSRF protection.

**Solution**: Implemented state parameter generation, storage (sessionStorage), and verification.

**Files Changed**:
- `src/app/github.js`: Added `generateState()` function and state verification in `exchangeCodeForToken()`

**Impact**: Protects against CSRF attacks and authorization code injection.

**Verification**: OAuth redirect URL now contains `&state=<random_hex>`. State mismatch will reject the login.

---

### BUG-02: Firestore Path Inconsistency ✅
**Severity**: 🔴 CRITICAL (Data Integrity)

**Problem**: Daily statistics were saved to wrong path (`users/{uid}/statistik/harian/{date}` instead of `users/{uid}/statistik_harian/{date}`), causing data loss.

**Solution**: Fixed path in `page.js` to match `UserStatistics.js` structure.

**Files Changed**:
- `src/app/page.js`: Line 367 - changed from `doc(db, "users", idPengguna, "statistik", "harian", tanggal)` to `doc(db, "users", idPengguna, "statistik_harian", tanggal)`

**Impact**: Daily statistics now correctly saved and displayed.

**Note**: Existing data in old path will NOT be migrated automatically. If needed, create a separate migration script.

---

### BUG-03: Exposed Credentials ✅
**Severity**: 🔴 CRITICAL (Security)

**Problem**: `.env.local` file containing real Firebase and GitHub credentials was committed to repository.

**Solution**: Created `.env.example` template file with placeholder values.

**Files Changed**:
- **[NEW]** `.env.example`: Template for environment variables

**Action Required**:
1. **URGENT**: Rotate GitHub OAuth Client Secret immediately
2. Consider rotating Firebase API key
3. Remove `.env.local` from git history:
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env.local" \
     --prune-empty --tag-name-filter cat -- --all
   ```

**Verification**: Check that `.env.example` exists and `.env.local` is gitignored.

---

### BUG-04: Environment Variable Name Mismatch ✅
**Severity**: 🟡 HIGH (Configuration)

**Problem**: README documented `GITHUB_CLIENT_SECRET` but code used `NEXT_GITHUB_CLIENT_SECRET`.

**Solution**: Standardized to `GITHUB_CLIENT_SECRET` (consistent with Next.js convention).

**Files Changed**:
- `src/app/api/github/callback/route.js`: Line 18 - changed from `process.env.NEXT_GITHUB_CLIENT_SECRET` to `process.env.GITHUB_CLIENT_SECRET`

**Impact**: Environment variable name now consistent with documentation.

---

## Quality Improvements (2 items)

### IMP-01: Sleep/Resume Handling + Wake Lock API ✅
**Severity**: 🔴 CRITICAL (P0 - Core Functionality)

**Problem**: Timer stopped/drifted when device went to sleep or tab was frozen.

**Solution**: Implemented comprehensive sleep/resume handling:
1. **Wake Lock API**: Prevents screen sleep during focus sessions (Chrome/Edge 84+, Safari 16.4+)
2. **Visibility Change Handler**: Corrects timer when tab becomes visible again
3. **Page Show Handler**: Handles back-forward cache restoration (mobile browsers)
4. **Timestamp-based Correction**: Ensures timer accuracy even if wake lock fails

**Files Changed**:
- `src/app/components/Timer/Timer.js`:
  - Added `wakeLockSupported` state and `refWakeLock` ref
  - Added `requestWakeLock()` and `releaseWakeLock()` helpers
  - Added `visibilitychange` event listener
  - Added `pageshow` event listener
  - Modified `mulai()`, `jeda()`, and cleanup logic

**Impact**: 
- Timer remains accurate even after device sleep
- Session auto-completes if time elapsed during sleep
- Improved UX for mobile users

**Browser Support**:
- **Full Support** (Wake Lock + correction): Chrome/Edge 84+, Safari 16.4+
- **Fallback** (correction only): Firefox, older browsers

**Verification**: See verification plan in `implementation_plan.md` - sections 3A through 3D.

---

### IMP-02: Audio Recovery After Sleep ✅
**Severity**: 🟡 HIGH (P1 - User Experience)

**Problem**: Music stopped playing after device sleep and didn't auto-resume.

**Solution**: Added `visibilitychange` listener to auto-resume audio when tab becomes visible.

**Files Changed**:
- `src/app/components/Music/MusicPlayer.js`:
  - Added visibility change handler with best-effort audio resume
  - Graceful fallback if autoplay blocked (shows error message)

**Impact**: Music automatically resumes after sleep/tab freeze (best-effort).

**Verification**: Play music → sleep device → wake → music should resume automatically.

---

## Technical Details

### Browser Compatibility

| Feature | Chrome/Edge | Safari | Firefox | Mobile Safari | Mobile Chrome |
|---------|-------------|--------|---------|---------------|---------------|
| Wake Lock API | ✅ 84+ | ✅ 16.4+ | ❌ Fallback | ✅ 16.4+ | ✅ 84+ |
| Visibility API | ✅ | ✅ | ✅ | ✅ | ✅ |
| OAuth CSRF | ✅ | ✅ | ✅ | ✅ | ✅ |

### Fallback Behavior

When Wake Lock API is not supported:
- Timer still uses timestamp-based correction via `visibilitychange`
- Timer remains accurate after resume
- Screen may still sleep (cannot be prevented)
- No error shown to user (silent fallback)

---

## Files Modified Summary

Total files changed: **5**
- ✅ `src/app/github.js` (OAuth CSRF)
- ✅ `src/app/api/github/callback/route.js` (env var fix)
- ✅ `src/app/page.js` (Firestore path)
- ✅ `src/app/components/Timer/Timer.js` (Wake Lock + sleep/resume)
- ✅ `src/app/components/Music/MusicPlayer.js` (audio recovery)

New files: **1**
- ✅ `.env.example` (template)

---

## Deployment Checklist

### Before Deployment
- [ ] Rotate GitHub OAuth Client Secret
- [ ] Update environment variables in production (Vercel/hosting)
- [ ] Ensure `.env.local` is NOT committed (check with `git status`)
- [ ] Run `npm run lint` (should pass)
- [ ] Run `npm run build` (should succeed)

### Post-Deployment
- [ ] Test OAuth login flow on production
- [ ] Test timer sleep/resume on mobile device
- [ ] Verify daily statistics are being saved correctly
- [ ] Monitor console for wake lock support logs

---

## Known Limitations

1. **Wake Lock API**: Not supported in Firefox. Users will get timestamp correction only.
2. **Audio Resume**: Best-effort. May fail if browser blocks autoplay after sleep.
3. **Firestore Migration**: Old data in `statistik/harian/*` path will not be automatically migrated.

---

## Next Steps (Backlog)

See `implementation_plan.md` for additional improvements (P1-P3):
- Enhanced keyboard shortcuts (1/2/3 for period switching)
- Session persistence & recovery
- Desktop notifications
- Security headers in `next.config.mjs`
- Error boundaries
- And more...

---

**Patch Applied**: 2026-01-25  
**Total Issues Fixed**: 6 (4 bugs + 2 improvements)  
**Risk Level**: Low-Medium (extensive manual testing recommended)
