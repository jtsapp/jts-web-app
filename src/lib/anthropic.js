// Anthropic brain for the voice tutor — Claude Haiku 4.5 with prompt caching.
//
// Ported from felix lib/llm/anthropic-client.ts, trimmed to what the voice
// brain shim needs: a tool-calling stream (chatStreamRich). The big win vs the
// felix version: the system prompt (~4k tokens) and tool defs are marked with
// `cache_control: ephemeral`, so from the 2nd turn on they bill at 10% of the
// input price (cache read $0.10/1M vs $1/1M). Cuts the brain cost ~2.5x.

import Anthropic from "@anthropic-ai/sdk";

const DEFAULT_MODEL =
  process.env.VOICE_BRAIN_MODEL || "claude-haiku-4-5-20251001";
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

  const stream = client.messages.stream({
    model,
    max_tokens: args.maxOutputTokens ?? MAX_OUTPUT_TOKENS,
    thinking: { type: "disabled" },
    system,
    messages: toRichMessages(args.messages),
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
