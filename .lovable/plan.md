

## Fix Password Recovery Flow - Implementation Plan

### Problem Identified
The current `Auth.tsx` has a critical bug in the `onAuthStateChange` handler (lines 53-72):

```typescript
if (session?.user) {
  navigate("/"); // Always redirects - even during PASSWORD_RECOVERY!
}
```

When users click the password reset link from their email:
1. Supabase triggers `PASSWORD_RECOVERY` event with a temporary session
2. The current code sees a session exists and immediately redirects to home
3. Users never get to set their new password

### Solution

**1. Create `SetNewPasswordForm.tsx` component**
- New Password input with visibility toggle
- Confirm Password input with visibility toggle
- Validation: minimum 6 characters, passwords must match, whitespace warning
- Calls `supabase.auth.updateUser({ password })` on submit
- Shows success message, then triggers callback

**2. Update `Auth.tsx` to handle PASSWORD_RECOVERY**

Add state:
```typescript
const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
```

Modify `onAuthStateChange` handler:
```typescript
supabase.auth.onAuthStateChange((event, session) => {
  // Intercept PASSWORD_RECOVERY - do NOT redirect
  if (event === 'PASSWORD_RECOVERY') {
    setIsPasswordRecovery(true);
    setSession(session);
    setUser(session?.user ?? null);
    return; // Stop here - don't navigate
  }
  
  // If in recovery mode, don't auto-redirect
  if (isPasswordRecovery) {
    return;
  }
  
  // Normal flow continues...
  if (session?.user) {
    navigate("/");
  }
});
```

Render `SetNewPasswordForm` when `isPasswordRecovery` is true:
```typescript
{isPasswordRecovery ? (
  <SetNewPasswordForm 
    onSuccess={() => {
      setIsPasswordRecovery(false);
      toast({ title: "Password updated!" });
      navigate("/");
    }}
    onBackToLogin={() => {
      supabase.auth.signOut();
      setIsPasswordRecovery(false);
    }}
  />
) : (
  // existing login/signup forms
)}
```

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/Auth/SetNewPasswordForm.tsx` | Create new component |
| `src/pages/Auth.tsx` | Update with PASSWORD_RECOVERY handling |

### User Flow After Fix

```text
1. User clicks "Quên mật khẩu?" → enters email → receives email
2. User clicks link in email → redirected to /auth
3. onAuthStateChange fires with event = "PASSWORD_RECOVERY"
4. Code detects this, sets isPasswordRecovery = true
5. Form shows "Đặt Mật Khẩu Mới" with New Password + Confirm fields
6. User submits → supabase.auth.updateUser({ password })
7. On success: sign out, show toast, redirect to home
```

### Validation Rules
- Password minimum 6 characters
- New password and confirm must match
- Warning if password has leading/trailing whitespace (common copy-paste issue)
- Vietnamese error messages for all scenarios

### Additional Improvements Included
- Email normalization: `email.trim().toLowerCase()` for all auth operations
- "Resend confirmation email" button when login fails due to unconfirmed email
- "Reset password suggestion" box when login fails with invalid credentials
- Safe logging for debugging (no passwords logged)

