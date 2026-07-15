// Anthropic brain for the voice tutor — Claude Haiku 4.5 with prompt caching.
//
// Ported from felix lib/llm/anthropic-client.ts, trimmed to what the voice
// brain shim needs: a tool-calling stream (chatStreamRich). The big win vs the
// felix version: the system prompt (~4k tokens) and tool defs are marked with
// `cache_control: ephemeral`, so from the 2nd turn on they bill at 10% of the
// input price (cache read $0.10/1M vs $1/1M). Cuts the brain cost ~2.5x.
//
// chatStreamRich adds a third breakpoint on the newest turn so the transcript
// is cached as well — without it, a long session's dominant cost is re-reading
// its own history at full price on every turn. Watch the `llm_cost` log line:
// `cacheReadTokens` should climb with the conversation. A flat zero means the
// prefix is being invalidated somewhere and the caching is silently dead.

import Anthropic from "@anthropic-ai/sdk";

const DEFAULT_MODEL =
  process.env.VOICE_BRAIN_MODEL || "claude-haiku-4-5-20251001";
// IELTS band-scoring wants Sonnet's accuracy — the voice brain's Haiku is tuned
// for latency, not for grading against the official band descriptors.
const DEFAULT_GRADING_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const MAX_OUTPUT_TOKENS = 4096;

let cached = null;
function getClient() {
  if (!cached) cached = new Anthropic(); // reads ANTHROPIC_API_KEY from env
  return cached;
}

export function hasAnthropicKey() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// Map RichTurn[] (OpenAI-shaped conversation w/ tool calls) → Anthropic message
// params. Tool calls must round-trip: assistant tool_use blocks answered by
// tool_result blocks in a USER-role message. Consecutive same-role msgs merge.
function toRichMessages(turns) {
  const msgs = [];
  const push = (role, blocks) => {
    if (blocks.length === 0) return;
    const last = msgs[msgs.length - 1];
    if (last && last.role === role && Array.isArray(last.content)) {
      last.content.push(...blocks);
    } else {
      msgs.push({ role, content: blocks });
    }
  };

  for (const t of turns) {
    if (t.role === "user") {
      if (t.content.trim()) push("user", [{ type: "text", text: t.content }]);
    } else if (t.role === "assistant") {
      const blocks = [];
      if (t.content.trim()) blocks.push({ type: "text", text: t.content });
      for (const tc of t.toolCalls ?? []) {
        let input = {};
        try {
          input = JSON.parse(tc.argumentsJson || "{}");
        } catch {
          /* malformed args from the wire — send empty input rather than 400 */
        }
        blocks.push({ type: "tool_use", id: tc.id, name: tc.name, input });
      }
      push("assistant", blocks);
    } else {
      push("user", [
        { type: "tool_result", tool_use_id: t.toolCallId, content: t.content },
      ]);
    }
  }
  return msgs;
}

/**
 * Tool-calling stream for the voice brain shim. Yields
 *   { type: "text", text }             — streamed text deltas
 *   { type: "tool_call", toolCall }    — one complete tool call on block stop
 *
 * @param {{ systemPrompt: string, messages: any[], tools?: any[],
 *           temperature?: number, model?: string, maxOutputTokens?: number }} args
 */
export async function* chatStreamRich(args) {
  const client = getClient();
  const model = args.model || DEFAULT_MODEL;

  // Cache the static prefix: the system prompt is identical every turn, so mark
  // it ephemeral. Anthropic caches system + tools up to the last breakpoint.
  const system = [
    {
      type: "text",
      text: args.systemPrompt,
      cache_control: { type: "ephemeral" },
    },
  ];

  let tools;
  if (args.tools && args.tools.length > 0) {
    tools = args.tools.map((t, i) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema,
      // Mark the LAST tool so the whole tool block is part of the cached prefix.
      ...(i === args.tools.length - 1
        ? { cache_control: { type: "ephemeral" } }
        : {}),
    }));
  }

  // Cache the conversation too, not just the static prefix. Render order is
  // tools → system → messages, so the breakpoints above only cover everything
  // up to the system prompt: every turn re-read the whole transcript at full
  // input price, and that cost grows with the square of session length (turn N
  // pays for all N-1 turns before it, again). A breakpoint on the newest turn
  // makes the next turn read the transcript at cache-read price instead.
  //
  // The breakpoint MOVES each turn — that is the intended multi-turn pattern.
  // Earlier breakpoints stay valid as read points, so hits accrue as the
  // conversation grows. Budget: 4 breakpoints per request, and system + tools
  // already hold two.
  //
  // Mutating the block in place is safe: toRichMessages() built these objects
  // from scratch on this call.
  const messages = toRichMessages(args.messages);
  const lastMsg = messages[messages.length - 1];
  if (Array.isArray(lastMsg?.content) && lastMsg.content.length > 0) {
    lastMsg.content[lastMsg.content.length - 1].cache_control = {
      type: "ephemeral",
    };
  }

  const stream = client.messages.stream({
    model,
    max_tokens: args.maxOutputTokens ?? MAX_OUTPUT_TOKENS,
    thinking: { type: "disabled" },
    system,
    messages,
    ...(tools ? { tools } : {}),
  });

  // Tool-use blocks in flight, keyed by content-block index.
  const pending = new Map();
  for await (const event of stream) {
    if (
      event.type === "content_block_start" &&
      event.content_block.type === "tool_use"
    ) {
      pending.set(event.index, {
        id: event.content_block.id,
        name: event.content_block.name,
        json: "",
      });
    } else if (event.type === "content_block_delta") {
      if (event.delta.type === "text_delta") {
        yield { type: "text", text: event.delta.text };
      } else if (event.delta.type === "input_json_delta") {
        const p = pending.get(event.index);
        if (p) p.json += event.delta.partial_json;
      }
    } else if (event.type === "content_block_stop") {
      const p = pending.get(event.index);
      if (p) {
        pending.delete(event.index);
        yield {
          type: "tool_call",
          toolCall: { id: p.id, name: p.name, argumentsJson: p.json || "{}" },
        };
      }
    }
  }

  // Log cost + cache effectiveness (cache_read should be > 0 from turn 2).
  try {
    const final = await stream.finalMessage();
    const u = final.usage || {};
    console.log(
      JSON.stringify({
        kind: "llm_cost",
        task: "voice_brain",
        model,
        inputTokens: u.input_tokens ?? null,
        outputTokens: u.output_tokens ?? null,
        cacheReadTokens: u.cache_read_input_tokens ?? null,
        cacheWriteTokens: u.cache_creation_input_tokens ?? null,
      }),
    );
  } catch {
    /* logging must never break the reply */
  }
}

// ---------------------------------------------------------------------------
// Structured JSON (IELTS band-scoring)
// ---------------------------------------------------------------------------

const TYPE_MAP = {
  OBJECT: "object",
  ARRAY: "array",
  STRING: "string",
  INTEGER: "integer",
  NUMBER: "number",
  BOOLEAN: "boolean",
};

// Translate a Gemini OpenAPI-subset schema (uppercase types) into the
// JSON-Schema dialect Anthropic tools expect (lowercase types). Recursive:
// handles OBJECT.properties, ARRAY.items, enum, and required. Anything already
// lowercase passes through, so hand-written JSON-Schema also works.
function toJsonSchema(schema) {
  const out = {};
  const rawType = schema.type;
  const type =
    typeof rawType === "string" ? (TYPE_MAP[rawType.toUpperCase()] ?? rawType) : rawType;
  if (type) out.type = type;
  if (Array.isArray(schema.enum)) out.enum = schema.enum;
  if (typeof schema.description === "string") out.description = schema.description;

  if (type === "object" && schema.properties && typeof schema.properties === "object") {
    out.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([k, v]) => [k, toJsonSchema(v)]),
    );
    if (Array.isArray(schema.required)) out.required = schema.required;
  }
  if (type === "array" && schema.items && typeof schema.items === "object") {
    out.items = toJsonSchema(schema.items);
  }
  return out;
}

/**
 * Structured JSON via forced tool-use: translate the schema, force a single
 * tool call, return its validated `input`. Optional images ride in front of the
 * text as a multimodal content array (the IELTS Task 1 chart, so the model
 * grades the description against the actual data rather than blind).
 *
 * @param {{ systemPrompt: string, userMessage: string, schema: object,
 *           images?: {mimeType: string, dataBase64: string}[],
 *           model?: string, maxOutputTokens?: number }} args
 */
export async function structured(args) {
  const client = getClient();
  const model = args.model || DEFAULT_GRADING_MODEL;
  const inputSchema = toJsonSchema(args.schema);

  const content =
    args.images && args.images.length > 0
      ? [
          ...args.images.map((img) => ({
            type: "image",
            source: {
              type: "base64",
              media_type: img.mimeType,
              data: img.dataBase64,
            },
          })),
          { type: "text", text: args.userMessage },
        ]
      : args.userMessage;

  const res = await client.messages.create({
    model,
    max_tokens: args.maxOutputTokens ?? MAX_OUTPUT_TOKENS,
    thinking: { type: "disabled" },
    system: args.systemPrompt,
    messages: [{ role: "user", content }],
    tools: [
      {
        name: "record_result",
        description:
          "Record the structured result. Call this exactly once with the full result.",
        input_schema: inputSchema,
      },
    ],
    // Force the model to answer through the tool so we always get JSON.
    tool_choice: { type: "tool", name: "record_result" },
  });

  try {
    const u = res.usage || {};
    console.log(
      JSON.stringify({
        kind: "llm_cost",
        task: "structured",
        model,
        inputTokens: u.input_tokens ?? null,
        outputTokens: u.output_tokens ?? null,
      }),
    );
  } catch {
    /* logging must never break the reply */
  }

  const toolUse = res.content.find((b) => b.type === "tool_use");
  if (!toolUse) throw new Error("Claude returned no tool_use block");
  return toolUse.input;
}
