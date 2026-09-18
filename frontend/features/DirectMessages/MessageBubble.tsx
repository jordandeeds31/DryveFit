import { useState } from "react";
import { View, Text, Modal, TouchableOpacity, TouchableWithoutFeedback } from "react-native";
import { Image } from "expo-image";
import Feather from "@expo/vector-icons/Feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DmMessage } from "@/types/directMessages.types";
import styles from "./MessageBubble.styles";

interface MessageBubbleProps {
  message: DmMessage;
  isOwnMessage: boolean;
}

// Deliberately NOT date.utils.ts's formatCalendarDate — that helper forces
// timeZone: "UTC" for calendar-day values (workout log dates etc.) where
// the stored value is a date-only UTC-midnight timestamp. A message
// createdAt is a real moment in time, and "when was this sent" should
// render in the viewer's own local clock, not UTC.
const formatMessageTime = (dateStr: string) =>
  new Date(dateStr).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

const MessageBubble = ({ message, isOwnMessage }: MessageBubbleProps) => {
  // Optimistic messages are given a "pending-<timestamp>" id (see
  // useSendDmMessage's onMutate) until the real row comes back — shown
  // dimmed rather than with a spinner, since a chat bubble that briefly
  // looks "sent but faded" reads better mid-scroll than a flickering
  // per-bubble loading indicator.
  const isPending = message.id.startsWith("pending-");
  const insets = useSafeAreaInsets();
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  return (
    <View
      style={[
        styles.row,
        isOwnMessage ? styles.rowOwn : styles.rowOther,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isOwnMessage ? styles.bubbleOwn : styles.bubbleOther,
          isPending && styles.bubblePending,
          !!message.imageUrl && styles.bubbleWithImage,
        ]}
      >
        {message.imageUrl && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setIsViewerOpen(true)}
          >
            <Image
              source={{ uri: message.imageUrl }}
              style={[styles.image, !!message.content && styles.imageWithCaption]}
              contentFit="cover"
            />
          </TouchableOpacity>
        )}
        {message.content && (
          <Text
            style={[
              isOwnMessage ? styles.textOwn : styles.textOther,
              !!message.imageUrl && styles.textUnderImage,
            ]}
          >
            {message.content}
          </Text>
        )}
      </View>
      <Text style={styles.timestamp}>
        {formatMessageTime(message.createdAt)}
      </Text>

      {message.imageUrl && (
        <Modal
          visible={isViewerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsViewerOpen(false)}
        >
          {/* Tap anywhere on the backdrop to dismiss — the image itself
              swallows the tap (see the inner TouchableWithoutFeedback)
              so tapping the photo doesn't also close the viewer. */}
          <TouchableWithoutFeedback onPress={() => setIsViewerOpen(false)}>
            <View style={styles.viewerBackdrop}>
              <TouchableWithoutFeedback>
                <Image
                  source={{ uri: message.imageUrl }}
                  style={styles.viewerImage}
                  contentFit="contain"
                />
              </TouchableWithoutFeedback>
              <TouchableOpacity
                style={[styles.viewerCloseButton, { top: insets.top + 12 }]}
                onPress={() => setIsViewerOpen(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Feather name="x" size={26} color="white" />
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </View>
  );
};

export default MessageBubble;
