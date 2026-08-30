import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import styles from "./TextInput.styles";
import { TextInputTypes } from "./TextInput.types";
import Feather from "@expo/vector-icons/Feather";

const Input = ({ label, error, isPassword, ...rest }: TextInputTypes) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <View>
            {label && <Text style={styles.label}>{label}</Text>}
            <View style={[styles.container, isPassword && styles.containerWithPasswordToggle]}>
                <TextInput style={styles.input} {...rest} secureTextEntry={isPassword && !showPassword} />
                {isPassword && (
                    <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)}>
                        <Feather name={showPassword ? "eye-off" : "eye"} size={18} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    )
}

export default Input