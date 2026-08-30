import { forwardRef, useImperativeHandle, useRef } from "react";
import {
  Modal as RNModal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  findNodeHandle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  KeyboardAwareScrollView,
  KeyboardAwareScrollViewRef,
} from "react-native-keyboard-controller";
import Feather from "@expo/vector-icons/Feather";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import styles from "./Modal.styles";
import { ModalProps, ModalHandle } from "./Modal.types";

const Modal = forwardRef<ModalHandle, ModalProps>(({
  visible,
  onClose,
  children,
  closable = true,
  title,
  titleStyle,
  headerAction,
  footer,
  size = "default",
  keyboardAware = true,
  bottomOffset = 60,
  wide = false,
  bottom = false,
}, ref) => {
  const insets = useSafeAreaInsets();
  const isLarge = size === "large";
  const scrollViewRef = useRef<KeyboardAwareScrollViewRef>(null);

  useImperativeHandle(ref, () => ({
    scrollToEnd: () => scrollViewRef.current?.scrollToEnd({ animated: true }),
    scrollToView: (nodeRef, extraOffset = 80) => {
      const node = nodeRef.current;
      const scrollHandle = findNodeHandle(scrollViewRef.current);
      if (!node || scrollHandle == null) return;
      // The classic RN "scroll a specific child into view" primitive —
      // measures node's position relative to the scroll view's own
      // native node, not the screen, so this stays correct regardless of
      // how far the scroll view itself has already scrolled.
      node.measureLayout(
        scrollHandle,
        (_x: number, y: number) => {
          scrollViewRef.current?.scrollTo({
            y: Math.max(y - extraOffset, 0),
            animated: true,
          });
        },
        () => {
          // Measurement can fail transiently (e.g. mid-layout) — nothing
          // to recover to, so just skip this scroll rather than throw.
        },
      );
    },
  }));

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
            bottom && styles.cardBottom,
            bottom && { paddingBottom: insets.bottom + spacing.md },
          ]}
        >
          {bottom && <View style={styles.dragHandle} />}
          {(closable || headerAction || title) && (
            <View
              style={[
                styles.closeRow,
                !!(headerAction || title) && styles.closeRowWithAction,
              ]}
            >
              {title ? (
                <Text style={[styles.title, titleStyle]} numberOfLines={1}>
                  {title}
                </Text>
              ) : (
                headerAction
              )}
              <View style={styles.closeRowRight}>
                {title ? headerAction : null}
                {closable && (
                  <TouchableOpacity
                    onPress={onClose}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="x" size={22} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          <KeyboardAwareScrollView
            ref={scrollViewRef}
            style={styles.scrollArea}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bottomOffset={bottomOffset}
            enabled={keyboardAware}
          >
            {children}
          </KeyboardAwareScrollView>
          {footer && <View style={styles.footer}>{footer}</View>}
        </View>
      </View>
    </RNModal>
  );
});

export default Modal;
