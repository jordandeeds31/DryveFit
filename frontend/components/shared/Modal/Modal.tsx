import { Modal as RNModal, View, TouchableWithoutFeedback } from "react-native";
import styles from "./Modal.styles";
import { ModalProps } from "./Modal.types";

const Modal = ({ visible, onClose, children }: ModalProps) => {
    return (
        <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.card}>
                            {children}
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </RNModal>
    )
}

export default Modal;