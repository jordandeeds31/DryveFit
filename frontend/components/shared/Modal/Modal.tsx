import {
  Modal as RNModal,
  View,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { LinearGradient } from "expo-linear-gradient";
import Feather from "@expo/vector-icons/Feather";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import styles from "./Modal.styles";
import { ModalProps } from "./Modal.types";

const Modal = ({
  visible,
  onClose,
  children,
  closable = true,
  headerAction,
  size = "default",
  keyboardAware = true,
  wide = false,
  glass = false,
  bottom = false,
}: ModalProps) => {
  const insets = useSafeAreaInsets();
  const isLarge = size === "large";

  const handleClose = () => {
    if (closable) {
      onClose();
    }
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType={bottom ? "slide" : "fade"}
      onRequestClose={handleClose}
    >
      <View
        style={[
          styles.overlay,
          isLarge && styles.overlayTop,
          wide && styles.overlayWide,
          bottom && styles.overlayBottom,
        ]}
      >
        {/* Absolutely-positioned sibling behind the card, not a wrapper
            around it — a wrapper would sit as a touch-responder ancestor
            of the ScrollView below and swallow scroll gestures before they
            ever reach it. As a sibling, it only ever receives touches that
            land outside the card's bounds. */}
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <View
          style={[
            styles.card,
            isLarge && styles.cardLarge,
            isLarge && { marginTop: insets.top + spacing.sm },
            wide && styles.cardWide,
            glass && styles.cardGlass,
            bottom && styles.cardBottom,
            bottom && { paddingBottom: insets.bottom + spacing.md },
          ]}
        >
          {glass && (
            <LinearGradient
              colors={[
                "rgba(255,255,255,0.94)",
                "rgba(239,246,255,0.88)",
                "rgba(245,243,255,0.88)",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
          )}
          {bottom && <View style={styles.dragHandle} />}
          {(closable || headerAction) && (
            <View
              style={[
                styles.closeRow,
                !!headerAction && styles.closeRowWithAction,
              ]}
            >
              {headerAction}
              {closable && (
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="x" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          )}
          <KeyboardAwareScrollView
            style={styles.scrollArea}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bottomOffset={60}
            enabled={keyboardAware}
          >
            {children}
          </KeyboardAwareScrollView>
        </View>
      </View>
    </RNModal>
  );
};

export default Modal;
