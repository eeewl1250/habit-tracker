function isIconName(s: string): boolean {
  return /^[a-z_][a-z0-9_]*$/.test(s)
}

export function CatIcon({ name, className = '' }: { name: string; className?: string }) {
  if (isIconName(name)) {
    return <span className={`material-symbols-outlined ${className}`}>{name}</span>
  }
  return <span className={className}>{name}</span>
}
