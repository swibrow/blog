const GITHUB_USER = "swibrow";

export interface GitHubStats {
  contributions: number | null;
  followers: number;
  publicRepos: number;
  totalStars: number;
  latestPush: { repo: string; date: string } | null;
}

interface RestUser {
  followers: number;
  public_repos: number;
}

interface RestRepo {
  name: string;
  fork: boolean;
  stargazers_count: number;
  pushed_at: string;
}

/**
 * Build-time GitHub stats. Uses GITHUB_TOKEN when available (CI); without a
 * token the REST calls still work unauthenticated but contributions (GraphQL)
 * are skipped. Returns null when GitHub is unreachable so the home page can
 * hide the section instead of failing the build.
 */
export async function fetchGitHubStats(): Promise<GitHubStats | null> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "wibrow.dev-build",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${GITHUB_USER}`, { headers }),
      fetch(
        `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=pushed`,
        { headers },
      ),
    ]);
    if (!userRes.ok || !reposRes.ok) return null;

    const user = (await userRes.json()) as RestUser;
    const repos = (await reposRes.json()) as RestRepo[];

    const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);
    const pushed = repos.filter((r) => !r.fork);
    const latestPush = pushed.length
      ? { repo: pushed[0].name, date: pushed[0].pushed_at }
      : null;

    return {
      contributions: token ? await fetchContributions(token) : null,
      followers: user.followers,
      publicRepos: user.public_repos,
      totalStars,
      latestPush,
    };
  } catch {
    return null;
  }
}

async function fetchContributions(token: string): Promise<number | null> {
  try {
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "wibrow.dev-build",
      },
      body: JSON.stringify({
        query: `query($login: String!) {
          user(login: $login) {
            contributionsCollection {
              contributionCalendar { totalContributions }
            }
          }
        }`,
        variables: { login: GITHUB_USER },
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: {
        user?: {
          contributionsCollection?: {
            contributionCalendar?: { totalContributions?: number };
          };
        };
      };
    };
    return (
      json.data?.user?.contributionsCollection?.contributionCalendar
        ?.totalContributions ?? null
    );
  } catch {
    return null;
  }
}
