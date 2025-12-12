"use client";

import { FilterAlt, FilterAltOff, Search } from "@mui/icons-material";
import {
  Autocomplete,
  Chip,
  IconButton,
  SxProps,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Theme,
  Tooltip,
} from "@mui/material";
import { useContactsContext } from "../contacts-context";
import { useWhatsappContext } from "../../../whatsapp-context";
import { CONTACTS_TABLE_COLUMNS } from "./table-config";
import { ContactsFilters } from "./contacts-reducer";

const textFieldStlye: SxProps<Theme> = {
  "& .MuiOutlinedInput-root": {
    fontSize: "0.875rem",
  },
};

type FilterKey = Exclude<keyof ContactsFilters, "page" | "perPage" | "sectorIds">;

const isKeyOfContact = (key: string): key is FilterKey => {
  const accepted: string[] = ["name", "phone", "customerName", "customerId"];
  return accepted.includes(key);
};

const textFieldClassName = "w-full bg-slate-200 dark:bg-slate-700";

export default function ContactsTableHeader() {
  const { dispatch, state, loadContacts } = useContactsContext();
  const { sectors = [] } = useWhatsappContext();

  const selectedSectorOptions = sectors.filter((sector) =>
    (state.filters.sectorIds || []).includes(sector.id),
  );

  const activeFilters = Object.keys(state.filters).filter((k) => {
    const key = k as keyof typeof state.filters;
    const isPageFilter = key === "page" || key === "perPage";
    const isSectorFilter = key === "sectorIds";
    const isFilterActive = state.filters[key] && state.filters[key] !== "none";

    if (isSectorFilter) {
      return (state.filters.sectorIds || []).length > 0;
    }

    return !isPageFilter && isFilterActive;
  });

  const activeFiltersCount = activeFilters.length;

  const onClickSearch = () => loadContacts();
  const onClearFilters = () => dispatch({ type: "clear-filters" });

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onClickSearch();
    }
  };

  const handleChangeFilter = (key: FilterKey) => {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!isKeyOfContact(key)) return;
      const value = event.target.value || null;
      if (value === null || value === "{{all}}") {
        dispatch({ type: "remove-filter", key });
      } else {
        dispatch({ type: "change-filter", key, value });
      }
    };
  };

  return (
    <TableHead>
      <TableRow
        className="bg-slate-200 dark:bg-slate-800"
        sx={{
          "& .MuiTableCell-root": {
            borderBottom: "2px solid",
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? "rgb(71 85 105)" : "rgb(226 232 240)",
            fontWeight: 600,
            fontSize: "0.875rem",
            color: (theme) => theme.palette.text.primary,
            paddingTop: "1rem",
            paddingBottom: "1rem",
          },
        }}
      >
        <TableCell
          className="px-3"
          sx={{
            width: CONTACTS_TABLE_COLUMNS.ID.width,
            minWidth: CONTACTS_TABLE_COLUMNS.ID.width,
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {CONTACTS_TABLE_COLUMNS.ID.label}
            </label>
            <TextField
              variant="outlined"
              size="small"
              placeholder={CONTACTS_TABLE_COLUMNS.ID.placeholder}
              value={state.filters.id || ""}
              onChange={handleChangeFilter("id")}
              onKeyDown={handleKeyPress}
              className={textFieldClassName}
              sx={textFieldStlye}
              disabled
            />
          </div>
        </TableCell>

        <TableCell
          className="px-3"
          sx={{
            width: CONTACTS_TABLE_COLUMNS.NAME.width,
            minWidth: CONTACTS_TABLE_COLUMNS.NAME.width,
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {CONTACTS_TABLE_COLUMNS.NAME.label}
            </label>
            <TextField
              variant="outlined"
              size="small"
              placeholder={CONTACTS_TABLE_COLUMNS.NAME.placeholder}
              value={state.filters.name || ""}
              onChange={handleChangeFilter("name")}
              onKeyDown={handleKeyPress}
              className={textFieldClassName}
              sx={textFieldStlye}
            />
          </div>
        </TableCell>
        <TableCell
          className="px-3"
          sx={{
            width: CONTACTS_TABLE_COLUMNS.PHONE.width,
            minWidth: CONTACTS_TABLE_COLUMNS.PHONE.width,
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {CONTACTS_TABLE_COLUMNS.PHONE.label}
            </label>
            <TextField
              variant="outlined"
              size="small"
              placeholder={CONTACTS_TABLE_COLUMNS.PHONE.placeholder}
              value={state.filters.phone || ""}
              onChange={handleChangeFilter("phone")}
              onKeyDown={handleKeyPress}
              className={textFieldClassName}
              sx={textFieldStlye}
            />
          </div>
        </TableCell>
        <TableCell
          className="px-3"
          sx={{
            width: CONTACTS_TABLE_COLUMNS.CUSTOMER.width,
            minWidth: CONTACTS_TABLE_COLUMNS.CUSTOMER.width,
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {CONTACTS_TABLE_COLUMNS.CUSTOMER.label}
            </label>
            <TextField
              variant="outlined"
              size="small"
              placeholder={CONTACTS_TABLE_COLUMNS.CUSTOMER.placeholder}
              value={state.filters.customerName || ""}
              onChange={handleChangeFilter("customerName")}
              onKeyDown={handleKeyPress}
              className={textFieldClassName}
              sx={textFieldStlye}
            />
          </div>
        </TableCell>
        <TableCell
          className="px-3"
          sx={{
            width: CONTACTS_TABLE_COLUMNS.SECTORS.width,
            minWidth: CONTACTS_TABLE_COLUMNS.SECTORS.width,
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {CONTACTS_TABLE_COLUMNS.SECTORS.label}
            </label>
            <Autocomplete
              multiple
              size="small"
              options={sectors}
              getOptionLabel={(option) => option.name}
              value={selectedSectorOptions}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              onChange={(_, values) =>
                dispatch({ type: "set-sector-filter", sectorIds: values.map((v) => v.id) })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={CONTACTS_TABLE_COLUMNS.SECTORS.placeholder}
                  variant="outlined"
                  className="bg-slate-200 dark:bg-slate-700"
                  sx={textFieldStlye}
                />
              )}
            />
          </div>
        </TableCell>
        <TableCell
          className="px-3"
          sx={{
            width: CONTACTS_TABLE_COLUMNS.ACTIONS.width,
            minWidth: CONTACTS_TABLE_COLUMNS.ACTIONS.width,
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {CONTACTS_TABLE_COLUMNS.ACTIONS.label}
            </label>
            <div className="flex min-h-[40px] w-32 items-center gap-1">
              <Tooltip title="Pesquisar" arrow>
                <IconButton
                  onClick={onClickSearch}
                  size="small"
                  color="primary"
                  className="bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
                >
                  <Search fontSize="small" />
                </IconButton>
              </Tooltip>
              {activeFiltersCount > 0 ? (
                <>
                  <Tooltip title="Limpar filtros" arrow>
                    <IconButton
                      onClick={onClearFilters}
                      size="small"
                      color="error"
                      className="bg-red-500 text-white hover:bg-red-600 dark:bg-red-800 dark:hover:bg-red-700"
                    >
                      <FilterAltOff fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Chip
                    icon={<FilterAlt fontSize="small" />}
                    label={activeFiltersCount}
                    size="small"
                    color="primary"
                  />
                </>
              ) : (
                <div className="w-[88px]" />
              )}
            </div>
          </div>
        </TableCell>
      </TableRow>
    </TableHead>
  );
}
