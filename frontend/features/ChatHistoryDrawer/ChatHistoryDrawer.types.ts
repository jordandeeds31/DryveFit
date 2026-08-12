export interface ChatHistoryDrawerProps {
  visible: boolean;
  onClose: () => void;
  onSelectConversation: (conversationId: string) => void;
}
