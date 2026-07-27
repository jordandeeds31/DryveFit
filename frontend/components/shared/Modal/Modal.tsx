import { Modal as RNModal, View, TouchableWithoutFeedback } from "react-native";
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
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>{children}</View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
};

export default Modal;
