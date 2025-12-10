import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";

// Schema for creating a chat message
const createMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1),
  searchId: z.string().optional(),
});

// Schema for getting chat history
const getMessagesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  before: z.string().optional(), // Cursor for pagination
});

export interface ChatMessageResponse {
  id: string;
  role: string;
  content: string;
  searchId: string | null;
  createdAt: string;
}

// GET - Retrieve chat history
export async function GET(request: NextRequest) {
  try {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const validationResult = getMessagesSchema.safeParse({
      limit: searchParams.get("limit"),
      before: searchParams.get("before"),
    });

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: "Invalid parameters" },
        { status: 400 }
      );
    }

    const { limit, before } = validationResult.data;

    const messages = await db.chatMessage.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      ...(before && {
        cursor: { id: before },
        skip: 1,
      }),
    });

    // Reverse to get chronological order
    const chronologicalMessages = messages.reverse();

    return NextResponse.json({
      success: true,
      data: {
        messages: chronologicalMessages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          searchId: m.searchId,
          createdAt: m.createdAt.toISOString(),
        })),
        hasMore: messages.length === limit,
        cursor: messages.length > 0 ? messages[0].id : null,
      },
    });
  } catch (error) {
    console.error("Get chat messages error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve messages" },
      { status: 500 }
    );
  }
}

// POST - Store a new chat message
export async function POST(request: NextRequest) {
  try {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validationResult = createMessageSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request",
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { role, content, searchId } = validationResult.data;

    const message = await db.chatMessage.create({
      data: {
        role,
        content,
        searchId,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: message.id,
        role: message.role,
        content: message.content,
        searchId: message.searchId,
        createdAt: message.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Create chat message error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to store message" },
      { status: 500 }
    );
  }
}

// DELETE - Clear chat history
export async function DELETE() {
  try {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await db.chatMessage.deleteMany({});

    return NextResponse.json({
      success: true,
      message: "Chat history cleared",
    });
  } catch (error) {
    console.error("Clear chat history error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to clear history" },
      { status: 500 }
    );
  }
}
