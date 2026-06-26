
import { useChatStore } from "../../stores/chatStore";
import { authService } from "../../services/authService";

const SUPPORT_BOT_ID = 547;

const handleSupportClick = async () => {
  const currentUser =
    authService.getCachedUser() || (await authService.getCurrentUser());
  if (!currentUser) {
    alert("Please log in.");
    return;
  }

  const store = useChatStore.getState();
  // Ensure conversations are loaded
  if (store.conversations.length === 0) {
    await store.fetchConversations();
  }

  // Find existing conversation with bot
  const existing = store.conversations.find(
    (conv) =>
      conv.type === "direct" &&
      conv.members.some((m) => m.id === currentUser.id) &&
      conv.members.some((m) => m.id === SUPPORT_BOT_ID),
  );

  if (existing) {
    // Set as active
    await store.setActiveConversation(existing);
    return;
  }

  // Create new conversation
  const newConv = await store.createConversation(
    "direct",
    [currentUser.id, SUPPORT_BOT_ID],
    "SkillsPanda Support",
  );
  // Now set it active
  await store.setActiveConversation(newConv);
};
