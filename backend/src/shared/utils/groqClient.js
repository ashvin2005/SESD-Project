'use strict';
const axios = require('axios');
const config = require('../../config');

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';


async function chatText({ system, messages, temperature = 0.3, maxTokens = 1024 }) {
  const body = {
    model: config.groq.model,
    messages: [
      { role: 'system', content: system },
      ...messages,
    ],
    temperature,
    max_tokens: maxTokens,
  };

  const response = await axios.post(`${GROQ_BASE_URL}/chat/completions`, body, {
    headers: {
      Authorization: `Bearer ${config.groq.apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });

  return response.data.choices[0].message.content.trim();
}


async function chatJSON({ system, user, temperature = 0.3, maxTokens = 1024 }) {
  const content = await chatText({
    system,
    messages: [{ role: 'user', content: user }],
    temperature,
    maxTokens,
  });

  const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(cleaned);
}


async function chatConversation({ system, history, temperature = 0.5, maxTokens = 1024 }) {
  return chatText({ system, messages: history, temperature, maxTokens });
}

module.exports = { chatText, chatJSON, chatConversation };
