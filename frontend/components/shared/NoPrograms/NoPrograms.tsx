import { Text, View } from "react-native";
import styles from "./NoPrograms.styles";

const NoPrograms = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>You haven't created any programs yet.</Text>
      <Text style={styles.text}>
        If you don't want to create a program you can still log your workouts.
      </Text>
    </View>
  );
};

export default NoPrograms;
