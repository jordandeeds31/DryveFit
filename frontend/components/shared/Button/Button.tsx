import { Pressable, Text, ActivityIndicator } from "react-native";
import styles from "./Button.styles";
import { ButtonTypes } from "./Button.types";

const Button = ({ title, onPress, backgroundColor }: ButtonTypes) => {
    return (
        <Pressable style={[styles.button, backgroundColor !== undefined && { backgroundColor }]} onPress={onPress}>
            <Text style={styles.text}>{title}</Text>
        </Pressable>
    )
}

export default Button;