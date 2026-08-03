import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "@/store";
import { fetchSubscriptionStatus } from "@/store/slices/subscriptionSlice";

export const useSubscription = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isPro, isLoading } = useSelector(
    (state: RootState) => state.subscription,
  );

  const refresh = () => dispatch(fetchSubscriptionStatus());

  return { isPro, isLoading, refresh };
};
