import { getDB } from './db';
import { createDexieRepos } from './repos/dexieRepos';
import type { Repos } from './repos/interfaces';

let repos: Repos | null = null;
/** Single access point for data. Swap the implementation here to add Firebase sync later. */
export function getRepos(): Repos {
  if (!repos) repos = createDexieRepos(getDB());
  return repos;
}
export type { Repos } from './repos/interfaces';
