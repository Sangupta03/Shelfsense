import type { ImgHTMLAttributes } from "react";
import { useTheme } from "../lib/theme";

// The illustrations are plain .svg files, and an <img> can't read our CSS colour
// variables. So each one has a -light twin, and this picks the right file.

export type IllustrationName = "hero-shelf" | "empty-shelf" | "report" | "welcome" | "scan-label";

interface IllustrationProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  name: IllustrationName;
}

export function Illustration({ name, alt = "", ...rest }: IllustrationProps) {
  const theme = useTheme();
  const file = theme === "light" ? `${name}-light` : name;
  return <img src={`/illustrations/${file}.svg`} alt={alt} {...rest} />;
}
