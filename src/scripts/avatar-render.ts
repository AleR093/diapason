import { escapeAttr, escapeHtml } from './product-render';

/** Up to 2 letters from a name, falling back to the email's local part. */
export function initials(name?: string | null, email?: string | null): string {
  const source = (name && name.trim()) || (email ? email.split('@')[0] : '') || '?';
  const parts = source.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : source.slice(0, 2);
  return letters.toUpperCase();
}

export interface AvatarOptions {
  avatarUrl?: string | null;
  name?: string | null;
  email?: string | null;
  size?: number;
}

/** Circular photo if one exists, otherwise a brass initials badge — same markup everywhere an avatar shows up. */
export function avatarHTML(opts: AvatarOptions): string {
  const size = opts.size ?? 32;
  if (opts.avatarUrl) {
    return `<img src="${escapeAttr(opts.avatarUrl)}" alt="" width="${size}" height="${size}" class="rounded-full object-cover" style="width:${size}px;height:${size}px" />`;
  }
  const letters = initials(opts.name, opts.email);
  const fontSize = Math.round(size * 0.4);
  return `<span class="flex items-center justify-center rounded-full bg-brass font-medium text-paper" style="width:${size}px;height:${size}px;font-size:${fontSize}px" aria-hidden="true">${escapeHtml(letters)}</span>`;
}
