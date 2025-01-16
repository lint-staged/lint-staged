import { Configuration } from '../../lib/types'

export const fullConfig: Configuration = {
  '*.ext1': 'eslint',

  '*.ext2': ['eslint', 'prettier'],

  '*.ext3': (fileNames: string[]) => {
    return `eslint ${fileNames.join(' ')}`
  },

  '*.ext4': (fileNames: string[]) => {
    return [`eslint ${fileNames.join(' ')}`, `prettier --write ${fileNames.join(' ')}`]
  },

  '*.ext5': async (fileNames: string[]) => {
    return `eslint ${fileNames.join(' ')}`
  },

  '*.ext6': async (fileNames: string[]) => {
    return [`eslint ${fileNames.join(' ')}`, `prettier --write ${fileNames.join(' ')}`]
  },
} satisfies Configuration

export const functionConfig1: Configuration = ((fileNames: string[]) => {
  return `eslint ${fileNames.join(' ')}`
}) satisfies Configuration

export const functionConfig2: Configuration = ((fileNames: string[]) => {
  return [`eslint ${fileNames.join(' ')}`, `prettier --write ${fileNames.join(' ')}`]
}) satisfies Configuration

export const functionConfig3: Configuration = (async (fileNames: string[]) => {
  return [`eslint ${fileNames.join(' ')}`, `prettier --write ${fileNames.join(' ')}`]
}) satisfies Configuration

export const functionConfig4: Configuration = (async (fileNames: string[]) => {
  return [`eslint ${fileNames.join(' ')}`, `prettier --write ${fileNames.join(' ')}`]
}) satisfies Configuration
