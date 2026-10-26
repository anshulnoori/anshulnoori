export const person = {
  name: "Anshul Noori",
  email: "anoori2@exeter.edu",
  github: "anshulnoori",
  site: "anshulnoori.com",
};

export type Contribution = {
  code: string;
  repo: string;
  owner: string;
  what: string;
  lang: string;
  pr?: number;
  status: "MERGED" | "UPCOMING";
  date: string;
  notes: string[];
};

export const openSource: Contribution[] = [
  {
    code: "BK2",
    repo: "buck2",
    owner: "facebook",
    what: "Meta's build system",
    lang: "Rust",
    pr: 1418,
    status: "MERGED",
    date: "2026.07",
    notes: [
      "Let Go projects save build results to a shared cache so later builds can reuse them; in testing, 501 of 526 build steps were reused instead of rerun.",
    ],
  },
  {
    code: "SPV",
    repo: "SPIRV-Cross",
    owner: "KhronosGroup",
    what: "Khronos Group's shader translator",
    lang: "C++",
    pr: 2666,
    status: "MERGED",
    date: "2026.08",
    notes: [
      "Added support for a 3D graphics setting that Apple's Metal lacks, so programs written for Vulkan render depth correctly on Apple devices; passed all 319 existing tests.",
    ],
  },
  {
    code: "MVK",
    repo: "MoltenVK",
    owner: "KhronosGroup",
    what: "Vulkan for Apple devices",
    lang: "Obj-C++",
    pr: 2712,
    status: "MERGED",
    date: "2026.04",
    notes: [
      "Added a Vulkan graphics feature that controls depth clipping, so games and apps that need it can run on Macs and iPhones.",
    ],
  },
  {
    code: "NAS",
    repo: "nixos-apple-silicon",
    owner: "nix-community",
    what: "NixOS on Apple Silicon",
    lang: "Nix",
    pr: 429,
    status: "MERGED",
    date: "2026.03",
    notes: ["Added support for the Limine boot loader to the project that runs NixOS Linux on Apple Silicon Macs."],
  },
  {
    code: "BK2",
    repo: "buck2",
    owner: "facebook",
    what: "Meta's build system",
    lang: "Rust",
    status: "UPCOMING",
    date: "2026.07",
    notes: [
      "Building a feature (3,000+ lines) that sends live build and test results to the dashboards Bazel users already use, showing which parts of a build failed.",
    ],
  },
  {
    code: "NK3",
    repo: "niks3",
    owner: "Mic92",
    what: "Nix build cache server",
    lang: "Go",
    status: "UPCOMING",
    date: "2026.10",
    notes: [
      "Changes, first built for Topit's cache, that let several caches share one storage bucket and let niks3 run on Cloudflare's servers.",
    ],
  },
];

export type Project = {
  id: string;
  name: string;
  what: string;
  stack: string;
  kind: "SW" | "HW" | "GPU" | "AI" | "OPS";
  dates?: string;
  href?: string;
  impact?: string;
  notes: string[];
};

const gh = (repo: string) => `https://github.com/anshulnoori/${repo}`;

export const projects: Project[] = [
  {
    id: "silt",
    name: "Silt",
    what: "3D game engine",
    stack: "Zig, Vulkan",
    kind: "GPU",
    dates: "2026.04 → now",
    href: gh("silt"),
    impact: "Macs lacked a graphics feature the engine needed, so I added it to MoltenVK upstream.",
    notes: [
      "A game engine built from scratch for Windows, macOS, and Linux. When Macs lacked a graphics feature it needed, I added that feature to MoltenVK.",
      "Draws only as much detail as the screen can show, similar to Unreal Engine's Nanite, so large worlds stay fast.",
      "Loads parts of the world in the background by predicting where the player is heading.",
    ],
  },
  {
    id: "trading",
    name: "Trading",
    what: "automated trading system",
    stack: "Rust, Python, SQL",
    kind: "SW",
    href: gh("trading"),
    impact: "No real money moves without statistical checks and human approval.",
    notes: [
      "Researches, tests, and runs stock and options trading strategies, with statistical checks against lucky results and human approval required before any real money is used.",
    ],
  },
  {
    id: "twentytwenty",
    name: "20/20 Vision",
    what: "Minecraft mod",
    stack: "Rust, Kotlin, Vulkan",
    kind: "GPU",
    dates: "2026.04 → now",
    href: gh("twentytwentyvision"),
    impact: "Players see much farther: distant terrain is drawn at lower detail on the GPU.",
    notes: [
      "Lets players see much farther by drawing distant terrain at lower detail and moving the drawing work to the graphics card.",
    ],
  },
  {
    id: "gum",
    name: "Gum",
    what: "robotics framework",
    stack: "Kotlin",
    kind: "SW",
    href: gh("gum"),
    impact: "Published for other FTC teams; robot code can be updated between matches.",
    notes: [
      "Replaced my FTC team's standard tools with an open-source framework, published for other teams, that makes robot code simpler to write and lets teams update code on the robot between matches.",
    ],
  },
  {
    id: "whoof",
    name: "Whoof",
    what: "Whoop for guide dogs",
    stack: "Python, PyTorch, hardware",
    kind: "AI",
    impact: "Helps guide-dog nonprofits spend limited resources on puppies likely to graduate.",
    notes: [
      "An AI model that predicts which guide-dog puppies will finish training, so nonprofits can focus limited resources on likely graduates.",
      "A prototype sensor collar that tracks a puppy's movement, heart rate, breathing, and sounds, to combine with video.",
    ],
  },
  {
    id: "alzheimers",
    name: "Alzheimer's Research Agent",
    what: "open AI research assistant",
    stack: "TypeScript, Python",
    kind: "AI",
    dates: "2026.10 → now",
    impact: "Judged on results that matter for drug development.",
    notes: [
      "Reads Alzheimer's studies and datasets, links findings across papers, and is judged on results that matter for drug development.",
    ],
  },
  {
    id: "hermes",
    name: "Hermes",
    what: "medication safety app",
    stack: "Python, TypeScript, React",
    kind: "SW",
    dates: "2026.01",
    href: gh("hermes-medicine-tracker"),
    impact: "Honorable mention, built solo in 24 hours against teams.",
    notes: [
      "Built solo in 24 hours at the Cline × Cerebras.AI hackathon (honorable mention against teams). Warns users about dangerous drug combinations using FDA data on reported side effects.",
    ],
  },
];

export const smallProjects: Project[] = [
  {
    id: "pathways",
    name: "Pathways",
    what: "offline schedule app for Exeter students on iOS, Android, and desktop",
    stack: "Kotlin",
    kind: "SW",
    dates: "2024.02",
    notes: [],
  },
  {
    id: "pathfinding",
    name: "Game AI Pathfinding",
    what: "fast route-finding for game characters",
    stack: "Rust, C++",
    kind: "SW",
    dates: "2025.12",
    notes: [],
  },
  {
    id: "14kb",
    name: "14 kB Websites",
    what: "pages small enough to load in one network round trip",
    stack: "TypeScript, Astro",
    kind: "SW",
    notes: [],
  },
  {
    id: "ani-tui",
    name: "ani-tui",
    what: "terminal app for browsing and tracking anime on AniList",
    stack: "Python",
    kind: "SW",
    dates: "2026.06 → 2026.07",
    href: gh("ani-tui"),
    notes: [],
  },
  {
    id: "nixconf",
    name: "NixOS Setup",
    what: "my computers and a game server, rebuilt from config files",
    stack: "Nix",
    kind: "OPS",
    dates: "2026.02 → now",
    href: gh("nixconf"),
    notes: [],
  },
  {
    id: "y86",
    name: "Y86 Assembler",
    what: "turns Y86 assembly language into machine code",
    stack: "C#",
    kind: "SW",
    dates: "2023.09",
    href: gh("OCS35-Y86-Assembler"),
    notes: [],
  },
];

export const keyboards = {
  io80: {
    name: "IO80",
    what: "mechanical keyboard",
    stack: "Circuit design, KiCad, Python",
    dates: "2026.10",
    impact: "Every key works and none interfere in 5,000 random key combinations, checked before manufacturing.",
    notes: [
      "An 88-key keyboard circuit board with per-key lighting, a volume knob, and a built-in fingerprint reader, reporting key presses 8,000 times per second.",
      "Generated the board with Python scripts and checked it with circuit and signal simulations before manufacturing: every key works and none interfere in 5,000 random key combinations.",
    ],
  },
  prometheus: {
    name: "Prometheus",
    what: "custom keyboard",
    stack: "Circuit design, KiCad",
    dates: "2025.12 → now",
    href: gh("prometheus-65"),
    impact: "Taught myself electrical engineering to build it; users set how far each key must be pressed.",
    notes: [
      "A keyboard and its circuit board designed from scratch, teaching myself electrical engineering along the way.",
      "Combines mechanical switches with magnetic sensors that let users set how far each key must be pressed. Grew from a 60% to a 75% layout over several versions.",
    ],
  },
};

export const topit = {
  company: "Topit AI",
  role: "Chief Technology Officer",
  notes: [
    "Lead technology at an AI startup that helps people choose their best photos, overseeing system design, security, privacy, and image analysis.",
    "Moved the company's code from GitHub to a self-hosted GitLab on AWS, with Google sign-in and automatic backups, and defined all cloud infrastructure as code.",
    "Moved builds onto remote cloud machines with a shared cache, so a full build of the codebase takes 9 seconds when cached and 52 seconds from scratch.",
    "Audited cloud spending and cut waste: each automated deploy now downloads about 16 KB instead of 230 MB of code, and tests skip parts of the code that did not change.",
  ],
};

export const skills: { group: string; items: string[] }[] = [
  {
    group: "Languages",
    items: [
      "C",
      "C++",
      "Zig",
      "Rust",
      "Go",
      "Python",
      "Nix",
      "OCaml",
      "Kotlin",
      "TypeScript",
      "JavaScript",
      "Java",
      "C#",
      "Swift",
      "Objective-C",
      "Lua",
      "PHP",
      "SQL",
      "Assembly",
      "Starlark",
      "Bash",
      "Zsh",
      "PowerShell",
    ],
  },
  { group: "GPU & Graphics", items: ["Vulkan", "Metal", "CUDA", "Slang", "SPIR-V", "GLSL"] },
  {
    group: "Frameworks & Libraries",
    items: [
      "React",
      "Astro",
      "Node.js",
      "Bun",
      "Turborepo",
      "FastAPI",
      "Kotlin Multiplatform",
      "Kotlin Coroutines",
      "Tokio",
      "gRPC",
      "Protocol Buffers",
      "Textual",
    ],
  },
  {
    group: "Cloud & Infrastructure",
    items: [
      "Cloudflare",
      "AWS",
      "GCP",
      "Azure",
      "Stripe",
      "E2B",
      "Kubernetes",
      "Docker",
      "OpenTofu",
      "GitLab",
      "GitHub Actions",
      "Buildkite",
      "Buck2",
      "Gradle",
      "Linux",
      "Git",
    ],
  },
  { group: "Hardware", items: ["KiCad", "STM32", "QMK", "PCB design"] },
];

export const education = {
  exeter: {
    name: "Phillips Exeter Academy",
    place: "Exeter, NH",
    when: "Expected June 2027",
    lines: [
      ["CSC590", "Game Playing AI", "A"],
      ["CSC590", "Game Development", "A"],
      ["MAT420-510", "Calculus", ""],
      ["CHE411-431", "Accelerated Chemistry", ""],
      ["PHY400", "Modern Physics", ""],
      ["REL460", "Ethics of the Marketplace", "A"],
    ] as [string, string, string][],
    senior: [
      "INT455 Principles of Engineering and Design",
      "MAT520 Calculus",
      "PHY470 Introductory Astronomy",
      "HIS410 U.S. History",
      "Computer Architecture",
      "Mathematical Modeling",
      "Graphics Programming",
    ],
    ap: [
      ["Calculus AB", "5"],
      ["Computer Science A", "5"],
      ["Physics 1", "5"],
    ] as [string, string][],
  },
  stanford: {
    name: "Stanford Online High School",
    place: "Online",
    when: "Grades 6-8",
    lines: [
      ["OCS15", "AP Computer Science A", "A"],
      ["OCS25", "Data Structures & Algorithms in Java", "A"],
      ["OCS35", "Computer Systems", "A-/A"],
    ] as [string, string, string][],
    note: "Data Structures and Computer Systems are taught at a post-AP, early-college level.",
  },
};

export const service = [
  {
    name: "Gentle Generations",
    role: "Co-Founder",
    notes: [
      "Co-founded a nonprofit that connects young people with senior citizens through service.",
      "Volunteers across the country and abroad design service projects around their own skills, including a month-long bake sale that raised over $1,000 for the Alzheimer's Association.",
    ],
  },
  {
    name: "FTC Team APEX 24513",
    role: "Lead Programmer",
    href: "https://github.com/FTC-APEX-24513/apex-2025",
    notes: [
      "Wrote the robot's software in Kotlin and Java for the 2025-26 season, covering driving, ball intake, sorting, and shooting.",
      "Autonomous routines that follow planned paths and use a camera to find targets, with battery-voltage compensation so the robot behaves the same as its battery drains.",
    ],
  },
  {
    name: "Guide Dog Puppy Raiser",
    role: "501(c)(3) guide dog nonprofit",
    notes: ["Raising and training Remington to become a guide dog for a person who is blind or has low vision."],
  },
  { name: "Alzheimer's Association", role: "Youth Board Chair", notes: [] },
  { name: "Nurturing Neurons", role: "Co-Founder", notes: [] },
  { name: "Fit4Grit", role: "CTO", notes: [] },
  { name: "Birthday Dreams", role: "Business Intern", notes: [] },
];

export const awards = [
  ["Computer Science Upper Classmen Award", "Phillips Exeter"],
  ["1517 Medici Project Grant", "1517 Fund"],
  ["Honorable Mention", "Cline × Cerebras.AI Hackathon"],
  ["College Board National Recognition Program", ""],
  ["National Merit Scholarship Program Qualifier", ""],
  ["First-Year English Award", "Phillips Exeter"],
];
