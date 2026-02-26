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

/* ---------- Build commands ---------- */

function buildCommands(data: ResumeData | null): Record<string, CommandDef> {
  const cmds: Record<string, CommandDef> = {
    help: {
      response: `Available commands:
\u2022 <span class="command">about</span> - Learn about Samuel
\u2022 <span class="command">experience</span> - Work experience
\u2022 <span class="command">skills</span> - Technical skills
\u2022 <span class="command">education</span> - Education & certifications
\u2022 <span class="command">contact</span> - Get in touch
\u2022 <span class="command">company [name]</span> - Details about specific company
\u2022 <span class="command">games</span> - List playable games
\u2022 <span class="command">clear</span> - Clear terminal
\u2022 <span class="command">help</span> - Show this message

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

<strong>Cloud & Infrastructure:</strong> AWS, Terraform, Kubernetes, Docker
<strong>Languages:</strong> Python, Bash, Go
<strong>CI/CD & GitOps:</strong> GitHub Actions, ArgoCD, GitLab CI
<strong>Observability:</strong> Datadog, Prometheus, EFK Stack`,
    };
    cmds.experience = {
      response: `<strong>Current Role:</strong>
Site Reliability Engineer at Tamedia (2023-Present)

Previous experience includes Platform Engineering at Dock Financial
and Cloud Engineering at Stylight. 13+ years in IT infrastructure.`,
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
    python: () =>
      "Python is one of my primary languages. I've developed internal libraries for CloudFormation generation, automation tools, and infrastructure management scripts.",
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
  "games",
  "snake",
  "wordle",
  "2048",
  "ttt",
  "pong",
];

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

const PROMPT = "samuel@wibrow.net:~$";

const WELCOME_ART = `<pre style="margin:0;font-family:inherit;font-size:12px;line-height:1.3"><span style="color:var(--ctp-green)">        /\\      /\\
       /  \\    /  \\      /\\        </span><span style="color:var(--ctp-text)">Samuel Wibrow</span><span style="color:var(--ctp-green)">
      /    \\  /    \\    /  \\       </span><span style="color:var(--ctp-subtext0)">SRE / Platform Engineer</span><span style="color:var(--ctp-green)">
     /      \\/      \\  /    \\
    /        \\       \\/      \\     </span><span style="color:var(--ctp-peach)">  o _ o</span><span style="color:var(--ctp-green)">
___/          \\___    \\       \\    </span><span style="color:var(--ctp-peach)">  |/</span><span style="color:var(--ctp-blue)">(_)</span><span style="color:var(--ctp-peach)">\\|</span><span style="color:var(--ctp-green)">
                  \\____\\_______\\___</span><span style="color:var(--ctp-peach)">/<span style="color:var(--ctp-blue)">o   o</span>\\</span></pre>
<span style="color:var(--ctp-subtext1)">Type <span class="command">help</span> for commands or <span class="command">games</span> to play.</span>`;

const Terminal = () => {
  const [output, setOutput] = useState<OutputLine[]>([
    { id: 0, type: "response", content: WELCOME_ART },
  ]);
  const [inputValue, setInputValue] = useState<string>("");
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [visible, setVisible] = useState<boolean>(true);
  const [bodyVisible, setBodyVisible] = useState<boolean>(true);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [activeGame, setActiveGame] = useState<GameType | null>(null);

  // Drag state
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
  const lineIdRef = useRef<number>(0);
  const terminalRef = useRef<HTMLDivElement>(null);

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
          content: `<span class="terminal-prompt">${PROMPT}</span> <span class="terminal-text">${command}</span>`,
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
    []
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

      // clear
      if (trimmedInput === "clear") {
        setOutput([]);
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
    [resumeData, addLine]
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
      const current = inputValue.trim().toLowerCase();
      if (!current) return;

      const matches = KNOWN_COMMANDS.filter((cmd) => cmd.startsWith(current));
      if (matches.length === 1) {
        setInputValue(matches[0]);
      } else if (matches.length > 1) {
        // Find common prefix
        let prefix = matches[0];
        for (let i = 1; i < matches.length; i++) {
          while (!matches[i].startsWith(prefix)) {
            prefix = prefix.slice(0, -1);
          }
        }
        if (prefix.length > current.length) {
          setInputValue(prefix);
        }
      }
    }
  };

  const handleGameExit = useCallback(() => {
    setActiveGame(null);
    // Refocus input on next tick
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  if (!visible) return null;

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
                  <span className="terminal-prompt">{PROMPT}</span>
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
};

export default Terminal;
