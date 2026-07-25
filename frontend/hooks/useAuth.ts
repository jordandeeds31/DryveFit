import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "@/store";
import {
  loginThunk,
  registerThunk,
  logoutThunk,
  restoreSession,
} from "@/store/slices/authSlice";

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { accessToken, isAuthenticated, isLoading, error } = useSelector(
    (state: RootState) => state.auth,
  );

  const login = (email: string, password: string) =>
    dispatch(loginThunk({ email, password }));
  const register = (email: string, password: string) =>
    dispatch(registerThunk({ email, password }));
  const logout = () => dispatch(logoutThunk());

  return {
    accessToken,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
  };
};
