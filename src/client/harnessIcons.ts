import type { ComponentType } from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'

type IconProps = { className?: string | undefined; size?: number | undefined }
type IconExports = Record<string, ComponentType<IconProps> | undefined>

// Harness renamed size-suffixed icon exports to weight-suffixed names. Resolve
// at runtime so this plugin bundle works with both the older published
// primitive package used for development and current Harness module tables.
const icons = primitives as unknown as IconExports

function resolveIcon(currentName: string, legacyName: string): ComponentType<IconProps> {
  const icon = icons[currentName] ?? icons[legacyName]
  if (icon === undefined) {
    throw new Error(`dsh-think-box: Harness icon export is missing (${currentName}, ${legacyName})`)
  }
  return icon
}

export const IconChevronDown = resolveIcon('IconChevronDownOutlineRegular', 'IconChevronDownOutline14')
export const IconThink = resolveIcon('IconThinkOutlineRegular', 'IconThinkOutline14')
