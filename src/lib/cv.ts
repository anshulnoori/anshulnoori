import { existsSync } from "node:fs";

// `pnpm cv` writes this only once the CV has no placeholder dates left.
export const cv = existsSync("public/cv.pdf") ? { href: "/cv.pdf", file: "Anshul_Noori_CV.pdf" } : undefined;
