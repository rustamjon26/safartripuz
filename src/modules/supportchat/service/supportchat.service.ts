import {
  isSupportAgentRole,
  partyTypeFromRole,
} from "../domain/party-type";
import type {
  SupportMessageView,
  SupportPartyType,
  SupportThreadStatus,
  SupportThreadView,
} from "../domain/types";
import { supportChatRepository } from "../repository/supportchat.repository";

export class SupportChatNotFoundError extends Error {
  constructor(message = "Suhbat topilmadi") {
    super(message);
    this.name = "SupportChatNotFoundError";
  }
}

export class SupportChatForbiddenError extends Error {
  constructor(message = "Ruxsat yo'q") {
    super(message);
    this.name = "SupportChatForbiddenError";
  }
}

export class SupportChatService {
  async openThreadAsParty(
    userId: string,
    input: { subject: string; body: string },
  ): Promise<SupportThreadView> {
    const user = await supportChatRepository.findUser(userId);
    if (!user) throw new SupportChatNotFoundError("Foydalanuvchi topilmadi");
    if (isSupportAgentRole(user.role)) {
      throw new SupportChatForbiddenError(
        "Agentlar party sifatida yangi suhbat ochmaydi",
      );
    }
    // Always derive from role — never trust client partyType.
    const partyType = partyTypeFromRole(user.role);
    return supportChatRepository.createThread({
      subject: input.subject,
      body: input.body,
      partyType,
      partyUserId: userId,
    });
  }

  async listAsAgent(
    agentUserId: string,
    filter: {
      status: "all" | SupportThreadStatus;
      partyType: "all" | SupportPartyType;
      q?: string;
    },
  ): Promise<SupportThreadView[]> {
    const user = await supportChatRepository.findUser(agentUserId);
    if (!user || !isSupportAgentRole(user.role)) {
      throw new SupportChatForbiddenError();
    }
    return supportChatRepository.listForAgent({
      ...filter,
      agentUserId,
    });
  }

  async listAsParty(userId: string): Promise<SupportThreadView[]> {
    return supportChatRepository.listForParty(userId);
  }

  async getMessagesForAgent(
    agentUserId: string,
    threadId: string,
  ): Promise<{
    thread: SupportThreadView;
    messages: SupportMessageView[];
  }> {
    const user = await supportChatRepository.findUser(agentUserId);
    if (!user || !isSupportAgentRole(user.role)) {
      throw new SupportChatForbiddenError();
    }
    const thread = await supportChatRepository.getThread(threadId);
    if (!thread) throw new SupportChatNotFoundError();

    await supportChatRepository.ensureMember({
      threadId,
      userId: agentUserId,
      role: "AGENT",
    });
    await supportChatRepository.markRead(threadId, agentUserId);

    const messages = await supportChatRepository.listMessages(
      threadId,
      agentUserId,
    );
    return {
      thread: {
        id: thread.id,
        subject: thread.subject,
        partyType: thread.partyType,
        partyUserId: thread.partyUserId,
        partyName: `${thread.partyUser.first_name} ${thread.partyUser.last_name}`.trim(),
        partyEmail: thread.partyUser.email,
        status: thread.status,
        preview: messages[messages.length - 1]?.body ?? null,
        lastMessageAt: thread.lastMessageAt?.toISOString() ?? null,
        unread: 0,
        createdAt: thread.createdAt.toISOString(),
      },
      messages,
    };
  }

  async getMessagesForParty(
    userId: string,
    threadId: string,
  ): Promise<{
    thread: SupportThreadView;
    messages: SupportMessageView[];
  }> {
    const thread = await supportChatRepository.getThread(threadId);
    if (!thread) throw new SupportChatNotFoundError();
    // Owner-only: membership must not grant read after role demotion.
    if (thread.partyUserId !== userId) {
      throw new SupportChatForbiddenError();
    }

    await supportChatRepository.ensureMember({
      threadId,
      userId,
      role: "PARTY",
    });
    await supportChatRepository.markRead(threadId, userId);

    const messages = await supportChatRepository.listMessages(threadId, userId);
    return {
      thread: {
        id: thread.id,
        subject: thread.subject,
        partyType: thread.partyType,
        partyUserId: thread.partyUserId,
        partyName: `${thread.partyUser.first_name} ${thread.partyUser.last_name}`.trim(),
        partyEmail: thread.partyUser.email,
        status: thread.status,
        preview: messages[messages.length - 1]?.body ?? null,
        lastMessageAt: thread.lastMessageAt?.toISOString() ?? null,
        unread: 0,
        createdAt: thread.createdAt.toISOString(),
      },
      messages,
    };
  }

  async sendAsAgent(
    agentUserId: string,
    threadId: string,
    body: string,
  ): Promise<SupportMessageView> {
    const user = await supportChatRepository.findUser(agentUserId);
    if (!user || !isSupportAgentRole(user.role)) {
      throw new SupportChatForbiddenError();
    }
    const thread = await supportChatRepository.getThread(threadId);
    if (!thread) throw new SupportChatNotFoundError();

    await supportChatRepository.ensureMember({
      threadId,
      userId: agentUserId,
      role: "AGENT",
    });
    return supportChatRepository.sendMessage({
      threadId,
      authorUserId: agentUserId,
      body,
    });
  }

  async sendAsParty(
    userId: string,
    threadId: string,
    body: string,
  ): Promise<SupportMessageView> {
    const thread = await supportChatRepository.getThread(threadId);
    if (!thread) throw new SupportChatNotFoundError();
    if (thread.partyUserId !== userId) {
      throw new SupportChatForbiddenError();
    }
    if (thread.status === "CLOSED") {
      await supportChatRepository.updateStatus(threadId, "OPEN");
    }
    await supportChatRepository.ensureMember({
      threadId,
      userId,
      role: "PARTY",
    });
    return supportChatRepository.sendMessage({
      threadId,
      authorUserId: userId,
      body,
    });
  }

  async patchStatusAsAgent(
    agentUserId: string,
    threadId: string,
    status: SupportThreadStatus,
  ): Promise<void> {
    const user = await supportChatRepository.findUser(agentUserId);
    if (!user || !isSupportAgentRole(user.role)) {
      throw new SupportChatForbiddenError();
    }
    const thread = await supportChatRepository.getThread(threadId);
    if (!thread) throw new SupportChatNotFoundError();
    await supportChatRepository.updateStatus(threadId, status);
  }
}

export const supportChatService = new SupportChatService();
