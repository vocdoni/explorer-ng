import { Grid, type GridProps } from '@chakra-ui/react'

/**
 * The public-list grid from vocdoni-app: auto-filled 350px columns with a
 * deliberately large row gap so cards breathe.
 */
export const CardGrid = (props: GridProps) => (
  <Grid
    templateColumns='repeat(auto-fill, minmax(350px, 1fr))'
    columnGap={{ base: 3, lg: 4 }}
    rowGap={12}
    {...props}
  />
)
