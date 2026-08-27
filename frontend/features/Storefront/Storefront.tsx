import { useState } from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "@/constants/colors";
import Button from "@/components/shared/Button/Button";
import {
  useMerchInterest,
  useRegisterMerchInterest,
} from "@/hooks/useStorefront";
import styles from "./Storefront.styles";

// Stable key naming this not-yet-real product — not a real catalog id,
// just what ties interest taps together server-side (see
// backend/src/modules/storefront).
const DRYVE_TEE_KEY = "dryve-tee";

const InterestTally = ({ count }: { count: number }) => {
  if (count <= 0) {
    return (
      <Text style={styles.interestTally}>Be the first to raise your hand.</Text>
    );
  }
  return (
    <Text style={styles.interestTally}>
      <Text style={styles.interestTallyCount}>{count}</Text>{" "}
      {count === 1 ? "person" : "people"} interested so far
    </Text>
  );
};

const Storefront = () => {
  const [gender, setGender] = useState<"men" | "women">("men");
  const { data: interest } = useMerchInterest(DRYVE_TEE_KEY);
  const { mutate: registerInterest, isPending: isRegistering } =
    useRegisterMerchInterest(DRYVE_TEE_KEY);

  const hasInterest = interest?.hasInterest ?? false;
  const interestCount = interest?.count ?? 0;

  return (
    <View style={styles.container}>
      <View style={styles.genderTabBar}>
        <TouchableOpacity
          style={[styles.genderTab, gender === "men" && styles.genderTabActive]}
          onPress={() => setGender("men")}
        >
          <Text
            style={[
              styles.genderTabText,
              gender === "men" && styles.genderTabTextActive,
            ]}
          >
            Men
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.genderTab,
            gender === "women" && styles.genderTabActive,
          ]}
          onPress={() => setGender("women")}
        >
          <Text
            style={[
              styles.genderTabText,
              gender === "women" && styles.genderTabTextActive,
            ]}
          >
            Women
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {gender === "men" ? (
          <View style={styles.productContent}>
            <View style={styles.productCard}>
              <Image
                source={require("@/assets/images/dryve-tee.png")}
                style={styles.productImage}
                resizeMode="cover"
              />
              <View style={styles.productBadge}>
                <Text style={styles.productBadgeText}>Coming Soon</Text>
              </View>
            </View>
            <Text style={styles.productName}>DRYVE Tee</Text>
            <Text style={styles.productSubtitle}>
              Heavyweight cotton. Vertical wordmark. Not for sale yet.
            </Text>

            <Button
              title={hasInterest ? "You're On The List" : "I'd Like One"}
              onPress={() => registerInterest()}
              disabled={hasInterest || isRegistering}
              variant={hasInterest ? "outline" : "primary"}
              style={styles.interestButton}
            />
            <InterestTally count={interestCount} />
          </View>
        ) : (
          <View style={styles.content}>
            <View style={styles.iconRing}>
              <Ionicons
                name="shirt-outline"
                size={32}
                color={colors.textMuted}
              />
            </View>
            <Text style={styles.title}>STOREFRONT</Text>
            <View style={styles.rule} />
            <Text style={styles.subtitle}>
              Gear worthy of the work you put in.
            </Text>
            <Text style={styles.eyebrow}>COMING SOON</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default Storefront;
