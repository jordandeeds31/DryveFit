import { View, Text } from "react-native";
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
        ]}
      >
        <Text
          style={isOwnMessage ? styles.textOwn : styles.textOther}
        >
          {message.content}
        </Text>
      </View>
      <Text style={styles.timestamp}>
        {formatMessageTime(message.createdAt)}
      </Text>
    </View>
  );
};

export default MessageBubble;
