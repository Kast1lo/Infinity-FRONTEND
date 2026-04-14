export interface ZipEntry {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  depth: number;
  expanded?: boolean;
  children?: ZipEntry[];
}