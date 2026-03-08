import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";

const Snake = lazy(() => import("./games/Snake"));
const Wordle = lazy(() => import("./games/Wordle"));
const Game2048 = lazy(() => import("./games/Game2048"));
const TicTacToe = lazy(() => import("./games/TicTacToe"));
const Pong = lazy(() => import("./games/Pong"));

/* ---------- Types ---------- */

interface ResumeBasics {
  name: string;
  label: string;
  summary: string;
  location: { city: string; countryCode: string };
  profiles: { network: string; username: string; url: string }[];
}

interface ResumeWork {
  company: string;
  location?: string;
  position: string;
  startDate: string;
  endDate?: string;
  summary?: string;
  highlights?: string[];
}

interface ResumeSkill {
  name: string;
  keywords: string[];
}

interface ResumeEducation {
  studyType: string;
  area: string;
  institution: string;
  startDate: string;
  endDate: string;
}

interface ResumeCertificate {
  name: string;
  date: string;
  url: string;
}

interface ResumeData {
  basics: ResumeBasics;
  work: ResumeWork[];
  skills: ResumeSkill[];
  education: ResumeEducation[];
  certificates: ResumeCertificate[];
}

interface OutputLine {
  id: number;
  type: "command" | "response";
  content: string;
}

interface CommandDef {
  response?: string;
  action?: () => string | false;
}

type GameType = "snake" | "wordle" | "2048" | "ttt" | "pong";

/* ---------- Formatting helpers ---------- */

function formatExperience(data: ResumeData): string {
  let response = "<strong>Work Experience:</strong>\n\n";
  const recentJobs = data.work.slice(0, 4);

  recentJobs.forEach((job) => {
    const endDate = job.endDate || "Present";
    response += `\u2022 <strong>${job.company}</strong> - ${job.position}\n`;
    response += `  ${job.startDate} to ${endDate}\n\n`;
  });

  response += "Type 'company [name]' for details about a specific role.";
  return response;
}

function formatJob(job: ResumeWork): string {
  const endDate = job.endDate || "Present";
  let response = `<strong>${job.company}</strong>\n`;
  response += `${job.position}\n`;
  response += `${job.startDate} to ${endDate}\n`;
  if (job.location) response += `\uD83D\uDCCD ${job.location}\n`;
  response += "\n";

  if (job.summary) {
    response += `${job.summary}\n\n`;
  }

  if (job.highlights && job.highlights.length > 0) {
    response += "<strong>Key Achievements:</strong>\n";
    job.highlights.forEach((highlight) => {
      response += `\u2022 ${highlight}\n`;
    });
  }

  return response;
}

function formatSkills(data: ResumeData): string {
  let response = "<strong>Technical Skills:</strong>\n\n";

  data.skills.forEach((skillGroup) => {
    response += `<strong>${skillGroup.name}:</strong>\n`;
    response += `\u2022 ${skillGroup.keywords.join(", ")}\n\n`;
  });

  return response;
}

function formatEducation(data: ResumeData): string {
  let response = "<strong>Education:</strong>\n";

  data.education.forEach((edu) => {
    response += `\u2022 ${edu.studyType} - ${edu.area}\n`;
    response += `  ${edu.institution} (${edu.startDate}-${edu.endDate})\n\n`;
  });

  response += "<strong>Certifications:</strong>\n";
  data.certificates.forEach((cert) => {
    response += `\u2022 <a href="${cert.url}" target="_blank">${cert.name}</a> (${cert.date})\n`;
  });

  return response;
}

function formatContact(data: ResumeData): string {
  let response = "<strong>Get in touch:</strong>\n\n";

  data.basics.profiles.forEach((profile) => {
    response += `\u2022 ${profile.network}: <a href="${profile.url}" target="_blank">@${profile.username}</a>\n`;
  });

  response += '\u2022 Resume: <a href="/resume.html" target="_blank">View full resume</a>';
  return response;
}

/* ---------- Search ---------- */

interface SearchMatch {
  type: "experience" | "skill";
  company?: string;
  position?: string;
  category?: string;
  text: string;
}

function searchResume(data: ResumeData, query: string): string | null {
  const terms = query.split(" ");
  const matches: SearchMatch[] = [];

  data.work.forEach((job) => {
    if (job.highlights) {
      job.highlights.forEach((highlight) => {
        if (terms.some((term) => highlight.toLowerCase().includes(term))) {
          matches.push({
            type: "experience",
            company: job.company,
            position: job.position,
            text: highlight,
          });
        }
      });
    }
  });

  data.skills.forEach((skillGroup) => {
    skillGroup.keywords.forEach((keyword) => {
      if (terms.some((term) => keyword.toLowerCase().includes(term))) {
        matches.push({
          type: "skill",
          category: skillGroup.name,
          text: keyword,
        });
      }
    });
  });

  if (matches.length === 0) return null;

  let response = `Found ${matches.length} match${matches.length > 1 ? "es" : ""} for "${query}":\n\n`;

  const skillMatches = matches.filter((m) => m.type === "skill");
  const experienceMatches = matches.filter((m) => m.type === "experience");

  if (skillMatches.length > 0) {
    response += "<strong>Skills:</strong>\n";
    const uniqueSkills = [...new Set(skillMatches.map((m) => m.text))];
    uniqueSkills.forEach((skill) => {
      response += `\u2022 ${skill}\n`;
    });
    response += "\n";
  }

  if (experienceMatches.length > 0) {
    response += "<strong>Related Experience:</strong>\n";
    experienceMatches.slice(0, 3).forEach((match) => {
      response += `\u2022 ${match.text}\n  (${match.company} - ${match.position})\n\n`;
    });
  }

  return response;
}

/* ---------- Virtual filesystem ---------- */

function buildFilesystem(data: ResumeData | null): Record<string, string | Record<string, string>> {
  if (!data) return {};

  const fs: Record<string, string | Record<string, string>> = {};

  // /basics
  fs["basics"] = {
    "name.txt": data.basics.name,
    "label.txt": data.basics.label,
    "summary.txt": data.basics.summary,
    "location.txt": `${data.basics.location.city}, ${data.basics.location.countryCode}`,
  };

  // /work/<company>
  const workDir: Record<string, string> = {};
  data.work.forEach((job) => {
    const key = job.company.toLowerCase().replace(/\s+/g, "-");
    const endDate = job.endDate || "Present";
    let content = `${job.position}\n${job.startDate} to ${endDate}`;
    if (job.location) content += `\n${job.location}`;
    if (job.summary) content += `\n\n${job.summary}`;
    if (job.highlights && job.highlights.length > 0) {
      content += "\n\nHighlights:\n" + job.highlights.map((h) => `- ${h}`).join("\n");
    }
    workDir[`${key}.txt`] = content;
  });
  fs["work"] = workDir;

  // /skills/<category>
  const skillsDir: Record<string, string> = {};
  data.skills.forEach((group) => {
    const key = group.name.toLowerCase().replace(/[&\s]+/g, "-").replace(/--+/g, "-");
    skillsDir[`${key}.txt`] = group.keywords.join("\n");
  });
  fs["skills"] = skillsDir;

  // /education
  const eduDir: Record<string, string> = {};
  data.education.forEach((edu) => {
    const key = edu.institution.toLowerCase().replace(/\s+/g, "-");
    eduDir[`${key}.txt`] = `${edu.studyType} - ${edu.area}\n${edu.institution} (${edu.startDate}-${edu.endDate})`;
  });
  fs["education"] = eduDir;

  // /certificates
  const certDir: Record<string, string> = {};
  data.certificates.forEach((cert) => {
    const key = cert.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
    certDir[`${key}.txt`] = `${cert.name}\n${cert.date}\n${cert.url}`;
  });
  fs["certificates"] = certDir;

  return fs;
}

function resolvePath(cwd: string, target: string): string {
  if (target.startsWith("/") || target.startsWith("~")) {
    // Absolute path
    const parts = target.replace("~", "").split("/").filter(Boolean);
    return "/" + parts.join("/");
  }
  // Relative path
  const base = cwd === "/" ? [] : cwd.split("/").filter(Boolean);
  const parts = target.split("/");
  for (const p of parts) {
    if (p === "." || p === "") continue;
    if (p === "..") { base.pop(); }
    else { base.push(p); }
  }
  return "/" + base.join("/");
}

function getNode(fs: Record<string, string | Record<string, string>>, path: string): string | Record<string, string> | null {
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return fs as unknown as Record<string, string>;
  if (parts.length === 1) return fs[parts[0]] ?? null;
  if (parts.length === 2) {
    const dir = fs[parts[0]];
    if (typeof dir === "object" && dir !== null) return dir[parts[1]] ?? null;
    return null;
  }
  return null;
}

function shellLs(fs: Record<string, string | Record<string, string>>, cwd: string, args: string): string {
  const target = args.trim() ? resolvePath(cwd, args.trim()) : cwd;
  const node = getNode(fs, target);
  if (node === null) return `ls: cannot access '${args.trim() || target}': No such file or directory`;
  if (typeof node === "string") return target.split("/").pop() || target;
  const entries = Object.keys(node).sort();
  return entries.map((e) => {
    const isDir = typeof node[e] === "object";
    return isDir
      ? `<span style="color:var(--ctp-blue);font-weight:bold">${e}/</span>`
      : `<span style="color:var(--ctp-text)">${e}</span>`;
  }).join("\n");
}

function shellCat(fs: Record<string, string | Record<string, string>>, cwd: string, args: string): string {
  if (!args.trim()) return "cat: missing operand";
  const target = resolvePath(cwd, args.trim());
  const node = getNode(fs, target);
  if (node === null) return `cat: ${args.trim()}: No such file or directory`;
  if (typeof node === "object") return `cat: ${args.trim()}: Is a directory`;
  return node;
}

function shellTree(fs: Record<string, string | Record<string, string>>, cwd: string): string {
  const node = getNode(fs, cwd);
  if (node === null || typeof node === "string") return "Not a directory";
  const lines: string[] = [];
  const baseName = cwd === "/" ? "~" : cwd;
  lines.push(`<span style="color:var(--ctp-blue);font-weight:bold">${baseName}</span>`);

  const entries = Object.entries(node).sort(([a], [b]) => a.localeCompare(b));
  entries.forEach(([name, value], i) => {
    const isLast = i === entries.length - 1;
    const prefix = isLast ? "\u2514\u2500\u2500 " : "\u251C\u2500\u2500 ";
    if (typeof value === "object" && value !== null) {
      lines.push(`${prefix}<span style="color:var(--ctp-blue);font-weight:bold">${name}/</span>`);
      const subEntries = Object.keys(value).sort();
      subEntries.forEach((sub, j) => {
        const subIsLast = j === subEntries.length - 1;
        const subConnector = isLast ? "    " : "\u2502   ";
        const subPrefix = subIsLast ? "\u2514\u2500\u2500 " : "\u251C\u2500\u2500 ";
        lines.push(`${subConnector}${subPrefix}${sub}`);
      });
    } else {
      lines.push(`${prefix}${name}`);
    }
  });

  return lines.join("\n");
}

function shellFind(fs: Record<string, string | Record<string, string>>, args: string): string {
  const pattern = args.trim().toLowerCase();
  if (!pattern) return "find: missing search pattern\nUsage: find <pattern>";
  const results: string[] = [];

  for (const [dirName, dirContent] of Object.entries(fs)) {
    if (dirName.toLowerCase().includes(pattern)) {
      results.push(`<span style="color:var(--ctp-blue)">/${dirName}/</span>`);
    }
    if (typeof dirContent === "object" && dirContent !== null) {
      for (const fileName of Object.keys(dirContent)) {
        if (fileName.toLowerCase().includes(pattern)) {
          results.push(`/${dirName}/<span style="color:var(--ctp-green)">${fileName}</span>`);
        }
      }
    }
  }

  if (results.length === 0) return `No files matching '${pattern}'`;
  return results.join("\n");
}

function shellGrep(fs: Record<string, string | Record<string, string>>, args: string): string {
  const parts = args.trim().split(/\s+/);
  const pattern = parts[0]?.toLowerCase();
  if (!pattern) return "grep: missing pattern\nUsage: grep <pattern> [path]";

  const targetPath = parts[1] || null;
  const results: string[] = [];

  for (const [dirName, dirContent] of Object.entries(fs)) {
    if (typeof dirContent === "object" && dirContent !== null) {
      for (const [fileName, fileContent] of Object.entries(dirContent)) {
        if (targetPath) {
          const filePath = `/${dirName}/${fileName}`;
          const targetResolved = targetPath.replace("~", "");
          if (!filePath.startsWith(targetResolved) && !`/${dirName}`.startsWith(targetResolved)) continue;
        }
        const lines = fileContent.split("\n");
        const matchingLines = lines.filter((l) => l.toLowerCase().includes(pattern));
        if (matchingLines.length > 0) {
          results.push(`<span style="color:var(--ctp-mauve)">/${dirName}/${fileName}</span>:`);
          matchingLines.forEach((line) => {
            const highlighted = line.replace(
              new RegExp(`(${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"),
              '<span style="color:var(--ctp-red);font-weight:bold">$1</span>'
            );
            results.push(`  ${highlighted}`);
          });
        }
      }
    }
  }

  if (results.length === 0) return `No matches for '${pattern}'`;
  return results.join("\n");
}

function shellHead(fs: Record<string, string | Record<string, string>>, cwd: string, args: string): string {
  const parts = args.trim().split(/\s+/);
  let count = 5;
  let file = "";
  for (const p of parts) {
    if (p.startsWith("-")) { count = parseInt(p.slice(1)) || 5; }
    else { file = p; }
  }
  if (!file) return "head: missing operand";
  const target = resolvePath(cwd, file);
  const node = getNode(fs, target);
  if (node === null) return `head: ${file}: No such file or directory`;
  if (typeof node === "object") return `head: ${file}: Is a directory`;
  return node.split("\n").slice(0, count).join("\n");
}

function shellWc(fs: Record<string, string | Record<string, string>>, cwd: string, args: string): string {
  if (!args.trim()) return "wc: missing operand";
  const target = resolvePath(cwd, args.trim());
  const node = getNode(fs, target);
  if (node === null) return `wc: ${args.trim()}: No such file or directory`;
  if (typeof node === "object") return `wc: ${args.trim()}: Is a directory`;
  const lines = node.split("\n").length;
  const words = node.split(/\s+/).filter(Boolean).length;
  const chars = node.length;
  return `  ${lines}  ${words}  ${chars} ${args.trim()}`;
}

/* ---------- Build commands ---------- */

function buildCommands(data: ResumeData | null): Record<string, CommandDef> {
  const cmds: Record<string, CommandDef> = {
    help: {
      response: `<strong>Navigation:</strong>
\u2022 <span class="command">ls [path]</span> - List directory contents
\u2022 <span class="command">cd &lt;path&gt;</span> - Change directory
\u2022 <span class="command">pwd</span> - Print working directory
\u2022 <span class="command">cat &lt;file&gt;</span> - Display file contents
\u2022 <span class="command">tree</span> - Show directory tree
\u2022 <span class="command">find &lt;pattern&gt;</span> - Search for files by name
\u2022 <span class="command">grep &lt;pattern&gt; [path]</span> - Search file contents
\u2022 <span class="command">head [-n] &lt;file&gt;</span> - Show first n lines
\u2022 <span class="command">wc &lt;file&gt;</span> - Count lines, words, chars
\u2022 <span class="command">whoami</span> - Who am I?

<strong>Quick Access:</strong>
\u2022 <span class="command">about</span> - Learn about Samuel
\u2022 <span class="command">experience</span> - Work experience
\u2022 <span class="command">skills</span> - Technical skills
\u2022 <span class="command">contact</span> - Get in touch
\u2022 <span class="command">company [name]</span> - Details about specific company
\u2022 <span class="command">games</span> - List playable games
\u2022 <span class="command">clear</span> - Clear terminal

Or just type a question!`,
    },
    games: {
      response: `<strong>Terminal Games:</strong>

\u2022 <span class="command">snake</span> - Classic snake game (Arrow keys)
\u2022 <span class="command">wordle</span> - Guess the 5-letter word
\u2022 <span class="command">2048</span> - Slide and merge tiles (Arrow keys)
\u2022 <span class="command">ttt</span> - Tic-tac-toe vs AI (Click)
\u2022 <span class="command">pong</span> - Pong vs AI (W/S or Arrow keys)

Press ESC to exit any game.`,
    },
  };

  if (!data) {
    // Fallback commands when resume data is unavailable
    cmds.about = {
      response: `<strong>Samuel Wibrow</strong>
Senior Site Reliability Engineer / Platform Engineer

Experienced SRE with 13+ years designing and operating highly available, scalable infrastructure.
Currently focused on AWS, Kubernetes, and building internal developer platforms.

\uD83D\uDCCD Zurich, Switzerland`,
    };
    cmds.skills = {
      response: `<strong>Technical Skills:</strong>

<strong>Cloud & Infrastructure:</strong> AWS (10+ years), Terraform, Terragrunt, Kubernetes, Docker
<strong>AI & Automation:</strong> Claude, ChatGPT/OpenAI, Ollama, LLM Tooling
<strong>Languages:</strong> Go, Python, TypeScript, Bash, React
<strong>CI/CD & GitOps:</strong> GitHub Actions, ArgoCD, GitLab CI, Renovate
<strong>Observability:</strong> Datadog, Prometheus, LGTM Stack, EFK Stack`,
    };
    cmds.experience = {
      response: `<strong>Current Role:</strong>
Site Reliability Engineer at Tamedia (2023-Present)

Previous experience includes Platform Engineering at Dock Financial
and Cloud Engineering at Stylight. 15+ years in IT infrastructure.`,
    };
    cmds.contact = {
      response: `<strong>Get in touch:</strong>

\u2022 GitHub: <a href="https://github.com/swibrow" target="_blank">@swibrow</a>
\u2022 LinkedIn: <a href="https://www.linkedin.com/in/samuelwibrow/" target="_blank">Samuel Wibrow</a>
\u2022 Resume: <a href="/resume.html" target="_blank">View full resume</a>`,
    };
  } else {
    cmds.about = {
      response: `<strong>${data.basics.name}</strong>
${data.basics.label}

${data.basics.summary}

\uD83D\uDCCD ${data.basics.location.city}, ${data.basics.location.countryCode}`,
    };
    cmds.experience = { response: formatExperience(data) };
    cmds.skills = { response: formatSkills(data) };
    cmds.education = { response: formatEducation(data) };
    cmds.contact = { response: formatContact(data) };

    // Company-specific commands
    data.work.forEach((job) => {
      const companyKey = job.company.toLowerCase().replace(/\s+/g, "");
      cmds[companyKey] = { response: formatJob(job) };
    });
  }

  return cmds;
}

/* ---------- Question handlers ---------- */

function handleQuestion(
  data: ResumeData,
  input: string
): string | null {
  const handlers: Record<string, () => string> = {
    aws: () => {
      const awsSkillGroup = data.skills.find(
        (s) => s.name === "Cloud & Infrastructure"
      );
      const awsExperience = awsSkillGroup?.keywords.find((k) =>
        k.includes("AWS")
      );
      return `I have ${awsExperience ?? "AWS"} experience. Recent AWS projects include migrating to EKS, implementing Karpenter for cost optimization, and building secure banking infrastructure. I use Terraform extensively for AWS infrastructure as code.`;
    },
    kubernetes: () =>
      "I have extensive Kubernetes experience including migrating from KOPS to EKS, implementing GitOps with ArgoCD, developing Helm charts, and managing production workloads. Currently using Karpenter for autoscaling.",
    terraform: () =>
      "I'm a Terraform certified professional with experience building reusable modules, managing multi-environment infrastructure, and implementing GitOps workflows. Check out the /terraform directory in this blog repo for examples!",
    ai: () =>
      "I'm actively using AI/LLMs in my workflow. I built 'how' — a Go CLI that converts natural language to shell commands using Claude, OpenAI, or Ollama locally. I use Claude extensively for AI-assisted development and built my Kubernetes operator TFOut in an afternoon with it. I'm exploring how LLMs can transform infrastructure automation and developer tooling.",
    llm: () =>
      "I work with multiple LLM providers: Claude/Anthropic API, OpenAI/ChatGPT, and Ollama for local inference. My 'how' CLI tool supports all three backends. I'm a big fan of running models locally with Ollama for privacy and offline use.",
    go: () =>
      "Go is one of my primary languages. I've built a Kubernetes operator (TFOut) using Kubebuilder and a CLI tool (how) for natural language to shell commands. Both are open source on GitHub.",
    python: () =>
      "Python is one of my primary languages. I've developed internal libraries for CloudFormation generation, automation tools, and infrastructure management scripts.",
    typescript: () =>
      "I use TypeScript and React for frontend development. This portfolio site is built with React 19, Vite, React Router, and Framer Motion — all in TypeScript.",
    experience: () => {
      const years = new Date().getFullYear() - 2010;
      return `I have ${years}+ years of experience in IT, with the last ${years - 3} years focused on Site Reliability Engineering and Platform Engineering. Currently at ${data.work[0].company} as a ${data.work[0].position}.`;
    },
    current: () => formatJob(data.work[0]),
    certifications: () => formatEducation(data),
  };

  for (const [keyword, handler] of Object.entries(handlers)) {
    if (input.includes(keyword)) {
      try {
        return handler();
      } catch (e) {
        console.error("Error in question handler:", e);
      }
    }
  }

  return null;
}

/* ---------- Known commands for tab completion ---------- */

const KNOWN_COMMANDS = [
  "help",
  "about",
  "experience",
  "skills",
  "education",
  "contact",
  "company",
  "clear",
  "exit",
  "games",
  "snake",
  "wordle",
  "2048",
  "ttt",
  "pong",
  "ls",
  "cd",
  "pwd",
  "cat",
  "tree",
  "find",
  "grep",
  "head",
  "wc",
  "whoami",
];

function findCommonPrefix(items: string[]): string {
  if (items.length === 0) return "";
  let prefix = items[0];
  for (let i = 1; i < items.length; i++) {
    while (!items[i].startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
    }
  }
  return prefix;
}

function getPathCompletions(
  fs: Record<string, string | Record<string, string>>,
  cwd: string,
  partial: string
): string[] {
  // Determine the directory to list and the fragment to match
  const lastSlash = partial.lastIndexOf("/");
  let dirPath: string;
  let fragment: string;

  if (lastSlash === -1) {
    dirPath = cwd;
    fragment = partial;
  } else {
    dirPath = resolvePath(cwd, partial.substring(0, lastSlash + 1));
    fragment = partial.substring(lastSlash + 1);
  }

  const node = getNode(fs, dirPath);
  if (node === null || typeof node === "string") return [];

  const prefix = lastSlash === -1 ? "" : partial.substring(0, lastSlash + 1);
  const entries = Object.keys(node);

  return entries
    .filter((name) => name.toLowerCase().startsWith(fragment))
    .map((name) => {
      const isDir = typeof node[name] === "object";
      return prefix + name + (isDir ? "/" : "");
    });
}

const GAME_COMMANDS: Record<string, GameType> = {
  snake: "snake",
  wordle: "wordle",
  "2048": "2048",
  ttt: "ttt",
  pong: "pong",
};

function renderGame(game: GameType, onExit: () => void) {
  const gameEl = (() => {
    switch (game) {
      case "snake":
        return <Snake onExit={onExit} />;
      case "wordle":
        return <Wordle onExit={onExit} />;
      case "2048":
        return <Game2048 onExit={onExit} />;
      case "ttt":
        return <TicTacToe onExit={onExit} />;
      case "pong":
        return <Pong onExit={onExit} />;
    }
  })();
  return (
    <Suspense
      fallback={
        <div className="terminal-game" style={{ color: "var(--ctp-subtext0)" }}>
          Loading...
        </div>
      }
    >
      {gameEl}
    </Suspense>
  );
}

/* ---------- Component ---------- */

function getPrompt(cwd: string): string {
  const path = cwd === "/" ? "~" : `~${cwd}`;
  return `samuel@wibrow.net:${path}$`;
}

// Visible art widths: 17,16,25,26,27,29,29,28,35,32 -> pad to 37
//                      +20,+21,+12,+11,+10,+8,+8,+9,+2,+5
const WELCOME_ART = `<div style="display:flex;gap:2ch;font-family:inherit;font-size:11px;line-height:1.3;margin:0">
<pre style="margin:0;font-family:inherit"><span style="color:var(--ctp-blue)">          *  .  *</span>
<span style="color:var(--ctp-green)">      /\\      /\\</span>
<span style="color:var(--ctp-green)">     /  \\  </span><span style="color:var(--ctp-text)">*</span><span style="color:var(--ctp-green)"> /  \\      /\\</span>
<span style="color:var(--ctp-green)">    /    \\  /    \\    /  \\</span>
<span style="color:var(--ctp-green)">   /      \\/      \\  /    \\</span>
<span style="color:var(--ctp-green)">  /    </span><span style="color:var(--ctp-teal)">~~~</span><span style="color:var(--ctp-green)">  \\       \\/      \\</span>
<span style="color:var(--ctp-green)">_/   </span><span style="color:var(--ctp-teal)">~~~~~</span><span style="color:var(--ctp-green)">  \\___    \\       \\</span>
<span style="color:var(--ctp-peach)">  o _ o</span><span style="color:var(--ctp-green)">       \\____\\_______\\</span>
<span style="color:var(--ctp-peach)">  |/</span><span style="color:var(--ctp-blue)">(O)</span><span style="color:var(--ctp-peach)">\\|</span><span style="color:var(--ctp-yellow)">  ________________________</span>
<span style="color:var(--ctp-peach)"> /</span><span style="color:var(--ctp-blue)">o   o</span><span style="color:var(--ctp-peach)">\\</span><span style="color:var(--ctp-yellow)"> /</span>  <span style="color:var(--ctp-subtext0)">~~~  ~~~  ~~  ~~~</span>  <span style="color:var(--ctp-yellow)">\\</span></pre>
<pre style="margin:0;font-family:inherit">
<span style="color:var(--ctp-text);font-weight:bold">samuel</span><span style="color:var(--ctp-subtext0)">@</span><span style="color:var(--ctp-green);font-weight:bold">wibrow.net</span>
<span style="color:var(--ctp-surface1)">─────────────────────────</span>
<span style="color:var(--ctp-blue)">OS</span>       <span style="color:var(--ctp-text)">Zurich, CH 🇨🇭</span>
<span style="color:var(--ctp-blue)">Role</span>     <span style="color:var(--ctp-text)">Senior SRE @ Tamedia</span>
<span style="color:var(--ctp-blue)">Uptime</span>   <span style="color:var(--ctp-text)">15+ years</span>
<span style="color:var(--ctp-blue)">Stack</span>    <span style="color:var(--ctp-text)">AWS / K8s / Terraform</span>
<span style="color:var(--ctp-blue)">Lang</span>     <span style="color:var(--ctp-text)">Go / Python / TS</span>
<span style="color:var(--ctp-blue)">Shell</span>    <span style="color:var(--ctp-text)">Neovim / Zsh</span>
<span style="color:var(--ctp-blue)">Hobby</span>    <span style="color:var(--ctp-text)">Cycling / Snowboarding</span></pre>
</div>
<span style="color:var(--ctp-subtext0)">Type </span><span class="command">help</span><span style="color:var(--ctp-subtext0)"> for commands, </span><span class="command">ls</span><span style="color:var(--ctp-subtext0)"> to explore, or </span><span class="command">games</span><span style="color:var(--ctp-subtext0)"> to play.</span>`;

export interface TerminalHandle {
  submitCommand: (cmd: string) => void;
  tabComplete: (input: string) => string | null;
}

interface TerminalProps {
  embedded?: boolean;
  externalInput?: boolean;
  onClose?: () => void;
}

function loadSessionState<T>(key: string, fallback: T): T {
  try {
    const stored = sessionStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return fallback;
}

const Terminal = React.forwardRef<TerminalHandle, TerminalProps>(({ embedded, externalInput, onClose }, ref) => {
  const defaultOutput: OutputLine[] = [{ id: 0, type: "response", content: WELCOME_ART }];
  const [output, setOutput] = useState<OutputLine[]>(() => loadSessionState("terminal-output", defaultOutput));
  const [inputValue, setInputValue] = useState<string>("");
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [visible, setVisible] = useState<boolean>(true);
  const [bodyVisible, setBodyVisible] = useState<boolean>(true);
  const [commandHistory, setCommandHistory] = useState<string[]>(() => loadSessionState("terminal-history", []));
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [activeGame, setActiveGame] = useState<GameType | null>(null);
  const [cwd, setCwd] = useState<string>("/");

  // Drag state (unused in embedded mode)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; w: number; h: number } | null>(null);
  const savedRect = useRef<{ pos: { x: number; y: number } | null; size: { w: number; h: number } | null }>({
    pos: null,
    size: null,
  });

  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lineIdRef = useRef<number>(output.reduce((max, line) => Math.max(max, line.id), 0));
  const terminalRef = useRef<HTMLDivElement>(null);

  // Persist output and history to sessionStorage
  useEffect(() => {
    try { sessionStorage.setItem("terminal-output", JSON.stringify(output)); } catch { /* ignore */ }
  }, [output]);

  useEffect(() => {
    try { sessionStorage.setItem("terminal-history", JSON.stringify(commandHistory)); } catch { /* ignore */ }
  }, [commandHistory]);

  // Fetch resume data on mount
  useEffect(() => {
    fetch("/resume.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.json();
      })
      .then((data: ResumeData) => setResumeData(data))
      .catch((err) => console.error("Failed to load resume data:", err));
  }, []);

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  // Focus input when body becomes visible
  useEffect(() => {
    if (bodyVisible && !activeGame && inputRef.current) {
      inputRef.current.focus();
    }
  }, [bodyVisible, activeGame]);

  /* ---------- Drag handlers ---------- */

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      // Don't drag if clicking on control buttons
      if ((e.target as HTMLElement).closest(".terminal-controls")) return;
      if (isMaximized) return;

      const el = terminalRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const posX = position?.x ?? rect.left;
      const posY = position?.y ?? rect.top;

      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        posX,
        posY,
      };

      e.preventDefault();
    },
    [position, isMaximized]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragRef.current) {
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        setPosition({
          x: dragRef.current.posX + dx,
          y: dragRef.current.posY + dy,
        });
      }
      if (resizeRef.current) {
        const dx = e.clientX - resizeRef.current.startX;
        const dy = e.clientY - resizeRef.current.startY;
        const maxW = window.innerWidth * 0.9;
        const maxH = window.innerHeight * 0.9;
        setSize({
          w: Math.max(400, Math.min(maxW, resizeRef.current.w + dx)),
          h: Math.max(300, Math.min(maxH, resizeRef.current.h + dy)),
        });
      }
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      resizeRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  /* ---------- Resize handler ---------- */

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (isMaximized) return;
      const el = terminalRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      resizeRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        w: size?.w ?? rect.width,
        h: size?.h ?? rect.height,
      };
      e.preventDefault();
      e.stopPropagation();
    },
    [size, isMaximized]
  );

  /* ---------- Maximize toggle ---------- */

  const handleMaximize = useCallback(() => {
    if (isMaximized) {
      // Restore
      setPosition(savedRect.current.pos);
      setSize(savedRect.current.size);
      setIsMaximized(false);
    } else {
      // Save current and maximize
      savedRect.current = { pos: position, size };
      const vw = window.innerWidth * 0.9;
      const vh = window.innerHeight * 0.8;
      setPosition({
        x: (window.innerWidth - vw) / 2,
        y: (window.innerHeight - vh) / 2,
      });
      setSize({ w: vw, h: vh });
      setIsMaximized(true);
    }
    setBodyVisible(true);
  }, [isMaximized, position, size]);

  /* ---------- Terminal output helpers ---------- */

  const addLine = useCallback(
    (command: string, response?: string): void => {
      setOutput((prev) => {
        const lines: OutputLine[] = [...prev];
        lineIdRef.current += 1;
        lines.push({
          id: lineIdRef.current,
          type: "command",
          content: `<span class="terminal-prompt">${getPrompt(cwd)}</span> <span class="terminal-text">${command}</span>`,
        });
        if (response) {
          lineIdRef.current += 1;
          lines.push({
            id: lineIdRef.current,
            type: "response",
            content: response,
          });
        }
        return lines;
      });
    },
    [cwd]
  );

  const processCommand = useCallback(
    (input: string): void => {
      const trimmedInput = input.trim().toLowerCase();
      const originalInput = input.trim();

      if (trimmedInput === "") return;

      // Check for game commands
      if (trimmedInput in GAME_COMMANDS) {
        addLine(originalInput, `Starting ${trimmedInput}... Press ESC to exit.`);
        setActiveGame(GAME_COMMANDS[trimmedInput]);
        return;
      }

      const commands = buildCommands(resumeData);
      const fs = buildFilesystem(resumeData);

      // clear
      if (trimmedInput === "clear") {
        setOutput([{ id: 0, type: "response", content: WELCOME_ART }]);
        setCommandHistory([]);
        setCwd("/");
        lineIdRef.current = 0;
        return;
      }

      if (trimmedInput === "exit") {
        if (onClose) onClose();
        return;
      }

      // Shell commands
      const cmd = trimmedInput.split(/\s+/)[0];
      const args = originalInput.substring(cmd.length).trim();

      if (cmd === "pwd") {
        addLine(originalInput, `~${cwd === "/" ? "" : cwd}`);
        return;
      }

      if (cmd === "whoami") {
        addLine(originalInput, resumeData ? `${resumeData.basics.name} (${resumeData.basics.label})` : "samuel");
        return;
      }

      if (cmd === "cd") {
        if (!args || args === "~" || args === "/") {
          setCwd("/");
          addLine(originalInput);
          return;
        }
        const target = resolvePath(cwd, args.toLowerCase());
        const node = getNode(fs, target);
        if (node === null) {
          addLine(originalInput, `cd: ${args}: No such file or directory`);
        } else if (typeof node === "string") {
          addLine(originalInput, `cd: ${args}: Not a directory`);
        } else {
          setCwd(target);
          addLine(originalInput);
        }
        return;
      }

      if (cmd === "ls" && Object.keys(fs).length > 0) {
        addLine(originalInput, shellLs(fs, cwd, args.toLowerCase()));
        return;
      }

      if (cmd === "cat" && Object.keys(fs).length > 0) {
        addLine(originalInput, shellCat(fs, cwd, args.toLowerCase()));
        return;
      }

      if (cmd === "tree" && Object.keys(fs).length > 0) {
        addLine(originalInput, shellTree(fs, cwd));
        return;
      }

      if (cmd === "find" && Object.keys(fs).length > 0) {
        addLine(originalInput, shellFind(fs, args.toLowerCase()));
        return;
      }

      if (cmd === "grep" && Object.keys(fs).length > 0) {
        addLine(originalInput, shellGrep(fs, args.toLowerCase()));
        return;
      }

      if (cmd === "head" && Object.keys(fs).length > 0) {
        addLine(originalInput, shellHead(fs, cwd, args.toLowerCase()));
        return;
      }

      if (cmd === "wc" && Object.keys(fs).length > 0) {
        addLine(originalInput, shellWc(fs, cwd, args.toLowerCase()));
        return;
      }

      // company command
      if (trimmedInput.startsWith("company ")) {
        const companyName = trimmedInput.substring(8).replace(/\s+/g, "");
        if (commands[companyName]) {
          addLine(originalInput, commands[companyName].response);
          return;
        }
      }

      // Exact command match
      if (commands[trimmedInput]) {
        addLine(originalInput, commands[trimmedInput].response);
        return;
      }

      // Question handlers (only when resume data available)
      if (resumeData) {
        const questionResponse = handleQuestion(resumeData, trimmedInput);
        if (questionResponse) {
          addLine(originalInput, questionResponse);
          return;
        }

        // Search resume data
        const searchResults = searchResume(resumeData, trimmedInput);
        if (searchResults) {
          addLine(originalInput, searchResults);
          return;
        }
      }

      // Default response
      if (
        trimmedInput.includes("?") ||
        trimmedInput.split(" ").length > 2
      ) {
        addLine(
          originalInput,
          "I don't have a specific answer for that. Try commands like 'help', 'about', 'skills', or ask about specific technologies like AWS, Kubernetes, or Terraform."
        );
      } else {
        addLine(
          originalInput,
          `Command not found: ${originalInput}. Type 'help' for available commands.`
        );
      }
    },
    [resumeData, addLine, cwd]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      const value = inputValue;
      if (value.trim()) {
        setCommandHistory((prev) => [...prev, value.trim()]);
        setHistoryIndex(-1);
      }
      processCommand(value);
      setInputValue("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const newIndex =
        historyIndex === -1
          ? commandHistory.length - 1
          : Math.max(0, historyIndex - 1);
      setHistoryIndex(newIndex);
      setInputValue(commandHistory[newIndex]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex === -1) return;
      const newIndex = historyIndex + 1;
      if (newIndex >= commandHistory.length) {
        setHistoryIndex(-1);
        setInputValue("");
      } else {
        setHistoryIndex(newIndex);
        setInputValue(commandHistory[newIndex]);
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      const current = inputValue.trim();
      if (!current) return;

      const parts = current.split(/\s+/);
      const fs = buildFilesystem(resumeData);

      if (parts.length <= 1) {
        // Complete command names
        const matches = KNOWN_COMMANDS.filter((cmd) => cmd.startsWith(current.toLowerCase()));
        if (matches.length === 1) {
          setInputValue(matches[0] + " ");
        } else if (matches.length > 1) {
          const prefix = findCommonPrefix(matches);
          if (prefix.length > current.length) {
            setInputValue(prefix);
          } else {
            // Show possible completions
            addLine(current, matches.join("  "));
          }
        }
      } else {
        // Complete file/directory paths
        const cmd = parts[0];
        const partial = parts[parts.length - 1].toLowerCase();
        const completions = getPathCompletions(fs, cwd, partial);

        if (completions.length === 1) {
          const completed = completions[0];
          const newParts = [...parts.slice(0, -1), completed];
          setInputValue(newParts.join(" "));
        } else if (completions.length > 1) {
          const prefix = findCommonPrefix(completions);
          if (prefix.length > partial.length) {
            const newParts = [...parts.slice(0, -1), prefix];
            setInputValue(newParts.join(" "));
          } else {
            addLine(current, completions.join("  "));
          }
        }
      }
    }
  };

  const handleGameExit = useCallback(() => {
    setActiveGame(null);
    // Refocus input on next tick
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  // Expose submitCommand for external use (header input)
  React.useImperativeHandle(ref, () => ({
    submitCommand: (cmd: string) => {
      processCommand(cmd);
    },
    tabComplete: (input: string): string | null => {
      const current = input.trim();
      if (!current) return null;

      const parts = current.split(/\s+/);
      const fs = buildFilesystem(resumeData);

      if (parts.length <= 1) {
        const matches = KNOWN_COMMANDS.filter((cmd) => cmd.startsWith(current.toLowerCase()));
        if (matches.length === 1) return matches[0] + " ";
        if (matches.length > 1) {
          const prefix = findCommonPrefix(matches);
          if (prefix.length > current.length) return prefix;
          addLine(current, matches.join("  "));
        }
        return null;
      }

      const partial = parts[parts.length - 1].toLowerCase();
      const completions = getPathCompletions(fs, cwd, partial);

      if (completions.length === 1) {
        return [...parts.slice(0, -1), completions[0]].join(" ");
      }
      if (completions.length > 1) {
        const prefix = findCommonPrefix(completions);
        if (prefix.length > partial.length) {
          return [...parts.slice(0, -1), prefix].join(" ");
        }
        addLine(current, completions.join("  "));
      }
      return null;
    },
  }), [processCommand, resumeData, cwd, addLine]);

  if (!visible && !embedded) return null;

  /* ---------- Embedded mode (header dropdown) ---------- */

  if (embedded) {
    return (
      <div className="terminal-embedded" ref={terminalRef}>
        <div className="terminal">
          <div className="terminal-body terminal-body-embedded">
            {activeGame ? (
              renderGame(activeGame, handleGameExit)
            ) : (
              <>
                <div className="terminal-output" ref={outputRef}>
                  {output.map((line) =>
                    line.type === "command" ? (
                      <div
                        key={line.id}
                        className="terminal-line"
                        dangerouslySetInnerHTML={{ __html: line.content }}
                      />
                    ) : (
                      <div
                        key={line.id}
                        className="terminal-response"
                        dangerouslySetInnerHTML={{ __html: line.content }}
                      />
                    )
                  )}
                </div>

                {!externalInput && (
                  <div className="terminal-input-line">
                    <span className="terminal-prompt">{getPrompt(cwd)}</span>
                    <input
                      ref={inputRef}
                      className="terminal-input"
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      autoFocus
                      spellCheck={false}
                      autoComplete="off"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Floating mode (original) ---------- */

  const containerStyle: React.CSSProperties = position
    ? {
        position: "fixed",
        left: position.x,
        top: position.y,
        bottom: "auto",
        right: "auto",
        ...(size ? { width: size.w, maxWidth: "none" } : {}),
      }
    : size
      ? { width: size.w, maxWidth: "none" }
      : {};

  const bodyStyle: React.CSSProperties = size
    ? { minHeight: size.h - 40, maxHeight: size.h - 40 }
    : {};

  return (
    <div className="terminal-container" style={containerStyle} ref={terminalRef}>
      <div className="terminal">
        <div
          className="terminal-header"
          onMouseDown={handleDragStart}
        >
          <div className="terminal-controls">
            <button
              className="terminal-control close"
              onClick={() => setVisible(false)}
              aria-label="Close terminal"
            />
            <button
              className="terminal-control minimize"
              onClick={() => setBodyVisible((v) => !v)}
              aria-label="Minimize terminal"
            />
            <button
              className="terminal-control maximize"
              onClick={handleMaximize}
              aria-label="Maximize terminal"
            />
          </div>
          <span className="terminal-title">samuel@wibrow.net</span>
        </div>

        {bodyVisible && (
          <div className="terminal-body" style={bodyStyle}>
            {activeGame ? (
              renderGame(activeGame, handleGameExit)
            ) : (
              <>
                <div className="terminal-output" ref={outputRef}>
                  {output.map((line) =>
                    line.type === "command" ? (
                      <div
                        key={line.id}
                        className="terminal-line"
                        dangerouslySetInnerHTML={{ __html: line.content }}
                      />
                    ) : (
                      <div
                        key={line.id}
                        className="terminal-response"
                        dangerouslySetInnerHTML={{ __html: line.content }}
                      />
                    )
                  )}
                </div>

                <div className="terminal-input-line">
                  <span className="terminal-prompt">{getPrompt(cwd)}</span>
                  <input
                    ref={inputRef}
                    className="terminal-input"
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    spellCheck={false}
                    autoComplete="off"
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Resize handle */}
        {bodyVisible && !isMaximized && (
          <div
            className="terminal-resize-handle"
            onMouseDown={handleResizeStart}
          />
        )}
      </div>
    </div>
  );
});

Terminal.displayName = "Terminal";

export default Terminal;
