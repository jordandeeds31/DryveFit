import {
  Modal as RNModal,
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { colors } from "@/constants/colors";
import styles from "./Modal.styles";
import { ModalProps } from "./Modal.types";

const Modal = ({ visible, onClose, children, closable = true }: ModalProps) => {
  const handleClose = () => {
    if (closable) {
      onClose();
    }
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Absolutely-positioned sibling behind the card, not a wrapper
            around it — a wrapper would sit as a touch-responder ancestor
            of the ScrollView below and swallow scroll gestures before they
            ever reach it. As a sibling, it only ever receives touches that
            land outside the card's bounds. */}
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <View style={styles.card}>
          {closable && (
            <View style={styles.closeRow}>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}
          <ScrollView
            style={styles.scrollArea}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </RNModal>
  );
};

export default Modal;
