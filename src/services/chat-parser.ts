const VOTE_REGEX = /#(\d{1,4})/g;
const PREDICT_REGEX = /!gana\s+#(\d{1,4})/i;

export function parseVote(message: string): string | null {
  if (PREDICT_REGEX.test(message)) return null;
  const matches = message.match(VOTE_REGEX);
  if (!matches || matches.length !== 1) return null;
  return matches[0].replace('#', '');
}

export function parsePrediction(message: string): string | null {
  const match = message.match(PREDICT_REGEX);
  if (!match) return null;
  return match[1];
}
