import DropdownFocusAreas from "@/components/shared/DropdownFocusAreas/DropdownFocusAreas";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";
import { BodyPart, BODY_PARTS } from "@/types/programs.types";
import Feather from "@expo/vector-icons/Feather";
import { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import programBuilderStyles from "../../ProgramBuilder.styles";
import { FocusAreasProps } from "./FocusAreas.types";

const FocusAreas = ({ selectedFocusAreas, setSelectedFocusAreas }: FocusAreasProps) => {
    const [searchText, setSearchText] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    const handleChangeText = (text: string) => {
        setSearchText(text);
        const matches = BODY_PARTS.filter((part) =>
            part.toLowerCase().includes(text.toLowerCase())
        );
        setIsOpen(text.length > 0 && matches.length > 0);
    };

    const filteredBodyParts = useMemo(() =>
        BODY_PARTS.filter((part) =>
            part.toLowerCase().includes(searchText.toLowerCase())
        ),
        [searchText]
    );

    const handleSelect = (bodyPart: BodyPart) => {
        const alreadySelected = selectedFocusAreas.includes(bodyPart);
        if (alreadySelected) {
            setSelectedFocusAreas(selectedFocusAreas.filter((p) => p !== bodyPart));
        } else {
            setSelectedFocusAreas([...selectedFocusAreas, bodyPart]);
        }
    };

    const handleDeselect = (bodyPart: BodyPart) => {
        setSelectedFocusAreas(selectedFocusAreas.filter((p) => p !== bodyPart));
    };

    const handleToggleDropdown = () => {
        setIsOpen((prev) => !prev);
        setSearchText("");
    };

    const dropdownData = searchText.length > 0 ? filteredBodyParts : [...BODY_PARTS];

    return (
        <View>
            <Text style={programBuilderStyles.label}>SELECT PROGRAM FOCUS AREA*</Text>
            <View style={inputStyles.container}>
                <View style={inputStyles.tagsRow}>
                    {selectedFocusAreas.map((area) => (
                        <TouchableOpacity
                            key={area}
                            style={inputStyles.tag}
                            onPress={() => handleDeselect(area)}
                        >
                            <Text style={inputStyles.tagText}>{area}</Text>
                            <Feather name="x" size={12} color="white" />
                        </TouchableOpacity>
                    ))}
                    <TextInput
                        style={inputStyles.input}
                        placeholder={selectedFocusAreas.length === 0 ? "Search a focus area" : ""}
                        value={searchText}
                        onChangeText={handleChangeText}
                        autoCapitalize="none"
                    />
                </View>
                <TouchableOpacity onPress={handleToggleDropdown} style={inputStyles.chevron}>
                    <Feather
                        name={isOpen ? "chevron-up" : "chevron-down"}
                        size={20}
                        color={colors.textSecondary}
                    />
                </TouchableOpacity>
            </View>
            {isOpen && (
                <DropdownFocusAreas
                    data={dropdownData}
                    selectedFocusAreas={selectedFocusAreas}
                    onSelect={handleSelect}
                />
            )}
        </View>
    );
};

export default FocusAreas;

const inputStyles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.borderGray,
        borderRadius: 8,
        backgroundColor: colors.lightGraySoft,
        minHeight: 44,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
    },
    tagsRow: {
        flex: 1,
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: spacing.xs,
    },
    tag: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.primaryBlue,
        fontWeight: fontWeights.semibold,
        borderRadius: 50,
        paddingVertical: 4,
        paddingHorizontal: 10,
        gap: 4,
    },
    tagText: {
        color: "white",
        fontSize: fontSizes.xs,
        fontWeight: fontWeights.semibold,
    },
    input: {
        flex: 1,
        fontSize: fontSizes.md,
        minWidth: 120,
        height: 32,
    },
    chevron: {
        paddingLeft: spacing.xs,
    },
});