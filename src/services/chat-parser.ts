const VOTE_REGEX = /#(\d{1,4})/g;

export function parseVote(message: string): string | null {
  const matches = message.match(VOTE_REGEX);
  if (!matches || matches.length !== 1) return null;
  return matches[0].replace('#', '');
}
