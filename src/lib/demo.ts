/** Opens a video search for how to do the exercise. Needs internet; nothing is bundled or cached. */
export const demoUrl = (name: string): string =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} exercise form`)}`;
