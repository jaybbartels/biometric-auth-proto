# Passive Biometric Authentication System - Checkpoint v1.0

**Date:** June 14, 2026  
**Status:** ✅ Complete & Deployed to Vercel  
**Live URL:** https://biometric-auth-proto.vercel.app

---

## System Architecture

### Three Main Apps
1. **Training App** (`/training?code=ENROLL-...`) - User enrollment
2. **Admin Dashboard** (`/admin`) - Management & monitoring  
3. **Authentication App** (`/biometric`) - Real-time biometric verification

---

## Database Schema

### Tables
- `organizations` - Company accounts
- `org_users` - Users within organizations
- `configurations` - Auth policies (thresholds, redirect URLs)
- `biometric_training_profiles` - Trained user baselines
- `enrollment_invites` - One-time training codes
- `authentication_events` - Auth attempt logs
- `biometric_modules` - Biometric type definitions

### Key Fields
- `biometric_training_profiles.is_validated` - Must be TRUE for auth
- `biometric_training_profiles.gait_analysis_data` - 18-feature JSON pattern
- `biometric_training_profiles.location_history` - Array of GPS points
- `biometric_training_profiles.device_info` - Device details + app version
- `enrollment_invites.enrollment_code` - ENROLL-timestamp-random format

---

## API Endpoints

### Training Flow
- `POST /api/training/save-profile` - Save validated training data
  - Requires valid `enrollment_code`
  - Checks `is_good_quality_profile()` (100+ samples, quality >65)
  - Sets `is_validated: true`

### Admin Flow
- `GET /api/admin/users?organizationId=X` - List users
- `POST /api/admin/users` - Create user
- `GET /api/admin/configurations?organizationId=X` - List configs
- `POST /api/admin/configurations` - Create config with thresholds
- `POST /api/admin/generate-enrollment-code` - Generate training link
- `GET /api/admin/confidence-scores?organizationId=X` - Auth history

### Authentication Flow
- `GET /api/biometric/organizations` - List organizations
- `GET /api/biometric/organizations-for-email?email=X` - Get org ID
- `GET /api/biometric/configurations-for-email?email=X` - Get user configs
- `POST /api/biometric/compare-profile` - **CORE**: Compare live vs trained
  - Input: email, deviceType, sensorData, organizationId
  - Output: person_confidence (0-100), is_validated_user
  - Rejects if: no validated profile OR device_type mismatch

---

## Authentication Flow (Step-by-Step)

1. **User goes to `/biometric`**
2. **Selects: Organization → Configuration → Email**
3. **App checks:**
   - `biometric_training_profiles` exists?
   - `email = input email` ✓
   - `device_type = current phone type` ✓
   - `is_validated = true` ✓
4. **Collects 100+ biometric samples**
5. **Calls `/api/biometric/compare-profile`**
6. **Gets back `person_confidence` (e.g., 85%)**
7. **Tests threshold:**
   - If `85 >= config.allow_threshold (80)` → **PASS**
     - Opens `config.allow_redirect_url` in new tab
   - If `85 < config.allow_threshold (80)` → **FAIL**
     - Opens `config.deny_redirect_url` in new tab

---

## Pattern Comparison (18 Features)

Each biometric type stores:
```json
{
  "mean": 54.67,
  "median": 57.22,
  "std_dev": 28.84,
  "variance": 831.69,
  "range": 99.32,
  "iqr": 52.3,
  "skewness": -0.21,
  "kurtosis": -1.15,
  "p5": 4.54,
  "p25": 28.92,
  "p50": 57.22,
  "p75": 81.22,
  "p95": 96.54,
  "autocorrelation": -0.07,
  "entropy": 0.96,
  "peak_count": 36,
  "peak_mean_height": 79.1,
  "coefficient_of_variation": 0.53,
  "sample_count": 102,
  "quality_score": 82
}
```

Comparison uses weighted average:
- Mean (20%) + Median (15%) + Std Dev (15%) + Skewness (10%) + Kurtosis (10%) + IQR (10%) + Entropy (5%) + Autocorr (5%)

---

## Test Data Available

**Organization:** Demo Corp (id: from /admin/login with admin/admin123)

**Test Users (Training Complete):**
- jaybartels@me.com (iOS, multiple validated profiles)

**Configuration Example:**
- Name: "TestConfig"
- Allow Threshold: 80%
- Challenge Threshold: 70%
- Allow URL: https://example.com/allow
- Deny URL: https://example.com/deny

---

## Deployment

- **Vercel Project:** biometric-auth-proto
- **GitHub:** https://github.com/jaybbartels/biometric-auth-proto
- **Build Status:** ✅ Passing
- **Latest Commit:** Add TypeScript error fix for redirect URLs

---

## Testing Checklist

- [ ] Test enrollment flow (/training with valid code)
- [ ] Test admin enrollment code generation
- [ ] Test configuration creation with thresholds
- [ ] Test authentication with trained profile
- [ ] Verify person_confidence calculation
- [ ] Test redirect URLs (allow & deny)
- [ ] Test validation checks (missing profile, wrong phone, etc)
- [ ] Test location history capture
- [ ] Verify device_info tracking
- [ ] Test admin dashboard all tabs

---

## Known Limitations

- Biometric data generation is simulated (random 0-100 scores)
- Real implementation would use actual sensor APIs
- Geolocation requires user permission on phone
- Device type detection via User-Agent (not 100% reliable)

---

## Next Phase Ideas

- Real sensor integration (accelerometer, gyroscope, etc)
- Machine learning model for biometric comparison
- Multi-device support per user
- Liveness detection
- Behavioral pattern analysis
- Real-time anomaly detection dashboard
