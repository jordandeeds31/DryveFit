import { useMutation } from "@tanstack/react-query";
import { forgotPassword, resetPassword } from "@/lib/api/auth.api";

// Kept separate from useAuth (which wraps the Redux session thunks) —
// neither of these touches accessToken/session state, so they're plain
// React Query mutations like the rest of the app's authenticated actions.
export const useForgotPassword = () => {
  return useMutation({
    mutationFn: forgotPassword,
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: resetPassword,
  });
};
