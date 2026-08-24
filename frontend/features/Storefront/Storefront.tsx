import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "@/constants/colors";
import styles from "./Storefront.styles";

const Storefront = () => {
  const [gender, setGender] = useState<"men" | "women">("men");

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

      <View style={styles.content}>
        <View style={styles.iconRing}>
          <Ionicons name="shirt-outline" size={32} color={colors.textMuted} />
        </View>
        <Text style={styles.title}>STOREFRONT</Text>
        <View style={styles.rule} />
        <Text style={styles.subtitle}>
          Gear worthy of the work you put in.
        </Text>
        <Text style={styles.eyebrow}>COMING SOON</Text>
      </View>
    </View>
  );
};

export default Storefront;
