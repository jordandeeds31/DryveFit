import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useIsFocused } from "@react-navigation/native";
import { colors } from "@/constants/colors";
import { useCitySearch } from "@/hooks/useCities";
import styles from "./CityPicker.styles";
import { CityPickerProps } from "./CityPicker.types";

const CityPicker = ({ selectedCity, setSelectedCity }: CityPickerProps) => {
  const [searchText, setSearchText] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const isFocused = useIsFocused();
  useEffect(() => {
    if (!isFocused) {
      setIsOpen(false);
      // Screens stay mounted across tab switches, so a still-focused
      // TextInput can silently regain focus when this screen comes back
      // and re-fire onFocus, reopening the dropdown right away — blur it
      // explicitly so that can't happen.
      inputRef.current?.blur();
    }
  }, [isFocused]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(searchText), 300);
    return () => clearTimeout(timeout);
  }, [searchText]);

  const { data: cities, isFetching } = useCitySearch(debouncedQuery);

  const handleSelect = (city: string) => {
    setSelectedCity(city);
    setSearchText("");
    setDebouncedQuery("");
    setIsOpen(false);
  };

  const handleChangeText = (text: string) => {
    setSearchText(text);
    setIsOpen(true);
  };

  const showMinCharsHint = searchText.trim().length > 0 && searchText.trim().length < 2;

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={[styles.input, selectedCity && styles.inputSelected]}
          placeholder={selectedCity ? selectedCity : "Search for a city"}
          placeholderTextColor={selectedCity ? "#000000" : colors.textMuted}
          value={searchText}
          onChangeText={handleChangeText}
          onFocus={() => setIsOpen(true)}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={() => setIsOpen((prev) => !prev)}>
          <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={20} />
        </TouchableOpacity>
      </View>

      {isOpen && (
        <View style={styles.dropdown}>
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {showMinCharsHint && (
              <Text style={styles.loadingText}>
                Keep typing to search cities
              </Text>
            )}
            {!showMinCharsHint && debouncedQuery.trim().length === 0 && (
              <Text style={styles.loadingText}>
                Type to search U.S. cities
              </Text>
            )}
            {isFetching && (
              <ActivityIndicator style={{ marginVertical: 8 }} />
            )}
            {!isFetching &&
              debouncedQuery.trim().length >= 2 &&
              cities?.length === 0 && (
                <Text style={styles.loadingText}>No cities found</Text>
              )}
            {!isFetching &&
              cities?.map((city: string) => (
                <TouchableOpacity
                  key={city}
                  style={styles.item}
                  onPress={() => handleSelect(city)}
                >
                  <Text style={styles.itemName}>{city}</Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

export default CityPicker;
