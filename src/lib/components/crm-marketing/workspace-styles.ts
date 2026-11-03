/** Shared presentation for the units/campaign workspace, scoped to these screens. */
export const workspaceSx = {
  maxWidth: 1200, minWidth: 0, pb: 4,
  '& .MuiTabs-root': { borderBottom: 1, borderColor: 'divider', minHeight: 48 },
  '& .MuiTab-root': { minHeight: 48, textTransform: 'none', fontWeight: 600 },
  '& .MuiButton-root': { minHeight: 40, textTransform: 'none', borderRadius: 2 },
  '& .MuiPaper-outlined': { borderRadius: 3 },
  '& .MuiAlert-root': { borderRadius: 2 },
};
export const interactiveCardSx = {
  p: { xs: 2, sm: 2.5 }, minWidth: 0,
  transition: 'border-color 150ms ease, background-color 150ms ease',
  '&:hover': { borderColor: 'text.secondary', bgcolor: 'action.hover' },
  '&:focus-within': { borderColor: 'primary.main', outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
  '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
};
export const formActionsSx = {
  pt: 2, mt: 1, borderTop: 1, borderColor: 'divider',
  flexDirection: { xs: 'column-reverse', sm: 'row' },
  '& .MuiButton-root': { minHeight: 44, width: { xs: '100%', sm: 'auto' } },
};
