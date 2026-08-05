import { beforeEach, describe, expect, it, vi } from "vitest";

const repo = vi.hoisted(() => ({
  findUser: vi.fn(),
  createThread: vi.fn(),
  listForAgent: vi.fn(),
  listForParty: vi.fn(),
  getThread: vi.fn(),
  ensureMember: vi.fn(),
  markRead: vi.fn(),
  listMessages: vi.fn(),
  sendMessage: vi.fn(),
  updateStatus: vi.fn(),
}));

vi.mock("../repository/supportchat.repository", () => ({
  supportChatRepository: repo,
}));

import {
  SupportChatForbiddenError,
  SupportChatService,
} from "./supportchat.service";

describe("SupportChatService authz", () => {
  const svc = new SupportChatService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks agents from opening party threads", async () => {
    repo.findUser.mockResolvedValue({
      id: "a1",
      role: "support",
      first_name: "A",
      last_name: "Gent",
      email: "a@x.uz",
    });
    await expect(
      svc.openThreadAsParty("a1", { subject: "Hello world", body: "help" }),
    ).rejects.toBeInstanceOf(SupportChatForbiddenError);
    expect(repo.createThread).not.toHaveBeenCalled();
  });

  it("derives partyType from role and ignores spoof attempts in input shape", async () => {
    repo.findUser.mockResolvedValue({
      id: "u1",
      role: "user",
      first_name: "M",
      last_name: "Ijoz",
      email: "m@x.uz",
    });
    repo.createThread.mockResolvedValue({
      id: "t1",
      subject: "Savol",
      partyType: "customer",
      partyUserId: "u1",
      partyName: "M Ijoz",
      partyEmail: "m@x.uz",
      status: "OPEN",
      preview: "help",
      lastMessageAt: null,
      unread: 0,
      createdAt: new Date().toISOString(),
    });

    await svc.openThreadAsParty("u1", {
      subject: "Savol",
      body: "help",
    });

    expect(repo.createThread).toHaveBeenCalledWith(
      expect.objectContaining({
        partyType: "customer",
        partyUserId: "u1",
      }),
    );
  });

  it("forbids party read when viewer is not thread owner (no membership bypass)", async () => {
    repo.getThread.mockResolvedValue({
      id: "t1",
      subject: "X",
      partyType: "hotel",
      partyUserId: "owner1",
      status: "OPEN",
      lastMessageAt: null,
      createdAt: new Date(),
      partyUser: {
        id: "owner1",
        first_name: "H",
        last_name: "Otel",
        email: "h@x.uz",
        role: "hotel_manager",
      },
    });
    await expect(
      svc.getMessagesForParty("intruder1", "t1"),
    ).rejects.toBeInstanceOf(SupportChatForbiddenError);
    expect(repo.listMessages).not.toHaveBeenCalled();
    expect(repo.ensureMember).not.toHaveBeenCalled();
  });

  it("forbids party send when viewer is not thread owner", async () => {
    repo.getThread.mockResolvedValue({
      id: "t1",
      partyUserId: "owner1",
      status: "OPEN",
    });
    await expect(
      svc.sendAsParty("intruder1", "t1", "salom"),
    ).rejects.toBeInstanceOf(SupportChatForbiddenError);
    expect(repo.sendMessage).not.toHaveBeenCalled();
  });

  it("forbids non-agents from agent list", async () => {
    repo.findUser.mockResolvedValue({
      id: "u1",
      role: "user",
      first_name: "U",
      last_name: "Ser",
      email: "u@x.uz",
    });
    await expect(
      svc.listAsAgent("u1", { status: "all", partyType: "all" }),
    ).rejects.toBeInstanceOf(SupportChatForbiddenError);
  });

  it("maps hotel_manager create to hotel partyType", async () => {
    repo.findUser.mockResolvedValue({
      id: "h1",
      role: "hotel_manager",
      first_name: "H",
      last_name: "M",
      email: "h@x.uz",
    });
    repo.createThread.mockResolvedValue({
      id: "t2",
      subject: "Bron",
      partyType: "hotel",
      partyUserId: "h1",
      partyName: "H M",
      partyEmail: "h@x.uz",
      status: "OPEN",
      preview: "x",
      lastMessageAt: null,
      unread: 0,
      createdAt: new Date().toISOString(),
    });

    await svc.openThreadAsParty("h1", { subject: "Bron", body: "x" });
    expect(repo.createThread).toHaveBeenCalledWith(
      expect.objectContaining({ partyType: "hotel" }),
    );
  });
});
