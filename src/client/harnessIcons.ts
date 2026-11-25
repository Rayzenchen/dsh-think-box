import type { ComponentType } from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'

type IconProps = { className?: string | undefined; size?: number | undefined }
type IconExports = Record<string, ComponentType<IconProps> | undefined>

// Harness renamed size-suffixed icon exports to weight-suffixed names. Resolve
// at runtime so this plugin bundle works with both the older published
// primitive package used for development and current Harness module tables.
const icons = primitives as unknown as IconExports

function lookup(name: string): ComponentType<IconProps> | undefined {
  try {
    // ESM module namespaces throw on a missing named export instead of
    // returning undefined; a mock or a future primitive table may do the same.
    return icons[name]
  } catch {
    return undefined
  }
}

function resolveIcon(currentName: string, legacyName: string): ComponentType<IconProps> {
  const icon = lookup(currentName) ?? lookup(legacyName)
  if (icon === undefined) {
    throw new Error(`dsh-think-box: Harness icon export is missing (${currentName}, ${legacyName})`)
  }
  return icon
}

export const IconChevronDown = resolveIcon('IconChevronDownOutlineRegular', 'IconChevronDownOutline14')
export const IconChevronRight = resolveIcon('IconChevronRightOutlineRegular', 'IconChevronRightOutline14')
export const IconCheck = resolveIcon('IconCheckOutlineRegular', 'IconCheckOutline14')
export const IconThink = resolveIcon('IconThinkOutlineRegular', 'IconThinkOutline14')
