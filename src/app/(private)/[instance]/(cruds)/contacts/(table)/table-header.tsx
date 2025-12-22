"use client";

import { FilterAlt, FilterAltOff, Search } from "@mui/icons-material";
import {
  Autocomplete,
  Chip,
  IconButton,
  MenuItem,
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
import React from "react";

const textFieldStlye: SxProps<Theme> = {
  "& .MuiOutlinedInput-root": {
    fontSize: "0.875rem",
  },
};

type FilterKey = Exclude<keyof ContactsFilters, "page" | "perPage" | "sectorIds">;

const isKeyOfContact = (key: string): key is FilterKey => {
  const accepted: string[] = ["id", "name", "phone", "customerName", "customerId"];
  return accepted.includes(key);
};

const textFieldClassName = "w-full bg-slate-200 dark:bg-slate-700";

export default function ContactsTableHeader() {
  const { dispatch, state, loadContacts } = useContactsContext();
  const { sectors = [] } = useWhatsappContext();
  const [idInput, setIdInput] = React.useState<string>(state.filters.id || "");
  const [nameInput, setNameInput] = React.useState<string>(state.filters.name || "");
  const [phoneInput, setPhoneInput] = React.useState<string>(state.filters.phone || "");
  const [customerNameInput, setCustomerNameInput] = React.useState<string>(state.filters.customerName || "");
  const [selectedSectorOptionsLocal, setSelectedSectorOptionsLocal] = React.useState<
    { id: number; name: string }[]
  >(sectors.filter((s) => (state.filters.sectorIds || []).includes(s.id)));

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

  const onClickSearch = () => {
    const actions = [] as any[];
    if (idInput && idInput.trim() !== "") actions.push({ type: "change-filter", key: "id", value: idInput.trim() });
    else actions.push({ type: "remove-filter", key: "id" });

    if (nameInput && nameInput.trim() !== "") actions.push({ type: "change-filter", key: "name", value: nameInput.trim() });
    else actions.push({ type: "remove-filter", key: "name" });

    if (phoneInput && phoneInput.trim() !== "") actions.push({ type: "change-filter", key: "phone", value: phoneInput.trim() });
    else actions.push({ type: "remove-filter", key: "phone" });

    if (customerNameInput && customerNameInput.trim() !== "")
      actions.push({ type: "change-filter", key: "customerName", value: customerNameInput.trim() });
    else actions.push({ type: "remove-filter", key: "customerName" });

    actions.push({ type: "set-sector-filter", sectorIds: selectedSectorOptionsLocal.map((s) => s.id) });

    dispatch({ type: "multiple", actions });
    loadContacts();
  };
  const onClearFilters = () => dispatch({ type: "clear-filters" });

  React.useEffect(() => {
    setIdInput(state.filters.id || "");
    setNameInput(state.filters.name || "");
    setPhoneInput(state.filters.phone || "");
    setCustomerNameInput(state.filters.customerName || "");
    setSelectedSectorOptionsLocal(sectors.filter((s) => (state.filters.sectorIds || []).includes(s.id)));
  }, [state.filters, sectors]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onClickSearch();
    }
  };

  const handleChangeFilter = (_: FilterKey) => {
    return () => {};
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
              value={idInput}
              onChange={(e) => setIdInput(e.target.value)}
              onKeyDown={handleKeyPress}
              className={textFieldClassName}
              sx={textFieldStlye}
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
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
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
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
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
              value={customerNameInput}
              onChange={(e) => setCustomerNameInput(e.target.value)}
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
              value={selectedSectorOptionsLocal}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              onChange={(_, values) => setSelectedSectorOptionsLocal(values as any)}
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
