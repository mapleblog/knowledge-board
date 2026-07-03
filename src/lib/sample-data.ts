import type { BoardWithCards } from "./types";

/**
 * In-memory seed data mirroring docs/mockup.html.
 * Used to drive the UI scaffold before Supabase is wired up.
 * Replace these reads with queries from src/lib/supabase once auth + DB are live.
 */

const now = "2026-07-03T00:00:00.000Z";

export const SAMPLE_BOARDS: BoardWithCards[] = [
  {
    id: "board-webdev",
    user_id: "demo",
    name: "Learn Web Dev",
    description: "Front-end fundamentals, in the order I want to learn them.",
    color: "#4f46e5",
    created_at: now,
    cards: [
      {
        id: "c1",
        board_id: "board-webdev",
        title: "How the web works",
        description:
          "Clients, servers, DNS, and the request/response cycle — the mental model everything else builds on.",
        url: "https://developer.mozilla.org/",
        status: "done",
        order_index: 1,
        icon: "🌐",
        created_at: now,
        updated_at: now,
        attachments: [],
      },
      {
        id: "c2",
        board_id: "board-webdev",
        title: "HTML structure & semantics",
        description:
          "Document outline, semantic elements, forms, and accessibility basics.",
        url: null,
        status: "done",
        order_index: 2,
        icon: "📄",
        created_at: now,
        updated_at: now,
        attachments: [
          {
            id: "a1",
            card_id: "c2",
            file_path: "demo/notes.md",
            file_name: "notes.md",
            file_size: 2048,
            mime_type: "text/markdown",
          },
        ],
      },
      {
        id: "c3",
        board_id: "board-webdev",
        title: "CSS layout: flexbox & grid",
        description:
          "Box model, the two layout engines, and when to reach for each. Currently working through the grid module.",
        url: "https://css-tricks.com/",
        status: "in_progress",
        order_index: 3,
        icon: "🎨",
        created_at: now,
        updated_at: now,
        attachments: [
          {
            id: "a2",
            card_id: "c3",
            file_path: "demo/cheatsheet.pdf",
            file_name: "cheatsheet.pdf",
            file_size: 51200,
            mime_type: "application/pdf",
          },
        ],
      },
      {
        id: "c4",
        board_id: "board-webdev",
        title: "JavaScript fundamentals",
        description: "Types, functions, the event loop, and DOM manipulation.",
        url: null,
        status: "todo",
        order_index: 4,
        icon: "⚡",
        created_at: now,
        updated_at: now,
        attachments: [],
      },
    ],
  },
  {
    id: "board-spanish",
    user_id: "demo",
    name: "Spanish",
    description: "Getting to conversational.",
    color: "#0ea5e9",
    created_at: now,
    cards: [
      {
        id: "s1",
        board_id: "board-spanish",
        title: "Present-tense verbs",
        description: "Regular -ar / -er / -ir conjugations.",
        url: null,
        status: "done",
        order_index: 1,
        icon: "🗣️",
        created_at: now,
        updated_at: now,
        attachments: [],
      },
      {
        id: "s2",
        board_id: "board-spanish",
        title: "Everyday vocabulary",
        description: "Food, travel, and small talk — the first 500 words.",
        url: null,
        status: "in_progress",
        order_index: 2,
        icon: "📚",
        created_at: now,
        updated_at: now,
        attachments: [],
      },
    ],
  },
  {
    id: "board-guitar",
    user_id: "demo",
    name: "Learn Guitar",
    description: "From open chords to first songs.",
    color: "#f59e0b",
    created_at: now,
    cards: [
      {
        id: "g1",
        board_id: "board-guitar",
        title: "Open chords",
        description: "G, C, D, E minor, A minor — clean transitions.",
        url: null,
        status: "done",
        order_index: 1,
        icon: "🎸",
        created_at: now,
        updated_at: now,
        attachments: [],
      },
      {
        id: "g2",
        board_id: "board-guitar",
        title: "Strumming patterns",
        description: "Down-up patterns and keeping time with a metronome.",
        url: null,
        status: "todo",
        order_index: 2,
        icon: "🥁",
        created_at: now,
        updated_at: now,
        attachments: [],
      },
    ],
  },
];
