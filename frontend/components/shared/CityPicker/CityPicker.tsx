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
import { useCitySearch, useCountries } from "@/hooks/useCities";
import { Country } from "@/lib/api/cities.api";
import styles from "./CityPicker.styles";
import { CityPickerProps } from "./CityPicker.types";

// Two-step now that the app's city list is worldwide (~33k cities across
// 244 countries) rather than US-only: pick a country first, then search
// narrows to just that country's cities — searching 33k unscoped entries
// isn't a great picking experience once cross-country name collisions
// (there are a lot of "Springfield"s and "San Jose"s out there) get
// common.
const CityPicker = ({ selectedCity, setSelectedCity }: CityPickerProps) => {
  const { data: countries } = useCountries();
  const [selectedCountryCode, setSelectedCountryCode] = useState<
    string | null
  >(null);
  const [countrySearchText, setCountrySearchText] = useState("");
  const [isCountryOpen, setIsCountryOpen] = useState(false);

  const [citySearchText, setCitySearchText] = useState("");
  const [debouncedCityQuery, setDebouncedCityQuery] = useState("");
  const [isCityOpen, setIsCityOpen] = useState(false);
  const cityInputRef = useRef<TextInput>(null);

  const isFocused = useIsFocused();
  useEffect(() => {
    if (!isFocused) {
      setIsCountryOpen(false);
      setIsCityOpen(false);
      cityInputRef.current?.blur();
    }
  }, [isFocused]);

  useEffect(() => {
    const timeout = setTimeout(
      () => setDebouncedCityQuery(citySearchText),
      300,
    );
    return () => clearTimeout(timeout);
  }, [citySearchText]);

  // Best-effort: infer the starting country from an already-set city
  // label (editing an existing profile) once the country list has
  // loaded, so reopening this doesn't dump the viewer back at "pick a
  // country" for a value that's already there. The city list's own
  // format ("City, ST" for the US, "City, Country" everywhere else — see
  // backend/src/constants/cities.ts) is what makes this parseable at all.
  useEffect(() => {
    if (!countries || selectedCountryCode || !selectedCity) return;
    const suffix = selectedCity.split(",").pop()?.trim();
    if (!suffix) return;
    if (/^[A-Z]{2}$/.test(suffix)) {
      setSelectedCountryCode("US");
      return;
    }
    const match = countries.find((country: Country) => country.name === suffix);
    if (match) setSelectedCountryCode(match.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countries, selectedCity]);

  const selectedCountryName =
    countries?.find((country: Country) => country.code === selectedCountryCode)
      ?.name ?? null;

  const countryMatches = (countries ?? []).filter((country: Country) =>
    country.name.toLowerCase().includes(countrySearchText.trim().toLowerCase()),
  );

  const { data: cities, isFetching } = useCitySearch(
    debouncedCityQuery,
    selectedCountryCode ?? undefined,
  );

  const handleSelectCountry = (code: string) => {
    setSelectedCountryCode(code);
    setCountrySearchText("");
    setIsCountryOpen(false);
    // A city search/result from the previous country no longer applies.
    setCitySearchText("");
    setDebouncedCityQuery("");
  };

  const handleSelectCity = (city: string) => {
    setSelectedCity(city);
    setCitySearchText("");
    setDebouncedCityQuery("");
    setIsCityOpen(false);
  };

  const showMinCharsHint =
    citySearchText.trim().length > 0 && citySearchText.trim().length < 2;

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, selectedCountryCode && styles.inputSelected]}
          placeholder={selectedCountryName ?? "Select a country"}
          placeholderTextColor={
            selectedCountryName ? "#000000" : colors.textMuted
          }
          value={countrySearchText}
          onChangeText={(text) => {
            setCountrySearchText(text);
            setIsCountryOpen(true);
          }}
          onFocus={() => setIsCountryOpen(true)}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={() => setIsCountryOpen((prev) => !prev)}>
          <Feather
            name={isCountryOpen ? "chevron-up" : "chevron-down"}
            size={20}
          />
        </TouchableOpacity>
      </View>

      {isCountryOpen && (
        <View style={styles.dropdown}>
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {countryMatches.length === 0 && (
              <Text style={styles.loadingText}>No countries found</Text>
            )}
            {countryMatches.map((country: Country) => (
              <TouchableOpacity
                key={country.code}
                style={styles.item}
                onPress={() => handleSelectCountry(country.code)}
              >
                <Text style={styles.itemName}>{country.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {selectedCountryCode ? (
        <>
          <View style={styles.inputRow}>
            <TextInput
              ref={cityInputRef}
              style={[styles.input, selectedCity && styles.inputSelected]}
              placeholder={selectedCity ? selectedCity : "Search for a city"}
              placeholderTextColor={selectedCity ? "#000000" : colors.textMuted}
              value={citySearchText}
              onChangeText={(text) => {
                setCitySearchText(text);
                setIsCityOpen(true);
              }}
              onFocus={() => setIsCityOpen(true)}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setIsCityOpen((prev) => !prev)}>
              <Feather
                name={isCityOpen ? "chevron-up" : "chevron-down"}
                size={20}
              />
            </TouchableOpacity>
          </View>

          {isCityOpen && (
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
                {!showMinCharsHint && debouncedCityQuery.trim().length === 0 && (
                  <Text style={styles.loadingText}>
                    Type to search {selectedCountryName} cities
                  </Text>
                )}
                {isFetching && (
                  <ActivityIndicator style={{ marginVertical: 8 }} />
                )}
                {!isFetching &&
                  debouncedCityQuery.trim().length >= 2 &&
                  cities?.length === 0 && (
                    <Text style={styles.loadingText}>No cities found</Text>
                  )}
                {!isFetching &&
                  cities?.map((city: string) => (
                    <TouchableOpacity
                      key={city}
                      style={styles.item}
                      onPress={() => handleSelectCity(city)}
                    >
                      <Text style={styles.itemName}>{city}</Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            </View>
          )}
        </>
      ) : (
        <Text style={styles.helperText}>
          Select a country to search its cities.
        </Text>
      )}
    </View>
  );
};

export default CityPicker;
