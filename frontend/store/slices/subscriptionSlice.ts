import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import Purchases from "react-native-purchases";
import { PRO_ENTITLEMENT_ID } from "@/lib/purchases/purchases";

interface SubscriptionState {
  isPro: boolean;
  isLoading: boolean;
}

const initialState: SubscriptionState = {
  isPro: false,
  isLoading: true,
};

export const fetchSubscriptionStatus = createAsyncThunk(
  "subscription/fetch",
  async () => {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[PRO_ENTITLEMENT_ID] != null;
  },
);

const subscriptionSlice = createSlice({
  name: "subscription",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubscriptionStatus.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchSubscriptionStatus.fulfilled, (state, action) => {
        state.isPro = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchSubscriptionStatus.rejected, (state) => {
        // If we can't reach RevenueCat, don't silently treat the user as
        // pro — fail closed.
        state.isPro = false;
        state.isLoading = false;
      });
  },
});

export default subscriptionSlice.reducer;
